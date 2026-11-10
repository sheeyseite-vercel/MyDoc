import { describe, it, expect, beforeEach } from "vitest";
import { run, runStream, classify, ProviderError, _reset, type Provider, type StreamEvent } from "../lib/ai/router";
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

const sp = (id: string, chunks: string[]): Provider => ({ id, model: "m", caps: ["chat"], call: async () => chunks.join(""), async *stream() { for (const c of chunks) yield c; } });
const sf = (id: string, kind: ProviderError["kind"], st?: number): Provider => ({ id, model: "m", caps: ["chat"], call: async () => { throw new ProviderError(kind, st); }, async *stream() { throw new ProviderError(kind, st); } });
const collect = async (chain: Provider[]) => { const o: StreamEvent[] = []; for await (const e of runStream(chain, "chat", { prompt: "x" }, fast)) o.push(e); return o; };
describe("runStream", () => {
  it("streams chunks then reports done", async () => { const o = await collect([sp("s1", ["he", "llo"])]); expect(o.map((e) => ("delta" in e ? e.delta : "|"))).toEqual(["he", "llo", "|"]); });
  it("fails over before the first token", async () => { const o = await collect([sf("s2", "bad_request", 404), sp("s3", ["ok"])]); expect(o[0]).toEqual({ delta: "ok" }); expect(o[1]).toMatchObject({ done: { switched: true } }); });
  it("treats 402 as quota and skips to the next provider", async () => { const o = await collect([sf("s4", "quota", 402), sp("s5", ["ok"])]); expect(o[0]).toEqual({ delta: "ok" }); });
  it("does not switch after output started", async () => { const broken: Provider = { id: "s6", model: "m", caps: ["chat"], call: async () => "", async *stream() { yield "part"; throw new ProviderError("transient"); } }; await expect(collect([broken, sp("s7", ["x"])])).rejects.toBeInstanceOf(ProviderError); });
});
