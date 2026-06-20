import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { StudentShell } from "@/components/layouts/StudentShell";
import { getTeacher } from "@/mock/teachers";
import { StatusBadge } from "@/components/common/PanelKit";
import { EmptyState } from "@/components/common/EmptyState";
import { createBooking, setBookingStatus } from "@/mock/appStore";
import {
  defaultStudio,
  getStudio,
  updateStudio,
  SCHEDULE_DAYS,
  SCHEDULE_SLOTS,
  type StudioState,
} from "@/mock/teacherStudio";
import { Calendar, Clock, CreditCard, Shield, CalendarX } from "lucide-react";

export const Route = createFileRoute("/booking/$teacherId")({
  head: () => ({ meta: [{ title: "预约 1v1 真人辅导 · 面镜 MirrorHire" }] }),
  loader: ({ params }) => {
    const t = getTeacher(params.teacherId);
    if (!t) throw notFound();
    return { teacher: t };
  },
  notFoundComponent: () => (
    <StudentShell>
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl">未找到该老师</h1>
        <p className="mt-2 text-sm text-muted-foreground">可能老师已下架，或链接有误。</p>
        <Link to="/teachers" className="mt-4 inline-block text-primary-glow underline">
          返回老师列表
        </Link>
      </div>
    </StudentShell>
  ),
  component: BookingPage,
});

// 非工作室老师的合成档期：固定时段，4 个工作日可约
const FALLBACK_TIMES = ["10:00", "14:00", "16:00", "20:00"];
const WEEKDAYS = ["周一", "周二", "周三", "周四"];

