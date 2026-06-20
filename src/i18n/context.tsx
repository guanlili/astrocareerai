// i18n 运行时：LocaleProvider + useT / useLocale（P2.5）
//
// SSR 安全：服务端固定渲染默认 locale（中文），客户端挂载后再从 localStorage / 浏览器
// 语言纠正，避免 hydration 不一致导致整页报错。切换结果持久化到 localStorage。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  detectLocale,
  dictionaries,
  interpolate,
  type Locale,
  type TKey,
} from "./dictionary";

const STORAGE_KEY = "mirrorhire:locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // 服务端 / 首帧固定中文，避免 hydration mismatch
  const [locale, setLocaleState] = useState<Locale>("zh");

  // 客户端挂载后纠正为持久化值或浏览器语言
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* 隐私模式等 → 忽略 */
    }
    const next: Locale =
      saved === "zh" || saved === "en" ? saved : detectLocale();
    if (next !== locale) setLocaleState(next);
    // 仅挂载时运行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* 忽略 */
    }
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) =>
      interpolate(dictionaries[locale][key] ?? dictionaries.zh[key] ?? key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale 必须在 <LocaleProvider> 内使用");
  return ctx;
}

/** 便捷 Hook：只取翻译函数。 */
export function useT() {
  return useLocale().t;
}
