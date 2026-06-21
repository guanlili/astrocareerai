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
  draft: { label: "草稿中", sub: "尚未发布到学生端", cls: "text-[var(--text-muted)]" },
  published: { label: "已发布", sub: "学生端可见可选", cls: "text-[var(--accent)]" },
  unpublished: { label: "已下架", sub: "学生端已不可见", cls: "text-[var(--warning)]" },
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
    <div className="flex min-h-screen w-full bg-paper">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r-2 border-ink bg-paper md:flex">
        <Link to="/teacher" className="flex h-[72px] items-center gap-3 border-b-2 border-ink px-5">
          <div className="grid h-9 w-9 place-items-center bg-accent font-cn text-sm font-bold text-white">
            面
          </div>
          <div className="leading-tight">
            <div className="font-ui text-sm font-bold text-ink">面镜 · 老师工作台</div>
            <div className="font-ui text-[10px] uppercase tracking-[0.16em] text-label">
              Mentor Studio
            </div>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((it) => {
            const active = it.exact
              ? pathname === it.to
              : pathname === it.to || pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`cn flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-ink text-paper"
                    : "text-[var(--text-muted)] hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t-2 border-ink p-4">
          <div className="border-2 border-ink bg-surface-2 p-3">
            <div className="font-ui text-[10px] uppercase tracking-widest text-label">分身状态</div>
            <div className={`cn mt-1 text-sm font-semibold ${sm.cls}`}>{sm.label}</div>
            <div className="cn mt-1 font-mono text-[11px] text-[var(--text-muted)]">{sm.sub}</div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b-2 border-ink bg-paper px-6">
          <div className="min-w-0">
            <h1 className="cn truncate font-ui text-lg font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="cn truncate font-mono text-xs text-[var(--text-muted)]">{subtitle}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {actions}
            <PerspectiveSwitcher />
          </div>
        </header>
        {/* 移动端水平导航：小屏下侧栏不可见时的替代入口，可横向滚动 */}
        <nav
          aria-label="老师工作台导航"
          className="flex gap-1.5 overflow-x-auto border-b-2 border-ink bg-paper px-5 py-2 sm:px-7 md:hidden"
        >
          {items.map((it) => {
            const active = it.exact
              ? pathname === it.to
              : pathname === it.to || pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-ink bg-surface text-[var(--text-muted)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <main className="p-5 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
