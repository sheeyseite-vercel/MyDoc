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

export const S = { trash: null as DocRow[] | null, reminders: {} as Record<string, number>, ops: 0, docs: null as DocRow[] | null, bills: null as Bill[] | null, folders: null as Folder[] | null, due: null as Due[] | null, outDocs: [] as DocRow[], outBills: [] as Bill[], failed: 0 };
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
  S.docs = S.bills = S.folders = S.due = S.trash = null; S.reminders = {}; S.ops = 0; S.outDocs = []; S.outBills = []; S.failed = 0; booted = false; localStorage.removeItem("mydoc.uid"); emit();
}

const DCOLS = "id,title,category,issuer,owner_name,issue_date,expiry_date,reference_no,notes,folder_id,is_favorite,archived_at,mime,size_bytes,storage_path,status,created_at";
export async function refreshDocs() { if (!online() || S.ops > 0) return; try { const { data, error } = await sb().from("documents").select(DCOLS).is("deleted_at", null).order("created_at", { ascending: false }).limit(1000); if (error) throw error; S.docs = data as DocRow[]; await kvSet("docs", S.docs); emit(); } catch { /* يبقى المخزَّن */ } }
export async function refreshBills() { if (!online() || S.ops > 0) return; try { const { data, error } = await sb().from("bills").select("id,category,period,amount,currency,usage,usage_unit,note,storage_path,mime").order("period", { ascending: false }).limit(1000); if (error) throw error; S.bills = (data ?? []).map((b) => ({ ...b, amount: Number(b.amount), usage: b.usage == null ? null : Number(b.usage) })) as Bill[]; await kvSet("bills", S.bills); emit(); } catch { /* تجاهل */ } }
export async function refreshFolders() { if (!online() || S.ops > 0) return; try { const { data, error } = await sb().from("folders").select("id,name").order("name"); if (error) throw error; S.folders = data ?? []; await kvSet("folders", S.folders); emit(); } catch { /* تجاهل */ } }
export async function refreshDue() {
  if (!online()) return;
  try { const { data, error } = await sb().from("reminders").select("id,days_before,documents(id,title)").lte("remind_at", new Date().toISOString()).order("remind_at", { ascending: false }).limit(10); if (error) throw error;
    S.due = ((data ?? []) as unknown as { id: string; days_before: number; documents: { id: string; title: string } | { id: string; title: string }[] | null }[]).map((r) => ({ id: r.id, days_before: r.days_before, doc: Array.isArray(r.documents) ? r.documents[0] : r.documents })).filter((r) => r.doc) as Due[]; await kvSet("due", S.due); emit(); } catch { /* تجاهل */ }
}
export async function refreshTrash() { if (!online() || S.ops > 0) return; try { const { data, error } = await sb().from("documents").select(DCOLS).not("deleted_at", "is", null).order("created_at", { ascending: false }).limit(500); if (error) throw error; S.trash = data as DocRow[]; await kvSet("trash", S.trash); emit(); } catch { /* تجاهل */ } }
export async function refreshReminders() { if (!online() || S.ops > 0) return; try { const { data, error } = await sb().from("bill_reminders").select("category,day"); if (error) throw error; S.reminders = Object.fromEntries((data ?? []).map((r) => [r.category, r.day])); await kvSet("breminders", S.reminders); emit(); } catch { /* تجاهل */ } }
export const refreshAll = () => Promise.all([refreshDocs(), refreshBills(), refreshFolders(), refreshDue(), refreshTrash(), refreshReminders()]);

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
  const [tr, br] = await Promise.all([kvGet<DocRow[]>("trash"), kvGet<Record<string, number>>("breminders")]); if (tr) S.trash = tr; if (br) S.reminders = br;
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
  od.sort((a, b) => b.created_at.localeCompare(a.created_at)); S.outDocs = od; S.outBills = ob; S.failed = failed; S.ops = (await kvKeys()).filter((x) => x.startsWith("op:")).length; emit();
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
    for (const k of (await kvKeys()).filter((x) => x.startsWith("op:")).sort()) {
      const rec = await kvGet<{ op: Op; fails: number }>(k); if (!rec) { await kvDel(k); continue; }
      try { await runOp(rec.op); await kvDel(k); did = true; } catch (e) { if (isNet(e)) break; rec.fails++; if (rec.fails >= 3) await kvDel(k); else await kvSet(k, rec); }
    }
  } finally { syncing = false; }
  await loadOutbox(); if (did) await refreshAll();
}

// عمليات التعديل تُطبَّق محلياً فوراً وتُحفظ في طابور، ثم تُرسَل للخادم عند توفر الإنترنت (يعمل التطبيق كله دونه)
export type Op =
  | { t: "doc.patch"; id: string; patch: Record<string, unknown> } | { t: "doc.trash"; id: string } | { t: "doc.restore"; id: string } | { t: "doc.purge"; id: string; path: string }
  | { t: "bill.remove"; id: string; path: string | null } | { t: "folder.add"; id: string; name: string; uid: string } | { t: "folder.rename"; id: string; name: string } | { t: "folder.remove"; id: string }
  | { t: "reminder.set"; category: string; day: number | null; uid: string } | { t: "consent"; value: boolean; uid: string };
