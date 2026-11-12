// طبقة بيانات تعمل دون إنترنت: كل شيء يُحفظ في IndexedDB، والإضافات تُوضع في صندوق صادر وتُزامَن عند عودة الاتصال.
import { useEffect, useReducer } from "react";
import { createStore, get, set, del, keys, type UseStore } from "idb-keyval";
import { supabaseBrowser } from "./supabase/client";
import { createReminders } from "./reminders";

export type DocRow = { id: string; title: string; category: string | null; issuer: string | null; owner_name: string | null; issue_date: string | null; expiry_date: string | null; reference_no: string | null; notes: string | null; folder_id: string | null; is_favorite: boolean; archived_at: string | null; mime: string; size_bytes: number; storage_path: string; status: string; created_at: string; pending?: "queued" | "failed" };
export type Title = Pick<DocRow, "id" | "title" | "category">;
export type Bill = { id: string; category: string; period: string; amount: number; currency: string; usage: number | null; usage_unit: string | null; note: string | null; storage_path: string | null; mime?: string | null; pending?: boolean };
export type Folder = { id: string; name: string };
export type Due = { id: string; days_before: number; doc: { id: string; title: string } };
type OutDoc = { kind: "doc"; id: string; uid: string; meta: { title: string; category: string | null; issuer: string | null; expiry_date: string | null; folder_id: string | null }; file: Blob; mime: string; size: number; created_at: string; fails: number };
type OutBill = { kind: "bill"; id: string; uid: string; row: Bill; file: Blob | null; created_at: string; fails: number };

let _st: UseStore | undefined; const st = () => (_st ??= createStore("mydoc", "kv"));
export const kvGet = async <T,>(k: string): Promise<T | undefined> => { try { return await get<T>(k, st()); } catch { return undefined; } };
export const kvSet = async (k: string, v: unknown) => { try { await set(k, v, st()); } catch { /* ممتلئ أو غير متاح */ } };
export const kvDel = async (k: string) => { try { await del(k, st()); } catch { /* تجاهل */ } };
export const kvKeys = async (): Promise<string[]> => { try { return (await keys(st())) as string[]; } catch { return []; } };
const online = () => typeof navigator === "undefined" || navigator.onLine;
const sb = () => supabaseBrowser();

export const S = { docs: null as DocRow[] | null, bills: null as Bill[] | null, folders: null as Folder[] | null, due: null as Due[] | null, outDocs: [] as DocRow[], outBills: [] as Bill[], failed: 0 };
const subs = new Set<() => void>(); const emit = () => subs.forEach((f) => f());
export function useStore() { const [, f] = useReducer((x: number) => x + 1, 0); useEffect(() => { subs.add(f); void boot(); return () => { subs.delete(f); }; }, []); return S; }
export const allDocs = (): DocRow[] => { const ids = new Set((S.docs ?? []).map((d) => d.id)); return [...S.outDocs.filter((d) => !ids.has(d.id)), ...(S.docs ?? [])]; };
export const allBills = (): Bill[] => { const ids = new Set((S.bills ?? []).map((b) => b.id)); return [...S.outBills.filter((b) => !ids.has(b.id)), ...(S.bills ?? [])]; };

export async function getUid(): Promise<string | null> {
  if (!online()) return localStorage.getItem("mydoc.uid");
  try { const { data: { session } } = await sb().auth.getSession(); if (session) { const prev = localStorage.getItem("mydoc.uid"); if (prev && prev !== session.user.id) await clearOffline(); localStorage.setItem("mydoc.uid", session.user.id); return session.user.id; } } catch { /* دون اتصال */ }
  return localStorage.getItem("mydoc.uid");
}
export async function clearOffline() {
  for (const k of await kvKeys()) await kvDel(k);
  S.docs = S.bills = S.folders = S.due = null; S.outDocs = []; S.outBills = []; S.failed = 0; booted = false; localStorage.removeItem("mydoc.uid"); emit();
}

