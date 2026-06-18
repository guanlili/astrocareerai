import { createFileRoute } from "@tanstack/react-router";
import { StudentShell } from "@/components/layouts/StudentShell";
import { KpiCard, SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { growthTrend, reportData } from "@/mock/sessions";
import { dashboardKpis } from "@/mock/platform";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis } from "recharts";

export const Route = createFileRoute("/growth")({
  head: () => ({ meta: [{ title: "成长追踪 · 面镜 MirrorHire" }] }),
  component: GrowthPage,
});

const history = [
  { date: "2026-06-18", scene: "字节 PM 终面 · 模拟", score: 82, delta: "+6" },
  { date: "2026-06-15", scene: "腾讯 PCG 业务面", score: 76, delta: "+4" },
  { date: "2026-06-12", scene: "陈昊 · 自由问答", score: 72, delta: "+2" },
  { date: "2026-06-09", scene: "简历优化", score: 70, delta: "+5" },
  { date: "2026-06-05", scene: "首次模拟面试", score: 62, delta: "—" },
];

function GrowthPage() {
  return (
    <StudentShell>
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="font-display text-3xl font-semibold">成长追踪</h1>
          <p className="mt-2 text-sm text-muted-foreground">42 小时累计训练 · 7 次模拟面试 · 综合评分提升 20 分</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          {dashboardKpis.student.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="评分趋势" />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} domain={[50, 100]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="var(--primary-glow)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--gold)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="当前能力分布" />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={reportData.dimensions}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <Radar dataKey="score" stroke="var(--primary-glow)" fill="var(--primary)" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="glass-panel rounded-xl">
          <div className="border-b border-border/60 px-6 py-4">
            <SectionTitle title="历史练习记录" desc="点击任意一条进入对应报告" />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">日期</th>
                <th className="px-6 py-3">场景</th>
                <th className="px-6 py-3">评分</th>
                <th className="px-6 py-3">较上次</th>
                <th className="px-6 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.date} className="border-t border-border/60 hover:bg-accent/30">
                  <td className="px-6 py-3 font-mono">{h.date}</td>
                  <td className="px-6 py-3">{h.scene}</td>
                  <td className="px-6 py-3 font-mono text-gold">{h.score}</td>
                  <td className="px-6 py-3">
                    <StatusBadge tone={h.delta.startsWith("+") ? "success" : "neutral"}>{h.delta}</StatusBadge>
                  </td>
                  <td className="px-6 py-3 text-primary-glow hover:underline">查看报告 →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </StudentShell>
  );
}
