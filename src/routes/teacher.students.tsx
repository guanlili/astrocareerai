import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TeacherShell } from "@/components/layouts/TeacherShell";
import { StatusBadge } from "@/components/common/PanelKit";
import { Search, Filter, CheckCircle2 } from "lucide-react";
import { useMockState, getAppState, studentsForTeacher } from "@/mock/store";
import { getOverlay, setOverlay, type StudentOverlay } from "@/mock/studentNotes";

export const Route = createFileRoute("/teacher/students")({
  head: () => ({ meta: [{ title: "学员管理 · 面镜 老师" }] }),
  component: StudentsPage,
});

const intentLabel = { high: "高意向", medium: "中意向", low: "低活跃" } as const;
const intentTone = { high: "gold", medium: "info", low: "neutral" } as const;
type IntentFilter = "all" | "high" | "medium" | "low";

function StudentsPage() {
  // 学员名单：静态演示学员 + 订单反推的新学员（学生新预约实时出现）
  const myStudents = studentsForTeacher(useMockState(), "陈昊");
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<IntentFilter>("all");
  // overlay（备注 / 联系状态）：惰性初始化用 seed 学员，避免 useEffect 依赖 myStudents 反复重算。
  // 订单反推的新学员 id 不在其中，rows 取 overlays[id] 为 undefined → 显示默认（未联系）。
  const [overlays, setOverlays] = useState<Record<string, StudentOverlay>>(() => {
    const m: Record<string, StudentOverlay> = {};
    studentsForTeacher(getAppState(), "陈昊").forEach((s) => (m[s.id] = getOverlay(s.id)));
    return m;
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return myStudents
      .map((s) => ({ ...s, ...overlays[s.id] }))
      .filter((s) => (intent === "all" ? true : s.intent === intent))
      .filter((s) => (q ? s.name.toLowerCase().includes(q) : true));
  }, [myStudents, query, intent, overlays]);

  const highCount = myStudents.filter((s) => s.intent === "high").length;

  function patchOverlay(id: string, patch: StudentOverlay) {
    const next = setOverlay(id, patch);
    setOverlays((o) => ({ ...o, [id]: next }));
  }
  function contact(id: string, name: string) {
    patchOverlay(id, { contacted: true });
    toast.success("已记录主动联系", { description: `${name} · 老师将跟进` });
  }

  return (
    <TeacherShell title="学员管理" subtitle="对话记录的访问需要学员明确授权（合规要求）">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索学员姓名"
            className="bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-sm">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value as IntentFilter)}
            className="bg-transparent outline-none"
          >
            <option value="all">全部意向</option>
            <option value="high">高意向</option>
            <option value="medium">中意向</option>
            <option value="low">低活跃</option>
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <StatusBadge tone="gold">高意向 {highCount}</StatusBadge>
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                  没有匹配的学员
                </td>
              </tr>
            ) : (
              rows.map((s) => (
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
                    <StatusBadge tone={s.paid ? "success" : "neutral"}>
                      {s.paid ? "已付费" : "未付费"}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge tone={intentTone[s.intent]}>{intentLabel[s.intent]}</StatusBadge>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {s.lastActive}
                  </td>
                  <td className="px-6 py-3">
                    <input
                      defaultValue={s.note}
                      onBlur={(e) => patchOverlay(s.id, { note: e.target.value })}
                      placeholder="点此添加备注…"
                      className="w-36 rounded-md border border-transparent bg-transparent px-2 py-1 text-xs outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      {s.contacted ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> 已联系
                        </span>
                      ) : (
                        s.intent === "high" && (
                          <button
                            onClick={() => contact(s.id, s.name)}
                            className="rounded-md gradient-primary px-2 py-1 text-xs text-primary-foreground"
                          >
                            主动联系
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        ⚠ 合规提示：查看学员对话记录前，学员需在「我的-账户」中明确授权。未授权时显示脱敏摘要。
      </div>
    </TeacherShell>
  );
}
