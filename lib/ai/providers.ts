import { classify, ProviderError, type AIInput, type Cap, type Provider } from "./router";
async function check(res: Response) { if (!res.ok) throw new ProviderError(classify(res.status, await res.text().catch(() => "")), res.status); }
async function* sse(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i: number;
    while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line.startsWith("data:")) { const d = line.slice(5).trim(); if (d && d !== "[DONE]") yield d; } }
  }
}
function msgs(i: AIInput) {
  const user = i.image ? [{ type: "text", text: i.prompt }, { type: "image_url", image_url: { url: `data:${i.image.mime};base64,${i.image.b64}` } }] : i.prompt;
  return [...(i.system ? [{ role: "system", content: i.system }] : []), ...(i.history ?? []).map((h) => ({ role: h.role, content: h.content })), { role: "user", content: user }];
}
function openai(id: string, base: string, keyEnv: string, model: string, caps: Cap[], extra: Record<string, unknown> = {}): Provider | null {
  const key = process.env[keyEnv]; if (!key || !model) return null;
  const req = (i: AIInput, stream: boolean) => ({ method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: msgs(i), ...extra, ...(stream ? { stream: true } : {}) }) });
  return {
    id, model, caps,
    async call(i, signal) { const res = await fetch(`${base}/chat/completions`, { ...req(i, false), signal }); await check(res); const j = await res.json(); return j.choices?.[0]?.message?.content ?? ""; },
    async *stream(i, signal) { const res = await fetch(`${base}/chat/completions`, { ...req(i, true), signal }); await check(res); for await (const d of sse(res)) { try { const t = JSON.parse(d).choices?.[0]?.delta?.content; if (t) yield t as string; } catch { /* تجاهل أجزاء غير مكتملة */ } } },
  };
}
function gemini(): Provider | null {
  const key = process.env.GEMINI_API_KEY; const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite"; if (!key) return null;
  const url = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:${m}`;
  const req = (i: AIInput) => ({ method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" }, body: JSON.stringify({
    ...(i.system ? { system_instruction: { parts: [{ text: i.system }] } } : {}),
    contents: [...(i.history ?? []).map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })), { role: "user", parts: [{ text: i.prompt }, ...(i.image ? [{ inline_data: { mime_type: i.image.mime, data: i.image.b64 } }] : [])] }],
    generationConfig: { maxOutputTokens: 4096 } }) });
  const text = (j: { candidates?: { content?: { parts?: { text?: string }[] } }[] }) => j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { id: "gemini", model, caps: ["chat", "vision", "longContext"],
    async call(i, signal) { const res = await fetch(url("generateContent"), { ...req(i), signal }); await check(res); return text(await res.json()); },
    async *stream(i, signal) { const res = await fetch(url("streamGenerateContent") + "?alt=sse", { ...req(i), signal }); await check(res); for await (const d of sse(res)) { try { const t = text(JSON.parse(d)); if (t) yield t; } catch { /* تجاهل */ } } },
  };
}
// الترتيب الافتراضي من الأسرع للأبطأ في المحادثة. أسماء النماذج قابلة للتغيير من متغيرات البيئة.
export function buildChain(settings: { provider: string; priority: number; enabled: boolean }[] = []): Provider[] {
  const e = process.env; const cf = e.CLOUDFLARE_ACCOUNT_ID; const gm = e.GROQ_MODEL ?? "openai/gpt-oss-120b";
  const all = [
    openai("groq", "https://api.groq.com/openai/v1", "GROQ_API_KEY", gm, ["chat"], gm.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
    openai("sambanova", "https://api.sambanova.ai/v1", "SAMBANOVA_API_KEY", e.SAMBANOVA_MODEL ?? "Meta-Llama-3.3-70B-Instruct", ["chat"]),
    gemini(),
    openai("openrouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY", e.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free", ["chat"]),
    openai("openrouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY", e.OPENROUTER_VISION_MODEL ?? "", ["chat", "vision"]),
    openai("nvidia", "https://integrate.api.nvidia.com/v1", "NVIDIA_API_KEY", e.NVIDIA_MODEL ?? "meta/llama-3.1-70b-instruct", ["chat"]),
    cf ? openai("cloudflare", `https://api.cloudflare.com/client/v4/accounts/${cf}/ai/v1`, "CLOUDFLARE_API_TOKEN", e.CLOUDFLARE_MODEL ?? "@cf/meta/llama-3.1-8b-instruct", ["chat"]) : null,
    openai("ollama", e.OLLAMA_BASE_URL ?? "https://ollama.com/v1", "OLLAMA_API_KEY", e.OLLAMA_MODEL ?? "gpt-oss:120b", ["chat"]),
    openai("siliconflow", e.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.com/v1", "SILICONFLOW_API_KEY", e.SILICONFLOW_MODEL ?? "Qwen/Qwen2.5-72B-Instruct", ["chat"]),
    openai("opencode", e.OPENCODE_BASE_URL ?? "https://opencode.ai/zen/v1", "OPENCODE_API_KEY", e.OPENCODE_MODEL ?? "", ["chat"]),
    e.ANYAPI_BASE_URL ? openai("anyapi", e.ANYAPI_BASE_URL, "ANYAPI_API_KEY", e.ANYAPI_MODEL ?? "", ["chat"]) : null,
    openai("huggingface", "https://router.huggingface.co/v1", "HUGGINGFACE_API_KEY", e.HUGGINGFACE_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct", ["chat"]),
  ].filter((p): p is Provider => !!p);
  if (!settings.length) return all;
  const pr = new Map(settings.map((s) => [s.provider, s]));
  return all.filter((p) => pr.get(p.id)?.enabled !== false).sort((a, b) => (pr.get(a.id)?.priority ?? 99) - (pr.get(b.id)?.priority ?? 99));
}
export const PROVIDER_IDS = ["groq", "sambanova", "gemini", "openrouter", "nvidia", "cloudflare", "ollama", "siliconflow", "opencode", "anyapi", "huggingface"];
