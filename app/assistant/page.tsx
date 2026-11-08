"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
type Card = { id: string; title: string; category: string | null; expiry_date: string | null };
type Msg = { role: "user" | "ai"; text: string; cards?: Card[] };
export default function Assistant() {
  const [msgs, setMsgs] = useState<Msg[]>([]); const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(""); const [toast, setToast] = useState(""); const conv = useRef<string>(); const ctl = useRef<AbortController>(); const last = useRef("");
  async function send(text: string) {
    if (!text.trim() || busy) return; last.current = text; setErr(""); setToast(""); setBusy(true); setInput("");
    setMsgs((m) => [...m, { role: "user", text }]); ctl.current = new AbortController();
    try {
      const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, conversationId: conv.current }), signal: ctl.current.signal });
      const j = await r.json().catch(() => ({}));
      if (j.error === "consent_required") setErr("فعّل تحليل الوثائق بالذكاء الاصطناعي من الإعدادات لاستخدام المساعد.");
      else if (j.error === "no_provider" || j.error === "config_error") setErr("المساعد غير مُعدّ بعد: لا يوجد مزود ذكاء اصطناعي صالح.");
      else if (!r.ok) setErr("تعذر الاتصال بالمساعد الآن. أعد المحاولة لاحقاً.");
      else { conv.current = j.conversationId; if (j.switched) setToast("وصل النموذج الحالي إلى حد الاستخدام، انتقلنا إلى نموذج بديل."); setMsgs((m) => [...m, { role: "ai", text: j.answer, cards: j.cards }]); }
    } catch (e) { if ((e as Error).name !== "AbortError") setErr("انقطع الاتصال."); }
    setBusy(false);
  }
  return (<main className="wrap"><div className="row"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>المساعد</h1><button className="chip g" style={{ background: "none", minHeight: 40 }} onClick={() => { setMsgs([]); conv.current = undefined; setErr(""); }}>محادثة جديدة</button></div>
    {!msgs.length && <div className="k m">اسأل عن وثائقك، مثلاً: «أين عقد الإيجار؟» أو «ما الوثائق التي تنتهي هذا الشهر؟»</div>}
    {msgs.map((m, i) => (<div key={i} style={{ display: "grid", gap: 8 }}><div className={`bub ${m.role === "user" ? "me" : "ai"}`}>{m.text}</div>
      {m.role === "ai" && <button className="chip m" style={{ background: "none", alignSelf: "flex-end", minHeight: 36 }} onClick={() => navigator.clipboard?.writeText(m.text)}>نسخ</button>}
      {m.cards?.map((c) => (<div key={c.id} className="k" style={{ borderColor: "var(--gold)" }}><b>{c.title}</b><div className="m" style={{ fontSize: 12 }}>{[c.category, c.expiry_date].filter(Boolean).join(" • ")}</div>
        <Link href={`/documents/${c.id}`} className="btn" style={{ height: 44, marginTop: 10 }}>فتح الوثيقة</Link></div>))}</div>))}
    {toast && <div className="toast" role="status">{toast}</div>}
    {err && <div className="err" role="alert">{err} {last.current && !err.includes("فعّل") && <button className="chip g" style={{ background: "none" }} onClick={() => send(last.current)}>إعادة المحاولة</button>}</div>}
    <div className="m" style={{ fontSize: 12 }}>الملخصات للمساعدة فقط، والوثيقة الأصلية هي المرجع.</div>
    <form onSubmit={(e) => { e.preventDefault(); send(input); }} style={{ display: "flex", gap: 8 }}><input aria-label="رسالة" placeholder="اسأل عن وثائقك…" value={input} onChange={(e) => setInput(e.target.value)} />
      {busy ? <button type="button" className="btn ghost" style={{ padding: "0 18px" }} onClick={() => ctl.current?.abort()}>إيقاف</button> : <button className="btn" style={{ padding: "0 22px" }}>إرسال</button>}</form>
    <Nav active="/assistant" /></main>);
}