async function runOp(o: Op) {
  const c = sb(); const bad = (e: { message?: string } | null) => { if (e) throw e; };
  switch (o.t) {
    case "doc.patch": bad((await c.from("documents").update({ ...o.patch, updated_at: new Date().toISOString() }).eq("id", o.id)).error); break;
    case "doc.trash": bad((await c.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", o.id)).error); break;
    case "doc.restore": bad((await c.from("documents").update({ deleted_at: null }).eq("id", o.id)).error); break;
    case "doc.purge": if (o.path) await c.storage.from("documents").remove([o.path]); bad((await c.from("documents").delete().eq("id", o.id)).error); break;
    case "bill.remove": if (o.path) await c.storage.from("documents").remove([o.path]); bad((await c.from("bills").delete().eq("id", o.id)).error); break;
    case "folder.add": { const r = await c.from("folders").insert({ id: o.id, user_id: o.uid, name: o.name }); if (r.error && r.error.code !== "23505") throw r.error; break; }
    case "folder.rename": bad((await c.from("folders").update({ name: o.name }).eq("id", o.id)).error); break;
    case "folder.remove": bad((await c.from("folders").delete().eq("id", o.id)).error); break;
    case "reminder.set": bad((o.day === null ? await c.from("bill_reminders").delete().eq("category", o.category).eq("user_id", o.uid) : await c.from("bill_reminders").upsert({ user_id: o.uid, category: o.category, day: o.day, last_sent: null }, { onConflict: "user_id,category" })).error); break;
    case "consent": bad((await c.from("profiles").update({ ai_consent: o.value }).eq("id", o.uid)).error); break;
  }
}
async function pushOp(op: Op) { await kvSet(`op:${String(Date.now()).padStart(15, "0")}:${Math.random().toString(36).slice(2, 6)}`, { op, fails: 0 }); await loadOutbox(); void syncOutbox(); }
const saveDocs = async () => { await kvSet("docs", S.docs); await kvSet("trash", S.trash); emit(); };
export async function patchDoc(id: string, patch: Partial<DocRow>) { S.docs = (S.docs ?? []).map((d) => (d.id === id ? { ...d, ...patch } : d)); await saveDocs(); await pushOp({ t: "doc.patch", id, patch }); }
export async function trashDoc(id: string) { const d = (S.docs ?? []).find((x) => x.id === id); if (d) S.trash = [d, ...(S.trash ?? [])]; S.docs = (S.docs ?? []).filter((x) => x.id !== id); await saveDocs(); await pushOp({ t: "doc.trash", id }); }
export async function restoreDoc(id: string) { const d = (S.trash ?? []).find((x) => x.id === id); if (d) S.docs = [d, ...(S.docs ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)); S.trash = (S.trash ?? []).filter((x) => x.id !== id); await saveDocs(); await pushOp({ t: "doc.restore", id }); }
export async function purgeDoc(d: DocRow) { S.trash = (S.trash ?? []).filter((x) => x.id !== d.id); await kvDel("file:" + d.id); await saveDocs(); await pushOp({ t: "doc.purge", id: d.id, path: d.storage_path }); }
export async function removeBill(b: Bill) {
  if (b.pending) { await kvDel("out:bill:" + b.id); await loadOutbox(); return; }
  S.bills = (S.bills ?? []).filter((x) => x.id !== b.id); await kvSet("bills", S.bills); await kvDel("bfile:" + b.id); emit(); await pushOp({ t: "bill.remove", id: b.id, path: b.storage_path });
}
const saveFolders = async () => { await kvSet("folders", S.folders); await kvSet("docs", S.docs); emit(); };
export async function addFolder(name: string) { const uid = await getUid(); if (!uid) return; const f = { id: crypto.randomUUID(), name }; S.folders = [...(S.folders ?? []), f].sort((a, b) => a.name.localeCompare(b.name)); await saveFolders(); await pushOp({ t: "folder.add", id: f.id, name, uid }); }
export async function renameFolder(id: string, name: string) { S.folders = (S.folders ?? []).map((f) => (f.id === id ? { ...f, name } : f)).sort((a, b) => a.name.localeCompare(b.name)); await saveFolders(); await pushOp({ t: "folder.rename", id, name }); }
export async function removeFolder(id: string) { S.folders = (S.folders ?? []).filter((f) => f.id !== id); S.docs = (S.docs ?? []).map((d) => (d.folder_id === id ? { ...d, folder_id: null } : d)); await saveFolders(); await pushOp({ t: "folder.remove", id }); }
export async function setBillReminder(category: string, day: number | null) {
  const uid = await getUid(); if (!uid) return; const r = { ...S.reminders }; if (day === null) delete r[category]; else r[category] = day;
  S.reminders = r; await kvSet("breminders", r); emit(); await pushOp({ t: "reminder.set", category, day, uid });
}
export const getConsent = () => { try { return localStorage.getItem("ai.consent") === "1"; } catch { return false; } };
export async function saveConsent(value: boolean) { try { localStorage.setItem("ai.consent", value ? "1" : "0"); } catch { /* تجاهل */ } const uid = await getUid(); if (uid) await pushOp({ t: "consent", value, uid }); }
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
