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
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMockState, retryTraining, cancelTraining } from "@/mock/store";

export const Route = createFileRoute("/admin/training")({
  head: () => ({ meta: [{ title: "分身训练监控 · 面镜 管理后台" }] }),
  component: TrainingPage,
});

// 确定性伪随机（不依赖 Math.random / Date），避免 SSR 与客户端首帧水合不一致。
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// 24h 队列状态：全部由确定性 seeded 派生，渲染期无副作用
const queueByHour = Array.from({ length: 12 }, (_, i) => ({
  h: `${(i * 2).toString().padStart(2, "0")}:00`,
  queued: Math.max(1, Math.round(Math.sin(i / 2) * 4 + 6 + seeded(i + 1) * 2)),
  running: Math.max(1, Math.round(Math.cos(i / 2) * 3 + 4 + seeded(i + 20))),
  failed: Math.round(seeded(i + 40) * 2),
}));

const statusMap = {
  queued: { tone: "neutral", label: "排队中" },
  running: { tone: "info", label: "进行中" },
  success: { tone: "success", label: "成功" },
  failed: { tone: "danger", label: "失败" },
} as const;

function TrainingPage() {
  // 反应式读取统一 Mock store；任务列表随审核通过 / 重试 / 取消实时变化
  const st = useMockState();
  const [reconciling, setReconciling] = useState(false);

  // KPI 由真实 trainingJobs 派生
  const kpi = useMemo(() => {
    const jobs = st.trainingJobs;
    const total = jobs.length;
    const success = jobs.filter((j) => j.status === "success").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const queued = jobs.filter((j) => j.status === "queued").length;
    const running = jobs.filter((j) => j.status === "running").length;
    const settled = success + failed;
    const successRate = settled > 0 ? (success / settled) * 100 : 0;
    return { total, success, failed, queued, running, successRate };
  }, [st.trainingJobs]);

  const handleRetry = (id: string, teacher: string) => {
    retryTraining(id);
    toast.success(`已重新排队训练`, { description: `${teacher} 的任务已重置为进行中（50%）` });
  };

  const handleCancel = (id: string, teacher: string) => {
    cancelTraining(id);
    toast(`已取消「${teacher}」的排队任务`);
  };

  const handleView = (status: string, teacher: string, failReason?: string, progress?: number) => {
    if (status === "failed" && failReason) {
      toast.error(`${teacher} 训练失败`, { description: failReason });
    } else if (status === "running") {
      toast(`${teacher} 训练进行中`, { description: `当前进度 ${progress ?? 0}%` });
    } else if (status === "success") {
      toast.success(`${teacher} 训练已完成`);
    } else {
      toast(`${teacher} 任务排队中，等待调度`);
    }
  };

  return (
    <AdminShell title="分身训练任务监控" subtitle="保障「老师上传即用」体验的关键后台">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="训练任务" value={String(kpi.total)} unit="项" delta={`+${kpi.total}`} />
        <KpiCard
          label="成功率"
          value={kpi.successRate.toFixed(1)}
          unit="%"
          delta={kpi.successRate >= 90 ? "+良好" : "-偏低"}
        />
        <KpiCard
          label="进行中"
          value={String(kpi.running)}
          unit="项"
          delta={`成功 ${kpi.success}`}
        />
        <KpiCard
          label="队列堆积"
          value={String(kpi.queued)}
          unit="项"
          delta={`失败 ${kpi.failed}`}
        />
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
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }}
                />
                <Bar dataKey="queued" stackId="a" fill="var(--primary)" />
                <Bar dataKey="running" stackId="a" fill="var(--accent-lite)" />
                <Bar dataKey="failed" stackId="a" fill="var(--destructive)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-6">
          <SectionTitle title="成功率仪表" />
          <div className="relative mx-auto mt-4 h-44 w-44">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="var(--chart-5)" strokeWidth="10" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="var(--primary-glow)"
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${(kpi.successRate / 100) * 264} 264`}
                strokeLinecap="butt"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-mono text-4xl font-semibold text-gold">
                {kpi.successRate.toFixed(1)}%
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                成功率
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 text-center">
            <div>
              <div className="font-mono text-lg text-success">{kpi.success}</div>
              <div className="text-xs text-muted-foreground">成功</div>
            </div>
            <div>
              <div className="font-mono text-lg text-primary-glow">{kpi.running}</div>
              <div className="text-xs text-muted-foreground">进行中</div>
            </div>
            <div>
              <div className="font-mono text-lg text-destructive">{kpi.failed}</div>
              <div className="text-xs text-muted-foreground">失败</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 glass-panel overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <SectionTitle title="近期训练任务" />
          <button
            disabled={reconciling}
            onClick={() => {
              setReconciling(true);
              setTimeout(() => {
                setReconciling(false);
                toast.success("队列对账完成，无异常");
              }, 800);
            }}
            className="rounded-md border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            {reconciling ? "对账中…" : "队列对账"}
          </button>
        </div>
        {st.trainingJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="text-sm text-muted-foreground">暂无训练任务</div>
            <div className="font-mono text-xs text-muted-foreground">
              通过老师入驻审核后，训练任务将自动排入此处
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {st.trainingJobs.map((j) => {
                  const sm = statusMap[j.status];
                  return (
                    <tr key={j.id} className="border-t border-border/60">
                      <td className="px-6 py-3 font-mono text-xs">{j.id}</td>
                      <td className="px-6 py-3">{j.teacher}</td>
                      <td className="px-6 py-3">
                        <StatusBadge tone={sm.tone}>{sm.label}</StatusBadge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${j.status === "failed" ? "bg-destructive" : "gradient-primary"}`}
                            style={{ width: `${j.progress}%` }}
                          />
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {j.progress}%
                        </div>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {j.startedAt}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs">{j.duration}</td>
                      <td className="px-6 py-3 text-xs text-destructive">{j.failReason ?? "—"}</td>
                      <td className="px-6 py-3">
                        {j.status === "failed" ? (
                          <button
                            onClick={() => handleRetry(j.id, j.teacher)}
                            className="rounded-md bg-success/15 px-2 py-1 text-xs text-success ring-1 ring-success/30 hover:bg-success/25"
                          >
                            重试
                          </button>
                        ) : j.status === "queued" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="rounded-md bg-destructive/15 px-2 py-1 text-xs text-destructive ring-1 ring-destructive/30 hover:bg-destructive/25">
                                取消
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>取消「{j.teacher}」的训练任务？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  取消后该任务将从队列移除，需重新触发训练。演示数据可随时重置恢复。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>保留</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancel(j.id, j.teacher)}>
                                  确认取消
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <button
                            onClick={() =>
                              handleView(j.status, j.teacher, j.failReason, j.progress)
                            }
                            className="text-xs text-primary-glow hover:underline"
                          >
                            查看
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
