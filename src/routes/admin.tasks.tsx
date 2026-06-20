import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronRight, Filter, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layouts/AdminShell";
import { StatusBadge } from "@/components/common/PanelKit";
import {
  approveRefund,
  retryTraining,
  setComplianceStatus,
  setReviewStatus,
  useAppState,
} from "@/mock/appStore";

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({ meta: [{ title: "运营待办 · 面镜 管理后台" }] }),
  component: AdminTasks,
});

type TaskType = "审核" | "训练" | "合规" | "退款";
type Task = {
  id: string;
  type: TaskType;
  priority: "P0" | "P1" | "P2";
  title: string;
  description: string;
  actionLabel: string;
  action: () => void;
  href: string;
};

const priorityTone = { P0: "danger", P1: "warning", P2: "info" } as const;

function AdminTasks() {
  const state = useAppState();
  const [filter, setFilter] = useState<"全部" | TaskType>("全部");

  const tasks = useMemo<Task[]>(() => {
    const reviewTasks = state.reviews
      .filter((item) => item.status === "pending")
      .map((item) => ({
        id: `review-${item.id}`,
        type: "审核" as const,
        priority: "P1" as const,
        title: `${item.name} 的导师入驻申请待审核`,
        description: `${item.title} · 已提交 ${item.materials} 份材料`,
        actionLabel: "通过审核",
        action: () => {
          setReviewStatus(item.id, "approved");
          toast.success("已通过审核", { description: "导师已自动进入分身训练队列" });
        },
        href: "/admin/review",
      }));
    const trainingTasks = state.trainingJobs
      .filter((item) => item.status === "failed" || item.status === "queued")
      .map((item) => ({
        id: `training-${item.id}`,
        type: "训练" as const,
        priority: (item.status === "failed" ? "P0" : "P1") as "P0" | "P1",
        title: `${item.teacher} 的分身训练${item.status === "failed" ? "失败" : "排队中"}`,
        description: item.failReason ?? `任务 ${item.id} 正在等待可用训练资源`,
        actionLabel: item.status === "failed" ? "重新训练" : "查看队列",
        action: () => {
          if (item.status === "failed") {
            retryTraining(item.id);
            toast.success("已重新加入训练", { description: "任务状态已更新为进行中" });
          } else {
            toast.info("已定位到训练监控", { description: "可在监控页继续处理该队列任务" });
          }
        },
        href: "/admin/training",
      }));
    const complianceTasks = state.compliance
      .filter((item) => item.status === "pending")
      .map((item) => ({
        id: `compliance-${item.id}`,
        type: "合规" as const,
        priority: (item.risk === "高"
          ? "P0"
          : item.risk === "中"
            ? "P1"
            : "P2") as Task["priority"],
        title: `${item.teacher} 的${item.type}需要处理`,
        description: item.reason,
        actionLabel: item.risk === "高" ? "立即下线" : "确认放行",
        action: () => {
          setComplianceStatus(item.id, item.risk === "高" ? "takenDown" : "allowed");
          toast.success(item.risk === "高" ? "内容已下线" : "内容已放行");
        },
        href: "/admin/compliance",
      }));
    const refundTasks = state.orders
      .filter((item) => item.status === "退款中")
      .map((item) => ({
        id: `refund-${item.id}`,
        type: "退款" as const,
        priority: "P1" as const,
        title: `${item.student} 申请退款`,
        description: `${item.id} · ${item.type} · ¥${item.amount.toLocaleString()} · 导师 ${item.teacher}`,
        actionLabel: "批准退款",
        action: () => {
          approveRefund(item.id);
          toast.success("退款已批准", { description: "订单、学员与导师收益已同步更新" });
        },
        href: "/admin/payments",
      }));
    return [...trainingTasks, ...complianceTasks, ...refundTasks, ...reviewTasks].sort((a, b) =>
      a.priority.localeCompare(b.priority),
    );
  }, [state]);

  const visible = filter === "全部" ? tasks : tasks.filter((task) => task.type === filter);
  const counts = {
    P0: tasks.filter((task) => task.priority === "P0").length,
    P1: tasks.filter((task) => task.priority === "P1").length,
  };

  return (
    <AdminShell title="运营待办" subtitle="跨审核、训练、合规与交易的统一处理队列">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="待处理总数" value={tasks.length} note="需要人工判断的任务" />
        <Metric label="高优先级" value={counts.P0} note="建议优先处理" tone="danger" />
        <Metric label="常规待办" value={counts.P1} note="本工作日内完成" tone="warning" />
      </div>

      <div className="mt-7 glass-panel rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">统一处理队列</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              处理后会同步更新对应业务页面与数据。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(["全部", "审核", "训练", "合规", "退款"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === item ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 divide-y divide-border">
          {visible.length ? (
            visible.map((task) => (
              <article
                key={task.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                    <TaskIcon type={task.type} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={priorityTone[task.priority]}>{task.priority}</StatusBadge>
                      <span className="text-xs text-muted-foreground">{task.type}</span>
                    </div>
                    <h3 className="mt-1 font-medium">{task.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 sm:self-center">
                  <button
                    onClick={task.action}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {task.actionLabel}
                  </button>
                  <Link
                    to={task.href}
                    className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    详情
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="py-16 text-center">
              <Check className="mx-auto h-8 w-8 text-success" />
              <p className="mt-3 font-medium">当前没有待处理任务</p>
              <p className="mt-1 text-sm text-muted-foreground">平台运行平稳，稍后再来看看。</p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone?: "danger" | "warning";
}) {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div
        className={`mt-2 text-3xl font-semibold tracking-tight ${tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-foreground"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

function TaskIcon({ type }: { type: TaskType }) {
  return type === "审核" ? (
    <ShieldCheck className="h-4 w-4" />
  ) : type === "退款" ? (
    <Wallet className="h-4 w-4" />
  ) : (
    <RefreshCw className="h-4 w-4" />
  );
}
