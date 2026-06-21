import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  LayoutDashboard,
  UserCheck,
  Database,
  Users2,
  Activity,
  CreditCard,
  AlertTriangle,
  ListTodo,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { PerspectiveSwitcher } from "./PerspectiveSwitcher";
import { resetAppState } from "@/mock/appStore";
// 注：<Toaster> 已在 __root.tsx 全局挂载，各 Shell 不再重复挂载（否则 toast 会弹两遍）。

const items: { to: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { to: "/admin", label: "总览", icon: LayoutDashboard, exact: true },
  { to: "/admin/tasks", label: "运营待办", icon: ListTodo },
  { to: "/admin/review", label: "老师入驻审核", icon: UserCheck },
  { to: "/admin/content", label: "题库 / 内容管理", icon: Database },
  { to: "/admin/users", label: "用户管理", icon: Users2 },
  { to: "/admin/training", label: "分身训练监控", icon: Activity },
  { to: "/admin/payments", label: "支付与结算", icon: CreditCard },
  { to: "/admin/compliance", label: "内容合规审核", icon: AlertTriangle },
] as const;

export function AdminShell({
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
  return (
    <div className="flex min-h-screen w-full bg-paper">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r-2 border-ink bg-paper md:flex">
        <Link to="/admin" className="flex h-[72px] items-center gap-3 border-b-2 border-ink px-5">
          <div className="grid h-9 w-9 place-items-center bg-ink text-paper">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="font-ui text-sm font-bold text-ink">面镜 · 管理后台</div>
            <div className="font-ui text-[10px] uppercase tracking-[0.16em] text-accent">
              Admin Console
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
        <div className="border-t-2 border-ink p-4 font-mono text-[11px] text-[var(--text-muted)]">
          <div>env · production</div>
          <div className="mt-1">build · 2026.06.18</div>
          <button
            onClick={() => {
              resetAppState();
              toast.success("演示数据已重置", {
                description: "审核 / 训练 / 合规 / 订单状态均已回到初始状态",
              });
            }}
            className="mt-3 inline-flex items-center gap-1 border-2 border-ink bg-surface px-2.5 py-1 text-[11px] transition-colors hover:bg-accent hover:text-ink"
          >
            <RotateCcw className="h-3 w-3" /> 重置演示数据
          </button>
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
          aria-label="管理后台导航"
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
