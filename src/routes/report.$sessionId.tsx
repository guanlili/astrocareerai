import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { StudentShell } from "@/components/layouts/StudentShell";
import { reportData, growthTrend } from "@/mock/sessions";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { Check, AlertTriangle, Lightbulb, Download, Share2 } from "lucide-react";

export const Route = createFileRoute("/report/$sessionId")({
  head: () => ({ meta: [{ title: "评估报告 · 面镜 MirrorHire" }] }),
  component: ReportPage,
});

function ReportPage() {
  return (
    <StudentShell>
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <StatusBadge tone="gold">第 7 次模拟面试 · 字节 PM 终面</StatusBadge>
          <h1 className="mt-3 font-display text-3xl font-semibold">
            综合评分 <span className="font-mono text-5xl text-gold">{reportData.overall}</span>
            <span className="text-lg text-muted-foreground">/100</span>
            <span className="ml-3 text-sm text-success">较上次 +6</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            本次报告基于 28 轮对话内容综合生成，所有评分均可下钻到对话片段，确保可追溯。
          </p>
          <div className="mt-5 flex gap-2">
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface/60 px-3 text-sm">
              <Download className="h-3.5 w-3.5" /> 导出 PDF
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface/60 px-3 text-sm">
              <Share2 className="h-3.5 w-3.5" /> 分享给老师
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="六维能力雷达" desc="维度由老师在工作台自定义，本次场景使用『互联网产品 · 终面』模板" />
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={reportData.dimensions}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} angle={30} />
                <Radar name="本次" dataKey="score" stroke="var(--primary-glow)" fill="var(--primary)" fillOpacity={0.45} />
                <Radar name="上次" dataKey="prev" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="能力成长曲线" desc="近 7 周综合评分趋势" />
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} domain={[50, 100]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary-glow)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--gold)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-3">
        <DimCard
          title="本次亮点"
          icon={<Check className="h-4 w-4 text-success" />}
          tone="success"
          items={reportData.highlights}
        />
        <DimCard
          title="待改进"
          icon={<AlertTriangle className="h-4 w-4 text-warning" />}
          tone="warning"
          items={reportData.weaknesses}
        />
        <DimCard
          title="老师建议"
          icon={<Lightbulb className="h-4 w-4 text-gold" />}
          tone="gold"
          items={reportData.suggestions}
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="glass-panel flex flex-col items-center gap-4 rounded-2xl p-8 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <div className="font-mono text-[11px] uppercase tracking-widest text-gold">
              老师建议直接预约 1v1
            </div>
            <h3 className="mt-2 font-display text-xl font-semibold">
              针对你的 ROI 决策表达问题，建议预约陈昊老师 2 小时深度演练
            </h3>
          </div>
          <Link
            to="/booking/$teacherId"
            params={{ teacherId: "t-001" }}
            className="inline-flex h-11 items-center rounded-md gradient-primary px-6 font-medium text-primary-foreground shadow-elevate"
          >
            查看档期 ¥1760/2h →
          </Link>
        </div>
      </section>
    </StudentShell>
  );
}

function DimCard({ title, icon, tone, items }: {
  title: string; icon: React.ReactNode; tone: "success" | "warning" | "gold"; items: string[];
}) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <StatusBadge tone={tone}>{items.length}</StatusBadge>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <span className="font-mono text-xs text-muted-foreground">{(i + 1).toString().padStart(2, "0")}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
