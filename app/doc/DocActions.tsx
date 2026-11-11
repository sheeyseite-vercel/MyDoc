"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import { fileOf, patchDoc, trashDoc, type DocRow } from "@/lib/data";
import { useOnline } from "@/lib/useOnline";
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export default function DocActions({ doc }: { doc: DocRow }) {
  const { t } = useT(); const router = useRouter(); const online = useOnline(); const [err, setErr] = useState(""); const [img, setImg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function open(dl: boolean) {
    setErr(""); setBusy(true);
    try {
      const b = await fileOf(doc); if (!b) { setErr(online ? t("Could not open the document.") : t("This file isn't saved for offline use.")); return; }
      const url = URL.createObjectURL(b);
      if (dl) { const a = document.createElement("a"); a.href = url; a.download = `${doc.title}.${EXT[b.type] ?? "bin"}`; a.click(); } else if (b.type.startsWith("image/")) setImg(url); else window.open(url, "_blank");
    } catch { setErr(t("Could not open the document.")); } finally { setBusy(false); }
  }
  async function act(fn: () => Promise<void>) { setErr(""); if (!online) return setErr(t("Needs an internet connection.")); try { await fn(); } catch { setErr(t("Could not complete the action.")); } }
  const edit = !doc.pending; const chip = { background: "none", minHeight: 44 } as const;
  return (<div style={{ display: "grid", gap: 10 }}>
    <button className="btn" disabled={busy} onClick={() => open(false)}>{t("Open document")}</button>
    <button className="btn ghost" disabled={busy} onClick={() => open(true)}>{t("Download")}</button>
    {edit && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="chip g" style={chip} onClick={() => { const n = prompt(t("New name"), doc.title)?.trim(); if (n) act(() => patchDoc(doc.id, { title: n })); }}>{t("Rename")}</button>
      <button className="chip g" style={chip} onClick={() => act(() => patchDoc(doc.id, { is_favorite: !doc.is_favorite }))}>{doc.is_favorite ? t("Remove from favorites") : t("Add to favorites")}</button>
      <button className="chip g" style={chip} onClick={() => act(() => patchDoc(doc.id, { archived_at: doc.archived_at ? null : new Date().toISOString() }))}>{doc.archived_at ? t("Unarchive") : t("Archive")}</button>
      <button className="chip g" style={chip} onClick={() => { const n = prompt(t("Notes"), doc.notes ?? ""); if (n !== null) act(() => patchDoc(doc.id, { notes: n || null })); }}>{t("Notes")}</button>
      <button className="chip tr" style={chip} onClick={() => { if (confirm(t("Move this document to trash?"))) act(async () => { await trashDoc(doc.id); router.replace("/"); }); }}>{t("Delete")}</button></div>}
    {err && <div className="err" role="alert">{err}</div>}
    {img && <div className="viewer" onClick={() => setImg(null)}><img src={img} alt={doc.title} /><button className="ib" style={{ position: "fixed", top: 14, insetInlineEnd: 14 }} aria-label={t("Close")}>✕</button></div>}</div>);
}
