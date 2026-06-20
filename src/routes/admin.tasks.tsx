import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Ban,
  CreditCard,
  History,
  type LucideIcon,
} from "lucide-react";
import { AdminShell } from "@/components/layouts/AdminShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";
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
import {
  useMockState,
  setReviewStatus,
  retryTraining,
  cancelTraining,
  setComplianceStatus,
  approveRefund,
  opsTasks,
  opsTaskCounts,
  type OpsTask,
  type TaskType,
  type TaskPriority,
  type AuditAction,
} from "@/mock/store";

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({ meta: [{ title: "运营待办 · 面镜 管理后台" }] }),
  component: TasksPage,
});

// ──────────────────────────────────────────────────────────────────────────
// 静态映射（确定性，SSR 安全）
// ──────────────────────────────────────────────────────────────────────────

const PRIORITY_TONE: Record<TaskPriority, "danger" | "warning" | "info"> = {
  P0: "danger",
  P1: "warning",
  P2: "info",
};

const TYPE_META: Record<
  TaskType,
  { label: string; icon: LucideIcon; link: string; linkLabel: string }
> = {
  review: { label: "入驻审核", icon: CheckCircle2, link: "/admin/review", linkLabel: "入驻审核" },
  training: { label: "分身训练", icon: RefreshCw, link: "/admin/training", linkLabel: "训练监控" },
  compliance: {
    label: "内容合规",
    icon: ShieldCheck,
    link: "/admin/compliance",
    linkLabel: "合规审核",
  },
  refund: { label: "退款处理", icon: CreditCard, link: "/admin/payments", linkLabel: "支付结算" },
};

const TYPE_FILTERS: Array<"全部" | TaskType> = [
  "全部",
  "review",
  "training",
  "compliance",
  "refund",
];
const PRIORITY_FILTERS: Array<"全部" | TaskPriority> = ["全部", "P0", "P1", "P2"];

const AUDIT_LABEL: Record<AuditAction, string> = {
  "review.approve": "通过审核",
  "review.reject": "拒绝审核",
  "training.retry": "重试训练",
  "training.cancel": "取消训练",
  "compliance.allow": "放行合规",
  "compliance.takedown": "下线合规",
  "refund.request": "发起退款",
  "refund.approve": "批准退款",
};

const AUDIT_TONE: Record<AuditAction, "success" | "danger" | "warning"> = {
  "review.approve": "success",
  "review.reject": "danger",
  "training.retry": "success",
  "training.cancel": "danger",
  "compliance.allow": "success",
  "compliance.takedown": "danger",
  "refund.request": "warning",
  "refund.approve": "warning",
};

/** 相对时间（仅对客户端交互后产生的审计条目调用，SSR/首帧列表为空 → 无水合风险）。 */
function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

