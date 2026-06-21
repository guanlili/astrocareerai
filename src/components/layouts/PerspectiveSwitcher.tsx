import { Link, useRouterState } from "@tanstack/react-router";
import { Users, Bot, ChevronRight } from "lucide-react";

const options = [
  { to: "/", label: "学员端", icon: "🎓" },
  { to: "/teacher", label: "老师端", icon: "🎙" },
  { to: "/admin", label: "管理后台", icon: "🛡" },
] as const;

export function PerspectiveSwitcher() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = pathname.startsWith("/admin")
    ? options[2]
    : pathname.startsWith("/teacher")
      ? options[1]
      : options[0];

  return (
    <div className="group relative">
      <button
        aria-haspopup="menu"
        className="flex h-9 items-center gap-2 border-2 border-ink bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:bg-accent"
      >
        <span>{current.icon}</span>
        <span className="hidden md:inline">{current.label}</span>
        <ChevronRight className="h-3.5 w-3.5 rotate-90 text-[var(--text-muted)]" />
      </button>
      <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 border-2 border-ink bg-surface p-1.5 opacity-0 shadow-[6px_6px_0_var(--ink)] transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="px-3 py-2 font-ui text-[10px] uppercase tracking-widest text-label">
          演示视角切换
        </div>
        {options.map((o) => (
          <Link
            key={o.to}
            to={o.to}
            className={`cn flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
              o.label === current.label
                ? "bg-ink text-paper"
                : "text-[var(--text-muted)] hover:bg-accent hover:text-ink"
            }`}
          >
            <span className="text-base">{o.icon}</span>
            <span>{o.label}</span>
            {o.label === current.label && (
              <span className="ml-auto font-mono text-[10px] text-paper">当前</span>
            )}
          </Link>
        ))}
        <div className="cn mt-1 border-t-2 border-ink px-3 py-2 text-[11px] text-[var(--text-muted)]">
          <Users className="mr-1 inline h-3 w-3" /> 学员 · <Bot className="mx-1 inline h-3 w-3" /> 老师
        </div>
      </div>
    </div>
  );
}
