import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StudentShell } from "@/components/layouts/StudentShell";
import { StatusBadge } from "@/components/common/PanelKit";
import { useAppState, refundBooking, type Booking } from "@/mock/appStore";
import { getTeacher } from "@/mock/teachers";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "我的 · 面镜 MirrorHire" }] }),
  component: Me,
});

const tabs = ["订单", "收藏", "练习历史", "订阅", "消息", "账户"] as const;

/** 把 booking 转成订单表格行（与 seedOrders 同构）。 */
function bookingToOrderRow(b: Booking) {
  return {
    id: b.id,
    teacher: b.teacherName,
    type: (b.duration === 120 ? "1v1辅导" : "试聊") as "1v1辅导" | "试聊",
    amount: b.amount,
    status: b.status,
    date: new Date(b.createdAt).toISOString().slice(0, 10),
  };
}

function Me() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("订单");
  const st = useAppState();

  // 订单：用户下单（bookings，最新优先）+ 种子历史订单。stable 排序，SSR 安全。
  const myOrders = useMemo(() => {
    const fromBookings = st.bookings.map(bookingToOrderRow);
    const merged = [...fromBookings, ...st.seedOrders];
    return merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [st.bookings, st.seedOrders]);

  const favorites = useMemo(
    () => st.favorites.map((id) => getTeacher(id)).filter((t): t is NonNullable<typeof t> => !!t),
    [st.favorites],
  );

  // 练习历史：读 appStore.sessions（报告页通过 ensureSession 幂等登记）。按日期降序。
  const history = useMemo(
    () => [...st.sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [st.sessions],
  );

  return (
    <StudentShell>
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-6 py-8">
          <img
            src="https://api.dicebear.com/9.x/notionists/svg?seed=zhangyu"
            alt=""
            className="h-16 w-16 rounded-full ring-2 ring-primary/40"
          />
          <div>
            <div className="font-display text-2xl font-semibold">张雨</div>
            <div className="font-mono text-xs text-muted-foreground">
              学员 ID · S-1101 · 注册 21 天
            </div>
          </div>
          <div className="ml-auto flex gap-3">
            <StatusBadge tone="gold">高活跃</StatusBadge>
            <StatusBadge tone="info">
              已订阅 {st.subscriptions.filter((s) => s.active).length} 位老师
            </StatusBadge>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2 text-sm transition-colors ${
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 bg-primary-glow" />
              )}
            </button>
          ))}
        </div>

        {tab === "订单" && (
          <div className="glass-panel overflow-hidden rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">订单号</th>
                  <th className="px-6 py-3">老师</th>
                  <th className="px-6 py-3">类型</th>
                  <th className="px-6 py-3">金额</th>
                  <th className="px-6 py-3">状态</th>
                  <th className="px-6 py-3">日期</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-muted-foreground"
                    >
                      还没有订单，去{" "}
                      <Link to="/teachers" className="text-primary-glow hover:underline">
                        找老师
                      </Link>{" "}
                      预约第一次对练。
                    </td>
                  </tr>
                ) : (
                  myOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border/60">
                      <td className="px-6 py-3 font-mono text-xs">{o.id}</td>
                      <td className="px-6 py-3">{o.teacher}</td>
                      <td className="px-6 py-3">{o.type}</td>
                      <td className="px-6 py-3 font-mono text-gold">¥{o.amount}</td>
                      <td className="px-6 py-3">
                        <StatusBadge
                          tone={
                            o.status === "已完成"
                              ? "success"
                              : o.status === "退款" || o.status === "已退款"
                                ? "danger"
                                : o.status === "退款中"
                                  ? "warning"
                                  : "info"
                          }
                        >
                          {o.status}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {o.date}
                      </td>
                      <td className="px-6 py-3">
                        {/* 仅本人下单（BKG-*）且未完成可发起退款；种子历史订单 ORD-* 不可退 */}
                        {o.id.startsWith("BKG-") &&
                        (o.status === "已支付" || o.status === "待确认") ? (
                          <button
                            onClick={() => {
                              refundBooking(o.id);
                              toast.success("退款申请已提交", {
                                description: `${o.id} · 将进入退款流程`,
                              });
                            }}
                            className="rounded-md border border-border bg-surface/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                          >
                            申请退款
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "收藏" && (
          <div>
            {favorites.length === 0 ? (
              <div className="glass-panel rounded-xl p-10 text-center text-sm text-muted-foreground">
                还没有收藏的老师，去{" "}
                <Link to="/teachers" className="text-primary-glow hover:underline">
                  找老师
                </Link>{" "}
                看看
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((t) => (
                  <Link
                    key={t.id}
                    to="/teachers/$id"
                    params={{ id: t.id }}
                    className="glass-panel rounded-xl p-5 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={t.avatar}
                        alt=""
                        className="h-12 w-12 rounded-full ring-2 ring-primary/30"
                      />
                      <div>
                        <div className="font-display text-lg font-semibold">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.title}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary-glow"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 font-mono text-xs text-muted-foreground">
                      起步价 ¥{t.startingPrice} · 评分 {t.rating}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "练习历史" && (
          <div className="glass-panel overflow-hidden rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">日期</th>
                  <th className="px-6 py-3">场景</th>
                  <th className="px-6 py-3">导师</th>
                  <th className="px-6 py-3">评分</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-muted-foreground"
                    >
                      还没有练习记录，去{" "}
                      <Link to="/teachers" className="text-primary-glow hover:underline">
                        找老师
                      </Link>{" "}
                      开始第一次 AI 对练
                    </td>
                  </tr>
                ) : (
                  history.map((h) => {
                    const isSeed = h.sessionId.startsWith("seed-");
                    return (
                      <tr
                        key={h.sessionId}
                        className="border-t border-border/60 hover:bg-accent/30"
                      >
                        <td className="px-6 py-3 font-mono text-xs">{h.date}</td>
                        <td className="px-6 py-3">{h.scene}</td>
                        <td className="px-6 py-3">{h.teacherName}</td>
                        <td className="px-6 py-3 font-mono text-gold">{h.overall}</td>
                        <td className="px-6 py-3">
                          {isSeed ? (
                            <span
                              title="演示数据，未生成完整报告"
                              className="cursor-not-allowed text-muted-foreground/60"
                            >
                              查看报告 →
                            </span>
                          ) : (
                            <Link
                              to="/report/$sessionId"
                              params={{ sessionId: h.sessionId }}
                              className="text-primary-glow hover:underline"
                            >
                              查看报告 →
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "订阅" && (
          <div className="grid gap-4 md:grid-cols-3">
            {["陈昊", "苏宁", "Anna Liu"].map((n) => (
              <div key={n} className="glass-panel rounded-xl p-5">
                <div className="text-sm text-muted-foreground">AI 分身 · 月订阅</div>
                <div className="mt-1 font-display text-lg font-semibold">{n}</div>
                <div className="mt-3 font-mono text-2xl text-gold">¥99/月</div>
                <div className="mt-2 font-mono text-xs text-muted-foreground">
                  下次扣费 2026-07-12
                </div>
                <button
                  onClick={() => toast("订阅管理功能演示中")}
                  className="mt-4 w-full rounded-md border border-border bg-surface/60 py-2 text-sm hover:bg-accent/30"
                >
                  管理订阅
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "消息" && (
          <div className="glass-panel divide-y divide-border rounded-xl">
            {[
              {
                from: "陈昊老师",
                msg: "我看到你昨天的报告，ROI 决策那块可以再练，建议预约一次 2h。",
                time: "10 分钟前",
              },
              {
                from: "系统",
                msg: "你的订单 ORD-90205 老师已确认时段，请按时进入会议。",
                time: "1 小时前",
              },
              {
                from: "面镜助手",
                msg: "本周完成了 7 次练习，综合评分 +6，继续保持。",
                time: "昨天",
              },
            ].map((m, i) => (
              <div key={i} className="flex gap-4 p-5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/20 font-mono text-xs text-primary-glow">
                  {m.from[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{m.from}</span>
                    <span className="font-mono text-xs text-muted-foreground">{m.time}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.msg}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "账户" && (
          <div className="glass-panel rounded-xl p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field k="昵称" v="张雨" />
              <Field k="手机号" v="138****0211" />
              <Field k="目标行业" v="互联网产品" />
              <Field k="毕业院校" v="复旦大学 2025 届" />
            </div>
            <div className="mt-6 rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
              ⚠ 隐私授权：当前已授权陈昊老师查看你的对话记录（用于 1v1 辅导前预习）。可随时撤销。
            </div>
          </div>
        )}
      </section>
    </StudentShell>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-border bg-surface/40 p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {k}
      </div>
      <div className="mt-1 text-sm">{v}</div>
    </div>
  );
}