function BookingPage() {
  const { teacher: t } = Route.useLoaderData();
  const navigate = useNavigate();

  // 工作室草稿：SSR/首帧用确定性 defaultStudio()，挂载后再读 localStorage 真实值
  const [studio, setStudio] = useState<StudioState>(defaultStudio());
  useEffect(() => {
    setStudio(getStudio());
  }, []);

  const isStudioTeacher = studio.profile.id === t.id;

  // 定价：工作室老师走 studio.pricing，其他老师回退 teacher.hourly
  const pricing = useMemo(() => {
    if (isStudioTeacher) {
      return {
        p60: studio.pricing.human60,
        p120: studio.pricing.human120,
        pkg: studio.pricing.packagePrice,
      };
    }
    return {
      p60: t.hourly,
      p120: Math.round(t.hourly * 1.9),
      pkg: t.packagePrice,
    };
  }, [isStudioTeacher, studio, t]);

  // 时段格子：工作室老师走真实档期 open/booked，其他老师用合成档期
  type Grid = { days: string[]; times: string[]; openKeys: Set<string>; bookedKeys: Set<string> };
  const grid: Grid = useMemo(() => {
    if (isStudioTeacher) {
      return {
        days: SCHEDULE_DAYS,
        times: SCHEDULE_SLOTS,
        openKeys: new Set(studio.schedule.open),
        bookedKeys: new Set(studio.schedule.booked),
      };
    }
    // 非工作室老师：合成「未来 4 个工作日 × 固定时段」，全部可选
    return {
      days: WEEKDAYS,
      times: FALLBACK_TIMES,
      openKeys: new Set(WEEKDAYS.flatMap((d) => FALLBACK_TIMES.map((tm) => `${d}-${tm}`))),
      bookedKeys: new Set<string>(),
    };
  }, [isStudioTeacher, studio]);

  const [duration, setDuration] = useState<60 | 120>(60);
  const [pickedKey, setPickedKey] = useState<string>("");

  const price = duration === 60 ? pricing.p60 : pricing.p120;

  // 把 "周一-10" 渲染成 "周一 10:00"（工作室 9 → 09:00）
  const slotLabel = (key: string): string => {
    const [day, hh] = key.split("-");
    const hour = parseInt(hh, 10);
    return `${day} ${isNaN(hour) ? hh : `${String(hour).padStart(2, "0")}:00`}`;
  };

  const hasOpen = grid.days.some((d) => grid.times.some((tm) => grid.openKeys.has(`${d}-${tm}`)));

  function onPay() {
    if (!pickedKey) return;
    // 下单：createBooking 默认「待确认」，这里按任务要求置为「已支付」
    const booking = createBooking({
      teacherId: t.id,
      teacherName: t.name,
      studentName: "张雨",
      slot: slotLabel(pickedKey),
      duration,
      amount: price,
    });
    setBookingStatus(booking.id, "已支付");

    // 工作室老师：把该档期从 open 移入 booked（跨端联动：教师端档期页即时反映）
    if (isStudioTeacher) {
      updateStudio({
        schedule: {
          open: studio.schedule.open.filter((k) => k !== pickedKey),
          booked: [...studio.schedule.booked, pickedKey],
        },
      });
    }

    toast.success(`下单成功，订单号 ${booking.id}`);
    navigate({ to: "/me" });
  }

  return (
    <StudentShell>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold">预约 1v1 真人辅导</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          由 AI 分身判断你的问题超出辅导能力范围，已为你推荐老师本人。
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="glass-panel flex gap-5 rounded-xl p-5">
              <img src={t.avatar} alt="" className="h-20 w-20 rounded-lg ring-2 ring-primary/40" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-semibold">{t.name}</h2>
                  <StatusBadge tone="gold">已认证</StatusBadge>
                  {isStudioTeacher && <StatusBadge tone="info">工作室档期</StatusBadge>}
                </div>
                <div className="text-sm text-muted-foreground">{t.title}</div>
                <div className="mt-2 flex gap-4 font-mono text-xs text-muted-foreground">
                  <span>★ {t.rating}</span>
                  <span>{t.studentsServed}+ 学员</span>
                  <span>¥{pricing.p60}/h</span>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
                <Clock className="h-4 w-4" /> 时长选择
              </div>
              <div className="flex gap-2">
                {([60, 120] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                      duration === d
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-surface/60 text-muted-foreground"
                    }`}
                  >
                    {d} 分钟 · ¥{d === 60 ? pricing.p60 : pricing.p120}
                  </button>
                ))}
              </div>
              <div className="mt-3 font-mono text-[11px] text-muted-foreground">
                Package（4 次 + AI）¥{pricing.pkg}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
                <Calendar className="h-4 w-4" /> 老师档期
              </div>

              {hasOpen ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
                  {grid.days.map((day) => (
                    <div key={day}>
                      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {day}
                      </div>
                      <div className="space-y-1.5">
                        {grid.times.map((tm) => {
                          const key = `${day}-${tm}`;
                          const booked = grid.bookedKeys.has(key);
                          const open = grid.openKeys.has(key);
                          const disabled = booked || !open;
                          const sel = pickedKey === key;
                          const hour = parseInt(tm, 10);
                          const label = isNaN(hour) ? tm : `${String(hour).padStart(2, "0")}:00`;
                          return (
                            <button
                              key={tm}
                              disabled={disabled}
                              onClick={() => setPickedKey(key)}
                              title={booked ? "已被预约" : open ? "可预约" : "未开放"}
                              className={`w-full rounded-md border px-2 py-1.5 font-mono text-sm transition-colors ${
                                booked
                                  ? "cursor-not-allowed border-border/40 bg-surface/30 text-muted-foreground/50 line-through"
                                  : !open
                                    ? "cursor-not-allowed border-border/30 bg-surface/20 text-muted-foreground/40"
                                    : sel
                                      ? "border-primary bg-primary/20 text-foreground"
                                      : "border-border bg-surface/60 text-foreground hover:bg-primary/10"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CalendarX className="h-8 w-8" />}
                  title="该老师暂无可约时段"
                  desc="已开放档期已满，可稍后再来或选择其他老师。"
                  action={
                    <Link
                      to="/teachers"
                      className="rounded-md gradient-primary px-4 py-2 text-sm text-primary-foreground"
                    >
                      换一位老师
                    </Link>
                  }
                />
              )}

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
              <Row k="时段" v={pickedKey ? slotLabel(pickedKey) : "未选择"} muted={!pickedKey} />
              <Row k="形式" v="腾讯会议 · 链接发邮件" />
              <Row k="小计" v={`¥${price}`} />
              <Row k="平台优惠" v="-¥0" muted />
            </div>
            <div className="my-4 border-t border-border/60" />
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted-foreground">应付</span>
              <span className="font-mono text-3xl font-semibold text-gold">¥{price}</span>
            </div>
            <button
              onClick={onPay}
              disabled={!pickedKey}
              className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md font-medium shadow-elevate transition-opacity ${
                pickedKey
                  ? "gradient-primary text-primary-foreground"
                  : "cursor-not-allowed gradient-primary text-primary-foreground opacity-50"
              }`}
            >
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
