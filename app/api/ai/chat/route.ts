import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { run, ProviderError } from "@/lib/ai/router";
import { buildChain } from "@/lib/ai/providers";
export const maxDuration = 60;
const STOP = new Set(["أين", "اين", "أرني", "ارني", "افتح", "ابحث", "عن", "لي", "ما", "هل", "التي", "الذي", "هذا", "هذه", "في", "من", "على", "كل", "جميع", "لخص", "الوثائق", "وثيقة", "وثائق", "where", "show", "find", "open", "the", "my"]);
const SYSTEM = "أنت مساعد داخل تطبيق MyDoc لإدارة الوثائق. أجب بإيجاز وبلغة المستخدم اعتماداً على الوثائق المرفقة فقط. لا تخترع وثائق أو روابط أو معرفات. ميّز بين ما هو مكتوب في الوثيقة وما هو استنتاج. إذا وجدت أكثر من وثيقة محتملة فاسأل سؤالاً توضيحياً قصيراً. إذا لم توجد وثيقة فقل ذلك واقترح كلمات بحث بديلة. لا تقدّم استشارة قانونية أو طبية حاسمة؛ الوثيقة الأصلية هي المرجع.";
export async function POST(req: Request) {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const message = String(body?.message ?? "").trim().slice(0, 1000);
  if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });
  const { data: prof } = await sb.from("profiles").select("ai_consent").eq("id", user.id).single();
  if (!prof?.ai_consent) return NextResponse.json({ error: "consent_required" }, { status: 403 });
  const terms = message.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase())).map((w) => (w.length > 4 ? w.replace(/^ال/, "") : w)).slice(0, 6);
  let q = sb.from("documents").select("id,title,category,issuer,expiry_date,ocr_text").is("deleted_at", null).limit(5);
  if (terms.length) q = q.or(terms.flatMap((t) => ["title", "category", "issuer", "notes", "ocr_text"].map((c) => `${c}.ilike.%${t}%`)).join(","));
  const { data: found } = await q;
  let docs = found ?? [];
  if (/تنتهي|انتهاء|expire/i.test(message)) {
    const { data: exp } = await sb.from("documents").select("id,title,category,issuer,expiry_date,ocr_text").is("deleted_at", null).not("expiry_date", "is", null).lte("expiry_date", new Date(Date.now() + 31 * 864e5).toISOString().slice(0, 10)).limit(5);
    docs = [...docs, ...(exp ?? []).filter((d) => !docs.some((x) => x.id === d.id))];
  }
  const ctx = docs.length ? docs.map((d, i) => `[${i + 1}] ${d.title} | الفئة: ${d.category ?? "-"} | الجهة: ${d.issuer ?? "-"} | الانتهاء: ${d.expiry_date ?? "-"} | مقتطف: ${(d.ocr_text ?? "").slice(0, 500)}`).join("\n") : "لا توجد وثائق مطابقة.";
  const { data: sets } = await sb.from("ai_provider_settings").select("provider,priority,enabled");
  const chain = buildChain(sets ?? []);
  if (!chain.length) return NextResponse.json({ error: "no_provider" }, { status: 503 });
  let convId = body?.conversationId as string | undefined;
  if (!convId) { const { data: c } = await sb.from("ai_conversations").insert({ user_id: user.id, title: message.slice(0, 60) }).select("id").single(); convId = c?.id; }
  try {
    const r = await run(chain, "chat", { system: SYSTEM, prompt: `الوثائق المتاحة:\n${ctx}\n\nسؤال المستخدم: ${message}` });
    await sb.from("ai_usage_logs").insert({ user_id: user.id, provider: r.provider, model: r.model, status: "ok" });
    if (convId) await sb.from("ai_messages").insert([{ user_id: user.id, conversation_id: convId, role: "user", content: message }, { user_id: user.id, conversation_id: convId, role: "assistant", content: r.text }]);
    return NextResponse.json({ answer: r.text, switched: r.switched, conversationId: convId, cards: docs.map(({ id, title, category, expiry_date }) => ({ id, title, category, expiry_date })) });
  } catch (e) {
    const kind = e instanceof ProviderError ? e.kind : "transient";
    await sb.from("ai_usage_logs").insert({ user_id: user.id, status: "error", error_kind: kind });
    return NextResponse.json({ error: kind === "auth" ? "config_error" : "unavailable" }, { status: kind === "auth" ? 500 : 503 });
  }
}
