import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layouts/AdminShell";
import { KpiCard, SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMockState, requestRefund, approveRefund, type OrderStatus } from "@/mock/store";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "支付与结算 · 面镜 管理后台" }] }),
  component: PaymentsPage,
});

/** 按 OrderStatus 选择 Badge 色调。 */
function statusTone(status: OrderStatus): "success" | "warning" | "danger" | "info" {
  if (status === "已完成" || status === "已支付") return "success";
  if (status === "退款" || status === "已退款") return "danger";
  if (status === "退款中") return "warning";
  if (status === "待确认") return "warning";
  return "info";
}

/** 把订单列表导出为 CSV 并触发下载。 */
function exportOrdersCsv(
  orders: {
    id: string;
    student: string;
    teacher: string;
    type: string;
    amount: number;
    status: string;
    date: string;
  }[],
) {
  const header = ["订单号", "学员", "老师", "类型", "金额", "状态", "日期"];
  const rows = orders.map((o) => [
    o.id,
    o.student,
    o.teacher,
    o.type,
    String(o.amount),
    o.status,
    o.date,
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  // BOM 保证 Excel 正确识别 UTF-8 中文
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "orders.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PaymentsPage() {
  // 反应式读取统一 Mock store：订单 / 退款状态实时联动
  const st = useMockState();
  const [reconciling, setReconciling] = useState(false);

  // KPI 由真实 orders 派生
  const kpi = useMemo(() => {
    const total = st.orders.length;
    const gmv = st.orders.reduce((s, o) => s + o.amount, 0);
    const pending = st.orders
      .filter((o) => o.status === "待确认" || o.status === "退款中")
      .reduce((s, o) => s + o.amount, 0);
    const refunded = st.orders.filter((o) => o.status === "已退款").length;
    const refundRate = total > 0 ? (refunded / total) * 100 : 0;
    return { gmv, pending, refundRate, total };
  }, [st.orders]);

  const handleRequestRefund = (id: string) => {
    requestRefund(id);
    toast(`已发起退款申请`, { description: `订单 ${id} 进入「退款中」待审批` });
  };

  const handleApproveRefund = (id: string) => {
    approveRefund(id);
    toast.success(`已退款`, { description: `订单 ${id} 已标记为「已退款」` });
  };

  const handleReconcile = () => {
    setReconciling(true);
    setTimeout(() => {
      setReconciling(false);
      toast.success("对账完成，无异常", { description: `已比对 ${st.orders.length} 单交易记录` });
    }, 800);
  };

  const handleExport = () => {
    exportOrdersCsv(st.orders);
    toast.success(`已导出 ${st.orders.length} 条订单`);
  };

  return (
    <AdminShell title="支付与结算" subtitle="订单状态机 + 定时对账双保险">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="累计 GMV"
          value={`¥${kpi.gmv.toLocaleString()}`}
          delta={`${kpi.total} 单`}
        />
        <KpiCard label="待结算" value={`¥${kpi.pending.toLocaleString()}`} delta="含退款中" />
        <KpiCard
          label="退款率"
          value={kpi.refundRate.toFixed(1)}
          unit="%"
          delta={kpi.refundRate > 0 ? "+关注" : "-健康"}
        />
        <KpiCard
          label="订单总数"
          value={String(kpi.total)}
          unit="单"
          delta={`已退款 ${st.orders.filter((o) => o.status === "已退款").length}`}
        />
      </div>

      <div className="mt-6 glass-panel overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <SectionTitle title="订单流水" />
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="rounded-md border border-border bg-surface/60 px-3 py-1.5 text-xs hover:text-foreground"
            >
              导出 CSV
            </button>
            <button
              disabled={reconciling}
              onClick={handleReconcile}
              className="rounded-md gradient-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-60"
            >
              {reconciling ? "对账中…" : "触发对账"}
            </button>
          </div>
        </div>
        {st.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="text-sm text-muted-foreground">暂无订单流水</div>
            <div className="font-mono text-xs text-muted-foreground">
              学员下单后，订单将自动出现在此处
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {st.orders.map((o) => (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="px-6 py-3 font-mono text-xs">{o.id}</td>
                    <td className="px-6 py-3">{o.student}</td>
                    <td className="px-6 py-3">{o.teacher}</td>
                    <td className="px-6 py-3">{o.type}</td>
                    <td className="px-6 py-3 text-right font-mono text-gold">
                      ¥{o.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge tone={statusTone(o.status)}>{o.status}</StatusBadge>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{o.date}</td>
                    <td className="px-6 py-3">
                      {o.status === "退款中" || o.status === "退款" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="rounded-md bg-destructive/15 px-2 py-1 text-xs text-destructive ring-1 ring-destructive/30 hover:bg-destructive/25">
                              审批退款
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                确认退款 ¥{o.amount.toLocaleString()}？
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                订单 {o.id}（{o.student} → {o.teacher}
                                ）将被标记为「已退款」，款项原路退回。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleApproveRefund(o.id)}>
                                确认退款
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : o.status === "已支付" || o.status === "待确认" ? (
                        <button
                          onClick={() => handleRequestRefund(o.id)}
                          className="rounded-md bg-warning/15 px-2 py-1 text-xs text-warning ring-1 ring-warning/30 hover:bg-warning/25"
                        >
                          退款
                        </button>
                      ) : o.status === "已退款" ? (
                        <span className="font-mono text-xs text-muted-foreground">已结案</span>
                      ) : (
                        <button
                          onClick={() =>
                            toast(`订单 ${o.id} 详情（演示）`, {
                              description: `${o.type} · ¥${o.amount.toLocaleString()}`,
                            })
                          }
                          className="text-xs text-primary-glow hover:underline"
                        >
                          详情
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        ⚠ 演示提示：退款流程为「发起退款 → 退款中 → 审批退款 → 已退款」，状态全链路联动。
      </div>
    </AdminShell>
  );
}
