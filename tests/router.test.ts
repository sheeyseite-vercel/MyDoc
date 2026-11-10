import { describe, it, expect, beforeEach } from "vitest";
import { run, classify, ProviderError, _reset, type Provider } from "../lib/ai/router";
const ok = (id: string, caps: Provider["caps"] = ["chat"]): Provider => ({ id, model: "m", caps, call: async () => id });
const bad = (id: string, kind: ProviderError["kind"]): Provider => ({ id, model: "m", caps: ["chat"], call: async () => { throw new ProviderError(kind); } });
const fast = { timeoutMs: 1000, backoffMs: 1 };
beforeEach(_reset);
describe("router", () => {
  it("classifies 429 and quota text", () => { expect(classify(429)).toBe("quota"); expect(classify(400, "quota exceeded")).toBe("quota"); expect(classify(401)).toBe("auth"); });
  it("switches on quota", async () => { const r = await run([bad("a", "quota"), ok("b")], "chat", { prompt: "x" }, fast); expect(r.provider).toBe("b"); expect(r.switched).toBe(true); });
  it("skips a provider with a bad key and uses the next", async () => { const r = await run([bad("a", "auth"), ok("b")], "chat", { prompt: "x" }, fast); expect(r.provider).toBe("b"); });
  it("reports auth only when every provider has a bad key", async () => { await expect(run([bad("a", "auth"), bad("b", "auth")], "chat", { prompt: "x" }, fast)).rejects.toMatchObject({ kind: "auth" }); });
  it("moves on after a rejected request or missing model", async () => { const r = await run([bad("a", "bad_request"), ok("b")], "chat", { prompt: "x" }, fast); expect(r.provider).toBe("b"); });
  it("skips providers lacking vision", async () => { const r = await run([ok("a"), ok("v", ["chat", "vision"])], "vision", { prompt: "x" }, fast); expect(r.provider).toBe("v"); });
  it("fails when no provider supports the task", async () => { await expect(run([ok("a")], "vision", { prompt: "x" }, fast)).rejects.toBeInstanceOf(ProviderError); });
  it("fails when all providers fail", async () => { await expect(run([bad("a", "quota"), bad("b", "quota")], "chat", { prompt: "x" }, fast)).rejects.toBeInstanceOf(ProviderError); });
});
