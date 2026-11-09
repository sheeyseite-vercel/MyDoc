"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";
import Nav from "@/components/Nav";
type Doc = { id: string; title: string; category: string | null; issuer: string | null };
const VIEWS = [["all", "All"], ["fav", "Favorites"], ["arch", "Archive"]] as const;
export default function Home() {
  const { t, lang } = useT();
  const [q, setQ] = useState(""); const [view, setView] = useState<"all" | "fav" | "arch">("all"); const [docs, setDocs] = useState<Doc[]>([]);
  const [hint, setHint] = useState(false); const [loading, setLoading] = useState(true); const [err, setErr] = useState(false);
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true); setErr(false);
      try {
        if (!q.trim()) {
          const folder = new URLSearchParams(window.location.search).get("folder");
          let s = supabaseBrowser().from("documents").select("id,title,category,issuer").is("deleted_at", null);
          s = view === "arch" ? s.not("archived_at", "is", null) : s.is("archived_at", null);
          if (view === "fav") s = s.eq("is_favorite", true); if (folder) s = s.eq("folder_id", folder);
          const { data, error } = await s.order("created_at", { ascending: false }).limit(50); if (error) throw error; setDocs(data ?? []); setHint(false);
        } else {
          const r = await fetch(`/api/documents/search?q=${encodeURIComponent(q)}`); if (!r.ok) throw new Error(); const j = await r.json();
          setDocs(j.results ?? []); setHint(!!j.ambiguous);
        }
      } catch { setErr(true); }
      setLoading(false);
    }, 250); return () => clearTimeout(timer);
  }, [q, view]);
  return (<main className="wrap">
    <div className="bar">
      <Link href="/upload" className="addbtn">+ {t("Add")}</Link>
      <input aria-label={t("Search documents…")} placeholder={t("Search documents…")} dir={lang === "ar" ? "rtl" : "ltr"} value={q} onChange={(e) => setQ(e.target.value)} />
    </div>
    <div className="chips">
      {VIEWS.map(([v, l]) => <button key={v} onClick={() => setView(v)} className={`chip ${view === v ? "g" : "m"}`} style={{ background: "none", minHeight: 38 }} aria-pressed={view === v}>{t(l)}</button>)}
      <Link href="/folders" className="chip m" style={{ display: "flex", alignItems: "center" }}>{t("Folders")}</Link>
      <Link href="/trash" className="chip m" style={{ display: "flex", alignItems: "center" }}>{t("Trash")}</Link>
    </div>
    {hint && <div className="g" style={{ fontSize: 13 }}>{t("Several results found. Pick the document you mean.")}</div>}
    {err && <div className="err" role="alert">{t("Could not load documents. Check your connection.")}</div>}
    {loading ? <div className="k m">{t("Loading…")}</div> : docs.length ? docs.map((d) => (
      <Link key={d.id} href={`/documents/${d.id}`} className="k"><b>{d.title}</b><div className="m" style={{ fontSize: 12 }}>{[d.category, d.issuer].filter(Boolean).join(" • ") || "—"}</div></Link>))
      : !err && <div className="empty">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3z" /></svg>
        <div className="h" style={{ fontSize: 22 }}>{q ? t("No results. Try other words.") : t("No documents yet")}</div>
        {!q && <div className="m" style={{ fontSize: 14 }}>{t("Tap Add to upload your first document.")}</div>}</div>}
    <Nav active="/" /></main>);
}
