import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { runStream, ProviderError, type ErrKind } from "@/lib/ai/router";
import { buildChain } from "@/lib/ai/providers";
export const maxDuration = 60;
const STOP = new Set(["أين", "اين", "أرني", "ارني", "افتح", "ابحث", "عن", "لي", "ما", "هل", "التي", "الذي", "هذا", "هذه", "في", "من", "على", "كل", "جميع", "لخص", "الوثائق", "وثيقة", "وثائق", "where", "show", "find", "open", "the", "my", "what", "which", "how", "calculate", "explain", "with", "for", "and", "are", "this", "that", "month", "documents", "document"]);
const SYSTEM = (today: string) => `You are MyDoc Assistant, a fast, accurate, friendly general-purpose AI assistant inside a personal document vault app. You can talk about ANY topic, not only the user's documents. Always reply in the same language the user writes in. Be concise by default (short paragraphs, bullet points when helpful) and go deeper only when asked.
For calculations (taxes, VAT, percentages, discounts, interest, loans, unit and currency conversions): state the formula, compute step by step, double-check the arithmetic, and show the final result clearly on its own line. State your assumptions: tax rates vary by country and year; if the country or rate matters and is missing, give the answer for the most common case and say so, or ask one short question.
You have no live data (exchange rates, news, prices); say so when it matters. You are not a lawyer, doctor or accountant: give useful general information and suggest a professional for high-stakes decisions.
The user's stored documents may be listed below. Use them only when the question is about them, never invent document contents. If you rely on specific listed documents, end your reply with a marker like [[docs:1,3]] using their numbers, and write nothing after it.
Today's date is ${today}.`;
type Row = { id: string; title: string; category: string | null; issuer: string | null; expiry_date: string | null; ocr_text: string | null };
const enc = new TextEncoder();
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const message = String(body?.message ?? "").trim().slice(0, 4000);
  if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });
  const history = (Array.isArray(body?.history) ? body.history : []).slice(-10).filter((h: { role?: string; content?: unknown }) => (h?.role === "user" || h?.role === "assistant") && typeof h.content === "string").map((h: { role: "user" | "assistant"; content: string }) => ({ role: h.role, content: h.content.slice(0, 3000) }));
  const sb = await supabaseServer();
  const terms = message.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w.toLowerCase())).map((w) => (w.length > 4 ? w.replace(/^ال/, "") : w)).slice(0, 6);
  const sel = "id,title,category,issuer,expiry_date,ocr_text";
  const findDocs = async (): Promise<Row[]> => {
    const base = sb.from("documents").select(sel).is("deleted_at", null);
    const [a, b] = await Promise.all([
      terms.length ? base.or(terms.flatMap((t) => ["title", "category", "issuer", "notes", "ocr_text"].map((c) => `${c}.ilike.%${t}%`)).join(",")).limit(5) : Promise.resolve({ data: [] as Row[] }),
      /تنتهي|انتهاء|expire|vencen|caducan/i.test(message) ? sb.from("documents").select(sel).is("deleted_at", null).not("expiry_date", "is", null).lte("expiry_date", new Date(Date.now() + 31 * 864e5).toISOString().slice(0, 10)).limit(5) : Promise.resolve({ data: [] as Row[] })]);
    const out = [...((a.data ?? []) as Row[])]; ((b.data ?? []) as Row[]).forEach((d) => { if (!out.some((x) => x.id === d.id)) out.push(d); }); return out.slice(0, 6);
  };
  const [u, prof, docs, sets] = await Promise.all([sb.auth.getUser(), sb.from("profiles").select("ai_consent").maybeSingle(), findDocs(), sb.from("ai_provider_settings").select("provider,priority,enabled")]);
  const user = u.data.user; if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prof.data?.ai_consent) return NextResponse.json({ error: "consent_required" }, { status: 403 });
  const chain = buildChain(sets.data ?? []); if (!chain.length) return NextResponse.json({ error: "no_provider" }, { status: 503 });
  const ctx = docs.length ? docs.map((d, i) => `[${i + 1}] ${d.title} | category: ${d.category ?? "-"} | issuer: ${d.issuer ?? "-"} | expires: ${d.expiry_date ?? "-"} | excerpt: ${(d.ocr_text ?? "").slice(0, 400)}`).join("\n") : "(none matched)";
  const isNew = !body?.conversationId; const convId: string = body?.conversationId || crypto.randomUUID();
  const stream = new ReadableStream({
    async start(c) {
      const send = (o: object) => c.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      send({ type: "meta", conversationId: convId });
      let full = ""; let switched = false; const fl: { provider: string; model: string; error_kind: string }[] = [];
      try {
        for await (const ev of runStream(chain, "chat", { system: SYSTEM(new Date().toISOString().slice(0, 10)), history, prompt: `User's documents that may be relevant:\n${ctx}\n\nUser message: ${message}` },
          { timeoutMs: 9000, backoffMs: 0, onError: (p, k, st) => { fl.push({ provider: p.id, model: p.model, error_kind: `${k}${st ? ":" + st : ""}` }); } })) {
          if ("delta" in ev) { full += ev.delta; send({ type: "delta", text: ev.delta }); } else switched = ev.done.switched;
        }
        const m = full.match(/\[\[docs:([\d,\s]*)\]\]/);
        const cards = m ? m[1].split(",").map((n) => docs[Number(n.trim()) - 1]).filter(Boolean).map(({ id, title, category, expiry_date }) => ({ id, title, category, expiry_date })) : [];
        send({ type: "cards", cards }); send({ type: "done", switched });
        const clean = full.replace(/\s*\[\[docs:[^\]]*\]\]\s*$/, "").trim();
        if (isNew) await sb.from("ai_conversations").insert({ id: convId, user_id: user.id, title: message.slice(0, 60) });
        await sb.from("ai_messages").insert([{ user_id: user.id, conversation_id: convId, role: "user", content: message }, { user_id: user.id, conversation_id: convId, role: "assistant", content: clean }]);
        await sb.from("ai_usage_logs").insert([{ user_id: user.id, status: "ok" }, ...fl.map((f) => ({ user_id: user.id, status: "error", ...f }))]);
      } catch (e) {
        const kind: ErrKind = e instanceof ProviderError ? e.kind : "transient";
        send({ type: "error", error: kind === "auth" ? "config_error" : "unavailable" });
        await sb.from("ai_usage_logs").insert([{ user_id: user.id, status: "error", error_kind: kind }, ...fl.map((f) => ({ user_id: user.id, status: "error", ...f }))]);
      } finally { c.close(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
