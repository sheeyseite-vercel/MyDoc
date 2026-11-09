"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { createReminders } from "@/lib/reminders";
import { useT } from "@/components/LangProvider";
type F = { id: string; field: string; value: string };
const COL: Record<string, string> = { name: "owner_name", issuer: "issuer", issue_date: "issue_date", expiry_date: "expiry_date", reference_no: "reference_no" };
const LBL: Record<string, string> = { name: "Name", issuer: "Issuer", issue_date: "Issue date", expiry_date: "Expiry date", reference_no: "Reference no." };
export default function OcrPanel({ id, hasText, status }: { id: string; hasText: boolean; status: string }) {
  const { t } = useT(); const [fields, setFields] = useState<F[]>([]); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const router = useRouter();
  const load = useCallback(async () => { const { data } = await supabaseBrowser().from("document_extracted_fields").select("id,field,value").eq("document_id", id).eq("confirmed", false); setFields((data as F[]) ?? []); }, [id]);
  useEffect(() => { load(); }, [load]);
  async function extract() {
    setBusy(true); setMsg(""); const r = await fetch(`/api/documents/${id}/ocr`, { method: "POST" }); const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (j.error === "consent_required") return setMsg(t("Enable AI document analysis in Settings first."));
    if (j.error) return setMsg(j.error === "too_large" ? t("File is too large to extract.") : t("Extraction failed. Your original document is safe; try again later."));
    await load(); router.refresh();
  }
  async function confirm(f: F) {
    const sb = supabaseBrowser(); const { data: { user } } = await sb.auth.getUser(); if (!user) return;
    const col = COL[f.field]; if (!col) return;
    const { error } = await sb.from("documents").update({ [col]: f.value }).eq("id", id); if (error) return setMsg(t("Invalid value for this field."));
    await sb.from("document_extracted_fields").update({ confirmed: true }).eq("id", f.id);
    if (col === "expiry_date") await createReminders(sb, user.id, id, f.value);
    await load(); router.refresh();
  }
  async function dismiss(f: F) { await supabaseBrowser().from("document_extracted_fields").delete().eq("id", f.id); load(); }
  return (<div className="k" style={{ display: "grid", gap: 10 }}>
    <div className="row"><b>{t("Text and data extraction")}</b>{status === "failed" && <span className="chip bad">{t("Failed before")}</span>}{hasText && <span className="chip good">{t("Extracted")}</span>}</div>
    <div className="m" style={{ fontSize: 12 }}>{t("Document content is sent to the selected AI provider. Extracted values are suggestions and are not applied without your approval.")}</div>
    <button className="btn ghost" onClick={extract} disabled={busy}>{busy ? t("Extracting…") : hasText ? t("Re-extract") : t("Extract with AI")}</button>
    {msg && <div className="err" role="alert">{msg}</div>}
    {fields.map((f) => (<div key={f.id} className="row"><div><div className="m" style={{ fontSize: 12 }}>{t(LBL[f.field] ?? f.field)}</div>{f.value}</div>
      <div style={{ display: "flex", gap: 6 }}><button className="chip good" style={{ background: "none", minHeight: 40 }} onClick={() => confirm(f)}>{t("Approve")}</button><button className="chip m" style={{ background: "none", minHeight: 40 }} onClick={() => dismiss(f)}>{t("Ignore")}</button></div></div>))}
  </div>);
}
