import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { run, ProviderError } from "@/lib/ai/router";
import { buildChain } from "@/lib/ai/providers";
import { DAILY_LIMIT, since24h } from "@/lib/ai/limit";
export const maxDuration = 60;
const PROMPT = 'Read this document and return ONLY JSON, no other text: {"title":null,"category":null,"issuer":null,"issue_date":null,"expiry_date":null,"reference_no":null}. "title" is a short name such as "Passport — 2028" (in the document\'s language). "category" must be one of ID, Contract, Invoice, Certificate, Medical, Other. Dates are YYYY-MM-DD. Use null when a value is unclear; never guess.';
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const str = (v: unknown, n = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const [u, prof, used] = await Promise.all([sb.auth.getUser(), sb.from("profiles").select("ai_consent").maybeSingle(), sb.from("ai_usage_logs").select("id", { count: "exact", head: true }).eq("status", "ok").gte("created_at", since24h())]);
  const user = u.data.user; if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prof.data?.ai_consent) return NextResponse.json({ error: "consent_required" }, { status: 403 });
  if ((used.count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: "limit_reached" }, { status: 429 });
  const f = (await req.formData().catch(() => null))?.get("file");
  if (!(f instanceof File) || f.size > 10 * 1024 * 1024 || !/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(f.type)) return NextResponse.json({ error: "bad_file" }, { status: 400 });
  try {
    const r = await run(buildChain(), "vision", { prompt: PROMPT, image: { mime: f.type, b64: Buffer.from(await f.arrayBuffer()).toString("base64") } });
    void sb.from("ai_usage_logs").insert({ user_id: user.id, provider: r.provider, model: r.model, status: "ok" });
    const j = JSON.parse(r.text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ title: str(j.title), category: ["ID", "Contract", "Invoice", "Certificate", "Medical", "Other"].includes(j.category) ? j.category : null, issuer: str(j.issuer), issue_date: date(j.issue_date), expiry_date: date(j.expiry_date), reference_no: str(j.reference_no, 60) });
  } catch (e) { return NextResponse.json({ error: e instanceof ProviderError && e.kind === "auth" ? "config_error" : "extract_failed" }, { status: 502 }); }
}
