"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useT } from "@/components/LangProvider";
type Card = { id: string; title: string; category: string | null; expiry_date: string | null };
type Msg = { role: "user" | "ai"; text: string; cards?: Card[] };
const SUG = ["Where is my rental contract?", "Which documents expire this month?", "Show my ID documents"];
const spark = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></svg>;
export default function Assistant() {
  const { t, lang } = useT(); const [msgs, setMsgs] = useState<Msg[]>([]); const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(""); const [toast, setToast] = useState(""); const conv = useRef<string>(); const ctl = useRef<AbortController>(); const last = useRef(""); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy, err]);
  async function send(text: string) {
    if (!text.trim() || busy) return; last.current = text; setErr(""); setToast(""); setBusy(true); setInput("");
    setMsgs((m) => [...m, { role: "user", text }]); ctl.current = new AbortController();
    try {
      const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, conversationId: conv.current }), signal: ctl.current.signal });
      const j = await r.json().catch(() => ({}));
      if (j.error === "consent_required") setErr(t("Turn on AI document analysis in Settings to use the assistant."));
      else if (j.error === "no_provider" || j.error === "config_error") setErr(t("The assistant is not set up yet: no valid AI provider."));
      else if (!r.ok) setErr(t("The assistant is unavailable right now. Try again later."));
      else { conv.current = j.conversationId; if (j.switched) setToast(t("The current model hit its usage limit, so we switched to a backup model.")); setMsgs((m) => [...m, { role: "ai", text: j.answer, cards: j.cards }]); }
    } catch (e) { if ((e as Error).name !== "AbortError") setErr(t("Connection lost.")); }
    setBusy(false);
  }
  const d = lang === "ar" ? "rtl" : "ltr";
  return (<main className="chat">
    <header className="chat-h"><div style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="ava">{spark}</span>
      <div><div className="h" style={{ fontSize: 22, lineHeight: 1.2 }}>{t("Assistant")}</div><div className="m" style={{ fontSize: 12 }}>{t("Searches your vault")}</div></div></div>
      <button className="chip g" style={{ background: "none", minHeight: 40 }} onClick={() => { setMsgs([]); conv.current = undefined; setErr(""); setToast(""); }}>{t("New chat")}</button></header>
    <div className="msgs" aria-live="polite">
      {!msgs.length && <div style={{ display: "grid", gap: 10, margin: "auto 0" }}>
        <div style={{ textAlign: "center", display: "grid", gap: 8, justifyItems: "center", marginBottom: 8 }}><span className="ava" style={{ width: 60, height: 60 }}>{spark}</span><div className="h" style={{ fontSize: 24 }}>{t("Ask about your documents")}</div></div>
        {SUG.map((s) => <button key={s} className="sug" onClick={() => send(t(s))}>{t(s)}</button>)}</div>}
      {msgs.map((m, i) => (<div key={i} style={{ display: "grid", gap: 8 }}>
        <div className={`bub ${m.role === "user" ? "me" : "ai"}`}>{m.text}</div>
        {m.role === "ai" && <button className="chip m" style={{ background: "none", justifySelf: "start", minHeight: 34 }} onClick={() => navigator.clipboard?.writeText(m.text)}>{t("Copy")}</button>}
        {m.cards?.map((c) => (<div key={c.id} className="k" style={{ borderColor: "var(--gold)", maxWidth: "88%" }}><b>{c.title}</b><div className="m" style={{ fontSize: 12 }}>{[c.category, c.expiry_date].filter(Boolean).join(" • ")}</div>
          <Link href={`/documents/${c.id}`} className="btn" style={{ height: 44, marginTop: 10 }}>{t("Open document")}</Link></div>))}</div>))}
      {busy && <div className="bub ai typing" role="status" aria-label={t("Thinking…")}><i /><i /><i /></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
      {err && <div className="err" role="alert">{err} {last.current && !err.includes("Settings") && !err.includes("Ajustes") && !err.includes("الإعدادات") && <button className="chip g" style={{ background: "none" }} onClick={() => send(last.current)}>{t("Retry")}</button>}</div>}
      <div ref={end} /></div>
    <div className="m" style={{ fontSize: 11, textAlign: "center" }}>{t("Summaries are for help only; the original document is the reference.")}</div>
    <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
      <input aria-label={t("Ask about your documents…")} placeholder={t("Ask about your documents…")} dir={d} value={input} onChange={(e) => setInput(e.target.value)} />
      {busy ? <button type="button" className="send stop" aria-label={t("Stop")} onClick={() => ctl.current?.abort()}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg></button>
        : <button className="send" aria-label={t("Send")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>}
    </form><Nav active="/assistant" /></main>);
}
