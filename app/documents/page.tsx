"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
type Doc = { id: string; title: string; category: string | null; issuer: string | null };
const VIEWS = [["all", "الكل"], ["fav", "المفضلة"], ["arch", "الأرشيف"]] as const;
export default function Documents() {
  const [q, setQ] = useState(""); const [view, setView] = useState<"all" | "fav" | "arch">("all"); const [docs, setDocs] = useState<Doc[]>([]);
  const [hint, setHint] = useState(""); const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true); setErr("");
      try {
        if (!q.trim()) {
          const folder = new URLSearchParams(window.location.search).get("folder");
          let s = supabaseBrowser().from("documents").select("id,title,category,issuer").is("deleted_at", null);
          s = view === "arch" ? s.not("archived_at", "is", null) : s.is("archived_at", null);
          if (view === "fav") s = s.eq("is_favorite", true); if (folder) s = s.eq("folder_id", folder);
          const { data, error } = await s.order("created_at", { ascending: false }).limit(50); if (error) throw error; setDocs(data ?? []); setHint("");
        } else {
          const r = await fetch(`/api/documents/search?q=${encodeURIComponent(q)}`); if (!r.ok) throw new Error(); const j = await r.json();
          setDocs(j.results ?? []); setHint(j.ambiguous ? "هناك أكثر من نتيجة. اختر الوثيقة المقصودة." : "");
        }
      } catch { setErr("تعذر تحميل الوثائق. تحقق من الاتصال."); }
      setLoading(false);
    }, 250); return () => clearTimeout(t);
  }, [q, view]);
  return (<main className="wrap"><div className="row"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>وثائقي</h1><Link href="/upload" className="chip g">+ إضافة</Link></div>
    <input aria-label="بحث" placeholder="ابحث بالاسم أو الفئة أو المحتوى…" value={q} onChange={(e) => setQ(e.target.value)} />
    <div style={{ display: "flex", gap: 8 }}>{VIEWS.map(([v, l]) => <button key={v} onClick={() => setView(v)} className={`chip ${view === v ? "g" : "m"}`} style={{ background: "none", minHeight: 36 }} aria-pressed={view === v}>{l}</button>)}
      <Link href="/folders" className="chip m">المجلدات</Link><Link href="/trash" className="chip m">المحذوفات</Link></div>
    {hint && <div className="g" style={{ fontSize: 13 }}>{hint}</div>}{err && <div className="err" role="alert">{err}</div>}
    {loading ? <div className="k m">جارٍ التحميل…</div> : docs.length ? docs.map((d) => (<Link key={d.id} href={`/documents/${d.id}`} className="k"><b>{d.title}</b><div className="m" style={{ fontSize: 12 }}>{[d.category, d.issuer].filter(Boolean).join(" • ") || "—"}</div></Link>))
      : <div className="k m">{q ? "لا توجد نتائج. جرّب كلمات أخرى." : "لا توجد وثائق هنا بعد."}</div>}
    <Nav active="/documents" /></main>);
}
