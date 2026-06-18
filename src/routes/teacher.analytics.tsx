import { createFileRoute } from "@tanstack/react-router";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { KpiCard, SectionTitle } from "@/components/common/PanelKit";
import { dashboardKpis, teacherDailyConversations } from "@/mock/platform";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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

export const Route = createFileRoute("/teacher/analytics")({
  head: () => ({ meta: [{ title: "数据看板 · 面镜 老师" }] }),
  component: AnalyticsPage,
});

const satisfaction = [
  { name: "★★★★★", value: 168 },
  { name: "★★★★", value: 72 },
  { name: "★★★", value: 18 },
  { name: "★★", value: 6 },
];

const conv = teacherDailyConversations.map((d) => ({ ...d, rate: Math.round((d.paid / d.count) * 100) }));

const PALETTE = ["var(--gold)", "var(--primary-glow)", "var(--chart-2)", "var(--destructive)"];

function AnalyticsPage() {
  return (
    <TeacherShell title="数据看板" subtitle="按日/周/月维度切换 · 数据延迟 < 5 分钟">
      <div className="grid gap-4 md:grid-cols-4">
        {dashboardKpis.teacher.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="转人工转化率趋势" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={conv}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Area type="monotone" dataKey="rate" stroke="var(--primary-glow)" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="学员满意度分布" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={satisfaction} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {satisfaction.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 glass-panel rounded-xl p-6">
        <SectionTitle title="对话量 vs 付费转化" />
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teacherDailyConversations}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="count" name="对话轮次" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paid" name="付费转化" fill="var(--gold)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </TeacherShell>
  );
}
