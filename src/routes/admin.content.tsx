import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/layouts/AdminShell";
import { SectionTitle, StatusBadge } from "@/components/common/PanelKit";

export const Route = createFileRoute("/admin/content")({
  head: () => ({ meta: [{ title: "题库 / 内容管理 · 面镜 管理后台" }] }),
  component: ContentPage,
});

type Entry = { q: string; from: string; level: string };
type Category = {
  name: string;
  count: number;
  owner: string;
  risk: "低" | "中" | "高";
  entries: Entry[];
};

const categories: Category[] = [
  {
    name: "互联网产品",
    count: 482,
    owner: "陈昊 等 12 位",
    risk: "低",
    entries: [
      { q: "如何定义「创作者激励是否有效」？为何不直接看 DAU？", from: "陈昊", level: "标准" },
      { q: "ROI 为负的 feature 该不该上线？如何向 leader 汇报？", from: "陈昊", level: "压力" },
    ],
  },
  {
    name: "咨询 Case",
    count: 196,
    owner: "林知夏 等 6 位",
    risk: "低",
    entries: [
      { q: "某快消品市占率下滑，请拆解原因并给出 3 个对策。", from: "林知夏", level: "标准" },
      { q: "估算某一线城市共享单车的日订单量。", from: "林知夏", level: "标准" },
    ],
  },
  {
    name: "投行 Technical",
    count: 244,
    owner: "Marcus 等 8 位",
    risk: "中",
    entries: [
      { q: "用 DCF 估值一家 SaaS 公司，关键假设有哪些？", from: "Marcus", level: "标准" },
      { q: "LBO 模型中杠杆率如何影响 IRR？", from: "Marcus", level: "压力" },
    ],
  },
  {
    name: "算法 / 系统设计",
    count: 1820,
    owner: "苏宁 等 22 位",
    risk: "低",
    entries: [
      { q: "设计一个短链服务，QPS 10k，如何保证唯一性？", from: "苏宁", level: "标准" },
      { q: "缓存击穿、穿透、雪崩的区别与对策。", from: "苏宁", level: "标准" },
    ],
  },
  {
    name: "快消 群面",
    count: 138,
    owner: "周明远 等 5 位",
    risk: "低",
    entries: [
      { q: "小组讨论：为新饮品设计上市 90 天计划。", from: "周明远", level: "标准" },
      { q: "如何在群面中展现领导力又不显强势？", from: "周明远", level: "标准" },
    ],
  },
  {
    name: "薪资谈判",
    count: 86,
    owner: "Anna Liu 等 3 位",
    risk: "高",
    entries: [
      { q: "手握竞品 offer，如何优雅地谈薪？", from: "Anna Liu", level: "标准" },
      { q: "HR 压价时的话术与底线设定。", from: "Anna Liu", level: "压力" },
    ],
  },
];

function ContentPage() {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

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
                onClick={() => toggle(c.name)}
                className="text-xs text-primary-glow hover:underline"
              >
                {expanded.has(c.name) ? "收起" : "查看条目"}
              </button>
            </div>
            {expanded.has(c.name) && (
              <ul className="mt-4 space-y-2 border-t border-border/60 pt-3">
                {c.entries.map((e, i) => (
                  <li key={i} className="text-xs">
                    <div className="text-foreground">{e.q}</div>
                    <div className="mt-0.5 font-mono text-muted-foreground">
                      来源：{e.from} · 难度：{e.level}
                    </div>
                  </li>
                ))}
                <li className="font-mono text-[10px] text-muted-foreground/70">
                  示例展示 2 条，完整 {c.count} 条在正式版分页查看
                </li>
              </ul>
            )}
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
