import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layouts/AdminShell";
import { KpiCard, SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { adminDauTrend, adminPaymentBreakdown, dashboardKpis } from "@/mock/platform";
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
import { useMockState, resetMockStore } from "@/mock/store";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "总览 · 面镜 管理后台" }] }),
  component: AdminHome,
});

const PALETTE = ["var(--primary-glow)", "var(--gold)", "var(--chart-2)", "var(--muted-foreground)"];

function AdminHome() {
  // 反应式读取统一 Mock store：GMV / 训练成功率由真实数据派生
  const st = useMockState();

  // GMV（万元）与训练成功率由真实 orders / trainingJobs 派生
  const derived = useMemo(() => {
    const gmv = st.orders.reduce((s, o) => s + o.amount, 0);
    const settled = st.trainingJobs.filter((j) => j.status === "success" || j.status === "failed");
    const success = settled.filter((j) => j.status === "success").length;
    const successRate = settled.length > 0 ? (success / settled.length) * 100 : 0;
    return { gmv, successRate };
  }, [st.orders, st.trainingJobs]);

  const handleReset = () => {
    resetMockStore();
    toast.success("已重置为初始演示数据", {
      description: "订单 / 审核 / 训练 / 合规 / 收藏 已全部恢复种子状态",
    });
  };

  // 用真实派生值替换静态 admin KPI 中的 GMV 与成功率
  const kpis = dashboardKpis.admin.map((k) => {
    if (k.label === "训练成功率") {
      return {
        ...k,
        value: derived.successRate.toFixed(1),
        delta: derived.successRate >= 90 ? "+健康" : "-偏低",
      };
    }
    if (k.label === "GMV (月)") {
      return {
        ...k,
        value: `¥${(derived.gmv / 10000).toFixed(2)}万`,
        delta: `+${st.orders.length} 单`,
      };
    }
    return k;
  });

  return (
    <AdminShell title="平台总览" subtitle="实时数据 · 14 天滚动窗口">
      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="DAU & 新增" desc="14 天滚动" />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={adminDauTrend}>
                <defs>
                  <linearGradient id="dau" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="dau"
                  stroke="var(--primary-glow)"
                  fill="url(#dau)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="newUsers"
                  stroke="var(--gold)"
                  fill="var(--gold)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="GMV 构成（月）" />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={adminPaymentBreakdown.filter((p) => p.value > 0)}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                >
                  {adminPaymentBreakdown.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }}
                  formatter={(v: number) => `¥${v.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="今日告警" />
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <StatusBadge tone="danger">P0</StatusBadge>
              <span>
                训练队列堆积 · {st.trainingJobs.filter((j) => j.status === "queued").length}{" "}
                项待处理
              </span>
            </li>
            <li className="flex items-center gap-3">
              <StatusBadge tone="warning">P1</StatusBadge>
              <span>
                {st.compliance.filter((c) => c.status === "pending").length} 条内容待合规审核
              </span>
            </li>
            <li className="flex items-center gap-3">
              <StatusBadge tone="info">P2</StatusBadge>
              <span>支付通道 Stripe 延迟 +400ms</span>
            </li>
          </ul>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="老师入驻漏斗（本周）" />
          <div className="space-y-2">
            {[
              { l: "提交申请", v: st.reviews.length, w: 100 },
              {
                l: "资质通过",
                v: st.reviews.filter((r) => r.status === "approved").length,
                w: 75,
              },
              { l: "素材上传", v: 14, w: 58 },
              {
                l: "训练成功",
                v: st.trainingJobs.filter((j) => j.status === "success").length,
                w: 50,
              },
              { l: "正式上线", v: 9, w: 38 },
            ].map((s) => (
              <div key={s.l}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{s.l}</span>
                  <span className="font-mono">{s.v}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full gradient-primary" style={{ width: `${s.w}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="训练任务（实时）" />
          <ul className="space-y-2 text-sm">
            {st.trainingJobs.slice(0, 4).map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between rounded-md border border-border bg-surface/40 p-2.5"
              >
                <span className="font-mono text-xs">
                  {j.id} · {j.teacher}
                </span>
                <StatusBadge
                  tone={
                    j.status === "success"
                      ? "success"
                      : j.status === "running"
                        ? "info"
                        : j.status === "failed"
                          ? "danger"
                          : "neutral"
                  }
                >
                  {j.status === "success"
                    ? "成功"
                    : j.status === "running"
                      ? `${j.progress}%`
                      : j.status === "failed"
                        ? "失败"
                        : "排队"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end border-t border-border/60 pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="rounded-md border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              重置演示数据
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>重置为初始演示数据？</AlertDialogTitle>
              <AlertDialogDescription>
                这将清除当前所有改动，把订单 / 审核 / 训练 / 合规 /
                收藏恢复为种子状态。此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>确认重置</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminShell>
  );
}
