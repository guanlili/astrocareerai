import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { heygenStatus, type HeygenStatus } from "@/media/heygen";
import { HeyGenAvatarClient } from "@/media/heygenAvatarClient";
import { WebSpeechASRClient } from "@/media/asr";
import { FREE_TRIAL_LIMIT_MS, type VideoRoomState, type TrialQuota } from "@/media/contracts";
import type { AvatarClient, ASRClient } from "@/media/contracts";
import { useT } from "@/i18n/context";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { PerspectiveSwitcher } from "@/components/layouts/PerspectiveSwitcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Mic,
  MicOff,
  MessageSquare,
  Captions,
  CaptionsOff,
  Settings2,
  Loader2,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  BrainCircuit,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/video/$teacherId")({
  head: ({ params }) => {
    const t = getTeacher(params.teacherId);
    return {
      meta: [{ title: `视频面试间 · ${t?.name ?? "老师"} AI 分身 · 面镜` }],
    };
  },
  loader: ({ params }) => {
    const t = getTeacher(params.teacherId);
    if (!t) throw notFound();
    const config = buildTeacherConfig(params.teacherId);
    if (!config.video) throw notFound(); // 无 video 配置的老师不开视频入口
    return { teacher: t, videoConfig: config.video };
  },
  component: VideoPage,
});

type LangChoice = "zh" | "en" | "mix";
const LANG_MODE: Record<LangChoice, LanguageMode> = {
  zh: { primary: "zh", mixing: "light" },
  en: { primary: "en", mixing: "none" },
  mix: { primary: "zh", mixing: "heavy" },
};
const langFromMode = (m?: LanguageMode): LangChoice =>
  !m ? "zh" : m.primary === "en" ? "en" : m.mixing === "heavy" ? "mix" : "zh";

type Difficulty = "warmup" | "standard" | "stress";

// 低置信度兜底话术
const LOW_CONF_FALLBACK = "没太听清，可以再说一遍吗？";

