import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { getTeacher } from "@/mock/teachers";
import type { ChatMsg } from "@/mock/sessions";
import {
  MockInterviewAgent,
  LocalSessionStore,
  type InterviewSession,
  type InterviewSetup,
  type LanguageMode,
} from "@/agent/interview";
import { MockTeacherConfigProvider, buildTeacherConfig } from "@/mock/interview";
import { FallbackModelClient, ServerModelClient } from "@/llm/clients";
import { llmStatus, type LlmStatus } from "@/llm/endpoints";
import { StatusBadge } from "@/components/common/PanelKit";
import { PerspectiveSwitcher } from "@/components/layouts/PerspectiveSwitcher";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useT } from "@/i18n/context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  FileText,
  Video,
  Settings2,
  Loader2,
  RotateCcw,
  BrainCircuit,
} from "lucide-react";

export const Route = createFileRoute("/chat/$teacherId")({
  head: ({ params }) => {
    const t = getTeacher(params.teacherId);
    return {
      meta: [{ title: `与 ${t?.name ?? "老师"} 的 AI 分身对话 · 面镜` }],
    };
  },
  loader: ({ params }) => {
    const t = getTeacher(params.teacherId);
    if (!t) throw notFound();
    return { teacher: t };
  },
  component: ChatPage,
});

const modeIcons = { free: Sparkles, mock: Video, resume: FileText } as const;

// UI 语言选项 → §5.5 LanguageMode 的映射（与产品界面语言无关）
type LangChoice = "zh" | "en" | "mix";
const LANG_MODE: Record<LangChoice, LanguageMode> = {
  zh: { primary: "zh", mixing: "light" },
  en: { primary: "en", mixing: "none" },
  mix: { primary: "zh", mixing: "heavy" },
};
const langFromMode = (m?: LanguageMode): LangChoice =>
  !m ? "zh" : m.primary === "en" ? "en" : m.mixing === "heavy" ? "mix" : "zh";

type Difficulty = "warmup" | "standard" | "stress";

