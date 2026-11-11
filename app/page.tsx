"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useT } from "@/components/LangProvider";
import { InstallIcon } from "@/components/InstallProvider";
import { allDocs, useStore, type DocRow } from "@/lib/data";
import { norm, suggest } from "@/lib/search";
type View = "all" | "fav" | "arch";
const VIEWS = [["all", "All"], ["fav", "Favorites"], ["arch", "Archive"]] as const;
const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const fields = (d: DocRow) => norm([d.title, d.category, d.issuer, d.owner_name, d.reference_no, d.notes].filter(Boolean).join(" "));
function Home() {
  const { t, lang } = useT(); const s = useStore(); const folder = useSearchParams().get("folder");
  const [q, setQ] = useState(""); const [view, setView] = useState<View>("all"); const [focus, setFocus] = useState(false); const [apiIds, setApiIds] = useState<string[]>([]);
  const docs = allDocs(); const ready = s.docs !== null || s.outDocs.length > 0;
  const sugg = useMemo(() => suggest(docs, q), [s.docs, s.outDocs, q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // بحث المحتوى (OCR) من الخادم عند توفر الإنترنت، ويُدمج مع البحث المحلي
    setApiIds([]); if (!q.trim() || !navigator.onLine) return;
    const timer = setTimeout(async () => { try { const r = await fetch(`/api/documents/search?q=${encodeURIComponent(q)}`); if (r.ok) setApiIds(((await r.json()).results ?? []).map((x: { id: string }) => x.id)); } catch { /* دون اتصال */ } }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  const list = useMemo(() => {
    const n = norm(q.trim());
    if (n) { const ids = new Set(apiIds); return docs.filter((d) => !d.archived_at && (fields(d).includes(n) || ids.has(d.id))); }
    return docs.filter((d) => (view === "arch" ? !!d.archived_at : !d.archived_at) && (view !== "fav" || d.is_favorite) && (!folder || d.folder_id === folder));
  }, [s.docs, s.outDocs, q, view, folder, apiIds]); // eslint-disable-line react-hooks/exhaustive-deps
  return (<main className="wrap">
    <div style={{ position: "relative" }}>
      <div className="bar">
        <Link href="/upload" className="addbtn">+ {t("Add")}</Link>
        <input aria-label={t("Search documents…")} placeholder={t("Search documents…")} dir={lang === "ar" ? "rtl" : "ltr"} value={q} autoComplete="off" enterKeyHint="search"
          onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
        <InstallIcon />
      </div>
      {focus && q.trim() && sugg.length > 0 && <div className="sugg" role="listbox" dir={lang === "ar" ? "rtl" : "ltr"} onPointerDown={(e) => e.preventDefault()}>
        {sugg.map((x) => { const i = x.title.toLowerCase().indexOf(q.trim().toLowerCase()); return (<div key={x.id} className="sg" role="option" aria-selected="false">
          <Link href={`/doc?id=${x.id}`}><span className="m"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg></span>
            <span dir="auto">{i >= 0 ? <>{x.title.slice(0, i)}<b>{x.title.slice(i, i + q.trim().length)}</b>{x.title.slice(i + q.trim().length)}</> : x.title}</span></Link>
          <button type="button" aria-label={t("Use suggestion")} onClick={() => setQ(x.title)}>{lang === "ar" ? "↗" : "↖"}</button></div>); })}</div>}
    </div>
    <div className="filters">
      <div className="seg" role="tablist">{VIEWS.map(([v, l]) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{t(l)}</button>)}</div>
      <Link href="/folders" className="ib" aria-label={t("Folders")}><svg {...ic}><path d="M3 7h7l2 2h9v10H3z" /></svg></Link>
      <Link href="/trash" className="ib" aria-label={t("Trash")}><svg {...ic}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg></Link>
    </div>
    {q.trim() && list.length > 1 && <div className="g" style={{ fontSize: 13 }}>{t("Several results found. Pick the document you mean.")}</div>}
    {!ready ? <div className="sk" style={{ flex: 1 }} aria-busy="true" /> : list.length ? list.map((d) => (
      <Link key={d.id} href={`/doc?id=${d.id}`} className="k row"><div style={{ minWidth: 0 }}><b>{d.title}</b><div className="m" style={{ fontSize: 12 }}>{[d.category, d.issuer].filter(Boolean).join(" • ") || "—"}</div></div>
        {d.pending && <span className={`chip ${d.pending === "failed" ? "tr" : "ty"}`}>{d.pending === "failed" ? t("Sync failed") : t("Waiting to sync")}</span>}</Link>))
      : <div className="empty">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3z" /></svg>
        <div className="h" style={{ fontSize: 22 }}>{q ? t("No results. Try other words.") : t("No documents yet")}</div>
        {!q && <div className="m" style={{ fontSize: 14 }}>{t("Tap Add to upload your first document.")}</div>}</div>}
  </main>);
}
export default function Page() { return <Suspense fallback={<main className="wrap"><div className="sk" style={{ flex: 1 }} /></main>}><Home /></Suspense>; }
