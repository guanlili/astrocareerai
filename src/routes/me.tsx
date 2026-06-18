import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StudentShell } from "@/components/layouts/StudentShell";
import { orders } from "@/mock/platform";
import { StatusBadge } from "@/components/common/PanelKit";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "我的 · 面镜 MirrorHire" }] }),
  component: Me,
});

const tabs = ["订单", "订阅", "消息", "账户"] as const;

function Me() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("订单");
  const myOrders = orders.slice(0, 4);

  return (
    <StudentShell>
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-6 py-8">
          <img src="https://api.dicebear.com/9.x/notionists/svg?seed=zhangyu" alt="" className="h-16 w-16 rounded-full ring-2 ring-primary/40" />
          <div>
            <div className="font-display text-2xl font-semibold">张雨</div>
            <div className="font-mono text-xs text-muted-foreground">学员 ID · S-1101 · 注册 21 天</div>
          </div>
          <div className="ml-auto flex gap-3">
            <StatusBadge tone="gold">高活跃</StatusBadge>
            <StatusBadge tone="info">已订阅 3 位老师</StatusBadge>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-5 flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2 text-sm transition-colors ${
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-primary-glow" />}
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
                </tr>
              </thead>
              <tbody>
                {myOrders.map((o) => (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="px-6 py-3 font-mono text-xs">{o.id}</td>
                    <td className="px-6 py-3">{o.teacher}</td>
                    <td className="px-6 py-3">{o.type}</td>
                    <td className="px-6 py-3 font-mono text-gold">¥{o.amount}</td>
                    <td className="px-6 py-3">
                      <StatusBadge tone={o.status === "已完成" ? "success" : o.status === "退款" ? "danger" : "info"}>
                        {o.status}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{o.date}</td>
                  </tr>
                ))}
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
                <div className="mt-2 font-mono text-xs text-muted-foreground">下次扣费 2026-07-12</div>
                <button className="mt-4 w-full rounded-md border border-border bg-surface/60 py-2 text-sm">管理订阅</button>
              </div>
            ))}
          </div>
        )}

        {tab === "消息" && (
          <div className="glass-panel divide-y divide-border rounded-xl">
            {[
              { from: "陈昊老师", msg: "我看到你昨天的报告，ROI 决策那块可以再练，建议预约一次 2h。", time: "10 分钟前" },
              { from: "系统", msg: "你的订单 ORD-90205 老师已确认时段，请按时进入会议。", time: "1 小时前" },
              { from: "面镜助手", msg: "本周完成了 7 次练习，综合评分 +6，继续保持。", time: "昨天" },
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
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="mt-1 text-sm">{v}</div>
    </div>
  );
}
