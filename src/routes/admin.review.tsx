import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layouts/AdminShell";
import { reviewQueue } from "@/mock/platform";
import { StatusBadge } from "@/components/common/PanelKit";

export const Route = createFileRoute("/admin/review")({
  head: () => ({ meta: [{ title: "老师入驻审核 · 面镜 管理后台" }] }),
  component: ReviewPage,
});

const toneMap = { pending: "warning", approved: "success", rejected: "danger" } as const;
const labelMap = { pending: "待审核", approved: "已通过", rejected: "已拒绝" } as const;

function ReviewPage() {
  return (
    <AdminShell title="老师入驻审核" subtitle="资质、素材授权、内容合规三重校验">
      <div className="mb-4 flex gap-2">
        <StatusBadge tone="warning">待审 2</StatusBadge>
        <StatusBadge tone="success">本月通过 28</StatusBadge>
        <StatusBadge tone="danger">本月拒绝 6</StatusBadge>
      </div>

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
            {reviewQueue.map((r) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="px-6 py-3 font-mono text-xs">{r.id}</td>
                <td className="px-6 py-3 font-medium">{r.name}</td>
                <td className="px-6 py-3 text-muted-foreground">{r.title}</td>
                <td className="px-6 py-3 font-mono">{r.materials}</td>
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{r.submittedAt}</td>
                <td className="px-6 py-3">
                  <StatusBadge tone={toneMap[r.status]}>{labelMap[r.status]}</StatusBadge>
                </td>
                <td className="px-6 py-3">
                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <button className="rounded-md bg-success/15 px-2 py-1 text-xs text-success ring-1 ring-success/30">通过</button>
                      <button className="rounded-md bg-destructive/15 px-2 py-1 text-xs text-destructive ring-1 ring-destructive/30">拒绝</button>
                      <button className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">查看材料</button>
                    </div>
                  ) : (
                    <button className="text-xs text-primary-glow hover:underline">详情</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
        ⚖ 通过前需确认老师已签署「素材使用授权协议」，明确覆盖『用于训练 AI 分身并对外服务』用途。
      </div>
    </AdminShell>
  );
}
