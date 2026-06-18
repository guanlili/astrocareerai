import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Search, UserCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { PerspectiveSwitcher } from "./PerspectiveSwitcher";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/teachers", label: "找老师" },
  { to: "/growth", label: "成长追踪" },
  { to: "/me", label: "我的" },
] as const;

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg gradient-primary shadow-elevate">
              <span className="font-display text-base font-bold text-primary-foreground">面</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-semibold">面镜 MirrorHire</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                AI Coach × Mentor IP
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-md border border-border/80 bg-surface/60 px-3 py-1.5 text-sm text-muted-foreground md:flex">
              <Search className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">搜索老师 / 行业 / 岗位</span>
            </div>
            <PerspectiveSwitcher />
            <button className="grid h-9 w-9 place-items-center rounded-md border border-border/80 bg-surface/60 text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-md border border-border/80 bg-surface/60 text-muted-foreground hover:text-foreground">
              <UserCircle2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-24 border-t border-border/60 bg-sidebar/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-display text-lg font-semibold">面镜 MirrorHire</div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              以老师 IP 为核心的 AI 数字分身面试辅导平台。让每位求职者拥有专属导师，让优秀经验规模化传承。
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              AI 生成内容已按《暂行办法》标识
            </div>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-medium">产品</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>找老师</li>
              <li>模拟面试</li>
              <li>简历优化</li>
              <li>1v1 预约</li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-medium">公司</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>入驻老师</li>
              <li>合规与隐私</li>
              <li>联系我们</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60 py-4 text-center font-mono text-xs text-muted-foreground">
          © 2026 MirrorHire · 仅为产品原型 · Demo Only
        </div>
      </footer>
    </div>
  );
}
