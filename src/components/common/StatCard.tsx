import type { ReactNode } from "react";

// 共享统计卡（teacher-portal-optimization-plan.md §4）
// 替换 earnings 的 Card / schedule 的 stat 块。

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "gold" | "info";
}) {
  const color =
    tone === "gold" || tone === "info" ? "text-accent" : "text-ink";
  return (
    <div className="glass-panel p-5">
      <div className="font-mono text-[11px] uppercase tracking-widest text-label">{label}</div>
      <div className={`mt-2 font-mono text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
