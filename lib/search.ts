import type { Title } from "./data";
export const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// اقتراحات فورية محلية: بداية العنوان ثم بداية أي كلمة ثم أي موضع ثم الفئة
export function suggest(items: Title[], q: string, max = 6): Title[] {
  const n = norm(q.trim()); if (!n) return [];
  const out: [number, Title][] = [];
  for (const it of items) { const t = norm(it.title); let sc = -1;
    if (t.startsWith(n)) sc = 0; else if (t.split(/[\s\-_.]+/).some((w) => w.startsWith(n))) sc = 1; else if (t.includes(n)) sc = 2; else if (it.category && norm(it.category).startsWith(n)) sc = 3;
    if (sc >= 0) out.push([sc, it]); }
  return out.sort((a, b) => a[0] - b[0] || a[1].title.length - b[1].title.length).slice(0, max).map((x) => x[1]);
}
