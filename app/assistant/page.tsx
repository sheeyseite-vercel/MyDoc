"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { useOnline } from "@/lib/useOnline";
type Card = { id: string; title: string; category: string | null; expiry_date: string | null };
type Msg = { role: "user" | "ai"; text: string; cards?: Card[] };
const SUG = ["Calculate 21% VAT on 480", "Explain income tax in simple words", "Which documents expire this month?", "Where is my rental contract?"];
const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const clean = (s: string) => s.replace(/\s*\[\[[^\]]*\]*$/, "");
function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => p.length > 4 && p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p.length > 2 && p.startsWith("`") && p.endsWith("`") ? <code key={i}>{p.slice(1, -1)}</code> : p);
}
function Md({ text }: { text: string }) {
  const out: React.ReactNode[] = []; const st: { list: { ord: boolean; items: string[] } | null } = { list: null };
  const flush = () => { const l = st.list; if (l) { const Tag = l.ord ? "ol" : "ul"; out.push(<Tag key={out.length}>{l.items.map((x, i) => <li key={i}>{inline(x)}</li>)}</Tag>); st.list = null; } };
  for (const line of text.split("\n")) {
    const b = line.match(/^\s*[-*•]\s+(.*)/); const n = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (b || n) { const ord = !!n; if (!st.list || st.list.ord !== ord) { flush(); st.list = { ord, items: [] }; } st.list.items.push((b ?? n)![1]); }
    else { flush(); if (line.trim()) out.push(<p key={out.length}>{inline(line.replace(/^#+\s*/, ""))}</p>); }
  }
  flush(); return <>{out}</>;
}
export default function Assistant() {
  const { t, lang } = useT(); const online = useOnline(); const [msgs, setMsgs] = useState<Msg[]>([]); const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(""); const [toast, setToast] = useState(""); const conv = useRef<string>(); const ctl = useRef<AbortController>(); const last = useRef(""); const end = useRef<HTMLDivElement>(null); const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, err]);
  useEffect(() => { const el = ta.current; if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; } }, [input]);
  const upd = (f: (m: Msg) => Msg) => setMsgs((a) => a.map((x, i) => (i === a.length - 1 ? f(x) : x)));
  function fail(code?: string) {
    if (code === "limit_reached") { setErr(t("Daily assistant limit reached. Try again tomorrow.")); setMsgs((a) => (a.length && a[a.length - 1].role === "ai" && !a[a.length - 1].text ? a.slice(0, -1) : a)); return; }
    setErr(code === "consent_required" ? t("Turn on AI document analysis in Settings to use the assistant.") : code === "no_provider" || code === "config_error" ? t("The assistant is not set up yet: no valid AI provider.") : t("The assistant is unavailable right now. Try again later."));
    setMsgs((a) => (a.length && a[a.length - 1].role === "ai" && !a[a.length - 1].text ? a.slice(0, -1) : a));
  }
  async function send(text: string) {
    if (!text.trim() || busy || !navigator.onLine) return; last.current = text; setErr(""); setToast(""); setBusy(true); setInput("");
    const history = msgs.filter((m) => m.text).slice(-10).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: clean(m.text) }));
    setMsgs((a) => [...a, { role: "user", text }, { role: "ai", text: "" }]); ctl.current = new AbortController();
    try {
      const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, conversationId: conv.current, history }), signal: ctl.current.signal });
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); fail(j.error); return; }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "meta") conv.current = ev.conversationId;
          else if (ev.type === "delta") upd((m) => ({ ...m, text: m.text + ev.text }));
          else if (ev.type === "cards") upd((m) => ({ ...m, cards: ev.cards }));
          else if (ev.type === "done") { if (ev.switched) setToast(t("The current model hit its usage limit, so we switched to a backup model.")); }
          else if (ev.type === "error") fail(ev.error);
        }
      }
    } catch (e) { if ((e as Error).name !== "AbortError") { setErr(t("Connection lost.")); } }
    setBusy(false);
  }
  const d = lang === "ar" ? "rtl" : "ltr"; const lastAi = msgs.length ? msgs[msgs.length - 1] : null;
  return (<main className="chat">
    <header className="chat-h"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Assistant")}</h1>
      <button className="ib" aria-label={t("New chat")} onClick={() => { ctl.current?.abort(); setMsgs([]); conv.current = undefined; setErr(""); setToast(""); setBusy(false); }}><svg {...ic}><path d="M12 5v14M5 12h14" /></svg></button></header>
    <div className="msgs" aria-live="polite">
      {!msgs.length && <div style={{ display: "grid", gap: 10, margin: "auto 0" }}>
        <div className="h" style={{ fontSize: 30, lineHeight: 1.25, marginBottom: 10 }}>{t("How can I help you today?")}</div>
        {SUG.map((s) => <button key={s} className="sug" onClick={() => send(t(s))}>{t(s)}</button>)}</div>}
      {msgs.map((m, i) => m.role === "user" ? <div key={i} className="umsg">{m.text}</div> : (<div key={i} style={{ display: "grid", gap: 8 }}>
        {m.text ? <div className="amsg"><Md text={clean(m.text)} />{busy && i === msgs.length - 1 && <span className="caret" />}</div> : busy && i === msgs.length - 1 ? <div className="typing" role="status" aria-label={t("Thinking…")}><i /><i /><i /></div> : null}
        {!!m.text && !(busy && i === msgs.length - 1) && <button className="chip m" style={{ background: "none", justifySelf: "start", minHeight: 32 }} onClick={() => navigator.clipboard?.writeText(clean(m.text))}>{t("Copy")}</button>}
        {m.cards?.map((c) => (<div key={c.id} className="k" style={{ borderColor: "var(--gold)" }}><b>{c.title}</b><div className="m" style={{ fontSize: 12 }}>{[c.category, c.expiry_date].filter(Boolean).join(" • ")}</div>
          <Link href={`/doc?id=${c.id}`} className="btn" style={{ height: 44, marginTop: 10 }}>{t("Open document")}</Link></div>))}</div>))}
      {!online && <div className="toast" role="status">{t("The assistant needs an internet connection.")}</div>}
      {toast && <div className="toast" role="status">{toast}</div>}
      {err && <div className="err" role="alert">{err} {last.current && !err.includes("Settings") && !err.includes("Ajustes") && !err.includes("الإعدادات") && <button className="chip g" style={{ background: "none" }} onClick={() => { setMsgs((a) => (a.length && a[a.length - 1].role === "ai" && !a[a.length - 1].text ? a.slice(0, -2) : a)); send(last.current); }}>{t("Retry")}</button>}</div>}
      <div ref={end} /></div>
    <form className="composer" style={{ flexDirection: "column", gap: 6 }} onSubmit={(e) => { e.preventDefault(); send(input); }}>
      <div className="cbox"><textarea ref={ta} rows={1} disabled={!online} aria-label={t("Ask me anything…")} placeholder={t("Ask me anything…")} dir={d} value={input} enterKeyHint="send" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
        {busy ? <button type="button" className="send stop" aria-label={t("Stop")} onClick={() => ctl.current?.abort()}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg></button>
          : <button className="send" aria-label={t("Send")} disabled={!input.trim() || !online}><svg {...ic}><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>}</div>
      <div className="m" style={{ fontSize: 11, textAlign: "center" }}>{t("AI can make mistakes. Check important information.")}</div></form>
  </main>);
}
