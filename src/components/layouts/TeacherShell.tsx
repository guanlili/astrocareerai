import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Bot,
  Users,
  Wallet,
  Calendar,
  LineChart,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { getStudio, type PublishStatus } from "@/mock/teacherStudio";
import { PerspectiveSwitcher } from "./PerspectiveSwitcher";

const items: { to: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { to: "/teacher", label: "工作台", icon: LayoutDashboard, exact: true },
  { to: "/teacher/studio", label: "分身工作室", icon: Bot },
  { to: "/teacher/students", label: "学员管理", icon: Users },
  { to: "/teacher/pricing", label: "服务定价", icon: Tag },
  { to: "/teacher/schedule", label: "档期管理", icon: Calendar },
  { to: "/teacher/analytics", label: "数据看板", icon: LineChart },
  { to: "/teacher/earnings", label: "收益结算", icon: Wallet },
] as const;

const STATUS_META: Record<PublishStatus, { label: string; sub: string; cls: string }> = {
  draft: { label: "草稿中", sub: "尚未发布到学生端", cls: "text-muted-foreground" },
  published: { label: "已发布", sub: "学生端可见可选", cls: "text-success" },
  unpublished: { label: "已下架", sub: "学生端已不可见", cls: "text-warning" },
};

export function TeacherShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // studio 状态仅在客户端读取，避免 hydration 不一致（SSR 默认 draft）。
  const [status, setStatus] = useState<PublishStatus>("draft");
  useEffect(() => setStatus(getStudio().status), []);
  const sm = STATUS_META[status];
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <Link
          to="/teacher"
          className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5"
        >
          <div className="grid h-8 w-8 place-items-center rounded-md gradient-primary">
            <span className="font-display text-sm font-bold text-primary-foreground">面</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">面镜 · 老师工作台</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Mentor Studio
            </div>
          </div>
        </Link>
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {items.map((it) => {
            const active = it.exact
              ? pathname === it.to
              : pathname === it.to || pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-md border border-gold/30 bg-gold/10 p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-gold">
              分身状态
            </div>
            <div className={`mt-1 text-sm font-medium ${sm.cls}`}>{sm.label}</div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{sm.sub}</div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/85 px-6 backdrop-blur-xl">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold">{title}</h1>
            {subtitle && (
              <p className="truncate font-mono text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {actions}
            <PerspectiveSwitcher />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
