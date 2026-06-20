// 语言切换器（P2.5）—— 中 / EN 二选一，接入聊天室头部
import { Languages } from "lucide-react";
import { LOCALES, type Locale } from "./dictionary";
import { useLocale } from "./context";

const LABEL: Record<Locale, string> = { zh: "中", en: "EN" };

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div
      className={`flex items-center gap-1 rounded-full border border-border bg-surface/60 p-0.5 ${className}`}
      role="group"
      aria-label={t("lang.switch")}
    >
      <Languages className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`rounded-full px-2 py-0.5 font-mono text-[11px] transition-colors ${
            locale === l
              ? "bg-primary/20 text-foreground ring-1 ring-primary/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
