"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";
export default function Folders() {
  const { t } = useT(); const [fs, setFs] = useState<{ id: string; name: string }[]>([]); const [name, setName] = useState(""); const [err, setErr] = useState("");
  const load = useCallback(async () => { const { data } = await supabaseBrowser().from("folders").select("id,name").order("name"); setFs(data ?? []); }, []);
  useEffect(() => { load(); }, [load]);
  async function add(e: React.FormEvent) { e.preventDefault(); const n = name.trim(); if (!n) return; const sb = supabaseBrowser(); const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("folders").insert({ user_id: user!.id, name: n }); setErr(error ? t("Could not create the folder.") : ""); setName(""); load(); }
  async function rename(f: { id: string; name: string }) { const n = prompt(t("New name"), f.name)?.trim(); if (n) { await supabaseBrowser().from("folders").update({ name: n }).eq("id", f.id); load(); } }
  async function del(f: { id: string }) { if (confirm(t("Delete this folder? Documents inside stay without a folder."))) { await supabaseBrowser().from("folders").delete().eq("id", f.id); load(); } }
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Folders")}</h1>
    <form onSubmit={add} style={{ display: "flex", gap: 8 }}><input aria-label={t("Folder name")} placeholder={t("New folder")} value={name} onChange={(e) => setName(e.target.value)} /><button className="btn" style={{ padding: "0 20px" }}>{t("Add")}</button></form>
    {err && <div className="err" role="alert">{err}</div>}
    {fs.length ? fs.map((f) => (<div key={f.id} className="k row"><Link href={`/?folder=${f.id}`} style={{ color: "inherit", flex: 1 }}><b>{f.name}</b></Link><button className="chip g" style={{ background: "none", minHeight: 40 }} onClick={() => rename(f)}>{t("Rename")}</button><button className="chip bad" style={{ background: "none", minHeight: 40 }} onClick={() => del(f)}>{t("Delete")}</button></div>))
      : <div className="empty"><div className="h" style={{ fontSize: 20 }}>{t("No folders yet.")}</div></div>}
</main>);
}
