"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { dir, tr, type Lang } from "@/lib/i18n";
type TFn = (s: string, v?: Record<string, string | number>) => string;
const Ctx = createContext<{ lang: Lang; t: TFn; setLang: (l: Lang) => void }>({ lang: "en", t: (s) => s, setLang: () => {} });
export const useT = () => useContext(Ctx);
export default function LangProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const [lang, setL] = useState<Lang>(initial); const router = useRouter();
  const setLang = useCallback((l: Lang) => {
    document.cookie = `lang=${l};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = l; document.documentElement.dir = dir(l); setL(l); router.refresh();
  }, [router]);
  const t = useMemo<TFn>(() => (s, v) => tr(lang, s, v), [lang]);
  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}
