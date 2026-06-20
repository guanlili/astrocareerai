import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { StudentShell } from "@/components/layouts/StudentShell";
import { getTeacher } from "@/mock/teachers";
import { StatusBadge } from "@/components/common/PanelKit";
import { Check, MessageSquare, Calendar, Star } from "lucide-react";

export const Route = createFileRoute("/teachers/$id")({
  head: ({ params }) => {
    const t = getTeacher(params.id);
    return {
      meta: [
        { title: `${t?.name ?? "老师"} · 面镜 MirrorHire` },
        { name: "description", content: t?.bio ?? "老师详情" },
      ],
    };
  },
  component: TeacherDetail,
  notFoundComponent: () => (
    <StudentShell>
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl">未找到该老师</h1>
        <Link to="/teachers" className="mt-4 inline-block text-primary-glow underline">
          返回老师列表
        </Link>
      </div>
    </StudentShell>
  ),
  loader: ({ params }) => {
    const t = getTeacher(params.id);
    if (!t) throw notFound();
    return { teacher: t };
  },
});

const reviews = [
  { name: "张同学", role: "字节 PM offer", stars: 5, content: "陈昊老师的分身追问非常真实，比我面试官还狠。重点是真的拿到 offer。", date: "2 周前" },
  { name: "Lily", role: "腾讯 PM offer", stars: 5, content: "六维评估能定位到对话片段，让我每次复盘都知道改哪里。", date: "1 个月前" },
  { name: "Marcus L.", role: "美团高级 PM", stars: 4, content: "建议增加更多硬件类岗位的案例。", date: "1 个月前" },
];

function TeacherDetail() {
  const t = getTeacher(Route.useParams().id)!; // loader 已 notFound 兜底，渲染期必存在

  return (
    <StudentShell>
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[1fr_320px]">
          <div className="flex gap-6">
            <img src={t.avatar} alt="" className="h-32 w-32 shrink-0 rounded-xl ring-2 ring-primary/40" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-semibold">{t.name}</h1>
                <StatusBadge tone="gold">已认证</StatusBadge>
                <StatusBadge tone="info">AI 分身在线</StatusBadge>
              </div>
              <div className="mt-1 text-muted-foreground">{t.title} · {t.company}</div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.tags.map((tag: string) => (
                  <span key={tag} className="rounded-full bg-accent/60 px-2.5 py-0.5 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-6 font-mono text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">综合评分</div>
                  <div className="text-2xl text-gold">★ {t.rating}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">服务学员</div>
                  <div className="text-2xl">{t.studentsServed.toLocaleString()}+</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">评价</div>
                  <div className="text-2xl">{t.reviewCount}</div>
                </div>
              </div>
            </div>
          </div>

          <aside className="glass-panel rounded-xl p-5 shadow-elevate">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              AI 分身 · 月订阅
            </div>
            <div className="mt-1 font-mono text-3xl font-semibold text-gold">
              ¥{t.startingPrice}
              <span className="text-sm text-muted-foreground">/月</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> 不限轮次对话 · 模拟面试</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> 简历优化 5 次/月</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> 六维评估报告</li>
            </ul>
            <Link
              to="/chat/$teacherId"
              params={{ teacherId: t.id }}
              className="mt-5 flex h-11 items-center justify-center gap-2 rounded-md gradient-primary font-medium text-primary-foreground shadow-elevate"
            >
              <MessageSquare className="h-4 w-4" />
              免费试聊 5 轮
            </Link>
            <Link
              to="/booking/$teacherId"
              params={{ teacherId: t.id }}
              className="mt-2 flex h-10 items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/10 text-sm text-gold"
            >
              <Calendar className="h-4 w-4" />
              预约真人 1v1 ¥{t.hourly}/h
            </Link>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <div>
            <h2 className="font-display text-xl font-semibold">老师介绍</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{t.bio}</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold">辅导亮点</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {t.highlights.map((h: string) => (
                <div key={h} className="glass-panel rounded-lg p-4 text-sm">
                  <Check className="mr-2 inline h-4 w-4 text-success" />
                  {h}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold">学员评价</h2>
            <div className="mt-4 space-y-3">
              {reviews.map((r, i) => (
                <div key={i} className="glass-panel rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.name}<span className="ml-2 text-xs text-muted-foreground">{r.role}</span></div>
                    <div className="font-mono text-xs text-muted-foreground">{r.date}</div>
                  </div>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: r.stars }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="glass-panel h-fit rounded-xl p-5">
          <div className="font-display text-base font-semibold">价格表</div>
          <div className="mt-4 space-y-3 text-sm">
            <PriceRow label="AI 分身月订阅" price={`¥${t.startingPrice}/月`} note="不限轮次" />
            <PriceRow label="单次 1v1（60min）" price={`¥${t.hourly}`} note="真人辅导" />
            <PriceRow label="Package（4 次 + AI）" price={`¥${t.packagePrice}`} note="推荐" highlight />
          </div>
          <div className="mt-5 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            ⚠ 试聊轮次：5 / 5 剩余。超出后弹出订阅引导。
          </div>
        </aside>
      </section>
    </StudentShell>
  );
}

function PriceRow({ label, price, note, highlight }: { label: string; price: string; note: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md border p-3 ${highlight ? "border-gold/40 bg-gold/10" : "border-border bg-surface/60"}`}>
      <div>
        <div className="text-sm">{label}</div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{note}</div>
      </div>
      <div className={`font-mono text-base font-semibold ${highlight ? "text-gold" : "text-foreground"}`}>{price}</div>
    </div>
  );
}
