"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
type Doc = { id: string; title: string; is_favorite: boolean; archived: boolean; notes: string | null };
export default function DocActions({ doc }: { doc: Doc }) {
  const [err, setErr] = useState(""); const router = useRouter(); const sb = supabaseBrowser();
  async function patch(v: Record<string, unknown>, action: string, after?: () => void) {
    setErr(""); const { error } = await sb.from("documents").update({ ...v, updated_at: new Date().toISOString() }).eq("id", doc.id);
    if (error) return setErr("تعذر تنفيذ العملية.");
    const { data: { user } } = await sb.auth.getUser(); if (user) await sb.from("activity_logs").insert({ user_id: user.id, action, document_id: doc.id });
    after ? after() : router.refresh();
  }
  async function open(download: boolean) {
    setErr(""); const r = await fetch(`/api/documents/${doc.id}/url`); const j = await r.json().catch(() => ({}));
    if (!j.url) return setErr("تعذر فتح الوثيقة.");
    if (download) { const a = document.createElement("a"); a.href = j.url; a.download = ""; a.click(); } else window.open(j.url, "_blank", "noopener");
  }
  return (<div style={{ display: "grid", gap: 10 }}>
    <button className="btn" onClick={() => open(false)}>فتح الوثيقة</button>
    <button className="btn ghost" onClick={() => open(true)}>تنزيل</button>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button className="chip g" style={{ background: "none", minHeight: 44 }} onClick={() => { const t = prompt("الاسم الجديد", doc.title)?.trim(); if (t) patch({ title: t }, "rename"); }}>إعادة تسمية</button>
      <button className="chip g" style={{ background: "none", minHeight: 44 }} onClick={() => patch({ is_favorite: !doc.is_favorite }, "favorite")}>{doc.is_favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}</button>
      <button className="chip g" style={{ background: "none", minHeight: 44 }} onClick={() => patch({ archived_at: doc.archived ? null : new Date().toISOString() }, "archive")}>{doc.archived ? "إلغاء الأرشفة" : "أرشفة"}</button>
      <button className="chip g" style={{ background: "none", minHeight: 44 }} onClick={() => { const n = prompt("الملاحظات", doc.notes ?? ""); if (n !== null) patch({ notes: n || null }, "notes"); }}>ملاحظات</button>
      <button className="chip bad" style={{ background: "none", minHeight: 44 }} onClick={() => { if (confirm("نقل الوثيقة إلى المحذوفات؟")) patch({ deleted_at: new Date().toISOString() }, "trash", () => router.replace("/documents")); }}>حذف</button>
    </div>{err && <div className="err" role="alert">{err}</div>}</div>);
}
