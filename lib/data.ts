import { supabaseBrowser } from "./supabase/client";
export type Doc = { id: string; title: string; category: string | null; issuer: string | null };
export const docsCache = new Map<string, Doc[]>();
export type AlertDoc = { id: string; title: string; expiry_date: string };
export type Due = { id: string; days_before: number; doc: { id: string; title: string } };
export const alertsCache: { docs?: AlertDoc[]; due?: Due[] } = {};
export async function loadAlerts() {
  const sb = supabaseBrowser();
  const [a, b] = await Promise.all([
    sb.from("documents").select("id,title,expiry_date").is("deleted_at", null).is("archived_at", null).not("expiry_date", "is", null).order("expiry_date"),
    sb.from("reminders").select("id,days_before,documents(id,title)").lte("remind_at", new Date().toISOString()).order("remind_at", { ascending: false }).limit(10)]);
  if (a.error) throw a.error;
  alertsCache.docs = (a.data ?? []) as AlertDoc[];
  alertsCache.due = ((b.data ?? []) as unknown as { id: string; days_before: number; documents: { id: string; title: string } | { id: string; title: string }[] | null }[])
    .map((r) => ({ id: r.id, days_before: r.days_before, doc: Array.isArray(r.documents) ? r.documents[0] : r.documents })).filter((r) => r.doc) as Due[];
  return alertsCache;
}
export type Bill = { id: string; category: string; period: string; amount: number; currency: string; usage: number | null; usage_unit: string | null; note: string | null; storage_path: string | null };
export const billsCache: { items?: Bill[] } = {};
export async function loadBills() {
  const { data, error } = await supabaseBrowser().from("bills").select("id,category,period,amount,currency,usage,usage_unit,note,storage_path").order("period", { ascending: false }).limit(1000);
  if (error) throw error;
  billsCache.items = (data ?? []).map((b) => ({ ...b, amount: Number(b.amount), usage: b.usage == null ? null : Number(b.usage) })) as Bill[];
  return billsCache.items;
}
