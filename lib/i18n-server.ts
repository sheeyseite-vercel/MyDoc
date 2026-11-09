import { cookies } from "next/headers";
import { parseLang, tr } from "./i18n";
export async function getT() {
  const lang = parseLang((await cookies()).get("lang")?.value);
  return { lang, t: (s: string, v?: Record<string, string | number>) => tr(lang, s, v) };
}
