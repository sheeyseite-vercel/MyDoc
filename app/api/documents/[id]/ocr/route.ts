import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { run, ProviderError } from "@/lib/ai/router";
import { buildChain } from "@/lib/ai/providers";
export const maxDuration = 60;
const PROMPT = 'استخرج كل النص الظاهر في هذه الوثيقة، ثم أعد JSON فقط بلا أي نص آخر بالشكل: {"text":"...","fields":{"name":null,"issuer":null,"issue_date":null,"expiry_date":null,"reference_no":null}}. التواريخ بصيغة YYYY-MM-DD. استخدم null إذا لم تكن القيمة واضحة ولا تخمّن.';
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await sb.from("profiles").select("ai_consent").eq("id", user.id).single();
  if (!prof?.ai_consent) return NextResponse.json({ error: "consent_required" }, { status: 403 });
  const { data: doc } = await sb.from("documents").select("id,storage_path,mime,size_bytes").eq("id", id).is("deleted_at", null).single();
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (doc.size_bytes > 10 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });
  await sb.from("documents").update({ status: "processing" }).eq("id", id);
  try {
    const { data: blob, error } = await sb.storage.from("documents").download(doc.storage_path);
    if (error || !blob) throw new ProviderError("transient");
    const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    const r = await run(buildChain(), "vision", { prompt: PROMPT, image: { mime: doc.mime, b64 } });
    const parsed = JSON.parse(r.text.replace(/```json|```/g, "").trim());
    await sb.from("documents").update({ ocr_text: String(parsed.text ?? "").slice(0, 50000), status: "ready" }).eq("id", id);
    await sb.from("document_extracted_fields").delete().eq("document_id", id).eq("confirmed", false);
    const rows = Object.entries(parsed.fields ?? {}).filter(([, v]) => typeof v === "string" && v).map(([field, value]) => ({ user_id: user.id, document_id: id, field, value: String(value), confirmed: false }));
    if (rows.length) await sb.from("document_extracted_fields").insert(rows);
    return NextResponse.json({ ok: true, fields: rows.length });
  } catch (e) {
    await sb.from("documents").update({ status: "failed" }).eq("id", id);
    const kind = e instanceof ProviderError ? e.kind : "parse";
    return NextResponse.json({ error: kind === "auth" ? "config_error" : "ocr_failed" }, { status: 502 });
  }
}
