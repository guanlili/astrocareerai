import type { ReactNode } from "react";

// 共享键值行（teacher-portal-optimization-plan.md §4）
// 替换 teacher.index / pricing 内联 Row。variant="boxed"=带底框（pricing），
// "plain"=无框（工作台信息卡）。

export function KvRow({
  k,
  v,
  highlight,
  variant = "boxed",
}: {
  k: string;
  v: ReactNode;
  highlight?: boolean;
  variant?: "boxed" | "plain";
}) {
  if (variant === "plain") {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{k}</span>
        <span>{v}</span>
      </div>
    );
  }
  return (
    <div
      className={`mb-2 flex items-center justify-between rounded-md px-4 py-3 ${
        highlight ? "ring-1 ring-gold/40 bg-gold/10" : "bg-surface/40"
      }`}
    >
      <span className="text-sm">{k}</span>
      <span className={`font-mono ${highlight ? "text-gold" : "text-foreground"}`}>{v}</span>
    </div>
  );
}
