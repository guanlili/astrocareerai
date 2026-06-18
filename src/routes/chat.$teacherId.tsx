import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getTeacher } from "@/mock/teachers";
import { mockInterviewScript, type ChatMsg } from "@/mock/sessions";
import { StatusBadge } from "@/components/common/PanelKit";
import { PerspectiveSwitcher } from "@/components/layouts/PerspectiveSwitcher";
import {
  ArrowLeft,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  FileText,
  Video,
  AlertCircle,
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

const modes = [
  { id: "free", label: "自由问答", icon: Sparkles },
  { id: "mock", label: "模拟面试", icon: Video },
  { id: "resume", label: "简历优化", icon: FileText },
];

function ChatPage() {
  const { teacher: t } = Route.useLoaderData();
  const [mode, setMode] = useState("mock");
  const [messages, setMessages] = useState<ChatMsg[]>(mockInterviewScript);
  const [input, setInput] = useState("");
  const [round] = useState({ used: 4, total: 5 });
  const [showHandoff] = useState(true);

  const send = () => {
    if (!input.trim()) return;
    const next: ChatMsg[] = [
      ...messages,
      { role: "user", content: input },
      {
        role: "ai",
        content:
          "好。我注意到你的回答里提到了「leader」，能具体说一下你是怎么平衡数据结论与团队意见的吗？",
        meta: "考察：沟通协作 · 决策表达",
      },
    ];
    setMessages(next);
    setInput("");
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* 顶部 */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
        <Link
          to="/teachers/$id"
          params={{ id: t.id }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 返回老师详情
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 font-mono text-[11px] text-warning md:flex">
            <AlertCircle className="h-3 w-3" />
            试聊剩余 {round.total - round.used}/{round.total} 轮
          </div>
          <PerspectiveSwitcher />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_300px]">
        {/* 左侧：老师卡 + 模式 */}
        <aside className="hidden flex-col gap-4 border-r border-border bg-sidebar/40 p-4 md:flex">
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <img src={t.avatar} alt="" className="h-12 w-12 rounded-lg ring-2 ring-primary/40" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.name} · AI 分身</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-success">
                  ● 在线
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{t.title}</div>
          </div>

          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              辅导模式
            </div>
            <div className="space-y-1">
              {modes.map((m) => {
                const active = m.id === mode;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              本次场景
            </div>
            <div className="mt-1 text-sm font-medium">字节跳动 · 产品经理 · 终面</div>
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <div>· 已上传简历：张雨_PM.pdf</div>
              <div>· 目标 JD：抖音电商 PM</div>
              <div>· 已对话：{messages.filter((m) => m.role !== "system").length} 条</div>
            </div>
          </div>

          <div className="mt-auto rounded-md border border-border bg-surface/60 p-3 font-mono text-[10px] text-muted-foreground">
            AI 生成内容标识：本对话由 AI 分身生成，依据《生成式人工智能服务管理暂行办法》。
          </div>
        </aside>

        {/* 中间：对话流 */}
        <section className="flex min-w-0 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((m, i) => {
                if (m.role === "system")
                  return (
                    <div key={i} className="text-center">
                      <StatusBadge tone="info">{m.content}</StatusBadge>
                      {m.meta && (
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {m.meta}
                        </div>
                      )}
                    </div>
                  );
                const ai = m.role === "ai";
                return (
                  <div key={i} className={`flex ${ai ? "" : "flex-row-reverse"} gap-3`}>
                    {ai && (
                      <img
                        src={t.avatar}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full ring-2 ring-primary/30"
                      />
                    )}
                    <div className={`max-w-[78%] space-y-1`}>
                      <div
                        className={`whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed ${
                          ai
                            ? "rounded-tl-sm bg-surface-2 text-foreground"
                            : "rounded-tr-sm bg-primary/20 text-foreground"
                        }`}
                      >
                        {m.content}
                      </div>
                      {m.meta && (
                        <div
                          className={`font-mono text-[10px] uppercase tracking-wider text-gold ${
                            ai ? "" : "text-right"
                          }`}
                        >
                          {m.meta}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {showHandoff && (
                <div className="glass-panel rounded-xl border border-gold/40 bg-gold/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-gold" />
                    <div className="flex-1">
                      <div className="font-medium text-gold">建议转 1v1 真人辅导</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        你已连续 3 次问到「具体怎么和 leader 沟通」——这类个性化场景建议直接与 {t.name} 老师本人深入沟通。
                      </p>
                      <Link
                        to="/booking/$teacherId"
                        params={{ teacherId: t.id }}
                        className="mt-3 inline-flex h-9 items-center rounded-md gradient-primary px-4 text-sm font-medium text-primary-foreground"
                      >
                        查看老师档期 →
                      </Link>
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
                <button className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent">
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
                  placeholder="输入你的回答……（Shift+Enter 换行）"
                  className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={send}
                  className="grid h-9 w-9 place-items-center rounded-md gradient-primary text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>首字延迟 ≈ 1.6s</span>
                <Link to="/report/$sessionId" params={{ sessionId: "demo-1" }} className="text-primary-glow hover:underline">
                  结束并生成评估报告 →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 右侧：实时考察维度 */}
        <aside className="hidden flex-col gap-4 border-l border-border bg-sidebar/40 p-4 lg:flex">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              实时考察维度
            </div>
            <div className="space-y-2">
              {[
                { l: "表达逻辑", v: 88 },
                { l: "业务理解", v: 85 },
                { l: "数据严谨", v: 80 },
                { l: "抗压应变", v: 74 },
                { l: "决策表达", v: 78 },
                { l: "整体印象", v: 81 },
              ].map((d) => (
                <div key={d.l} className="glass-panel rounded-md p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{d.l}</span>
                    <span className="font-mono text-sm text-foreground">{d.v}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full gradient-primary"
                      style={{ width: `${d.v}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              AI 实时洞察
            </div>
            <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
              <li>✓ STAR 结构清晰</li>
              <li>✓ 主动给出 A/B 实验归因</li>
              <li>⚠ ROI 问题反应较慢</li>
              <li>⚠ 缺少失败项目复盘</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
