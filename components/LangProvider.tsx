"use client";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { dir, tr, type Lang } from "@/lib/i18n";
type TFn = (s: string, v?: Record<string, string | number>) => string;
const Ctx = createContext<{ lang: Lang; t: TFn; setLang: (l: Lang) => void }>({ lang: "en", t: (s) => s, setLang: () => {} });
export const useT = () => useContext(Ctx);
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
export default function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setL] = useState<Lang>("en");
  useIso(() => { const m = document.cookie.match(/(?:^|; )lang=(en|es|ar)/); const l = (m?.[1] as Lang) || "en"; setL(l); document.documentElement.lang = l; document.documentElement.dir = dir(l); }, []);
  const setLang = useCallback((l: Lang) => { document.cookie = `lang=${l};path=/;max-age=31536000;samesite=lax`; document.documentElement.lang = l; document.documentElement.dir = dir(l); setL(l); }, []);
  const t = useMemo<TFn>(() => (s, v) => tr(lang, s, v), [lang]);
  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}
