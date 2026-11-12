import type { Bill } from "./data";
export const CATS = [["electricity", "Electricity", "kWh"], ["water", "Water", "m³"], ["gas", "Gas", "m³"], ["internet", "Internet", ""], ["phone", "Phone", ""], ["tax", "Tax", ""], ["rent", "Rent", ""], ["other", "Other", ""]] as const;
export const ICONS: Record<string, string> = {
  electricity: "M13 2L4 14h7l-1 8 9-12h-7z", water: "M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z",
  gas: "M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z", internet: "M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5h.01",
  phone: "M7 3h10v18H7zM11 18h2", tax: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6", rent: "M4 11l8-7 8 7v9H4zM10 20v-6h4v6", other: "M4 6h16M4 12h16M4 18h10" };
export const CURRENCIES = ["EUR", "USD", "GBP", "DKK", "SEK", "NOK", "CHF", "SAR", "AED", "EGP", "MAD", "DZD", "TND"];
export const money = (n: number, cur: string, lang: string) => { try { return new Intl.NumberFormat(lang, { style: "currency", currency: cur }).format(n); } catch { return `${n.toFixed(2)} ${cur}`; } };
export const monthLabel = (p: string, lang: string, short = false) => new Date(p + "T00:00:00").toLocaleDateString(lang, short ? { month: "short" } : { month: "long", year: "numeric" });
export type Delta = { amt: number; pct: number | null; use: number | null };
// يستقبل فواتير فئة واحدة مرتبة من الأقدم للأحدث
export function deltas(asc: Bill[]) {
  const m = new Map<string, Delta>();
  asc.forEach((b, i) => { const p = asc[i - 1]; if (!p || p.currency !== b.currency) return;
    m.set(b.id, { amt: b.amount - p.amount, pct: p.amount ? ((b.amount - p.amount) / p.amount) * 100 : null, use: b.usage != null && p.usage != null ? b.usage - p.usage : null }); });
  return m;
}
export const group = (items: Bill[]) => { const g = new Map<string, Bill[]>(); items.forEach((b) => g.set(b.category, [...(g.get(b.category) ?? []), b])); return g; };
// حدّ تنبيه ارتفاع الفاتورة (نسبة مئوية، 0 = إيقاف)
export const getAlertPct = () => { try { const v = localStorage.getItem("billAlertPct"); return v == null ? 10 : Math.max(0, Number(v) || 0); } catch { return 10; } };
export const setAlertPct = (n: number) => { try { localStorage.setItem("billAlertPct", String(Math.max(0, Math.min(500, n)))); } catch { /* تجاهل */ } };
