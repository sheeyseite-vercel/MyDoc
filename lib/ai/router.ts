// طبقة موحدة لمزودي AI مع تبديل تلقائي. المفاتيح من متغيرات البيئة على الخادم فقط.
export type Cap = "chat" | "vision" | "longContext";
export type ErrKind = "quota" | "auth" | "bad_request" | "transient";
export type AIInput = { prompt: string; system?: string; image?: { mime: string; b64: string }; history?: { role: "user" | "assistant"; content: string }[] };
export class ProviderError extends Error { constructor(public kind: ErrKind, public status?: number) { super(kind); } }
export interface Provider { id: string; model: string; caps: Cap[]; call(input: AIInput, signal: AbortSignal): Promise<string>; stream?(input: AIInput, signal: AbortSignal): AsyncGenerator<string>; }

export function classify(status: number, body = ""): ErrKind {
  if (status === 429 || status === 402 || /quota|rate.?limit|resource_exhausted/i.test(body)) return "quota";
  if (status === 401 || status === 403) return "auth";
  if (status >= 500 || status === 408) return "transient";
  return "bad_request";
}
const cooldown = new Map<string, number>(); // مؤقت في الذاكرة (لكل نسخة خادم)
const fails = new Map<string, number>();
const key = (p: Provider) => `${p.id}:${p.model}`;
const available = (p: Provider) => (cooldown.get(key(p)) ?? 0) < Date.now();
export const cooldownInfo = () => [...cooldown].filter(([, t]) => t > Date.now()).map(([k, t]) => ({ key: k, until: t }));
export const _reset = () => { cooldown.clear(); fails.clear(); };

type Opts = { timeoutMs: number; backoffMs: number; onError?: (p: Provider, kind: ErrKind, status?: number) => void };
export async function run(chain: Provider[], need: Cap, input: AIInput, opts: Opts = { timeoutMs: 25000, backoffMs: 400 }) {
  const candidates = chain.filter((p) => p.caps.includes(need) && available(p));
  if (!candidates.length) throw new ProviderError("transient");
  const kinds: ErrKind[] = [];
  for (const p of candidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await p.call(input, AbortSignal.timeout(opts.timeoutMs));
        fails.delete(key(p));
        return { text, provider: p.id, model: p.model, switched: p !== candidates[0] };
      } catch (e) {
        const kind = e instanceof ProviderError ? e.kind : "transient"; const status = e instanceof ProviderError ? e.status : undefined;
        opts.onError?.(p, kind, status);
        if (kind === "auth") { cooldown.set(key(p), Date.now() + 600_000); kinds.push(kind); break; } // مفتاح خاطئ: جرّب غيره وتجاهله 10 دقائق
        if (kind === "bad_request") { if (status === 404 || status === 410) cooldown.set(key(p), Date.now() + 300_000); kinds.push(kind); break; } // نموذج غير موجود أو طلب مرفوض: انتقل للتالي
        if (kind === "quota") { cooldown.set(key(p), Date.now() + 60_000); kinds.push(kind); break; }
        const n = (fails.get(key(p)) ?? 0) + 1; fails.set(key(p), n);
        if (n >= 3) { cooldown.set(key(p), Date.now() + 30_000); kinds.push(kind); break; } // Circuit Breaker
        if (attempt === 1) kinds.push(kind);
        await new Promise((r) => setTimeout(r, opts.backoffMs * 2 ** attempt));
      }
    }
  }
  throw new ProviderError(kinds.length && kinds.every((k) => k === "auth") ? "auth" : "transient");
}

function markFail(p: Provider, kind: ErrKind, status?: number) {
  if (kind === "auth") cooldown.set(key(p), Date.now() + 600_000);
  else if (kind === "bad_request") { if (status === 404 || status === 410) cooldown.set(key(p), Date.now() + 300_000); }
  else if (kind === "quota") cooldown.set(key(p), Date.now() + (status === 402 ? 1_800_000 : 60_000));
  else { const n = (fails.get(key(p)) ?? 0) + 1; fails.set(key(p), n); if (n >= 2) cooldown.set(key(p), Date.now() + 30_000); }
}
export type StreamEvent = { delta: string } | { done: { provider: string; model: string; switched: boolean } };
// بث الإجابة؛ الانتقال لمزود آخر ممكن فقط قبل وصول أول جزء من النص
export async function* runStream(chain: Provider[], need: Cap, input: AIInput, opts: Opts = { timeoutMs: 9000, backoffMs: 0 }): AsyncGenerator<StreamEvent> {
  const candidates = chain.filter((p) => p.caps.includes(need) && available(p));
  if (!candidates.length) throw new ProviderError("transient");
  const kinds: ErrKind[] = [];
  for (const p of candidates) {
    const ac = new AbortController(); const first = setTimeout(() => ac.abort(), opts.timeoutMs); const total = setTimeout(() => ac.abort(), 90_000); let started = false;
    try {
      const it = p.stream ? p.stream(input, ac.signal) : (async function* () { yield await p.call(input, ac.signal); })();
      for await (const d of it) { if (!d) continue; if (!started) { started = true; clearTimeout(first); } yield { delta: d }; }
      if (!started) throw new ProviderError("transient");
      fails.delete(key(p)); yield { done: { provider: p.id, model: p.model, switched: p !== candidates[0] } }; return;
    } catch (e) {
      const kind = e instanceof ProviderError ? e.kind : "transient"; const status = e instanceof ProviderError ? e.status : undefined;
      opts.onError?.(p, kind, status);
      if (started) throw new ProviderError("transient");
      markFail(p, kind, status); kinds.push(kind);
    } finally { clearTimeout(first); clearTimeout(total); }
  }
  throw new ProviderError(kinds.length && kinds.every((k) => k === "auth") ? "auth" : "transient");
}
