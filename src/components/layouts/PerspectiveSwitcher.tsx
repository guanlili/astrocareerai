import { Link, useRouterState } from "@tanstack/react-router";
import { Users, Bot, ChevronRight } from "lucide-react";

const options = [
  { to: "/", label: "学员端", icon: "🎓" },
  { to: "/teacher", label: "老师端", icon: "🎙" },
  { to: "/admin", label: "管理后台", icon: "🛡" },
] as const;

export function PerspectiveSwitcher() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current =
    pathname.startsWith("/admin")
      ? options[2]
      : pathname.startsWith("/teacher")
      ? options[1]
      : options[0];

  return (
    <div className="group relative">
      <button className="flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm text-foreground hover:bg-primary/20">
        <span>{current.icon}</span>
        <span className="hidden font-medium md:inline">{current.label}</span>
        <ChevronRight className="h-3.5 w-3.5 rotate-90 text-muted-foreground" />
      </button>
      <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 opacity-0 shadow-elevate transition-all group-hover:visible group-hover:opacity-100">
        <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          演示视角切换
        </div>
        {options.map((o) => (
          <Link
            key={o.to}
            to={o.to}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              o.label === current.label
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <span className="text-base">{o.icon}</span>
            <span>{o.label}</span>
            {o.label === current.label && (
              <span className="ml-auto font-mono text-[10px] text-primary">当前</span>
            )}
          </Link>
        ))}
        <div className="mt-1 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
          <Users className="mr-1 inline h-3 w-3" /> 学员 ·{" "}
          <Bot className="mx-1 inline h-3 w-3" /> 老师
        </div>
      </div>
    </div>
  );
}
