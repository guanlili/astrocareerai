import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { StudentShell } from "@/components/layouts/StudentShell";
import { getTeacher } from "@/mock/teachers";
import { StatusBadge } from "@/components/common/PanelKit";
import { Calendar, Clock, CreditCard, Shield } from "lucide-react";

export const Route = createFileRoute("/booking/$teacherId")({
  head: () => ({ meta: [{ title: "预约 1v1 真人辅导 · 面镜 MirrorHire" }] }),
  loader: ({ params }) => {
    const t = getTeacher(params.teacherId);
    if (!t) throw notFound();
    return { teacher: t };
  },
  component: BookingPage,
});

const slots = [
  { date: "06-19 周四", times: ["10:00", "14:00", "20:00"] },
  { date: "06-20 周五", times: ["09:00", "13:00", "—", "21:00"] },
  { date: "06-21 周六", times: ["10:00", "—", "—", "20:00"] },
  { date: "06-22 周日", times: ["10:00", "14:00", "16:00", "20:00"] },
];

function BookingPage() {
  const { teacher: t } = Route.useLoaderData();
  const [picked, setPicked] = useState("06-20 周五 · 21:00");
  const [duration, setDuration] = useState(60);

  const price = duration === 60 ? t.hourly : Math.round(t.hourly * 1.9);

  return (
    <StudentShell>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold">预约 1v1 真人辅导</h1>
        <p className="mt-2 text-sm text-muted-foreground">由 AI 分身判断你的问题超出辅导能力范围，已为你推荐老师本人。</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="glass-panel flex gap-5 rounded-xl p-5">
              <img src={t.avatar} alt="" className="h-20 w-20 rounded-lg ring-2 ring-primary/40" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-semibold">{t.name}</h2>
                  <StatusBadge tone="gold">已认证</StatusBadge>
                </div>
                <div className="text-sm text-muted-foreground">{t.title}</div>
                <div className="mt-2 flex gap-4 font-mono text-xs text-muted-foreground">
                  <span>★ {t.rating}</span><span>{t.studentsServed}+ 学员</span><span>¥{t.hourly}/h</span>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
                <Clock className="h-4 w-4" /> 时长选择
              </div>
              <div className="flex gap-2">
                {[60, 120].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                      duration === d
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-surface/60 text-muted-foreground"
                    }`}
                  >
                    {d} 分钟
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
                <Calendar className="h-4 w-4" /> 老师档期 · 接下来 4 天
              </div>
              <div className="grid grid-cols-4 gap-3">
                {slots.map((s) => (
                  <div key={s.date}>
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {s.date}
                    </div>
                    <div className="space-y-1.5">
                      {s.times.map((tm, i) => {
                        const disabled = tm === "—";
                        const id = `${s.date} · ${tm}`;
                        const sel = picked === id;
                        return (
                          <button
                            key={i}
                            disabled={disabled}
                            onClick={() => setPicked(id)}
                            className={`w-full rounded-md border px-2 py-1.5 font-mono text-sm transition-colors ${
                              disabled
                                ? "cursor-not-allowed border-border/40 bg-surface/30 text-muted-foreground/50 line-through"
                                : sel
                                ? "border-primary bg-primary/20 text-foreground"
                                : "border-border bg-surface/60 text-foreground hover:bg-primary/10"
                            }`}
                          >
                            {tm}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                ⓘ 老师档期已满时将进入候补队列，或推荐 2 位风格相近老师。
              </div>
            </div>
          </div>

          {/* 订单摘要 */}
          <aside className="glass-panel sticky top-20 h-fit rounded-xl p-5">
            <div className="font-display text-base font-semibold">订单摘要</div>
            <div className="mt-4 space-y-3 text-sm">
              <Row k="老师" v={t.name} />
              <Row k="服务" v={`1v1 真人辅导 · ${duration}min`} />
              <Row k="时段" v={picked} />
              <Row k="形式" v="腾讯会议 · 链接发邮件" />
              <Row k="小计" v={`¥${price}`} />
              <Row k="平台优惠" v="-¥0" muted />
            </div>
            <div className="my-4 border-t border-border/60" />
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted-foreground">应付</span>
              <span className="font-mono text-3xl font-semibold text-gold">¥{price}</span>
            </div>
            <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md gradient-primary font-medium text-primary-foreground shadow-elevate">
              <CreditCard className="h-4 w-4" /> 立即支付
            </button>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" /> 支付由 Stripe 担保，老师未确认时段可全额退款。
            </div>
          </aside>
        </div>
      </section>
    </StudentShell>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{v}</span>
    </div>
  );
}
