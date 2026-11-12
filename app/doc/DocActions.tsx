"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import { fileOf, patchDoc, trashDoc, type DocRow } from "@/lib/data";
import { useOnline } from "@/lib/useOnline";
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export default function DocActions({ doc }: { doc: DocRow }) {
  const { t } = useT(); const router = useRouter(); const online = useOnline(); const [err, setErr] = useState(""); const [img, setImg] = useState<string | null>(null); const [shareOpen, setShareOpen] = useState(false); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  async function open(dl: boolean) {
    setErr(""); setBusy(true);
    try {
      const b = await fileOf(doc); if (!b) { setErr(online ? t("Could not open the document.") : t("This file isn't saved for offline use.")); return; }
      const url = URL.createObjectURL(b);
      if (dl) { const a = document.createElement("a"); a.href = url; a.download = `${doc.title}.${EXT[b.type] ?? "bin"}`; a.click(); } else if (b.type.startsWith("image/")) setImg(url); else window.open(url, "_blank");
    } catch { setErr(t("Could not open the document.")); } finally { setBusy(false); }
  }
  async function act(fn: () => Promise<void>) { setErr(""); if (!online) return setErr(t("Needs an internet connection.")); try { await fn(); } catch { setErr(t("Could not complete the action.")); } }
  async function share(hours: number) {
    setErr(""); setNote(""); if (!online) return setErr(t("Needs an internet connection."));
    try { const r = await fetch(`/api/documents/${doc.id}/share?hours=${hours}`); const j = await r.json(); if (!j.url) throw new Error("x"); setShareOpen(false);
      if (navigator.share) { try { await navigator.share({ title: doc.title, url: j.url }); return; } catch { /* ألغى المستخدم */ } }
      await navigator.clipboard?.writeText(j.url); setNote(t("Link copied")); } catch { setErr(t("Could not create the link.")); }
  }
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
    {edit && <button className="btn ghost" onClick={() => setShareOpen(true)}>{t("Share link")}</button>}
    {note && <div className="toast" role="status">{note}</div>}
    {shareOpen && <div className="sheet" onClick={() => setShareOpen(false)}><div role="dialog" aria-modal="true" aria-label={t("Share link")} onClick={(e) => e.stopPropagation()}>
      <h2 className="h" style={{ fontSize: 24, margin: 0 }}>{t("Share link")}</h2><div className="m" style={{ fontSize: 13 }}>{t("Anyone with the link can open the file until it expires.")}</div>
      {([[1, "1 hour"], [24, "24 hours"], [168, "7 days"]] as const).map(([h, l]) => <button key={h} className="btn ghost" onClick={() => share(h)}>{t(l)}</button>)}</div></div>}
    {err && <div className="err" role="alert">{err}</div>}
    {img && <div className="viewer" onClick={() => setImg(null)}><img src={img} alt={doc.title} /><button className="ib" style={{ position: "fixed", top: 14, insetInlineEnd: 14 }} aria-label={t("Close")}>✕</button></div>}</div>);
}
