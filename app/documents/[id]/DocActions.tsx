"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";
type Doc = { id: string; title: string; is_favorite: boolean; archived: boolean; notes: string | null };
export default function DocActions({ doc }: { doc: Doc }) {
  const { t } = useT(); const [err, setErr] = useState(""); const router = useRouter(); const sb = supabaseBrowser();
  async function patch(v: Record<string, unknown>, action: string, after?: () => void) {
    setErr(""); const { error } = await sb.from("documents").update({ ...v, updated_at: new Date().toISOString() }).eq("id", doc.id);
    if (error) return setErr(t("Could not complete the action."));
    const { data: { user } } = await sb.auth.getUser(); if (user) await sb.from("activity_logs").insert({ user_id: user.id, action, document_id: doc.id });
    after ? after() : router.refresh();
  }
  async function open(download: boolean) {
    setErr(""); const r = await fetch(`/api/documents/${doc.id}/url`); const j = await r.json().catch(() => ({}));
    if (!j.url) return setErr(t("Could not open the document."));
    if (download) { const a = document.createElement("a"); a.href = j.url; a.download = ""; a.click(); } else window.open(j.url, "_blank", "noopener");
  }
  return (<div style={{ display: "grid", gap: 10 }}>
    <button className="btn" onClick={() => open(false)}>{t("Open document")}</button>
    <button className="btn ghost" onClick={() => open(true)}>{t("Download")}</button>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="chip g" style={{ background: "none", minHeight: 44 }} onClick={() => { const nn = prompt(t("New name"), doc.title)?.trim(); if (nn) patch({ title: nn }, "rename"); }}>{t("Rename")}</button>
      <button className="chip g" style={{ background: "none", minHeight: 44 }} onClick={() => patch({ is_favorite: !doc.is_favorite }, "favorite")}>{doc.is_favorite ? t("Remove from favorites") : t("Add to favorites")}</button>
      <button className="chip g" style={{ background: "none", minHeight: 44 }} onClick={() => patch({ archived_at: doc.archived ? null : new Date().toISOString() }, "archive")}>{doc.archived ? t("Unarchive") : t("Archive")}</button>
      <button className="chip g" style={{ background: "none", minHeight: 44 }} onClick={() => { const n = prompt(t("Notes"), doc.notes ?? ""); if (n !== null) patch({ notes: n || null }, "notes"); }}>{t("Notes")}</button>
      <button className="chip bad" style={{ background: "none", minHeight: 44 }} onClick={() => { if (confirm(t("Move this document to trash?"))) patch({ deleted_at: new Date().toISOString() }, "trash", () => router.replace("/")); }}>{t("Delete")}</button>
    </div>{err && <div className="err" role="alert">{err}</div>}</div>);
}
