import type { ReactNode } from "react";

// 通用空状态：图标 + 文案 + 可选行动按钮。三端共用。
export function EmptyState({
  icon,
  title,
  desc,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center border-2 border-dashed border-ink bg-surface-2 px-6 py-12 text-center ${
        className ?? ""
      }`}
    >
      {icon && <div className="text-muted-foreground/70">{icon}</div>}
      <div className="mt-3 font-medium text-foreground">{title}</div>
      {desc && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
