import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/layouts/AdminShell";
import { adminUserSummary } from "@/mock/platform";
import { StatusBadge } from "@/components/common/PanelKit";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "用户管理 · 面镜 管理后台" }] }),
  component: UsersPage,
});

function UsersPage() {
  return (
    <AdminShell title="用户管理" subtitle="学员 / 老师 / 管理员统一视图">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input placeholder="搜索用户 ID / 姓名" className="w-64 bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="ml-auto flex gap-2">
          {["全部", "学员", "老师", "高价值", "流失风险"].map((t, i) => (
            <button
              key={t}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                i === 0 ? "border-primary bg-primary/15" : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3">用户 ID</th>
              <th className="px-6 py-3">姓名</th>
              <th className="px-6 py-3">角色</th>
              <th className="px-6 py-3 text-right">累计消费</th>
              <th className="px-6 py-3">最近活跃</th>
              <th className="px-6 py-3">状态</th>
              <th className="px-6 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {adminUserSummary.map((u) => (
              <tr key={u.id} className="border-t border-border/60">
                <td className="px-6 py-3 font-mono text-xs">{u.id}</td>
                <td className="px-6 py-3 font-medium">{u.name}</td>
                <td className="px-6 py-3">
                  <StatusBadge tone={u.role === "老师" ? "info" : "neutral"}>{u.role}</StatusBadge>
                </td>
                <td className="px-6 py-3 text-right font-mono text-gold">¥{u.spent.toLocaleString()}</td>
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{u.lastActive}</td>
                <td className="px-6 py-3">
                  <StatusBadge tone={u.status === "高价值" ? "gold" : u.status === "流失风险" ? "danger" : "success"}>
                    {u.status}
                  </StatusBadge>
                </td>
                <td className="px-6 py-3 text-xs text-primary-glow hover:underline">详情 →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
