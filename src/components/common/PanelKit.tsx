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
    <div className="glass-panel relative overflow-hidden rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-mono text-3xl font-semibold text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {delta && (
        <div
          className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${
            positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          }`}
        >
          {delta}
        </div>
      )}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
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
    success: "bg-success/15 text-success ring-success/30",
    warning: "bg-warning/15 text-warning ring-warning/30",
    danger: "bg-destructive/15 text-destructive ring-destructive/30",
    info: "bg-primary/15 text-primary-glow ring-primary/30",
    neutral: "bg-muted text-muted-foreground ring-border",
    gold: "bg-gold/15 text-gold ring-gold/40",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ring-1 ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
