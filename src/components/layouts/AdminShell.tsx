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
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { PerspectiveSwitcher } from "./PerspectiveSwitcher";
import { Toaster } from "@/components/ui/sonner";
import { resetAppState } from "@/mock/appStore";

const items: { to: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { to: "/admin", label: "总览", icon: LayoutDashboard, exact: true },
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
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <Link
          to="/admin"
          className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5"
        >
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gold/15 ring-1 ring-gold/40">
            <ShieldCheck className="h-4 w-4 text-gold" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">面镜 · 管理后台</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-gold/80">
              Admin Console
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
        <div className="border-t border-sidebar-border p-4 font-mono text-[11px] text-muted-foreground">
          <div>env · production</div>
          <div className="mt-1">build · 2026.06.18</div>
          <button
            onClick={() => {
              resetAppState();
              toast.success("演示数据已重置", {
                description: "审核 / 训练 / 合规 / 订单状态均已回到初始状态",
              });
            }}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] transition-colors hover:bg-accent hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> 重置演示数据
          </button>
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

      <Toaster richColors position="top-center" />
    </div>
  );
}