const DCOLS = "id,title,category,issuer,owner_name,issue_date,expiry_date,reference_no,notes,folder_id,is_favorite,archived_at,mime,size_bytes,storage_path,status,created_at";
export async function refreshDocs() { if (!online()) return; try { const { data, error } = await sb().from("documents").select(DCOLS).is("deleted_at", null).order("created_at", { ascending: false }).limit(1000); if (error) throw error; S.docs = data as DocRow[]; await kvSet("docs", S.docs); emit(); } catch { /* يبقى المخزَّن */ } }
export async function refreshBills() { if (!online()) return; try { const { data, error } = await sb().from("bills").select("id,category,period,amount,currency,usage,usage_unit,note,storage_path,mime").order("period", { ascending: false }).limit(1000); if (error) throw error; S.bills = (data ?? []).map((b) => ({ ...b, amount: Number(b.amount), usage: b.usage == null ? null : Number(b.usage) })) as Bill[]; await kvSet("bills", S.bills); emit(); } catch { /* تجاهل */ } }
export async function refreshFolders() { if (!online()) return; try { const { data, error } = await sb().from("folders").select("id,name").order("name"); if (error) throw error; S.folders = data ?? []; await kvSet("folders", S.folders); emit(); } catch { /* تجاهل */ } }
export async function refreshDue() {
  if (!online()) return;
  try { const { data, error } = await sb().from("reminders").select("id,days_before,documents(id,title)").lte("remind_at", new Date().toISOString()).order("remind_at", { ascending: false }).limit(10); if (error) throw error;
    S.due = ((data ?? []) as unknown as { id: string; days_before: number; documents: { id: string; title: string } | { id: string; title: string }[] | null }[]).map((r) => ({ id: r.id, days_before: r.days_before, doc: Array.isArray(r.documents) ? r.documents[0] : r.documents })).filter((r) => r.doc) as Due[]; await kvSet("due", S.due); emit(); } catch { /* تجاهل */ }
}
export const refreshAll = () => Promise.all([refreshDocs(), refreshBills(), refreshFolders(), refreshDue()]);

let booted = false;
async function boot() {
  if (booted) return;
  let authed = !!localStorage.getItem("mydoc.uid") || /auth-token/.test(document.cookie); // دون انتظار الشبكة
  if (!authed && online()) { try { authed = !!(await sb().auth.getSession()).data.session; } catch { /* تجاهل */ } }
  if (!authed) return; // لم يسجّل الدخول بعد
  if (booted) return; booted = true;
  if (online()) void getUid(); // يحفظ معرّف المستخدم لاستخدامه دون إنترنت
  const [d, b, f, du] = await Promise.all([kvGet<DocRow[]>("docs"), kvGet<Bill[]>("bills"), kvGet<Folder[]>("folders"), kvGet<Due[]>("due")]);
  if (d) S.docs = d; if (b) S.bills = b; if (f) S.folders = f; if (du) S.due = du;
  await loadOutbox(); emit();
  window.addEventListener("online", () => { void syncOutbox(); void refreshAll(); });
  void syncOutbox().then(() => refreshAll());
}
async function loadOutbox() {
  const od: DocRow[] = []; const ob: Bill[] = []; let failed = 0;
  for (const k of (await kvKeys()).filter((x) => x.startsWith("out:"))) {
    const o = await kvGet<OutDoc | OutBill>(k); if (!o) continue; if (o.fails >= 3) failed++;
    if (o.kind === "doc") od.push({ id: o.id, ...o.meta, owner_name: null, issue_date: null, reference_no: null, notes: null, is_favorite: false, archived_at: null, mime: o.mime, size_bytes: o.size, storage_path: "", status: "ready", created_at: o.created_at, pending: o.fails >= 3 ? "failed" : "queued" });
    else ob.push({ ...o.row, pending: true });
  }
  od.sort((a, b) => b.created_at.localeCompare(a.created_at)); S.outDocs = od; S.outBills = ob; S.failed = failed; emit();
}
export async function enqueueDoc(o: { id: string; uid: string; meta: OutDoc["meta"]; file: Blob; mime: string; size: number }) {
  await kvSet("out:doc:" + o.id, { ...o, kind: "doc", fails: 0, created_at: new Date().toISOString() } satisfies OutDoc); await loadOutbox(); void syncOutbox();
}
export async function enqueueBill(o: { uid: string; row: Bill; file: Blob | null }) {
  await kvSet("out:bill:" + o.row.id, { kind: "bill", id: o.row.id, uid: o.uid, row: o.row, file: o.file, created_at: new Date().toISOString(), fails: 0 } satisfies OutBill); await loadOutbox(); void syncOutbox();
}
const isNet = (e: unknown) => !online() || /fetch|network|load failed|timeout|abort/i.test(String((e as { message?: string })?.message ?? e));
let syncing = false;
export async function syncOutbox() {
  if (syncing || !online()) return; syncing = true; let did = false;
  try {
    for (const k of (await kvKeys()).filter((x) => x.startsWith("out:"))) {
      const o = await kvGet<OutDoc | OutBill>(k); if (!o) continue;
      try {
        if (o.kind === "doc") {
          const ext = o.mime === "application/pdf" ? "pdf" : o.mime === "image/jpeg" ? "jpg" : o.mime.split("/")[1]; const path = `${o.uid}/${o.id}.${ext}`;
          const up = await sb().storage.from("documents").upload(path, o.file, { contentType: o.mime, upsert: true }); if (up.error) throw up.error;
          const ins = await sb().from("documents").insert({ id: o.id, user_id: o.uid, ...o.meta, storage_path: path, mime: o.mime, size_bytes: o.size, status: "ready" }); if (ins.error && ins.error.code !== "23505") throw ins.error;
          await kvSet("file:" + o.id, o.file); void createReminders(sb(), o.uid, o.id, o.meta.expiry_date); void sb().from("activity_logs").insert({ user_id: o.uid, action: "upload", document_id: o.id });
        } else {
          const r = o.row; const up = o.file && r.storage_path ? await sb().storage.from("documents").upload(r.storage_path, o.file, { contentType: r.mime ?? undefined, upsert: true }) : { error: null }; if (up.error) throw up.error;
          const ins = await sb().from("bills").insert({ id: r.id, user_id: o.uid, category: r.category, period: r.period, amount: r.amount, currency: r.currency, usage: r.usage, usage_unit: r.usage_unit, note: r.note, storage_path: r.storage_path, mime: r.mime ?? null }); if (ins.error && ins.error.code !== "23505") throw ins.error;
          if (o.file) await kvSet("bfile:" + r.id, o.file);
        }
        await kvDel(k); did = true;
      } catch (e) { if (isNet(e)) break; o.fails++; await kvSet(k, o); }
    }
  } finally { syncing = false; }
  await loadOutbox(); if (did) await Promise.all([refreshDocs(), refreshBills()]);
}

