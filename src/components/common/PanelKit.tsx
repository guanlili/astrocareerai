import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  unit,
  delta,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  icon?: ReactNode;
}) {
  const positive = delta?.startsWith("+");
  return (
    <div className="glass-panel relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div className="font-mono text-[11px] uppercase tracking-widest text-label">{label}</div>
        {icon && <div className="text-[var(--text-muted)]">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-mono text-3xl font-bold text-ink">{value}</span>
        {unit && <span className="text-sm text-[var(--text-muted)]">{unit}</span>}
      </div>
      {delta && (
        <div
          className={`mt-2 inline-flex items-center gap-1 border-2 border-ink px-2 py-0.5 font-mono text-xs font-bold ${
            positive
              ? "bg-[var(--success)]/15 text-[var(--success)]"
              : "bg-[var(--destructive)]/15 text-[var(--destructive)]"
          }`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

export function SectionTitle({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "info" | "neutral" | "gold";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    success: "bg-[var(--success)]/20 text-[var(--success)]",
    warning: "bg-[var(--warning)]/20 text-[var(--warning)]",
    danger: "bg-[var(--destructive)]/15 text-[var(--destructive)]",
    info: "bg-accent/15 text-accent",
    neutral: "bg-surface-2 text-[var(--text-muted)]",
    gold: "bg-accent/15 text-accent",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 border-2 border-ink px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
