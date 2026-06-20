import { createFileRoute } from "@tanstack/react-router";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { KpiCard, SectionTitle } from "@/components/common/PanelKit";
import { dashboardKpis, teacherDailyConversations } from "@/mock/platform";
import { useMockState, ordersForTeacher } from "@/mock/store";
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

const TEACHER_NAME = "陈昊";

// 学员满意度分布（示例数据）：appStore 暂无独立「评价」数据源（sessions.overall 是模拟评分，
// 不等价于满意度），接入真实评价体系前保持示例，避免用错语义的数据误导。
const satisfaction = [
  { name: "★★★★★", value: 168 },
  { name: "★★★★", value: 72 },
  { name: "★★★", value: 18 },
  { name: "★★", value: 6 },
];

const conv = teacherDailyConversations.map((d) => ({
  ...d,
  rate: Math.round((d.paid / d.count) * 100),
}));

const PALETTE = ["var(--gold)", "var(--primary-glow)", "var(--chart-2)", "var(--destructive)"];

function AnalyticsPage() {
  // 真实订单派生：管理端退款 / 学员下单 → 这里数字会实时变动（SSR 安全）
  const st = useMockState();
  const mine = ordersForTeacher(st, TEACHER_NAME);

  const settledCount = mine.length;
  const settledRevenue = mine
    .filter((o) => o.status === "已支付" || o.status === "已完成")
    .reduce((s, o) => s + o.amount, 0);
  const refundedAmount = mine
    .filter((o) => o.status === "退款" || o.status === "已退款")
    .reduce((s, o) => s + o.amount, 0);

  // 转化率：以本周对话付费转化均值估算（demo-derived；真实订单数据不足以独立计算）
  const totalConvs = teacherDailyConversations.reduce((s, d) => s + d.count, 0);
  const conversionRate =
    settledCount > 0 && totalConvs > 0 ? Math.round((settledCount / totalConvs) * 1000) / 10 : 0;

  // 反应式 KPI（顶部），标记 demo-derived vs 真实订单派生
  const reactiveKpis = [
    {
      label: "订单数",
      value: String(settledCount),
      unit: "单",
      delta: settledCount > 0 ? "+实时" : undefined,
    },
    {
      label: "成交额",
      value: `¥${settledRevenue.toLocaleString()}`,
      unit: "",
      delta: settledRevenue > 0 ? "+实时" : undefined,
    },
    {
      label: "退款额",
      value: `¥${refundedAmount.toLocaleString()}`,
      unit: "",
      delta: refundedAmount > 0 ? "-实时" : undefined,
    },
    { label: "订单/对话转化", value: `${conversionRate}%`, unit: "", delta: undefined },
  ];

  // 其余 KPI（今日对话 / 覆盖学员）仍为静态 demo 数据
  const staticKpis = dashboardKpis.teacher.slice(0, 2);

  return (
    <TeacherShell
      title="数据看板"
      subtitle="顶部 KPI 实时来自订单 · 趋势图为 demo 数据 · 延迟 < 5 分钟"
    >
      {/* 反应式 KPI：来自统一 Mock store 的真实订单 */}
      <div className="grid gap-4 md:grid-cols-4">
        {reactiveKpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {settledCount === 0 && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          本月暂无成交订单 — 顶部 KPI 显示为 0。学员下单或管理端开单后，此处与收益将实时联动。
        </div>
      )}

      {/* 静态 demo KPI（今日对话/覆盖学员）——平台级聚合，订单 store 无对应数据 */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {staticKpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="转人工转化率趋势" desc="demo 数据 · 平台级聚合" />
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
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--primary-glow)"
                  fill="url(#g)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="学员满意度分布" desc="示例数据 · 接入真实评价后更新" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={satisfaction}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {satisfaction.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 glass-panel rounded-xl p-6">
        <SectionTitle title="对话量 vs 付费转化" desc="demo 数据 · 平台级聚合" />
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teacherDailyConversations}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }}
              />
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
