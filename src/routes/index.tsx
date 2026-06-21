import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Star, TrendingUp, CheckCircle2, GraduationCap } from "lucide-react";
import { StudentShell } from "@/components/layouts/StudentShell";
import { teachers } from "@/mock/teachers";
import { reportData, growthTrend } from "@/mock/sessions";
import { testimonials } from "@/mock/testimonials";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "面镜 MirrorHire · 老师 IP × AI 数字分身面试辅导平台" },
      {
        name: "description",
        content: "找真正做过面试官的老师，AI 分身 7×24 陪练，关键时刻无缝转 1v1。",
      },
      { property: "og:title", content: "面镜 MirrorHire" },
      { property: "og:description", content: "老师 IP × AI 数字分身，让每位求职者拥有专属导师。" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    no: "01",
    t: "老师专属知识库",
    en: "Private knowledge base",
    d: "RAG 严格隔离，分身只用本人素材，不串用其他老师内容。",
  },
  {
    no: "02",
    t: "动态追问 ≠ 题库",
    en: "Adaptive follow-ups",
    d: "AI 基于上一轮回答生成下一题，告别固定脚本，逼近真实终面压力。",
    fill: true,
  },
  {
    no: "03",
    t: "六维可追溯评估",
    en: "Traceable scoring",
    d: "雷达图分数可下钻到对话片段，不是黑盒打分。",
  },
  {
    no: "04",
    t: "AI + 真人闭环",
    en: "Human-in-the-loop",
    d: "AI 处理 80% 重复问题，触发条件自动转人工。",
  },
];

