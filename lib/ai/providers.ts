import { classify, ProviderError, type AIInput, type Cap, type Provider } from "./router";
async function check(res: Response) { if (!res.ok) throw new ProviderError(classify(res.status, await res.text().catch(() => "")), res.status); }
function openai(id: string, base: string, keyEnv: string, model: string, caps: Cap[]): Provider | null {
  const key = process.env[keyEnv]; if (!key || !model) return null;
  return { id, model, caps, async call(i: AIInput, signal) {
    const user = i.image ? [{ type: "text", text: i.prompt }, { type: "image_url", image_url: { url: `data:${i.image.mime};base64,${i.image.b64}` } }] : i.prompt;
    const res = await fetch(`${base}/chat/completions`, { method: "POST", signal, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [...(i.system ? [{ role: "system", content: i.system }] : []), { role: "user", content: user }] }) });
    await check(res); const j = await res.json(); return j.choices?.[0]?.message?.content ?? "";
  } };
}
function gemini(): Provider | null {
  const key = process.env.GEMINI_API_KEY; const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest"; if (!key) return null;
  return { id: "gemini", model, caps: ["chat", "vision", "longContext"], async call(i, signal) {
    const parts: unknown[] = [{ text: i.prompt }]; if (i.image) parts.push({ inline_data: { mime_type: i.image.mime, data: i.image.b64 } });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", signal,
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ ...(i.system ? { system_instruction: { parts: [{ text: i.system }] } } : {}), contents: [{ role: "user", parts }] }) });
    await check(res); const j = await res.json(); return j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  } };
}
// أسماء النماذج الافتراضية قابلة للتغيير من متغيرات البيئة؛ تحقق منها في لوحة كل مزود.
export function buildChain(settings: { provider: string; priority: number; enabled: boolean }[] = []): Provider[] {
  const e = process.env; const cf = e.CLOUDFLARE_ACCOUNT_ID;
  const all = [gemini(),
    openai("groq", "https://api.groq.com/openai/v1", "GROQ_API_KEY", e.GROQ_MODEL ?? "llama-3.3-70b-versatile", ["chat"]),
    openai("openrouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY", e.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free", ["chat"]),
    openai("openrouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY", e.OPENROUTER_VISION_MODEL ?? "", ["chat", "vision"]),
    openai("nvidia", "https://integrate.api.nvidia.com/v1", "NVIDIA_API_KEY", e.NVIDIA_MODEL ?? "meta/llama-3.1-70b-instruct", ["chat"]),
    cf ? openai("cloudflare", `https://api.cloudflare.com/client/v4/accounts/${cf}/ai/v1`, "CLOUDFLARE_API_TOKEN", e.CLOUDFLARE_MODEL ?? "@cf/meta/llama-3.1-8b-instruct", ["chat"]) : null,
    openai("ollama", e.OLLAMA_BASE_URL ?? "https://ollama.com/v1", "OLLAMA_API_KEY", e.OLLAMA_MODEL ?? "gpt-oss:120b", ["chat"]),
    e.ANYAPI_BASE_URL ? openai("anyapi", e.ANYAPI_BASE_URL, "ANYAPI_API_KEY", e.ANYAPI_MODEL ?? "", ["chat"]) : null,
    openai("opencode", e.OPENCODE_BASE_URL ?? "https://opencode.ai/zen/v1", "OPENCODE_API_KEY", e.OPENCODE_MODEL ?? "", ["chat"]),
    openai("siliconflow", e.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.com/v1", "SILICONFLOW_API_KEY", e.SILICONFLOW_MODEL ?? "Qwen/Qwen2.5-72B-Instruct", ["chat"]),
    openai("sambanova", "https://api.sambanova.ai/v1", "SAMBANOVA_API_KEY", e.SAMBANOVA_MODEL ?? "Meta-Llama-3.3-70B-Instruct", ["chat"]),
    openai("huggingface", "https://router.huggingface.co/v1", "HUGGINGFACE_API_KEY", e.HUGGINGFACE_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct", ["chat"]),
  ].filter((p): p is Provider => !!p);
  if (!settings.length) return all;
  const pr = new Map(settings.map((s) => [s.provider, s]));
  return all.filter((p) => pr.get(p.id)?.enabled !== false).sort((a, b) => (pr.get(a.id)?.priority ?? 99) - (pr.get(b.id)?.priority ?? 99));
}
export const PROVIDER_IDS = ["gemini", "groq", "openrouter", "nvidia", "cloudflare", "ollama", "anyapi", "opencode", "siliconflow", "sambanova", "huggingface"];
