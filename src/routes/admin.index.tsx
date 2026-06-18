import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layouts/AdminShell";
import { KpiCard, SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { adminDauTrend, adminPaymentBreakdown, dashboardKpis, trainingJobs } from "@/mock/platform";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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
  return (
    <AdminShell title="平台总览" subtitle="实时数据 · 14 天滚动窗口">
      <div className="grid gap-4 md:grid-cols-4">
        {dashboardKpis.admin.map((k) => (
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
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="dau" stroke="var(--primary-glow)" fill="url(#dau)" strokeWidth={2} />
                <Area type="monotone" dataKey="newUsers" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="GMV 构成（月）" />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={adminPaymentBreakdown.filter((p) => p.value > 0)} dataKey="value" innerRadius={60} outerRadius={110} paddingAngle={2}>
                  {adminPaymentBreakdown.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} formatter={(v: number) => `¥${v.toLocaleString()}`} />
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
              <span>训练队列堆积 · 12 项待处理</span>
            </li>
            <li className="flex items-center gap-3">
              <StatusBadge tone="warning">P1</StatusBadge>
              <span>3 条 AI 回答涉及薪资敏感词</span>
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
              { l: "提交申请", v: 24, w: 100 },
              { l: "资质通过", v: 18, w: 75 },
              { l: "素材上传", v: 14, w: 58 },
              { l: "训练成功", v: 12, w: 50 },
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
            {trainingJobs.slice(0, 4).map((j) => (
              <li key={j.id} className="flex items-center justify-between rounded-md border border-border bg-surface/40 p-2.5">
                <span className="font-mono text-xs">{j.id} · {j.teacher}</span>
                <StatusBadge
                  tone={j.status === "success" ? "success" : j.status === "running" ? "info" : j.status === "failed" ? "danger" : "neutral"}
                >
                  {j.status === "success" ? "成功" : j.status === "running" ? `${j.progress}%` : j.status === "failed" ? "失败" : "排队"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