function Home() {
  const featured = teachers.slice(0, 4);
  const heroTeacher = teachers[0];

  return (
    <StudentShell>
      {/* ============================ HERO ============================ */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-20">
        <div>
          <span className="eyebrow-fill">● Phase 1 — 老师 IP × AI 分身闭环</span>
          <h1 className="mt-6 text-[clamp(40px,6.5vw,76px)] font-bold leading-[0.98] tracking-[-0.035em]">
            让每位
            <br />
            求职者拥有
            <br />
            <span className="accent">随身专属导师</span>
          </h1>
          <p className="font-cn mt-7 max-w-[520px] text-[17px] leading-[1.7] text-[var(--text-muted)]">
            入驻老师 100% 来自一线企业面试官。AI
            分身基于专属知识库结构化追问，覆盖简历优化、模拟面试与能力评估，关键时刻一键转人工 1v1。
          </p>
          <div className="btn-group mt-9">
            <Link to="/teachers" className="btn btn-accent">
              立即开始模拟面试 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/teachers" className="btn btn-paper">
              浏览老师库
            </Link>
          </div>
        </div>

        {/* demo panel — 位移衬底块 */}
        <div className="framed mt-4 lg:mt-0">
          <div className="panel">
            <div className="panel-head">
              <div className="who">
                <img src={heroTeacher.avatar} alt="" className="avatar" />
                <div>
                  <div className="nm">{heroTeacher.name} · AI 分身</div>
                  <div className="st">
                    <span className="dot" /> 在线 · 模拟面试模式
                  </div>
                </div>
              </div>
              <span className="tagchip">终面 · 字节 PM</span>
            </div>
            <div className="chat">
              <div className="bubble ai">
                做了创作者激励体系，当时怎么定义「激励是否有效」？为什么不直接看 DAU？
              </div>
              <div className="bubble me">
                我们拆成三层：激励触达率、转化率、长期留存。DAU 易受大盘扰动……
              </div>
              <div className="bubble ai">
                好。换个角度，假设留存涨 2% 但现金成本翻倍，向 leader 汇报你会怎么表达？
              </div>
            </div>
            <div className="scores">
              {reportData.dimensions.slice(0, 3).map((d) => (
                <div className="score" key={d.name}>
                  <div className="k">{d.name}</div>
                  <div className="v">{d.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================ STATS BAND ============================ */}
      <section className="stats">
        <div>
          <div className="num">
            186<span className="hl">+</span>
          </div>
          <div className="lab">认证老师 · Certified mentors</div>
        </div>
        <div>
          <div className="num">12,408</div>
          <div className="lab">学员在练 · Active learners</div>
        </div>
        <div>
          <div className="num" style={{ color: "var(--accent-lite)" }}>
            68%
          </div>
          <div className="lab">终面通过率提升 · Pass rate ↑</div>
        </div>
      </section>

      {/* ============================ TRUST ============================ */}
      <section className="trust">
        <span className="eyebrow-text" style={{ whiteSpace: "nowrap" }}>
          Mentors from
        </span>
        <div className="marks">
          <span>字节跳动</span>
          <span>腾讯</span>
          <span>阿里巴巴</span>
          <span>美团</span>
          <span>小红书</span>
          <span>快手</span>
        </div>
      </section>

      {/* ============================ FEATURES ============================ */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="sec-head">
          <h2>
            不是题库，
            <br />
            是会<span className="accent">追问</span>的真实导师
          </h2>
          <div className="eyebrow-text">04 capabilities</div>
        </div>
        <div className="fgrid">
          {FEATURES.map((f) => (
            <div className={`fcard ${f.fill ? "fill" : ""}`} key={f.no}>
              <div className="no">{f.no}</div>
              <div className="t">{f.t}</div>
              <div className="en">{f.en}</div>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================ 导师目录预览 ============================ */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="sec-head">
          <h2>
            像选课一样，
            <br />
            挑你的<span className="accent">面试教练</span>
          </h2>
          <Link to="/teachers" className="btn btn-paper hidden items-center gap-2 sm:inline-flex">
            查看全部 186 位老师 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* L-trick: 容器只给上/左边，单元格给右/下边 → 任意列数都无双线 */}
        <div className="grid grid-cols-1 border-l-2 border-t-2 border-[var(--ink)] sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((t) => (
            <Link
              to="/teachers/$id"
              params={{ id: t.id }}
              key={t.id}
              className="group flex flex-col border-b-2 border-r-2 border-[var(--ink)] p-5 transition-colors hover:bg-[var(--accent-soft)]"
            >
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt="" className="avatar" />
                <div className="min-w-0">
                  <div className="truncate font-bold">{t.name}</div>
                  <div className="truncate text-[11px] text-[var(--text-muted)]">{t.title}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="border border-[var(--ink)] px-2 py-0.5 font-ui text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-end justify-between border-t-2 border-[var(--ink)] pt-3">
                <div>
                  <div className="font-ui text-[10px] uppercase tracking-wider text-[var(--label)]">
                    起价
                  </div>
                  <div className="font-mono text-lg font-bold text-[var(--ink)]">
                    ¥{t.startingPrice}
                    <span className="text-xs text-[var(--text-muted)]">/月</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[var(--accent)] px-2 py-0.5 font-mono text-xs font-bold text-white">
                  <Star className="h-3 w-3 fill-current" /> {t.rating}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================ 进度追踪 demo ============================ */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="sec-head">
          <h2>
            每一次练习，
            <br />
            都被认真<span className="accent">量化</span>
          </h2>
          <div className="eyebrow-text">traceable progress</div>
        </div>

        <div className="grid gap-0 border-2 border-[var(--ink)] lg:grid-cols-[1.4fr_1fr]">
          {/* 维度条 */}
          <div className="border-b-2 border-[var(--ink)] p-6 lg:border-b-0 lg:border-r-2">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-lg font-bold">六维能力拆解</div>
              <span className="bg-[var(--accent)] px-3 py-1 font-mono text-xs font-bold text-white">
                综合 {reportData.overall} / 100
              </span>
            </div>
            <div className="space-y-3.5">
              {reportData.dimensions.map((d, i) => {
                const delta = d.score - d.prev;
                return (
                  <div key={d.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-cn font-medium">{d.name}</span>
                      <span className="flex items-center gap-2 font-mono">
                        <span className="text-xs text-[var(--text-muted)] line-through">
                          {d.prev}
                        </span>
                        <span className="font-bold">{d.score}</span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold ${
                            i === reportData.dimensions.length - 1
                              ? "bg-[var(--accent-lite)] text-[var(--ink)]"
                              : "bg-[var(--ink)] text-white"
                          }`}
                        >
                          +{delta}
                        </span>
                      </span>
                    </div>
                    <div className="h-3 w-full bg-[var(--surface-2)]">
                      <div className="h-full bg-[var(--accent)]" style={{ width: `${d.score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 成长曲线 + 高光 */}
          <div className="flex flex-col">
            <div className="border-b-2 border-[var(--ink)] p-6">
              <div className="flex items-center gap-2 text-lg font-bold">
                <TrendingUp className="h-5 w-5 text-[var(--accent)]" /> 七周成长曲线
              </div>
              <p className="font-cn mb-4 text-xs text-[var(--text-muted)]">每周综合分 · 持续上扬</p>
              <div className="flex h-32 items-end justify-between gap-2">
                {growthTrend.map((g, i) => (
                  <div key={g.week} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full ${
                          i === growthTrend.length - 1
                            ? "bg-[var(--accent-lite)]"
                            : "bg-[var(--ink)]"
                        }`}
                        style={{ height: `${Math.max(24, g.score)}%` }}
                        title={`${g.week}: ${g.score}`}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">{g.week}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between bg-[var(--ink)] px-4 py-2.5 text-white">
                <span className="font-cn text-xs font-medium">7 周综合分提升</span>
                <span className="font-mono text-lg font-bold text-[var(--accent-lite)]">
                  {growthTrend[0].score} → {growthTrend.at(-1)!.score}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-3 text-base font-bold">本周高光</div>
              <ul className="space-y-2.5">
                {reportData.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm leading-relaxed">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <span className="font-cn">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ 学员说 ============================ */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="sec-head">
          <h2>
            他们练着练着，
            <br />
            就拿到了 <span className="accent">offer</span>
          </h2>
          <div className="eyebrow-text">student stories</div>
        </div>

        <div className="grid grid-cols-1 border-l-2 border-t-2 border-[var(--ink)] md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((tm) => (
            <figure
              key={tm.id}
              className="flex flex-col border-b-2 border-r-2 border-[var(--ink)] p-6"
            >
              <div className="flex items-center gap-3">
                <img src={tm.avatar} alt="" className="avatar" />
                <div className="min-w-0">
                  <div className="truncate font-bold">{tm.name}</div>
                  <div className="truncate text-xs font-semibold text-[var(--accent)]">
                    {tm.company} · {tm.role}
                  </div>
                </div>
              </div>

              <blockquote className="font-cn mt-4 flex-1 text-sm leading-relaxed text-[var(--text)]">
                “{tm.quote}”
              </blockquote>

              <div className="mt-4 flex items-center justify-between border-t-2 border-[var(--ink)] pt-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[var(--text-muted)] line-through">
                    {tm.beforeScore}
                  </span>
                  <ArrowRight className="h-3 w-3 text-[var(--text-muted)]" />
                  <span className="bg-[var(--accent)] px-2 py-0.5 font-mono text-xs font-bold text-white">
                    {tm.afterScore}
                  </span>
                </div>
                <span className="border border-[var(--ink)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                  练习 {tm.weeks} 周
                </span>
              </div>
            </figure>
          ))}
        </div>
      </section>

      {/* ============================ FINAL CTA ============================ */}
      <section className="cta-band mx-auto max-w-7xl">
        <div>
          <h2>
            准备好让面试
            <br />
            不再靠运气了吗？
          </h2>
          <p>Ready to stop leaving interviews to luck? 第一场模拟面试免费。</p>
        </div>
        <Link to="/teachers" className="btn btn-hero shrink-0">
          立即开始 <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* 小注脚 */}
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-6 text-xs text-[var(--label)]">
        <GraduationCap className="h-3.5 w-3.5" /> 新用户首节模拟面试免费 · 无需下载 · 186+ 认证老师
        · 数据可复盘可追溯
      </div>
    </StudentShell>
  );
}
