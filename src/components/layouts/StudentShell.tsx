import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Search,
  UserCircle2,
  RotateCcw,
  Home,
  Users,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { PerspectiveSwitcher } from "./PerspectiveSwitcher";
import { resetAppState } from "@/mock/appStore";
// 注：<Toaster> 已在 __root.tsx 全局挂载，各 Shell 不再重复挂载（否则 toast 会弹两遍）。

const navItems = [
  { to: "/", label: "首页", icon: Home },
  { to: "/teachers", label: "找老师", icon: Users },
  { to: "/growth", label: "成长追踪", icon: TrendingUp },
  { to: "/me", label: "我的", icon: UserCircle2 },
] as const;

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-paper pb-20 text-ink md:pb-0">
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-8 px-5 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center bg-accent font-cn text-lg font-bold text-white">
              面
            </div>
            <div className="leading-tight">
              <div className="font-ui text-[15px] font-bold tracking-tight text-ink">
                面镜 MirrorHire
              </div>
              <div className="font-ui text-[10px] uppercase tracking-[0.16em] text-label">
                AI Coach × Mentor IP
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`font-cn px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-ink text-paper"
                      : "text-[var(--text-muted)] hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 border-2 border-ink bg-surface px-3.5 py-2 text-sm text-[var(--text-muted)] md:flex">
              <Search className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">搜索老师 / 行业 / 岗位</span>
            </div>
            <PerspectiveSwitcher />
            <button className="grid h-9 w-9 place-items-center border-2 border-ink bg-surface text-[var(--text-muted)] transition-colors hover:bg-accent hover:text-ink">
              <Bell className="h-4 w-4" />
            </button>
            <button className="grid h-9 w-9 place-items-center border-2 border-ink bg-surface text-[var(--text-muted)] transition-colors hover:bg-accent hover:text-ink">
              <UserCircle2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t-2 border-ink bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-ui text-lg font-bold">面镜 MirrorHire</div>
            <p className="font-cn mt-2 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
              以老师 IP 为核心的 AI
              数字分身面试辅导平台。让每位求职者拥有专属导师，让优秀经验规模化传承。
            </p>
            <div className="mt-4 inline-flex items-center gap-2 border-2 border-ink bg-surface-2 px-3 py-1 font-ui text-[11px] uppercase tracking-wider text-ink">
              <span className="h-1.5 w-1.5 bg-accent" />
              AI 生成内容已按《暂行办法》标识
            </div>
          </div>
          <div className="font-cn text-sm">
            <div className="mb-3 font-semibold">产品</div>
            <ul className="space-y-2 text-[var(--text-muted)]">
              <li>找老师</li>
              <li>模拟面试</li>
              <li>简历优化</li>
              <li>1v1 预约</li>
            </ul>
          </div>
          <div className="font-cn text-sm">
            <div className="mb-3 font-semibold">公司</div>
            <ul className="space-y-2 text-[var(--text-muted)]">
              <li>入驻老师</li>
              <li>合规与隐私</li>
              <li>联系我们</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 border-t-2 border-ink py-4 text-center font-mono text-xs text-[var(--text-muted)] sm:flex-row sm:justify-center sm:gap-4">
          <span>© 2026 MirrorHire · 仅为产品原型 · Demo Only</span>
          <button
            onClick={() => {
              resetAppState();
              toast.success("演示数据已重置", {
                description: "收藏 / 预约 / 订单 / 审核状态均已回到初始状态",
              });
            }}
            className="inline-flex items-center gap-1 border-2 border-ink bg-surface px-2 py-1 text-[11px] text-[var(--text-muted)] transition-colors hover:bg-accent hover:text-ink"
          >
            <RotateCcw className="h-3 w-3" /> 重置演示数据
          </button>
        </div>
      </footer>

      {/* 移动端底部导航：硬边标签栏，小屏下主导航始终可用 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {navItems.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
                  active ? "bg-ink text-paper" : "text-[var(--text-muted)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
