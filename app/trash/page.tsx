"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
type D = { id: string; title: string; storage_path: string };
export default function Trash() {
  const [docs, setDocs] = useState<D[]>([]); const [err, setErr] = useState(""); const sb = supabaseBrowser();
  const load = useCallback(async () => { const { data } = await supabaseBrowser().from("documents").select("id,title,storage_path").not("deleted_at", "is", null).order("deleted_at", { ascending: false }); setDocs(data ?? []); }, []);
  useEffect(() => { load(); }, [load]);
  async function restore(d: D) { const { error } = await sb.from("documents").update({ deleted_at: null }).eq("id", d.id); setErr(error ? "تعذرت الاستعادة." : ""); load(); }
  async function wipe(d: D) {
    if (!confirm(`حذف «${d.title}» نهائياً؟`) || !confirm("لا يمكن التراجع عن الحذف النهائي. متأكد؟")) return;
    const rm = await sb.storage.from("documents").remove([d.storage_path]); if (rm.error) return setErr("تعذر حذف الملف.");
    const { error } = await sb.from("documents").delete().eq("id", d.id); setErr(error ? "تعذر حذف السجل." : ""); load();
  }
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>المحذوفات</h1>{err && <div className="err" role="alert">{err}</div>}
    {docs.length ? docs.map((d) => (<div key={d.id} className="k"><b>{d.title}</b><div style={{ display: "flex", gap: 8, marginTop: 10 }}><button className="btn ghost" style={{ flex: 1, height: 44 }} onClick={() => restore(d)}>استعادة</button><button className="btn ghost bad" style={{ flex: 1, height: 44 }} onClick={() => wipe(d)}>حذف نهائي</button></div></div>)) : <div className="k m">لا توجد وثائق محذوفة.</div>}
    <Nav active="/documents" /></main>);
}
