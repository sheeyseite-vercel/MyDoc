"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";
import Nav from "@/components/Nav";
type D = { id: string; title: string; storage_path: string };
export default function Trash() {
  const { t } = useT(); const [docs, setDocs] = useState<D[]>([]); const [err, setErr] = useState(""); const sb = supabaseBrowser();
  const load = useCallback(async () => { const { data } = await supabaseBrowser().from("documents").select("id,title,storage_path").not("deleted_at", "is", null).order("deleted_at", { ascending: false }); setDocs(data ?? []); }, []);
  useEffect(() => { load(); }, [load]);
  async function restore(d: D) { const { error } = await sb.from("documents").update({ deleted_at: null }).eq("id", d.id); setErr(error ? t("Could not restore.") : ""); load(); }
  async function wipe(d: D) {
    if (!confirm(t("Delete “{title}” forever?", { title: d.title })) || !confirm(t("This cannot be undone. Are you sure?"))) return;
    const rm = await sb.storage.from("documents").remove([d.storage_path]); if (rm.error) return setErr(t("Could not delete the file."));
    const { error } = await sb.from("documents").delete().eq("id", d.id); setErr(error ? t("Could not delete the record.") : ""); load();
  }
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Trash")}</h1>{err && <div className="err" role="alert">{err}</div>}
    {docs.length ? docs.map((d) => (<div key={d.id} className="k"><b>{d.title}</b><div style={{ display: "flex", gap: 8, marginTop: 10 }}><button className="btn ghost" style={{ flex: 1, height: 44 }} onClick={() => restore(d)}>{t("Restore")}</button><button className="btn ghost bad" style={{ flex: 1, height: 44 }} onClick={() => wipe(d)}>{t("Delete forever")}</button></div></div>))
      : <div className="empty"><div className="h" style={{ fontSize: 20 }}>{t("No deleted documents.")}</div></div>}
    <Nav active="/" /></main>);
}
