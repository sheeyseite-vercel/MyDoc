"use client";
import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { addFolder, removeFolder, renameFolder, useStore } from "@/lib/data";
export default function Folders() {
  const { t } = useT(); const fs = useStore().folders; const [name, setName] = useState("");
  async function add(e: React.FormEvent) { e.preventDefault(); const n = name.trim(); if (!n) return; setName(""); await addFolder(n); }
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Folders")}</h1>
    <form onSubmit={add} style={{ display: "flex", gap: 8 }}><input aria-label={t("Folder name")} placeholder={t("New folder")} value={name} onChange={(e) => setName(e.target.value)} /><button className="btn" style={{ padding: "0 20px" }}>{t("Add")}</button></form>
    {fs && fs.length ? fs.map((f) => (<div key={f.id} className="k row"><Link href={`/?folder=${f.id}`} style={{ color: "inherit", flex: 1 }}><b>{f.name}</b></Link>
      <button className="chip g" style={{ background: "none", minHeight: 40 }} onClick={() => { const n = prompt(t("New name"), f.name)?.trim(); if (n) void renameFolder(f.id, n); }}>{t("Rename")}</button>
      <button className="chip bad" style={{ background: "none", minHeight: 40 }} onClick={() => { if (confirm(t("Delete this folder? Documents inside stay without a folder."))) void removeFolder(f.id); }}>{t("Delete")}</button></div>))
      : fs && <div className="empty"><div className="h" style={{ fontSize: 20 }}>{t("No folders yet.")}</div></div>}
  </main>);
}