function ChatPage() {
  const t = getTeacher(Route.useParams().teacherId)!; // 同上，参数名为 teacherId
  const t9n = useT();
  const navigate = useNavigate();

  // 面试 Agent：真实模型经服务端代理 Qwen（密钥在服务端），失败回退打桩；本地存储。
  const { agent, store } = useMemo(() => {
    const localStore = new LocalSessionStore();
    return {
      store: localStore,
      agent: new MockInterviewAgent({
        configProvider: new MockTeacherConfigProvider(),
        model: new FallbackModelClient(new ServerModelClient()),
        store: localStore,
      }),
    };
  }, []);

  // LLM 真实状态（实测探活，关键信息已遮蔽），用于头部标识
  const [llm, setLlm] = useState<LlmStatus | null>(null);
  useEffect(() => {
    llmStatus()
      .then(setLlm)
      .catch((e) =>
        setLlm({ enabled: false, model: "", maskedKey: "", reason: String(e).slice(0, 140) }),
      );
  }, []);

  const config = useMemo(() => buildTeacherConfig(t.id), [t.id]);
  const rubric = config.knowledge.rubric;
  const maxQ = config.guardrails.maxQuestions;
  const lastKey = `mirrorhire:last:${t.id}`;

  const [mode, setMode] = useState<keyof typeof modeIcons>("mock");
  const [phase, setPhase] = useState<"config" | "interview">("config");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [resumable, setResumable] = useState<InterviewSession | null>(null);

  const [input, setInput] = useState("");
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); // 等待 AI 回合（显示「正在输入」）
  const [starting, setStarting] = useState(false);
  const [generating, setGenerating] = useState(false);
  // 逐字打字机：正在打字的 AI 消息下标 + 已显示字数（§6.4）
  const [typing, setTyping] = useState<{ idx: number; n: number } | null>(null);
  const beginTyping = (idx: number) => setTyping({ idx, n: 0 });
  const skipTyping = () =>
    setTyping((cur) => (cur ? { idx: cur.idx, n: Number.MAX_SAFE_INTEGER } : null));

  // 配置表单
  const [resume, setResume] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [langChoice, setLangChoice] = useState<LangChoice>(langFromMode(config.style.language));

  const scrollRef = useRef<HTMLDivElement>(null);

  // 续连检测（§7.8）：进入聊天室若存在未完成会话，提示继续 / 重开
  useEffect(() => {
    let active = true;
    let sid: string | null = null;
    try {
      sid = localStorage.getItem(lastKey);
    } catch {
      /* ignore */
    }
    if (!sid) {
      setDrawerOpen(true);
      return;
    }
    store.load(sid).then((s) => {
      if (!active) return;
      if (s && s.status === "active" && (s.state === "INTRO" || s.state === "QA_LOOP")) {
        setResumable(s);
      } else {
        setDrawerOpen(true);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 新消息滚动到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session?.messages.length, pendingUser, busy, typing?.n]);

  // 逐字推进：每帧多显示几个字，直到整段显示完（§6.4）
  useEffect(() => {
    if (!typing) return;
    const full = session?.messages[typing.idx]?.content ?? "";
    if (typing.n >= full.length) {
      setTyping(null);
      return;
    }
    const id = setTimeout(() => setTyping({ idx: typing.idx, n: typing.n + 2 }), 24);
    return () => clearTimeout(id);
  }, [typing, session]);

  const messages: ChatMsg[] = session?.messages ?? [];
  const askedCount = session?.askedQuestionIds.length ?? 0;
  const dimName = (id: string) => rubric.find((r) => r.id === id)?.name ?? id;
  const followUpReason = (dimension: string, score?: number) => {
    const name = dimName(dimension);
    if (score !== undefined && score < 75) {
      return `上一轮的「${name}」证据不足，AI 正在追问关键细节来判断真实能力。`;
    }
    return `AI 正在验证「${name}」，确认你的结论是否有完整的业务与决策依据。`;
  };

  function rememberPointer(id: string) {
    try {
      localStorage.setItem(lastKey, id);
    } catch {
      /* ignore */
    }
  }

  async function startInterview() {
    setStarting(true);
    const setup: InterviewSetup = {
      resume: resume.trim() || undefined,
      companyName: companyName.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
      roleTitle: roleTitle.trim() || undefined,
      customFocus: customFocus.trim() || undefined,
      difficulty,
      language: LANG_MODE[langChoice],
    };
    try {
      const s = await agent.start(setup, t.id);
      rememberPointer(s.id);
      setSession(s);
      setPhase("interview");
      setDrawerOpen(false);
      setResumable(null);
      beginTyping(s.messages.length - 1); // 开场白逐字打出
    } finally {
      setStarting(false);
    }
  }

  async function continueResumable() {
    if (!resumable) return;
    const s = await agent.resume(resumable.id);
    setSession(s);
    setPhase("interview");
    setResumable(null);
  }

  function restartFromResumable() {
    try {
      localStorage.removeItem(lastKey);
    } catch {
      /* ignore */
    }
    setResumable(null);
    setDrawerOpen(true);
  }

  async function send() {
    if (!input.trim() || !session || busy) return;
    skipTyping(); // 若上一条还在打字，先补全
    const text = input;
    setInput("");
    setPendingUser(text);
    setBusy(true);
    try {
      const { session: s } = await agent.reply(session.id, text);
      setSession(s);
      beginTyping(s.messages.length - 1); // 新回复逐字打出
    } finally {
      setPendingUser(null);
      setBusy(false);
    }
  }

  async function endAndReport() {
    if (!session || generating) return;
    setGenerating(true);
    try {
      const report = await agent.finish(session.id);
      try {
        localStorage.setItem(`mirrorhire:report:${session.id}`, JSON.stringify(report));
      } catch {
        /* ignore */
      }
      navigate({ to: "/report/$sessionId", params: { sessionId: session.id } });
    } finally {
      setGenerating(false);
    }
  }

  // 实时维度：按 rubric 聚合已收集反馈的均分
  const liveDims = rubric.map((r) => {
    const scores = messages
      .map((m) => m.feedback)
      .filter((f) => f && f.dimension === r.id)
      .map((f) => f!.score);
    const v = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return { name: r.name, v };
  });

  const wrappedUp = session?.state === "WRAPUP" || session?.state === "REPORT";

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* 顶部 */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
        <Link
          to="/teachers/$id"
          params={{ id: t.id }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t9n("header.back")}
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {phase === "interview" && (
            <div className="hidden items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] text-foreground md:flex">
              {t9n("progress.questions", { n: askedCount, m: maxQ })}
            </div>
          )}
          <div
            className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] md:flex ${
              !llm
                ? "border-border bg-surface/60 text-muted-foreground"
                : llm.enabled
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border bg-surface/60 text-muted-foreground"
            }`}
            title={
              !llm
                ? t9n("llm.checking")
                : llm.enabled
                  ? `Qwen · ${llm.model} · ${llm.maskedKey}`
                  : `${t9n("llm.mocking")} · ${llm.reason ?? ""}`
            }
          >
            {!llm ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {!llm
              ? t9n("llm.checking")
              : llm.enabled
                ? `Qwen · ${llm.model}`
                : t9n("llm.mocking")}
          </div>
          <LanguageSwitcher />
          <PerspectiveSwitcher />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_1fr_300px]">
        {/* 左侧：老师卡 + 模式 + 场景 */}
        <aside className="hidden flex-col gap-4 border-r border-border bg-sidebar/40 p-4 lg:flex">
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <img src={t.avatar} alt="" className="h-12 w-12 rounded-lg ring-2 ring-primary/40" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {t.name} · {t9n("header.aiAvatar")}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-success">
                  ● {t9n("header.online")}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{t.title}</div>
          </div>

          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t9n("scenario.title")}
            </div>
            <div className="space-y-1">
              {(["free", "mock", "resume"] as const).map((id) => {
                const active = id === mode;
                const Icon = modeIcons[id];
                return (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {t9n(`mode.${id}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t9n("scenario.title")}
              </div>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-muted-foreground hover:text-foreground"
                title={t9n("config.title")}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1 text-sm font-medium">
              {session?.setup.companyName || session?.setup.roleTitle || t9n("scenario.generic")}
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              {session?.setup.roleTitle && (
                <div>
                  · {t9n("scenario.role")}：{session.setup.roleTitle}
                </div>
              )}
              {session?.setup.customFocus && (
                <div>
                  · {t9n("scenario.focus")}：{session.setup.customFocus}
                </div>
              )}
              {phase === "interview" && (
                <div>· {t9n("progress.questions", { n: askedCount, m: maxQ })}</div>
              )}
            </div>
          </div>

          <div className="mt-auto rounded-md border border-border bg-surface/60 p-3 font-mono text-[10px] text-muted-foreground">
            {t9n("compliance.aiNotice")}
          </div>
        </aside>

        {/* 中间：对话流 */}
        <section className="flex min-w-0 flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-4">
              {/* 续连提示 */}
              {phase === "config" && resumable && (
                <div className="glass-panel mx-auto max-w-md rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                  <div className="text-sm font-medium text-foreground">{t9n("resume.title")}</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t9n("resume.desc", { n: resumable.askedQuestionIds.length })}
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button size="sm" onClick={continueResumable}>
                      {t9n("resume.continue")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={restartFromResumable}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t9n("resume.restart")}
                    </Button>
                  </div>
                </div>
              )}

              {/* 配置空态 */}
              {phase === "config" && !resumable && (
                <div className="mx-auto max-w-md rounded-xl border border-dashed border-border p-8 text-center">
                  <Video className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">{t9n("config.subtitle")}</p>
                  <Button className="mt-4" onClick={() => setDrawerOpen(true)}>
                    <Settings2 className="mr-1.5 h-4 w-4" /> {t9n("config.title")}
                  </Button>
                </div>
              )}

              {messages.map((m, i) => {
                if (m.role === "system")
                  return (
                    <div key={i} className="text-center">
                      <StatusBadge tone="info">{m.content}</StatusBadge>
                    </div>
                  );
                const ai = m.role === "ai";
                const isTyping = ai && typing?.idx === i;
                const shownContent = isTyping ? m.content.slice(0, typing!.n) : m.content;
                return (
                  <div key={i} className={`flex ${ai ? "" : "flex-row-reverse"} gap-3`}>
                    {ai && (
                      <img
                        src={t.avatar}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full ring-2 ring-primary/30"
                      />
                    )}
                    <div className="max-w-[78%] space-y-1">
                      <div
                        onClick={isTyping ? skipTyping : undefined}
                        title={isTyping ? t9n("chat.skipTyping") : undefined}
                        className={`whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed ${
                          ai
                            ? "rounded-tl-sm bg-surface-2 text-foreground"
                            : "rounded-tr-sm bg-primary text-primary-foreground"
                        } ${isTyping ? "cursor-pointer" : ""}`}
                      >
                        {shownContent}
                        {isTyping && (
                          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-primary/70 align-middle" />
                        )}
                      </div>
                      {/* 即时反馈：打字完成后才显示（面试官「脑内打分」，不在对话里念出，§6.4） */}
                      {ai && m.feedback && !isTyping && (
                        <div className="rounded-lg border border-gold/30 bg-gold/5 p-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-gold">
                              {dimName(m.feedback.dimension)}
                            </span>
                            <span className="font-mono text-gold">
                              {t9n("feedback.score")} {m.feedback.score}
                            </span>
                          </div>
                          {m.feedback.oneLineComment && (
                            <p className="mt-1 text-muted-foreground">
                              {m.feedback.oneLineComment}
                            </p>
                          )}
                        </div>
                      )}
                      {ai && m.meta && !m.feedback && !isTyping && (
                        <div className="rounded-xl border border-primary/15 bg-primary/5 p-2.5 text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-primary">
                            <BrainCircuit className="h-3.5 w-3.5" /> 为什么追问
                          </div>
                          <p className="mt-1 leading-relaxed text-muted-foreground">
                            {followUpReason(m.meta)}
                          </p>
                          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-primary/80">
                            验证维度 · {dimName(m.meta)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 乐观渲染用户气泡 + 思考中 */}
              {pendingUser && (
                <div className="flex flex-row-reverse gap-3">
                  <div className="max-w-[78%]">
                    <div className="whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary p-4 text-sm text-primary-foreground">
                      {pendingUser}
                    </div>
                  </div>
                </div>
              )}
              {/* 正在输入：类似微信打字态——LLM 运作期间显示三点跳动气泡（§6.4） */}
              {busy && (
                <div className="flex items-end gap-3">
                  <img
                    src={t.avatar}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full ring-2 ring-primary/30"
                  />
                  <div className="space-y-1">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t.name} {t9n("chat.typing")}
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-3">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 输入 */}
          <div className="border-t border-border bg-background/85 px-6 py-4">
            <div className="mx-auto max-w-3xl">
              <div className="glass-panel flex items-end gap-2 rounded-xl p-2">
                <button
                  className="grid h-9 w-9 cursor-not-allowed place-items-center rounded-md text-muted-foreground/50"
                  title={t9n("chat.attachSoon")}
                  disabled
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                {/* Mic 置灰：语音输入即将上线（§8.3） */}
                <button
                  className="relative grid h-9 w-9 cursor-not-allowed place-items-center rounded-md text-muted-foreground/50"
                  title={t9n("chat.micSoon")}
                  disabled
                >
                  <Mic className="h-4 w-4" />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  disabled={phase !== "interview" || busy || wrappedUp}
                  placeholder={t9n("chat.inputPh")}
                  className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={phase !== "interview" || busy || wrappedUp || !input.trim()}
                  className="grid h-9 w-9 place-items-center rounded-md gradient-primary text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>
                  {t.name} · {t9n("header.aiAvatar")}
                </span>
                {phase === "interview" && (
                  <button
                    onClick={endAndReport}
                    disabled={generating}
                    className="text-primary-glow hover:underline disabled:opacity-50"
                  >
                    {generating ? t9n("chat.generatingReport") : `${t9n("chat.endAndReport")} →`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 右侧：实时考察维度 */}
        <aside className="hidden flex-col gap-4 border-l border-border bg-sidebar/40 p-4 lg:flex">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t9n("panel.realtimeDims")}
            </div>
            {messages.some((m) => m.feedback) ? (
              <div className="space-y-2">
                {liveDims.map((d) => (
                  <div key={d.name} className="glass-panel rounded-md p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{d.name}</span>
                      <span className="font-mono text-sm text-foreground">{d.v ?? "—"}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full gradient-primary" style={{ width: `${d.v ?? 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t9n("panel.noData")}</p>
            )}
          </div>
        </aside>
      </div>

      {/* 配置抽屉（§4.3） */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t9n("config.title")}</SheetTitle>
            <SheetDescription>{t9n("config.subtitle")}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 px-4">
            <Field label={t9n("config.company")}>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t9n("config.company.ph")}
              />
            </Field>
            <Field label={t9n("config.role")}>
              <Input
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder={t9n("config.role.ph")}
              />
            </Field>
            <Field label={t9n("config.jd")}>
              <Textarea
                rows={3}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder={t9n("config.jd.ph")}
              />
            </Field>
            <Field label={t9n("config.resume")}>
              <Textarea
                rows={4}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder={t9n("config.resume.ph")}
              />
            </Field>
            <Field label={t9n("config.focus")}>
              <Textarea
                rows={2}
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder={t9n("config.focus.ph")}
              />
            </Field>

            <Field label={t9n("config.difficulty")}>
              <RadioGroup
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
                className="flex gap-2"
              >
                {(["warmup", "standard", "stress"] as const).map((d) => (
                  <label
                    key={d}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                  >
                    <RadioGroupItem value={d} /> {t9n(`difficulty.${d}`)}
                  </label>
                ))}
              </RadioGroup>
            </Field>

            <Field label={t9n("config.language")}>
              <RadioGroup
                value={langChoice}
                onValueChange={(v) => setLangChoice(v as LangChoice)}
                className="flex gap-2"
              >
                {(["zh", "en", "mix"] as const).map((c) => (
                  <label
                    key={c}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                  >
                    <RadioGroupItem value={c} /> {t9n(`lang.${c}`)}
                  </label>
                ))}
              </RadioGroup>
            </Field>
          </div>

          <SheetFooter>
            <Button onClick={startInterview} disabled={starting}>
              {starting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t9n("config.starting")}
                </>
              ) : (
                t9n("config.start")
              )}
            </Button>
            <Button variant="ghost" onClick={startInterview} disabled={starting}>
              {t9n("config.skip")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
