import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layouts/AdminShell";
import { orders } from "@/mock/platform";
import { KpiCard, SectionTitle, StatusBadge } from "@/components/common/PanelKit";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "支付与结算 · 面镜 管理后台" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  return (
    <AdminShell title="支付与结算" subtitle="订单状态机 + 定时对账双保险">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="今日 GMV" value="¥82,460" delta="+18%" />
        <KpiCard label="待结算" value="¥204,180" delta="+6%" />
        <KpiCard label="退款率（7d）" value="1.2" unit="%" delta="-0.4pp" />
        <KpiCard label="对账异常" value="2" unit="单" delta="+1" />
      </div>

      <div className="mt-6 glass-panel overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <SectionTitle title="订单流水" />
          <div className="flex gap-2">
            <button className="rounded-md border border-border bg-surface/60 px-3 py-1.5 text-xs">导出 CSV</button>
            <button className="rounded-md gradient-primary px-3 py-1.5 text-xs text-primary-foreground">触发对账</button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3">订单号</th>
              <th className="px-6 py-3">学员</th>
              <th className="px-6 py-3">老师</th>
              <th className="px-6 py-3">类型</th>
              <th className="px-6 py-3 text-right">金额</th>
              <th className="px-6 py-3">状态</th>
              <th className="px-6 py-3">日期</th>
              <th className="px-6 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border/60">
                <td className="px-6 py-3 font-mono text-xs">{o.id}</td>
                <td className="px-6 py-3">{o.student}</td>
                <td className="px-6 py-3">{o.teacher}</td>
                <td className="px-6 py-3">{o.type}</td>
                <td className="px-6 py-3 text-right font-mono text-gold">¥{o.amount.toLocaleString()}</td>
                <td className="px-6 py-3">
                  <StatusBadge tone={o.status === "已完成" ? "success" : o.status === "退款" ? "danger" : o.status === "待确认" ? "warning" : "info"}>
                    {o.status}
                  </StatusBadge>
                </td>
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{o.date}</td>
                <td className="px-6 py-3 text-xs text-primary-glow hover:underline">详情</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        ⚠ 当前发现 2 单"支付成功但老师端未确认"，已自动加入对账队列，预计 5 分钟内补偿。
      </div>
    </AdminShell>
  );
}
