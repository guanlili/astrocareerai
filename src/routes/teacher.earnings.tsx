import { createFileRoute } from "@tanstack/react-router";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { StatCard } from "@/components/common/StatCard";
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
import { useMockState, teacherEarnings, ordersForTeacher, commissionFor } from "@/mock/store";
import type { OrderStatus } from "@/mock/store";

export const Route = createFileRoute("/teacher/earnings")({
  head: () => ({ meta: [{ title: "收益结算 · 面镜 老师" }] }),
  component: EarningsPage,
});

const TEACHER_NAME = "陈昊";

/** 按 OrderStatus 选择 Badge 色调。退款类红色，已支付/已完成绿色，待确认/退款中琥珀色。 */
function statusTone(status: OrderStatus): "success" | "warning" | "danger" {
  if (status === "已支付" || status === "已完成") return "success";
  if (status === "退款" || status === "已退款") return "danger";
  return "warning"; // 待确认 / 退款中
}

function EarningsPage() {
  // 反应式读取统一 Mock store；SSR/首帧返回确定性 seed，hydrate 后随订单变化
  const st = useMockState();
  const e = teacherEarnings(st, TEACHER_NAME);
  const mine = ordersForTeacher(st, TEACHER_NAME);

  // 流水行：由真实订单派生 {source, gross, fee, net, status}
  // 佣金仅对已结算单（已支付/已完成）计取，与 teacherEarnings 聚合 fee 口径一致；
  // 退款类显示为负数（抵扣视图），其余未结算单佣金为 0。
  const txns = mine.map((o) => {
    const isRefund = o.status === "退款" || o.status === "已退款";
    const isSettled = o.status === "已支付" || o.status === "已完成";
    const fee = isSettled ? commissionFor(o.amount) : 0;
    return {
      id: o.id,
      date: o.date,
      source: `${o.type} · ${o.student}`,
      gross: isRefund ? -o.amount : o.amount,
      fee,
      net: isRefund ? -o.amount : o.amount - fee,
      status: o.status,
    };
  });

  // 提现弹窗内输入金额（仅在事件处理中更新，不影响 SSR）
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");

  const handleWithdraw = (ev: MouseEvent) => {
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      // 阻止 AlertDialogAction 默认关闭弹窗
      ev.preventDefault();
      toast.error("请输入有效金额");
      return;
    }
    if (amt > e.net) {
      ev.preventDefault();
      toast.error("提现金额超过可提现余额");
      return;
    }
    toast.success(`提现申请已提交，预计 T+1 到账`, {
      description: `¥${amt.toLocaleString()} 将在 1 个工作日内到账`,
    });
    setWithdrawAmount("");
  };

  return (
    <TeacherShell title="收益结算" subtitle="平台分成 15%，每月 5 日自动结算到绑定账户">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="可提现（净）" value={`¥${e.net.toLocaleString()}`} tone="gold" />
        <StatCard label="待确认 / 冻结" value={`¥${e.pending.toLocaleString()}`} />
        <StatCard label="累计成交" value={`¥${e.gross.toLocaleString()}`} />
        <StatCard label="订单数" value={e.count} tone="info" />
      </div>

      <div className="mt-6 glass-panel overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <SectionTitle title="收益流水" desc={`平台抽佣 ¥${e.fee.toLocaleString()}（15%）`} />
          {e.net <= 0 ? (
            <button
              onClick={() => toast.error("暂无可提现金额")}
              className="rounded-md gradient-primary px-4 py-2 text-sm text-primary-foreground shadow-elevate opacity-60"
            >
              提现到银行卡
            </button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="rounded-md gradient-primary px-4 py-2 text-sm text-primary-foreground shadow-elevate">
                  提现到银行卡
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>提现到银行卡</AlertDialogTitle>
                  <AlertDialogDescription>
                    当前可提现余额 ¥{e.net.toLocaleString()}。输入提现金额后提交，预计 T+1 到账。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    提现金额（¥）
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={e.net}
                    value={withdrawAmount}
                    onChange={(ev) => setWithdrawAmount(ev.target.value)}
                    placeholder={`最多 ¥${e.net.toLocaleString()}`}
                    className="rounded-md border border-border bg-surface/60 px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setWithdrawAmount("")}>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleWithdraw}>确认提现</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="text-sm text-muted-foreground">暂无收益流水</div>
            <div className="font-mono text-xs text-muted-foreground">
              当学员下单后，订单将自动出现在此处
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">流水号</th>
                <th className="px-6 py-3">日期</th>
                <th className="px-6 py-3">来源</th>
                <th className="px-6 py-3 text-right">毛收入</th>
                <th className="px-6 py-3 text-right">平台分成</th>
                <th className="px-6 py-3 text-right">净收入</th>
                <th className="px-6 py-3">状态</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-t border-border/60">
                  <td className="px-6 py-3 font-mono text-xs">{t.id}</td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{t.date}</td>
                  <td className="px-6 py-3">{t.source}</td>
                  <td className="px-6 py-3 text-right font-mono">¥{t.gross.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-mono text-muted-foreground">
                    ¥{t.fee.toLocaleString()}
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-mono ${t.net < 0 ? "text-destructive" : "text-gold"}`}
                  >
                    ¥{t.net.toLocaleString()}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge tone={statusTone(t.status)}>{t.status}</StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </TeacherShell>
  );
}
