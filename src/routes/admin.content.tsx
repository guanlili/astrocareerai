import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/layouts/AdminShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";

export const Route = createFileRoute("/admin/content")({
  head: () => ({ meta: [{ title: "题库 / 内容管理 · 面镜 管理后台" }] }),
  component: ContentPage,
});

const categories = [
  { name: "互联网产品", count: 482, owner: "陈昊 等 12 位", risk: "低" as const },
  { name: "咨询 Case", count: 196, owner: "林知夏 等 6 位", risk: "低" as const },
  { name: "投行 Technical", count: 244, owner: "Marcus 等 8 位", risk: "中" as const },
  { name: "算法 / 系统设计", count: 1820, owner: "苏宁 等 22 位", risk: "低" as const },
  { name: "快消 群面", count: 138, owner: "周明远 等 5 位", risk: "低" as const },
  { name: "薪资谈判", count: 86, owner: "Anna Liu 等 3 位", risk: "高" as const },
];

function ContentPage() {
  const handleViewEntries = (name: string, count: number) => {
    toast(`分类「${name}」共 ${count} 条知识点（演示）`, {
      description: "完整题目列表、来源老师、难度分级将在正式版本中展开",
    });
  };

  return (
    <AdminShell title="题库 / 内容管理" subtitle="知识库严格按老师隔离，禁止跨老师串用">
      <div className="grid gap-4 md:grid-cols-3">
        {categories.map((c) => (
          <div key={c.name} className="glass-panel rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg font-semibold">{c.name}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{c.owner}</div>
              </div>
              <StatusBadge
                tone={c.risk === "高" ? "danger" : c.risk === "中" ? "warning" : "success"}
              >
                {c.risk}风险
              </StatusBadge>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="font-mono text-3xl font-semibold text-foreground">{c.count}</span>
              <button
                onClick={() => handleViewEntries(c.name, c.count)}
                className="text-xs text-primary-glow hover:underline"
              >
                查看条目
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 glass-panel rounded-xl p-6">
        <SectionTitle title="知识库隔离状态" desc="每位老师拥有独立 namespace，RAG 检索严禁串库" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            "陈昊·v3",
            "林知夏·v2",
            "Marcus·v4",
            "苏宁·v5",
            "周明远·v2",
            "Anna Liu·v2",
            "王雪·待训",
            "李澜·待训",
          ].map((n) => (
            <div
              key={n}
              className="flex items-center justify-between rounded-md border border-border bg-surface/40 p-3 text-sm"
            >
              <span>{n}</span>
              <StatusBadge tone={n.includes("待训") ? "warning" : "success"}>
                {n.includes("待训") ? "未上线" : "隔离正常"}
              </StatusBadge>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