export async function patchDoc(id: string, patch: Partial<DocRow>) {
  if (!online()) throw new Error("offline");
  const { error } = await sb().from("documents").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id); if (error) throw error;
  S.docs = (S.docs ?? []).map((d) => (d.id === id ? { ...d, ...patch } : d)); await kvSet("docs", S.docs); emit();
}
export async function trashDoc(id: string) {
  if (!online()) throw new Error("offline");
  const { error } = await sb().from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", id); if (error) throw error;
  S.docs = (S.docs ?? []).filter((d) => d.id !== id); await kvSet("docs", S.docs); emit();
}
export async function removeBill(b: Bill) {
  if (b.pending) { await kvDel("out:bill:" + b.id); await loadOutbox(); return; }
  if (!online()) throw new Error("offline");
  if (b.storage_path) await sb().storage.from("documents").remove([b.storage_path]);
  const { error } = await sb().from("bills").delete().eq("id", b.id); if (error) throw error;
  S.bills = (S.bills ?? []).filter((x) => x.id !== b.id); await kvSet("bills", S.bills); await kvDel("bfile:" + b.id); emit();
}
async function fetchBlob(api: string, cacheKey: string) {
  if (!online()) return null;
  const r = await fetch(api); const j = await r.json().catch(() => ({})); if (!j.url) return null;
  const b = await (await fetch(j.url)).blob(); await kvSet(cacheKey, b); return b;
}
export async function fileOf(d: DocRow): Promise<Blob | null> {
  const p = await kvGet<OutDoc>("out:doc:" + d.id); if (p) return p.file;
  return (await kvGet<Blob>("file:" + d.id)) ?? fetchBlob(`/api/documents/${d.id}/url`, "file:" + d.id);
}
export async function billFileOf(b: Bill): Promise<Blob | null> {
  const p = await kvGet<OutBill>("out:bill:" + b.id); if (p?.file) return p.file;
  return (await kvGet<Blob>("bfile:" + b.id)) ?? fetchBlob(`/api/bills/${b.id}/url`, "bfile:" + b.id);
}
export async function cacheAllFiles(onProgress: (done: number, total: number) => void) {
  const have = new Set((await kvKeys()).filter((k) => k.startsWith("file:")).map((k) => k.slice(5)));
  const todo = (S.docs ?? []).filter((d) => !have.has(d.id)); let n = 0; onProgress(0, todo.length);
  for (const d of todo) { try { await fileOf(d); } catch { /* تخطَّ */ } onProgress(++n, todo.length); }
}