function TasksPage() {
  // 反应式读取统一 Mock store：任务列表与审计日志随各模块状态机实时联动
  const st = useMockState();
  const [typeFilter, setTypeFilter] = useState<"全部" | TaskType>("全部");
  const [priorityFilter, setPriorityFilter] = useState<"全部" | TaskPriority>("全部");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const allTasks = useMemo(() => opsTasks(st), [st]);
  const counts = useMemo(() => opsTaskCounts(st), [st]);
  const filtered = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          (typeFilter === "全部" || t.type === typeFilter) &&
          (priorityFilter === "全部" || t.priority === priorityFilter),
      ),
    [allTasks, typeFilter, priorityFilter],
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ── 动作：复用既有 store 状态机（审计由 store 内部自动记录） ──
  const handleApproveReview = (t: OpsTask) => {
    setReviewStatus(t.targetId, "approved");
    toast.success("已通过入驻申请", { description: `${t.title} · 已排入训练队列` });
  };
  const handleRejectReview = (t: OpsTask) => {
    setReviewStatus(t.targetId, "rejected");
    toast.error("已拒绝入驻申请", { description: t.title });
  };
  const handleRetry = (t: OpsTask) => {
    retryTraining(t.targetId);
    toast.success("已重新排队训练", { description: `${t.title} · 重置为进行中 50%` });
  };
  const handleCancelTraining = (t: OpsTask) => {
    cancelTraining(t.targetId);
    toast("已取消训练任务", { description: t.title });
  };
  const handleAllowCompliance = (t: OpsTask) => {
    setComplianceStatus(t.targetId, "allowed");
    toast.success("已放行合规条目", { description: t.title });
  };
  const handleTakedownCompliance = (t: OpsTask) => {
    setComplianceStatus(t.targetId, "takenDown");
    toast.error("已下线合规条目", { description: t.title });
  };
  const handleApproveRefund = (t: OpsTask) => {
    approveRefund(t.targetId);
    toast.success("已批准退款", { description: `${t.title} · 款项原路退回` });
  };

  return (
    <AdminShell title="运营待办" subtitle="统一优先级任务中心 · 审核至退款一站式处理">
      {/* 头部优先级概览 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge tone="danger">P0 紧急 · {counts.P0}</StatusBadge>
        <StatusBadge tone="warning">P1 重要 · {counts.P1}</StatusBadge>
        <StatusBadge tone="info">P2 常规 · {counts.P2}</StatusBadge>
        <StatusBadge tone="neutral">合计 · {counts.total}</StatusBadge>
        <span className="ml-1 self-center font-mono text-[11px] text-muted-foreground">
          审核 {counts.byType.review} · 训练 {counts.byType.training} · 合规{" "}
          {counts.byType.compliance} · 退款 {counts.byType.refund}
        </span>
      </div>

      {/* 筛选栏：类型 + 优先级 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          类型
        </span>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              typeFilter === t
                ? "border-primary bg-primary/15"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "全部" ? "全部" : TYPE_META[t].label}
          </button>
        ))}
        <span className="ml-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          优先级
        </span>
        {PRIORITY_FILTERS.map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              priorityFilter === p
                ? "border-primary bg-primary/15"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 任务列表（可展开上下文） */}
      {filtered.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-16 text-center">
          <CheckCircle2 className="h-8 w-8 text-success/70" />
          <div className="text-sm text-muted-foreground">
            {allTasks.length === 0 ? "当前没有待处理任务，一切就绪" : "当前筛选下没有匹配任务"}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            各模块状态变化后会自动汇入此处
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const meta = TYPE_META[t.type];
            const TypeIcon = meta.icon;
            const isOpen = expanded.has(t.id);
            return (
              <div key={t.id} className="glass-panel rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(t.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    aria-expanded={isOpen}
                  >
                    <StatusBadge tone={PRIORITY_TONE[t.priority]}>{t.priority}</StatusBadge>
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-glow">
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {meta.label}
                        </span>
                        <span className="truncate font-medium">{t.title}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t.subtitle}
                      </div>
                    </div>
                    <ChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* 主操作（无需展开即可执行） */}
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {t.type === "review" && (
                      <>
                        <button
                          onClick={() => handleApproveReview(t)}
                          className="rounded-md bg-success/15 px-2.5 py-1 text-xs text-success ring-1 ring-success/30 hover:bg-success/25"
                        >
                          通过
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="rounded-md bg-destructive/15 px-2.5 py-1 text-xs text-destructive ring-1 ring-destructive/30 hover:bg-destructive/25">
                              拒绝
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>拒绝该入驻申请？</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.title} 将被标记为已拒绝，老师需重新提交。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRejectReview(t)}>
                                确认拒绝
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    {t.type === "training" && t.priority === "P0" && (
                      <button
                        onClick={() => handleRetry(t)}
                        className="rounded-md bg-success/15 px-2.5 py-1 text-xs text-success ring-1 ring-success/30 hover:bg-success/25"
                      >
                        重试
                      </button>
                    )}
                    {t.type === "training" && t.priority !== "P0" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="rounded-md bg-destructive/15 px-2.5 py-1 text-xs text-destructive ring-1 ring-destructive/30 hover:bg-destructive/25">
                            取消
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>取消该训练任务？</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.title} 将从队列移除，需重新触发训练。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>保留</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelTraining(t)}>
                              确认取消
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {t.type === "compliance" && (
                      <>
                        <button
                          onClick={() => handleAllowCompliance(t)}
                          className="rounded-md bg-success/15 px-2.5 py-1 text-xs text-success ring-1 ring-success/30 hover:bg-success/25"
                        >
                          放行
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="rounded-md bg-destructive/15 px-2.5 py-1 text-xs text-destructive ring-1 ring-destructive/30 hover:bg-destructive/25">
                              下线
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>下线该内容？</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.title} 将不再对外展示，老师需修改后重新提交。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleTakedownCompliance(t)}>
                                确认下线
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    {t.type === "refund" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="rounded-md bg-warning/15 px-2.5 py-1 text-xs text-warning ring-1 ring-warning/30 hover:bg-warning/25">
                            批准退款
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认批准退款？</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.title} 将被标记为「已退款」，款项原路退回。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleApproveRefund(t)}>
                              确认退款
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {/* 展开上下文 */}
                {isOpen && (
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {Object.entries(t.meta).map(([k, v]) => (
                        <div
                          key={k}
                          className="rounded-md border border-border/60 bg-surface/40 px-3 py-2"
                        >
                          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {k}
                          </div>
                          <div className="mt-0.5 truncate text-sm">{v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Link
                        to={meta.link}
                        className="inline-flex items-center gap-1 text-xs text-primary-glow hover:underline"
                      >
                        前往{meta.linkLabel}
                      </Link>
                      {t.type === "training" && t.priority === "P0" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-xs text-muted-foreground hover:text-destructive">
                              <Ban className="mr-1 inline h-3 w-3" />
                              放弃该任务
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>取消该训练任务？</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.title} 将从队列移除。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>保留</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancelTraining(t)}>
                                确认取消
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 最近处理记录（审计日志） */}
      <div className="mt-8 glass-panel rounded-xl p-6">
        <SectionTitle title="最近处理记录" desc="本会话内通过待办中心或各模块完成的运营动作" />
        {st.auditLog.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
            <History className="h-4 w-4" />
            暂无处理记录，执行上方任一动作后将出现在此处
          </div>
        ) : (
          <ul className="space-y-2">
            {st.auditLog.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-md border border-border/60 bg-surface/40 px-3 py-2.5 text-sm"
              >
                <StatusBadge tone={AUDIT_TONE[a.action]}>{AUDIT_LABEL[a.action]}</StatusBadge>
                <span className="min-w-0 flex-1 truncate">{a.summary}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {relativeTime(a.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
