// طبقة موحدة لمزودي AI مع تبديل تلقائي. المفاتيح من متغيرات البيئة على الخادم فقط.
export type Cap = "chat" | "vision" | "longContext";
export type ErrKind = "quota" | "auth" | "bad_request" | "transient";
export type AIInput = { prompt: string; system?: string; image?: { mime: string; b64: string } };
export class ProviderError extends Error { constructor(public kind: ErrKind, public status?: number) { super(kind); } }
export interface Provider { id: string; model: string; caps: Cap[]; call(input: AIInput, signal: AbortSignal): Promise<string>; }

export function classify(status: number, body = ""): ErrKind {
  if (status === 429 || /quota|rate.?limit|resource_exhausted/i.test(body)) return "quota";
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

export async function run(chain: Provider[], need: Cap, input: AIInput, opts = { timeoutMs: 25000, backoffMs: 400 }) {
  const candidates = chain.filter((p) => p.caps.includes(need) && available(p));
  if (!candidates.length) throw new ProviderError("transient");
  for (const p of candidates) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await p.call(input, AbortSignal.timeout(opts.timeoutMs));
        fails.delete(key(p));
        return { text, provider: p.id, model: p.model, switched: p !== candidates[0] };
      } catch (e) {
        const kind = e instanceof ProviderError ? e.kind : "transient";
        if (kind === "auth" || kind === "bad_request") throw e; // خطأ إعداد أو طلب: لا تبديل
        if (kind === "quota") { cooldown.set(key(p), Date.now() + 60_000); break; }
        const n = (fails.get(key(p)) ?? 0) + 1; fails.set(key(p), n);
        if (n >= 3) { cooldown.set(key(p), Date.now() + 30_000); break; } // Circuit Breaker
        await new Promise((r) => setTimeout(r, opts.backoffMs * 2 ** attempt));
      }
    }
  }
  throw new ProviderError("transient");
}
