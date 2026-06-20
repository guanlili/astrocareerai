import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/layouts/AdminShell";
import { StatusBadge } from "@/components/common/PanelKit";
import { Search } from "lucide-react";
import { adminUserSummary } from "@/mock/platform";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "用户管理 · 面镜 管理后台" }] }),
  component: UsersPage,
});

type FilterKey = "全部" | "学员" | "老师" | "高价值" | "流失风险";
const FILTERS: FilterKey[] = ["全部", "学员", "老师", "高价值", "流失风险"];

function UsersPage() {
  // 本地搜索 / 筛选状态（事件中更新，不影响 SSR 首帧）
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("全部");

  // 按搜索关键字 + 筛选芯片派生
  const rows = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return adminUserSummary.filter((u) => {
      const matchKw = !kw || u.name.toLowerCase().includes(kw) || u.id.toLowerCase().includes(kw);
      const matchFilter =
        filter === "全部" ||
        (filter === "学员" && u.role === "学员") ||
        (filter === "老师" && u.role === "老师") ||
        (filter === "高价值" && u.status === "高价值") ||
        (filter === "流失风险" && u.status === "流失风险");
      return matchKw && matchFilter;
    });
  }, [search, filter]);

  const handleDetail = (name: string) => {
    toast(`用户「${name}」详情（演示）`, {
      description: "完整画像、订单、会话记录将在正式版本中展示",
    });
  };

  return (
    <AdminShell title="用户管理" subtitle="学员 / 老师 / 管理员统一视图">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索用户 ID / 姓名"
            className="w-64 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="font-mono text-xs text-muted-foreground hover:text-foreground"
              aria-label="清除搜索"
            >
              ✕
            </button>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                filter === t
                  ? "border-primary bg-primary/15"
                  : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="text-sm text-muted-foreground">未找到匹配的用户</div>
            <div className="font-mono text-xs text-muted-foreground">
              试试更换关键词或切换筛选条件
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {rows.map((u) => (
                  <tr key={u.id} className="border-t border-border/60">
                    <td className="px-6 py-3 font-mono text-xs">{u.id}</td>
                    <td className="px-6 py-3 font-medium">{u.name}</td>
                    <td className="px-6 py-3">
                      <StatusBadge tone={u.role === "老师" ? "info" : "neutral"}>
                        {u.role}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gold">
                      ¥{u.spent.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {u.lastActive}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge
                        tone={
                          u.status === "高价值"
                            ? "gold"
                            : u.status === "流失风险"
                              ? "danger"
                              : "success"
                        }
                      >
                        {u.status}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDetail(u.name)}
                        className="text-xs text-primary-glow hover:underline"
                      >
                        详情 →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
