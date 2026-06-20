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
    tone === "gold" ? "text-gold" : tone === "info" ? "text-primary-glow" : "text-foreground";
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-2 font-mono text-3xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
