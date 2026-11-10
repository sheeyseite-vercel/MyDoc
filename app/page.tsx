"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";
type View = "all" | "fav" | "arch";
const VIEWS = [["all", "All"], ["fav", "Favorites"], ["arch", "Archive"]] as const;
import { docsCache as cache, loadTitles, titlesCache, type Doc } from "@/lib/data";
import { suggest } from "@/lib/search";
import { InstallIcon } from "@/components/InstallProvider";
const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
export default function Home() {
  const { t, lang } = useT();
  const [q, setQ] = useState(""); const [view, setView] = useState<View>("all"); const [docs, setDocs] = useState<Doc[]>(cache.get("all|") ?? []);
  const [titles, setTitles] = useState(titlesCache.items ?? []); const [focus, setFocus] = useState(false);
  const sugg = useMemo(() => suggest(titles, q), [titles, q]);
  useEffect(() => { loadTitles().then((x) => setTitles([...x])).catch(() => {}); }, []);
  const [hint, setHint] = useState(false); const [loading, setLoading] = useState(!cache.has("all|")); const [err, setErr] = useState(false);
  useEffect(() => {
    const folder = new URLSearchParams(window.location.search).get("folder") ?? ""; const key = `${view}|${folder}`;
    if (!q.trim()) { const c = cache.get(key); if (c) { setDocs(c); setLoading(false); } else setLoading(true); }
    const timer = setTimeout(async () => {
      setErr(false);
      try {
        if (!q.trim()) {
          let s = supabaseBrowser().from("documents").select("id,title,category,issuer").is("deleted_at", null);
          s = view === "arch" ? s.not("archived_at", "is", null) : s.is("archived_at", null);
          if (view === "fav") s = s.eq("is_favorite", true); if (folder) s = s.eq("folder_id", folder);
          const { data, error } = await s.order("created_at", { ascending: false }).limit(50); if (error) throw error;
          cache.set(key, data ?? []); setDocs(data ?? []); setHint(false);
        } else {
          setLoading(true); const r = await fetch(`/api/documents/search?q=${encodeURIComponent(q)}`); if (!r.ok) throw new Error(); const j = await r.json();
          setDocs(j.results ?? []); setHint(!!j.ambiguous);
        }
      } catch { setErr(true); }
      setLoading(false);
    }, q.trim() ? 250 : 0); return () => clearTimeout(timer);
  }, [q, view]);
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
          <Link href={`/documents/${x.id}`}><span className="m"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg></span>
            <span dir="auto">{i >= 0 ? <>{x.title.slice(0, i)}<b>{x.title.slice(i, i + q.trim().length)}</b>{x.title.slice(i + q.trim().length)}</> : x.title}</span></Link>
          <button type="button" aria-label={t("Use suggestion")} onClick={() => setQ(x.title)}>{lang === "ar" ? "↗" : "↖"}</button></div>); })}</div>}
    </div>
    <div className="filters">
      <div className="seg" role="tablist">{VIEWS.map(([v, l]) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{t(l)}</button>)}</div>
      <Link href="/folders" className="ib" aria-label={t("Folders")}><svg {...ic}><path d="M3 7h7l2 2h9v10H3z" /></svg></Link>
      <Link href="/trash" className="ib" aria-label={t("Trash")}><svg {...ic}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg></Link>
    </div>
    {hint && <div className="g" style={{ fontSize: 13 }}>{t("Several results found. Pick the document you mean.")}</div>}
    {err && <div className="err" role="alert">{t("Could not load documents. Check your connection.")}</div>}
    {loading && !docs.length ? <div className="sk" style={{ flex: 1 }} aria-busy="true" /> : docs.length ? docs.map((d) => (
      <Link key={d.id} href={`/documents/${d.id}`} className="k"><b>{d.title}</b><div className="m" style={{ fontSize: 12 }}>{[d.category, d.issuer].filter(Boolean).join(" • ") || "—"}</div></Link>))
      : !err && <div className="empty">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3z" /></svg>
        <div className="h" style={{ fontSize: 22 }}>{q ? t("No results. Try other words.") : t("No documents yet")}</div>
        {!q && <div className="m" style={{ fontSize: 14 }}>{t("Tap Add to upload your first document.")}</div>}</div>}
  </main>);
}
