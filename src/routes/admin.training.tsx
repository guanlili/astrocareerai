import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layouts/AdminShell";
import { trainingJobs } from "@/mock/platform";
import { KpiCard, SectionTitle, StatusBadge } from "@/components/common/PanelKit";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/training")({
  head: () => ({ meta: [{ title: "分身训练监控 · 面镜 管理后台" }] }),
  component: TrainingPage,
});

const queueByHour = Array.from({ length: 12 }, (_, i) => ({
  h: `${(i * 2).toString().padStart(2, "0")}:00`,
  queued: Math.max(1, Math.round(Math.sin(i / 2) * 4 + 6 + Math.random() * 2)),
  running: Math.max(1, Math.round(Math.cos(i / 2) * 3 + 4 + Math.random())),
  failed: Math.round(Math.random() * 2),
}));

const statusMap = {
  queued: { tone: "neutral", label: "排队中" },
  running: { tone: "info", label: "进行中" },
  success: { tone: "success", label: "成功" },
  failed: { tone: "danger", label: "失败" },
} as const;

function TrainingPage() {
  return (
    <AdminShell title="分身训练任务监控" subtitle="保障「老师上传即用」体验的关键后台">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="今日训练" value="48" unit="任务" delta="+12" />
        <KpiCard label="成功率（7 日）" value="94.2" unit="%" delta="+1.1pp" />
        <KpiCard label="平均耗时" value="22" unit="min" delta="-3min" />
        <KpiCard label="队列堆积" value="12" unit="项" delta="+4" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="24h 队列状态" desc="蓝色=排队 / 浅蓝=进行 / 红色=失败" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueByHour}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="h" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Bar dataKey="queued" stackId="a" fill="var(--primary)" />
                <Bar dataKey="running" stackId="a" fill="var(--primary-glow)" />
                <Bar dataKey="failed" stackId="a" fill="var(--destructive)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="成功率仪表" />
          <div className="relative mx-auto mt-4 h-44 w-44">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="var(--border)" strokeWidth="10" fill="none" />
              <circle
                cx="50" cy="50" r="42"
                stroke="var(--primary-glow)" strokeWidth="10" fill="none"
                strokeDasharray={`${(94.2 / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-4xl font-semibold text-gold">94.2%</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">7 日成功率</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 text-center">
            <div><div className="font-mono text-lg text-success">186</div><div className="text-xs text-muted-foreground">成功</div></div>
            <div><div className="font-mono text-lg text-primary-glow">8</div><div className="text-xs text-muted-foreground">进行中</div></div>
            <div><div className="font-mono text-lg text-destructive">11</div><div className="text-xs text-muted-foreground">失败</div></div>
          </div>
        </div>
      </div>

      <div className="mt-6 glass-panel overflow-hidden rounded-xl">
        <div className="border-b border-border/60 px-6 py-4">
          <SectionTitle title="近期训练任务" />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3">任务 ID</th>
              <th className="px-6 py-3">老师</th>
              <th className="px-6 py-3">状态</th>
              <th className="px-6 py-3 w-48">进度</th>
              <th className="px-6 py-3">开始时间</th>
              <th className="px-6 py-3">耗时</th>
              <th className="px-6 py-3">失败原因</th>
              <th className="px-6 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {trainingJobs.map((j) => {
              const sm = statusMap[j.status];
              return (
                <tr key={j.id} className="border-t border-border/60">
                  <td className="px-6 py-3 font-mono text-xs">{j.id}</td>
                  <td className="px-6 py-3">{j.teacher}</td>
                  <td className="px-6 py-3"><StatusBadge tone={sm.tone}>{sm.label}</StatusBadge></td>
                  <td className="px-6 py-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${j.status === "failed" ? "bg-destructive" : "gradient-primary"}`}
                        style={{ width: `${j.progress}%` }}
                      />
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">{j.progress}%</div>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{j.startedAt}</td>
                  <td className="px-6 py-3 font-mono text-xs">{j.duration}</td>
                  <td className="px-6 py-3 text-xs text-destructive">{j.failReason ?? "—"}</td>
                  <td className="px-6 py-3 text-xs text-primary-glow hover:underline">
                    {j.status === "failed" ? "重试" : "查看"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