function VideoPage() {
  const { teacher: t, videoConfig } = Route.useLoaderData();
  const t9n = useT();
  const navigate = useNavigate();

  // ── Agent & Store ──────────────────────────────────────────────────────
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

  const config = useMemo(() => buildTeacherConfig(t.id), [t.id]);
  const rubric = config.knowledge.rubric;
  const maxQ = config.guardrails.maxQuestions;
  const lastKey = `mirrorhire:last:${t.id}`;

  // ── 媒体客户端（惰性创建，只在客户端存在）──────────────────────────────
  const avatarRef = useRef<AvatarClient | null>(null);
  const asrRef = useRef<ASRClient | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── HeyGen 状态 ─────────────────────────────────────────────────────────
  const [heygenSt, setHeygenSt] = useState<HeygenStatus | null>(null);
  useEffect(() => {
    heygenStatus()
      .then(setHeygenSt)
      .catch(() => setHeygenSt({ enabled: false, maskedKey: "(未配置)" }));
  }, []);

  // ── 面试会话 ────────────────────────────────────────────────────────────
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [resumable, setResumable] = useState<InterviewSession | null>(null);

  // ── 视频间运行时状态 ─────────────────────────────────────────────────────
  const [room, setRoom] = useState<VideoRoomState>({
    media: "idle",
    micEnabled: false,
    avatarTalking: false,
    userTalking: false,
    captionsEnabled: true,
  });

  // ── 试用额度（Q6：免费用户限 20 分钟）────────────────────────────────────
  const [quota, setQuota] = useState<TrialQuota>({
    limitMs: FREE_TRIAL_LIMIT_MS,
    usedMs: 0,
    exhausted: false,
  });
  const quotaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startQuotaTimer = useCallback(() => {
    if (quotaTimerRef.current) return;
    quotaTimerRef.current = setInterval(() => {
      setQuota((q) => {
        const next = q.usedMs + 1000;
        if (next >= q.limitMs) {
          stopQuotaTimer();
          handleQuotaExhausted();
          return { ...q, usedMs: q.limitMs, exhausted: true };
        }
        return { ...q, usedMs: next };
      });
    }, 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopQuotaTimer = useCallback(() => {
    if (quotaTimerRef.current) {
      clearInterval(quotaTimerRef.current);
      quotaTimerRef.current = null;
    }
  }, []);

  const handleQuotaExhausted = useCallback(async () => {
    setRoom((r) => ({ ...r, media: "ended" }));
    await avatarRef.current?.interrupt().catch(() => {});
    await asrRef.current?.stop().catch(() => {});
    await avatarRef.current?.stop().catch(() => {});
  }, []);

  // ── 当前字幕（数字人正在说的话）──────────────────────────────────────────
  const [caption, setCaption] = useState("");
  // ── 部分 ASR 中间结果 ────────────────────────────────────────────────────
  const [partialSpeech, setPartialSpeech] = useState("");
  // ── 即时反馈（侧栏）─────────────────────────────────────────────────────
  const [latestFeedback, setLatestFeedback] = useState<ChatMsg["feedback"] | null>(null);
  const [busy, setBusy] = useState(false);

  // ── 配置表单 ─────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [customFocus, setCustomFocus] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [langChoice, setLangChoice] = useState<LangChoice>(langFromMode(config.style.language));
  const [starting, setStarting] = useState(false);

  // 同意录音 banner
  const [consentGiven, setConsentGiven] = useState(false);

  // ── 续连检测 ─────────────────────────────────────────────────────────────
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

  // ── 清理 ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopQuotaTimer();
      asrRef.current?.stop().catch(() => {});
      avatarRef.current?.stop().catch(() => {});
    };
  }, [stopQuotaTimer]);

  // ── 开始连接数字人 ────────────────────────────────────────────────────────
  async function connectAvatar(sess: InterviewSession) {
    if (!containerRef.current) return;
    setRoom((r) => ({ ...r, media: "connecting" }));

    const client = new HeyGenAvatarClient();
    avatarRef.current = client;

    const lang = sess.setup.language ??
      config.style.language ?? { primary: "zh" as const, mixing: "light" as const };

    client.on("ready", () => {
      setRoom((r) => ({ ...r, media: "live", micEnabled: true }));
      startQuotaTimer();
      startASR(sess, lang);
      // 播放开场白（INTRO 状态下已有第一条 AI 消息）
      const first = sess.messages.findLast((m) => m.role === "ai");
      if (first) {
        setCaption(first.content);
        client.speak(first.content).catch(console.warn);
      }
    });

    client.on("talking_start", () => setRoom((r) => ({ ...r, avatarTalking: true })));
    client.on("talking_end", () => {
      setRoom((r) => ({ ...r, avatarTalking: false }));
      setCaption("");
    });

    client.on("error", (p) => {
      const msg = (p as { message?: string })?.message ?? "连接异常";
      setRoom((r) => ({ ...r, media: "error", lastError: msg }));
      stopQuotaTimer();
    });

    try {
      await client.start({ container: containerRef.current, video: videoConfig, language: lang });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRoom((r) => ({ ...r, media: "error", lastError: msg }));
    }
  }

  // ── ASR 启动（turn-taking）────────────────────────────────────────────────
  function startASR(sess: InterviewSession, lang: LanguageMode) {
    const asr = new WebSpeechASRClient();
    asrRef.current = asr;

    asr
      .start({
        language: lang,
        onPartial: (text) => {
          setPartialSpeech(text);
          setRoom((r) => ({ ...r, userTalking: true }));
          // barge-in：用户开口时打断数字人朗读
          if (room.avatarTalking) {
            avatarRef.current?.interrupt().catch(() => {});
          }
        },
        onFinal: async (text, confidence) => {
          setPartialSpeech("");
          setRoom((r) => ({ ...r, userTalking: false }));

          // 低置信度兜底（不计入题数）
          if (!text || (confidence !== undefined && confidence < 0.3)) {
            const fallbackSay = LOW_CONF_FALLBACK;
            setCaption(fallbackSay);
            await avatarRef.current?.speak(fallbackSay).catch(console.warn);
            return;
          }

          // 静音麦克风，防止 AI 回答时 ASR 误识别
          asrRef.current?.mute(true);
          setBusy(true);

          try {
            const { session: nextSess, message } = await agent.reply(sess.id, text);
            setSession(nextSess);
            if (message.feedback) setLatestFeedback(message.feedback);

            const say = message.content;
            setCaption(say);

            // 语音朗读
            await avatarRef.current?.speak(say).catch(console.warn);

            if (nextSess.state === "REPORT") {
              // 结束 → 跳报告
              stopQuotaTimer();
              await asrRef.current?.stop().catch(() => {});
              await avatarRef.current?.stop().catch(() => {});
              navigate({ to: `/report/${nextSess.id}` });
            }
          } catch (e) {
            console.error("[video] reply 失败:", e);
          } finally {
            setBusy(false);
            asrRef.current?.mute(false);
          }
        },
      })
      .catch((e) => {
        setRoom((r) => ({
          ...r,
          media: "error",
          lastError: e instanceof Error ? e.message : String(e),
        }));
      });
  }

  // ── 开始面试（新场 or 续连）──────────────────────────────────────────────
  async function startNew() {
    if (!consentGiven) return;
    setStarting(true);
    const setup: InterviewSetup = {
      resume: resumeText.trim() || undefined,
      companyName: companyName.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
      roleTitle: roleTitle.trim() || undefined,
      customFocus: customFocus.trim() || undefined,
      difficulty,
      language: LANG_MODE[langChoice],
    };
    try {
      const s = await agent.start(setup, t.id);
      try {
        localStorage.setItem(lastKey, s.id);
      } catch {
        /* ignore */
      }
      setSession(s);
      setDrawerOpen(false);
      setResumable(null);
      await connectAvatar(s);
    } finally {
      setStarting(false);
    }
  }

  async function resumeSession() {
    if (!resumable || !consentGiven) return;
    setStarting(true);
    try {
      const s = await agent.resume(resumable.id);
      setSession(s);
      setResumable(null);
      await connectAvatar(s);
    } finally {
      setStarting(false);
    }
  }

  // ── 麦克风开关 ──────────────────────────────────────────────────────────
  function toggleMic() {
    const next = !room.micEnabled;
    asrRef.current?.mute(!next);
    setRoom((r) => ({ ...r, micEnabled: next }));
  }

  // ── 辅助 ─────────────────────────────────────────────────────────────────
  const askedCount = session?.askedQuestionIds.length ?? 0;
  const dimName = (id: string) => rubric.find((r) => r.id === id)?.name ?? id;
  const quotaPercent = Math.min((quota.usedMs / quota.limitMs) * 100, 100);
  const quotaRemainMin = Math.max(0, Math.ceil((quota.limitMs - quota.usedMs) / 60000));

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* ── 顶部导航 ── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/teachers"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {t.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{t.name} · AI 视频分身</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-gold" /> AI 生成 · 数字人
                </span>
                {videoConfig.isPersonalAvatar ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-gold/50 text-gold"
                  >
                    本人形象
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 text-muted-foreground"
                  >
                    演示形象
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 切换文字聊天室 */}
          {session && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => navigate({ to: `/chat/${t.id}` })}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              切换文字
            </Button>
          )}
          <LanguageSwitcher />
          <PerspectiveSwitcher />
        </div>
      </header>

      {/* ── HeyGen 未配置警告 ── */}
      {heygenSt && !heygenSt.enabled && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 flex items-start gap-2 text-amber-300 text-xs shrink-0">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            HeyGen 未配置（密钥：{heygenSt.maskedKey}）
            {heygenSt.reason ? `：${heygenSt.reason}` : ""}。 视频面试需先在 <code>.env.local</code>{" "}
            填入 <code>HEYGEN_API_KEY</code>。 可{" "}
            <button
              className="underline font-medium"
              onClick={() => navigate({ to: `/chat/${t.id}` })}
            >
              切换文字聊天室
            </button>{" "}
            继续练习。
          </span>
        </div>
      )}

      {/* ── 试用额度条 ── */}
      {room.media === "live" && (
        <div className="px-4 pt-2 pb-1 shrink-0">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {quota.exhausted ? (
                <span className="text-destructive font-medium">试用额度已用完</span>
              ) : (
                `剩余 ${quotaRemainMin} 分钟 · 免费试用`
              )}
            </span>
            <span>{Math.round(quotaPercent)}%</span>
          </div>
          <Progress
            value={quotaPercent}
            className={`h-1 ${quota.exhausted ? "[&>div]:bg-destructive" : "[&>div]:bg-gold"}`}
          />
        </div>
      )}

      {/* ── 主区域 ── */}
      <div className="flex flex-1 min-h-0 gap-4 p-4">
        {/* ── 左：数字人视频 ── */}
        <div className="flex flex-col gap-3" style={{ flex: "0 0 60%" }}>
          {/* 视频容器 */}
          <div
            ref={containerRef}
            className="relative flex-1 rounded-2xl overflow-hidden bg-surface border border-white/10 min-h-0"
            style={{ minHeight: 320 }}
          >
            {/* 连接态 / 空闲态 占位 */}
            {(room.media === "idle" || room.media === "connecting") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                {room.media === "connecting" ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm">正在连接数字人…</p>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-8 w-8 text-primary/50" />
                    <p className="text-sm">{t.name} 的 AI 数字人</p>
                    <p className="text-xs text-muted-foreground/60">配置面试后开始连接</p>
                  </>
                )}
              </div>
            )}

            {/* 错误态 */}
            {room.media === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive text-center">连接失败</p>
                <p className="text-xs text-muted-foreground text-center">{room.lastError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate({ to: `/chat/${t.id}` })}
                  className="mt-1"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  切换文字聊天室
                </Button>
              </div>
            )}

            {/* 额度耗尽遮罩 */}
            {quota.exhausted && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10 p-6 rounded-2xl">
                <Clock className="h-10 w-10 text-gold" />
                <div className="text-center">
                  <p className="font-semibold text-lg">20 分钟免费试用已结束</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    升级后可继续视频面试，或免费切换文字聊天室继续练习。
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Button size="sm" className="gradient-primary">
                    升级继续视频
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: `/chat/${t.id}` })}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    切换文字（免费）
                  </Button>
                </div>
              </div>
            )}

            {/* 正在说话指示 */}
            {room.avatarTalking && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-white z-10">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {t.name} 正在说话
              </div>
            )}

            {/* 用户说话指示 */}
            {room.userTalking && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-white z-10">
                <Mic className="h-3 w-3 text-green-400" />
                <span className="text-green-400">你正在说话</span>
              </div>
            )}

            {/* AI 生成水印 */}
            <div className="absolute bottom-3 right-3 text-[10px] text-white/40 select-none z-10">
              AI 生成 · 数字人 · 非真人
            </div>
          </div>

          {/* 字幕区 */}
          {room.captionsEnabled && (caption || partialSpeech) && (
            <div className="rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 px-4 py-2.5 text-sm">
              {caption && (
                <p className="text-white/90">
                  <span className="text-primary font-medium mr-1.5">{t.name}：</span>
                  {caption}
                </p>
              )}
              {partialSpeech && (
                <p className="text-muted-foreground italic mt-1">
                  <span className="text-green-400 font-medium mr-1.5">你：</span>
                  {partialSpeech}…
                </p>
              )}
            </div>
          )}

          {/* 底部控制栏 */}
          {room.media === "live" && (
            <div className="flex items-center justify-center gap-3 shrink-0">
              <Button
                size="icon"
                variant={room.micEnabled ? "default" : "outline"}
                className={`h-12 w-12 rounded-full ${room.micEnabled ? "bg-primary hover:bg-primary/90" : "border-destructive text-destructive hover:bg-destructive/10"}`}
                onClick={toggleMic}
                disabled={busy}
                title={room.micEnabled ? "静音" : "开麦"}
              >
                {room.micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full"
                onClick={() => setRoom((r) => ({ ...r, captionsEnabled: !r.captionsEnabled }))}
                title={room.captionsEnabled ? "关闭字幕" : "开启字幕"}
              >
                {room.captionsEnabled ? (
                  <Captions className="h-4 w-4" />
                ) : (
                  <CaptionsOff className="h-4 w-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={async () => {
                  if (!session) return;
                  stopQuotaTimer();
                  setBusy(true);
                  try {
                    await asrRef.current?.stop().catch(() => {});
                    const report = await agent.finish(session.id);
                    await avatarRef.current?.stop().catch(() => {});
                    navigate({ to: `/report/${report.sessionId}` });
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                结束并生成报告
              </Button>
            </div>
          )}

          {/* 「说完了」兜底按钮（手动结束发言）*/}
          {room.media === "live" && room.micEnabled && !room.avatarTalking && !busy && (
            <p className="text-center text-[11px] text-muted-foreground">
              说完了可以直接停顿，AI 自动判停；也可点
              <button
                className="underline mx-1"
                onClick={() => {
                  // 触发一次"静音再开麦"以强制 ASR 提交当前片段
                  asrRef.current?.mute(true);
                  setTimeout(() => asrRef.current?.mute(false), 50);
                }}
              >
                手动结束发言
              </button>
            </p>
          )}
        </div>

        {/* ── 右：反馈侧栏 ── */}
        <div className="flex flex-col gap-3 overflow-y-auto" style={{ flex: "0 0 40%" }}>
          {/* 进度 */}
          {session && (
            <div className="glass-panel rounded-xl p-3 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">面试进度</span>
                <span className="text-xs text-muted-foreground">
                  {askedCount}/{maxQ} 题
                  {session.elapsedMs > 0 && <> · {Math.floor(session.elapsedMs / 60000)} 分钟</>}
                </span>
              </div>
              <Progress value={(askedCount / maxQ) * 100} className="h-1.5 [&>div]:bg-gold" />
            </div>
          )}

          {/* 即时反馈框（脑内打分，不朗读 §6.4）*/}
          {latestFeedback ? (
            <div className="glass-panel rounded-xl p-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <BrainCircuit className="h-3.5 w-3.5 text-gold" />
                  即时反馈 · {dimName(latestFeedback.dimension)}
                </span>
                <span className="text-lg font-bold font-mono text-gold">
                  {latestFeedback.score}
                  <span className="text-xs font-normal text-muted-foreground">/100</span>
                </span>
              </div>
              <p className="text-sm text-foreground/90 mb-3 border-l-2 border-primary/50 pl-3 italic">
                「{latestFeedback.oneLineComment}」
              </p>
              {latestFeedback.strengths.length > 0 && (
                <div className="mb-2">
                  <p className="text-[11px] font-medium text-green-400 mb-1">亮点</p>
                  <ul className="space-y-0.5">
                    {latestFeedback.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-green-400 mt-0.5">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {latestFeedback.improvements.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-amber-400 mb-1">待改进</p>
                  <ul className="space-y-0.5">
                    {latestFeedback.improvements.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-amber-400 mt-0.5">△</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-xl p-4 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BrainCircuit className="h-3.5 w-3.5" />
                {room.media === "live" ? "答完题后即时反馈将出现在这里" : "开始面试后查看即时反馈"}
              </div>
            </div>
          )}

          {/* AI 说的话（历史，文字辅助回顾）*/}
          {session && session.messages.length > 0 && (
            <div className="glass-panel rounded-xl p-3 flex-1 overflow-y-auto min-h-0">
              <p className="text-[11px] font-medium text-muted-foreground mb-2">对话记录</p>
              <div className="space-y-2">
                {session.messages
                  .filter((m) => m.role !== "system")
                  .map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                      <div
                        className={`text-xs rounded-lg px-3 py-2 max-w-[90%] leading-relaxed ${
                          m.role === "ai"
                            ? "bg-surface text-foreground/90"
                            : "bg-primary/20 text-foreground"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                {busy && (
                  <div className="flex gap-2">
                    <div className="text-xs rounded-lg px-3 py-2 bg-surface text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t.name} 正在思考…
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 老师简介 */}
          {!session && (
            <div className="glass-panel rounded-xl p-4 shrink-0">
              <p className="text-xs font-medium mb-1">{t.name}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                {t.bio}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 续连提示覆盖层 ── */}
      {resumable && !session && room.media === "idle" && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20 p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <RotateCcw className="h-8 w-8 text-primary mx-auto" />
            <div>
              <p className="font-semibold">上次面试未完成</p>
              <p className="text-sm text-muted-foreground mt-1">
                已进行到第 {resumable.askedQuestionIds.length} 题，可继续或重新开始。
              </p>
            </div>
            {/* 录音同意 */}
            {!consentGiven && (
              <label className="flex items-start gap-2 text-left cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  onChange={(e) => setConsentGiven(e.target.checked)}
                />
                <span className="text-xs text-muted-foreground">
                  我同意本次面试采集语音用于 AI 识别与质量优化，平台将按隐私政策保护我的数据。
                </span>
              </label>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1 gradient-primary"
                disabled={!consentGiven || starting}
                onClick={resumeSession}
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : "继续上次"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setResumable(null);
                  setDrawerOpen(true);
                }}
              >
                重新开始
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 配置抽屉 ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              配置本次视频面试
            </SheetTitle>
            <SheetDescription>
              信息越详细，{t.name} AI 分身的追问越精准。所有字段均可留空。
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-6">
            {/* 录音同意 */}
            <label className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-900/20 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
              />
              <span className="text-xs text-amber-300 leading-relaxed">
                我同意本次面试采集麦克风语音，用于 AI 语音识别与会话质量优化。
                平台将按隐私政策加密保护数据，可随时申请删除。
              </span>
            </label>

            <div className="space-y-2">
              <Label className="text-xs">目标公司</Label>
              <Input
                className="h-9 text-sm"
                placeholder="如：字节跳动"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">岗位名称</Label>
              <Input
                className="h-9 text-sm"
                placeholder="如：抖音电商运营经理"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">岗位 JD（粘贴关键内容）</Label>
              <Textarea
                className="text-sm min-h-[80px]"
                placeholder="粘贴 JD 正文，AI 会据此押题…"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">简历（粘贴文本）</Label>
              <Textarea
                className="text-sm min-h-[80px]"
                placeholder="粘贴简历文本，AI 会针对你的经历追问…"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">我想重点训练的方向（自定义关注点）</Label>
              <Textarea
                className="text-sm min-h-[60px]"
                placeholder="如：我容易紧张、逻辑发散，帮我重点练结构化表达"
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">难度</Label>
              <RadioGroup
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
                className="flex gap-4"
              >
                {(["warmup", "standard", "stress"] as const).map((d) => (
                  <div key={d} className="flex items-center gap-1.5">
                    <RadioGroupItem value={d} id={`vid-diff-${d}`} />
                    <Label htmlFor={`vid-diff-${d}`} className="text-xs cursor-pointer">
                      {d === "warmup" ? "热身" : d === "standard" ? "标准" : "压力测试"}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">面试语言</Label>
              <RadioGroup
                value={langChoice}
                onValueChange={(v) => setLangChoice(v as LangChoice)}
                className="flex gap-4"
              >
                {(
                  [
                    ["zh", "中文"],
                    ["en", "English"],
                    ["mix", "中英混杂"],
                  ] as const
                ).map(([v, label]) => (
                  <div key={v} className="flex items-center gap-1.5">
                    <RadioGroupItem value={v} id={`vid-lang-${v}`} />
                    <Label htmlFor={`vid-lang-${v}`} className="text-xs cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <p className="text-[11px] text-muted-foreground bg-surface/50 rounded-lg px-3 py-2 leading-relaxed">
              免费用户视频面试限 20 分钟。额度耗尽后可免费切换文字聊天室继续练习。
            </p>
          </div>

          <SheetFooter>
            <Button
              className="w-full gradient-primary"
              disabled={starting || !consentGiven || (heygenSt != null && !heygenSt.enabled)}
              onClick={startNew}
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  连接数字人…
                </>
              ) : heygenSt && !heygenSt.enabled ? (
                "HeyGen 未配置（无法启动视频）"
              ) : !consentGiven ? (
                "请先同意录音授权"
              ) : (
                "开始视频面试"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
