import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layouts/AdminShell";
import { StatusBadge } from "@/components/common/PanelKit";
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
import { useMockState, setReviewStatus } from "@/mock/store";

export const Route = createFileRoute("/admin/review")({
  head: () => ({ meta: [{ title: "老师入驻审核 · 面镜 管理后台" }] }),
  component: ReviewPage,
});

const toneMap = { pending: "warning", approved: "success", rejected: "danger" } as const;
const labelMap = { pending: "待审核", approved: "已通过", rejected: "已拒绝" } as const;

function ReviewPage() {
  // 反应式读取统一 Mock store：reviews 与 trainingJobs 联动（通过审核即排入训练队列）
  const st = useMockState();

  // 头部计数器由真实 reviews 派生
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of st.reviews) {
      if (r.status === "pending") pending += 1;
      else if (r.status === "approved") approved += 1;
      else rejected += 1;
    }
    return { pending, approved, rejected };
  }, [st.reviews]);

  const handleApprove = (id: string, name: string) => {
    setReviewStatus(id, "approved");
    toast.success(`已通过 ${name}，已排入训练队列`);
  };

  const handleReject = (id: string, name: string) => {
    setReviewStatus(id, "rejected");
    toast.error(`已拒绝 ${name} 的入驻申请`);
  };

  const handleViewMaterials = (name: string, materials: number) => {
    toast(`「${name}」已上传 ${materials} 份资质 / 素材`, {
      description: "演示：包含简历、作品集、素材授权协议等",
    });
  };

  return (
    <AdminShell title="老师入驻审核" subtitle="资质、素材授权、内容合规三重校验">
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge tone="warning">待审 {counts.pending}</StatusBadge>
        <StatusBadge tone="success">已通过 {counts.approved}</StatusBadge>
        <StatusBadge tone="danger">已拒绝 {counts.rejected}</StatusBadge>
      </div>

      {st.reviews.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-16 text-center">
          <div className="text-sm text-muted-foreground">审核队列为空</div>
          <div className="font-mono text-xs text-muted-foreground">
            当老师提交入驻申请后，将出现在此处
          </div>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">姓名</th>
                <th className="px-6 py-3">背景</th>
                <th className="px-6 py-3">素材数</th>
                <th className="px-6 py-3">提交时间</th>
                <th className="px-6 py-3">状态</th>
                <th className="px-6 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {st.reviews.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-6 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-6 py-3 font-medium">{r.name}</td>
                  <td className="px-6 py-3 text-muted-foreground">{r.title}</td>
                  <td className="px-6 py-3 font-mono">{r.materials}</td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {r.submittedAt}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge tone={toneMap[r.status]}>{labelMap[r.status]}</StatusBadge>
                  </td>
                  <td className="px-6 py-3">
                    {r.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApprove(r.id, r.name)}
                          className="rounded-md bg-success/15 px-2 py-1 text-xs text-success ring-1 ring-success/30 hover:bg-success/25"
                        >
                          通过
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="rounded-md bg-destructive/15 px-2 py-1 text-xs text-destructive ring-1 ring-destructive/30 hover:bg-destructive/25">
                              拒绝
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>拒绝「{r.name}」的入驻申请？</AlertDialogTitle>
                              <AlertDialogDescription>
                                拒绝后该申请将标记为已拒绝，老师需重新提交。此操作可在演示数据重置后恢复。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleReject(r.id, r.name)}>
                                确认拒绝
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <button
                          onClick={() => handleViewMaterials(r.name, r.materials)}
                          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          查看材料
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleViewMaterials(r.name, r.materials)}
                        className="text-xs text-primary-glow hover:underline"
                      >
                        详情
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
        ⚖ 通过前需确认老师已签署「素材使用授权协议」，明确覆盖『用于训练 AI 分身并对外服务』用途。
      </div>
    </AdminShell>
  );
}
