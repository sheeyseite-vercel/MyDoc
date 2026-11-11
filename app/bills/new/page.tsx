"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shrink, extOf } from "@/lib/image";
import { useT } from "@/components/LangProvider";
import { CatIcon } from "@/components/BillBits";
import { enqueueBill, getUid } from "@/lib/data";
import { CATS, CURRENCIES } from "@/lib/bills";
const num = (s: string) => Number(s.trim().replace(",", "."));
export default function NewBill() {
  const { t } = useT(); const router = useRouter();
  const [cat, setCat] = useState("electricity"); const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); const [amount, setAmount] = useState(""); const [cur, setCur] = useState("EUR");
  const [usage, setUsage] = useState(""); const [note, setNote] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  useEffect(() => { const c = new URLSearchParams(window.location.search).get("cat"); if (c && CATS.some((x) => x[0] === c)) setCat(c); setCur(localStorage.getItem("billCur") ?? "EUR"); }, []);
  const unit = CATS.find((c) => c[0] === cat)?.[2] ?? "";
  async function save(e: React.FormEvent) {
    e.preventDefault(); const n = num(amount); if (!amount.trim() || !isFinite(n) || n < 0) return setMsg(t("Invalid amount.")); setBusy(true); setMsg("");
    const uid = await getUid(); if (!uid) return router.replace("/login");
    const id = crypto.randomUUID(); const f = file ? await shrink(file) : null; const path = f ? `${uid}/bills/${id}.${extOf(f)}` : null; const u = usage.trim() ? num(usage) : null; const ok = u != null && isFinite(u);
    await enqueueBill({ uid, file: f, row: { id, category: cat, period: `${month}-01`, amount: n, currency: cur, usage: ok ? u : null, usage_unit: ok && unit ? unit : null, note: note.trim() || null, storage_path: path, mime: f?.type ?? null } });
    localStorage.setItem("billCur", cur); router.replace(`/bills/${cat}`); // يُحفظ محلياً فوراً ويُزامَن في الخلفية
  }
  return (<main className="wrap">
    <div className="row" style={{ justifyContent: "flex-start", gap: 12 }}><Link href="/bills" className="ib" aria-label={t("Bills")}><svg className="flip" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></Link><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Add bill")}</h1></div>
    <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
      <div className="catpick" role="radiogroup" aria-label={t("Category")}>{CATS.map(([c, n]) => <button type="button" key={c} role="radio" aria-checked={cat === c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}><CatIcon cat={c} />{t(n)}</button>)}</div>
      <div className="fcard">
        <label>{t("Month")}<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required /></label>
        <div style={{ display: "flex", gap: 10 }}><label style={{ flex: 1 }}>{t("Amount")}<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" dir="ltr" required /></label>
          <label style={{ width: 110 }}>{t("Currency")}<select value={cur} onChange={(e) => setCur(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label></div>
        {unit && <label>{t("Usage (optional)")} ({unit})<input inputMode="decimal" value={usage} onChange={(e) => setUsage(e.target.value)} dir="ltr" /></label>}
        <label>{t("Note (optional)")}<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <label className="drop" style={{ padding: 16 }}><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => { const x = e.target.files?.[0]; if (x && x.size <= 15 * 1024 * 1024) setFile(x); }} />
          <b style={{ fontSize: 14 }}>{file ? file.name : t("Invoice photo (optional)")}</b><span className="m" style={{ fontSize: 12 }}>{t("PDF, JPG, PNG or WEBP · up to 15 MB")}</span></label></div>
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn" disabled={busy}>{busy ? t("Saving…") : t("Save")}</button>
    </form></main>);
}
