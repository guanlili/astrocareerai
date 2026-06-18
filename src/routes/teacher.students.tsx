import { createFileRoute } from "@tanstack/react-router";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { students } from "@/mock/platform";
import { StatusBadge } from "@/components/common/PanelKit";
import { Search, Filter } from "lucide-react";

export const Route = createFileRoute("/teacher/students")({
  head: () => ({ meta: [{ title: "学员管理 · 面镜 老师" }] }),
  component: StudentsPage,
});

const intentLabel = { high: "高意向", medium: "中意向", low: "低活跃" } as const;
const intentTone = { high: "gold", medium: "info", low: "neutral" } as const;

function StudentsPage() {
  return (
    <TeacherShell title="学员管理" subtitle="对话记录的访问需要学员明确授权（合规要求）">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input placeholder="搜索学员姓名" className="bg-transparent outline-none placeholder:text-muted-foreground" />
        </div>
        <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface/60 px-3 text-sm">
          <Filter className="h-3.5 w-3.5" /> 筛选
        </button>
        <div className="ml-auto flex gap-2">
          <StatusBadge tone="gold">高意向 2</StatusBadge>
          <StatusBadge tone="info">本周新增 14</StatusBadge>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3">学员</th>
              <th className="px-6 py-3">对话轮次</th>
              <th className="px-6 py-3">付费状态</th>
              <th className="px-6 py-3">意向</th>
              <th className="px-6 py-3">最近活跃</th>
              <th className="px-6 py-3">备注</th>
              <th className="px-6 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-border/60 hover:bg-accent/30">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <img src={s.avatar} alt="" className="h-8 w-8 rounded-full" />
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{s.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3 font-mono">{s.rounds}</td>
                <td className="px-6 py-3">
                  <StatusBadge tone={s.paid ? "success" : "neutral"}>{s.paid ? "已付费" : "未付费"}</StatusBadge>
                </td>
                <td className="px-6 py-3">
                  <StatusBadge tone={intentTone[s.intent]}>{intentLabel[s.intent]}</StatusBadge>
                </td>
                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{s.lastActive}</td>
                <td className="px-6 py-3 text-xs text-muted-foreground">{s.note ?? "—"}</td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <button className="rounded-md border border-border bg-surface/60 px-2 py-1 text-xs">查看记录</button>
                    {s.intent === "high" && (
                      <button className="rounded-md gradient-primary px-2 py-1 text-xs text-primary-foreground">主动联系</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        ⚠ 合规提示：查看学员对话记录前，学员需在「我的-账户」中明确授权。未授权时显示脱敏摘要。
      </div>
    </TeacherShell>
  );
}
