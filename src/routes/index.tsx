import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Target, Users, Bot, MessageSquare, Award } from "lucide-react";
import { StudentShell } from "@/components/layouts/StudentShell";
import { teachers } from "@/mock/teachers";
import { StatusBadge } from "@/components/common/PanelKit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "面镜 MirrorHire · 老师 IP × AI 数字分身面试辅导平台" },
      { name: "description", content: "找真正做过面试官的老师，AI 分身 7×24 陪练，关键时刻无缝转 1v1。" },
      { property: "og:title", content: "面镜 MirrorHire" },
      { property: "og:description", content: "老师 IP × AI 数字分身，让每位求职者拥有专属导师。" },
    ],
  }),
  component: Home,
});

function Home() {
  const featured = teachers.slice(0, 4);

  return (
    <StudentShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-primary-glow">
              <Sparkles className="h-3 w-3" /> Phase 1 · 老师 IP + AI 分身闭环
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              让每位求职者
              <br />
              拥有
              <span className="gradient-text">随身专属导师</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              入驻老师 100% 来自一线企业面试官。AI 分身基于老师专属知识库进行结构化追问，
              支持简历优化、模拟面试、能力评估，关键时刻一键转人工 1v1。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/teachers"
                className="inline-flex h-12 items-center gap-2 rounded-md gradient-primary px-6 font-medium text-primary-foreground shadow-elevate transition-transform hover:translate-y-[-1px]"
              >
                立即开始模拟面试 <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/teachers"
                className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-surface/60 px-6 text-sm text-foreground hover:bg-surface"
              >
                浏览老师库
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border/60 pt-6">
              {[
                { k: "186+", v: "认证老师" },
                { k: "12,408", v: "学员在练" },
                { k: "68%", v: "终面通过率提升" },
              ].map((s) => (
                <div key={s.k}>
                  <div className="font-mono text-2xl font-semibold text-foreground">{s.k}</div>
                  <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 仪表盘预览 */}
          <div className="relative">
            <div className="glass-panel relative rounded-2xl p-5 shadow-elevate">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <img
                    src={teachers[0].avatar}
                    alt=""
                    className="h-9 w-9 rounded-full ring-2 ring-primary/40"
                  />
                  <div>
                    <div className="text-sm font-medium">{teachers[0].name} · AI 分身</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-success">
                      ● 在线 · 模拟面试模式
                    </div>
                  </div>
                </div>
                <StatusBadge tone="gold">终面 · 字节 PM</StatusBadge>
              </div>

              <div className="mt-4 space-y-3">
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-surface-2 p-3 text-sm leading-relaxed">
                  你提到了创作者激励体系，当时怎么定义「激励是否有效」？为什么不直接看 DAU？
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-gold">
                    考察：指标拆解 · 业务理解
                  </div>
                </div>
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary/20 p-3 text-sm text-foreground">
                  我们拆成三层：激励触达率、转化率、长期留存。DAU 易受大盘扰动……
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-surface-2 p-3 text-sm leading-relaxed">
                  好。换个角度，假设留存涨 2% 但现金成本翻倍，向 leader 汇报你会怎么表达？
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-gold">
                    考察：商业 sense · 决策表达
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
                {[
                  { l: "表达逻辑", v: 88 },
                  { l: "业务理解", v: 85 },
                  { l: "抗压应变", v: 74 },
                ].map((d) => (
                  <div key={d.l} className="rounded-md bg-surface/60 p-2">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {d.l}
                    </div>
                    <div className="mt-1 font-mono text-lg font-semibold text-foreground">
                      {d.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 rounded-lg border border-gold/40 bg-gold/15 px-3 py-2 font-mono text-[11px] text-gold shadow-elevate">
              ⚡ 首字延迟 1.6s
            </div>
          </div>
        </div>
      </section>

      {/* 价值主张 */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: Bot, t: "老师专属知识库", d: "RAG 严格隔离，分身只用本人素材，不串用其他老师内容。" },
            { icon: MessageSquare, t: "动态追问 ≠ 题库", d: "AI 基于上一轮回答生成下一题，告别固定脚本。" },
            { icon: Target, t: "六维可追溯评估", d: "雷达图分数可下钻到对话片段，不是黑盒打分。" },
            { icon: Users, t: "AI + 真人闭环", d: "AI 处理 80% 重复问题，触发条件自动转人工。" },
          ].map((f) => (
            <div key={f.t} className="glass-panel rounded-xl p-5">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary-glow">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-medium">{f.t}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 老师推荐 */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-primary-glow">
              Featured Mentors · 本周精选
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              <Award className="mr-2 inline h-6 w-6 text-gold" />
              来自一线的面试官，已数字化
            </h2>
          </div>
          <Link
            to="/teachers"
            className="text-sm text-primary-glow hover:underline"
          >
            查看全部 186 位老师 →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featured.map((t) => (
            <Link
              to="/teachers/$id"
              params={{ id: t.id }}
              key={t.id}
              className="group glass-panel relative overflow-hidden rounded-xl p-5 transition-all hover:ring-1 hover:ring-primary/40"
            >
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt="" className="h-12 w-12 rounded-full ring-2 ring-primary/30" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.name}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    {t.title}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {t.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    起价
                  </div>
                  <div className="font-mono text-lg font-semibold text-gold">
                    ¥{t.startingPrice}
                    <span className="text-xs text-muted-foreground">/月</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-foreground">★ {t.rating}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {t.studentsServed}+ 学员
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </StudentShell>
  );
}
