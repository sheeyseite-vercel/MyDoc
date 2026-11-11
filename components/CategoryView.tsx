"use client";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/LangProvider";
import { CatIcon, DeltaText } from "@/components/BillBits";
import { allBills, billFileOf, removeBill, useStore, type Bill } from "@/lib/data";
import { useOnline } from "@/lib/useOnline";
import { CATS, deltas, money, monthLabel } from "@/lib/bills";
const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
export default function CategoryView({ category }: { category: string }) {
  const { t, lang } = useT(); const s = useStore(); const online = useOnline(); const [err, setErr] = useState(""); const [img, setImg] = useState<string | null>(null);
  const name = CATS.find((c) => c[0] === category)?.[1] ?? "Other";
  const asc = allBills().filter((b) => b.category === category).sort((a, b) => a.period.localeCompare(b.period));
  const dm = deltas(asc); const last = asc[asc.length - 1]; const prevYear = last ? asc.find((b) => b.period.slice(0, 4) === String(Number(last.period.slice(0, 4)) - 1) && b.period.slice(5, 7) === last.period.slice(5, 7) && b.currency === last.currency) : undefined;
  const yoy = last && prevYear ? { amt: last.amount - prevYear.amount, pct: prevYear.amount ? ((last.amount - prevYear.amount) / prevYear.amount) * 100 : null, use: null } : null;
  const nums = asc.map((b) => b.amount); const cur = last?.currency ?? "EUR"; const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const chart = asc.slice(-12); const max = Math.max(...chart.map((b) => b.amount), 1); const W = 320, H = 130, slot = (W - 20) / Math.max(chart.length, 1), bw = Math.min(24, slot - 8);
  async function open(b: Bill) { setErr(""); const f = await billFileOf(b).catch(() => null); if (!f) return setErr(online ? t("Could not open the document.") : t("This file isn't saved for offline use.")); const u = URL.createObjectURL(f); if (f.type.startsWith("image/")) setImg(u); else window.open(u, "_blank"); }
  async function del(b: Bill) { if (!confirm(t("Delete this bill?"))) return; try { await removeBill(b); } catch { setErr(online ? t("Could not delete.") : t("Needs an internet connection.")); } }
  return (<main className="wrap">
    <div className="row"><div style={{ display: "flex", gap: 12, alignItems: "center" }}><Link href="/bills" className="ib" aria-label={t("Bills")}><svg {...ic} className="flip"><path d="M15 6l-6 6 6 6" /></svg></Link><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t(name)}</h1></div>
      <Link href={`/bills/new?cat=${category}`} className="addbtn" style={{ height: 46 }}>+ {t("Add")}</Link></div>
    {err && <div className="err" role="alert">{err}</div>}
    {s.bills === null && !asc.length ? <div className="sk" style={{ flex: 1 }} aria-busy="true" /> : !last ? <div className="empty"><span className="ico" style={{ width: 52, height: 52 }}><CatIcon cat={category} size={26} /></span><div className="h" style={{ fontSize: 22 }}>{t("No bills yet")}</div><div className="m" style={{ fontSize: 14 }}>{t("Tap Add to record your first bill.")}</div></div> : <>
      <div className="k" style={{ display: "grid", gap: 8 }}>
        <div className="m" style={{ fontSize: 12 }}>{t("Latest")} • {monthLabel(last.period, lang)}</div>
        <div className="h" style={{ fontSize: 34 }}>{money(last.amount, last.currency, lang)}</div>
        {dm.get(last.id) ? <div className="row" style={{ justifyContent: "flex-start", gap: 8, flexWrap: "wrap" }}><span className="m" style={{ fontSize: 12 }}>{t("vs previous month")}</span><DeltaText d={dm.get(last.id)!} cur={cur} lang={lang} noChange={t("No change")} />
          {dm.get(last.id)!.use != null && last.usage_unit && <span className={dm.get(last.id)!.use! > 0 ? "tr" : "tg"} style={{ fontSize: 12, fontWeight: 600 }}>{dm.get(last.id)!.use! > 0 ? "▲" : "▼"} {Math.abs(dm.get(last.id)!.use!).toLocaleString(lang)} {last.usage_unit}</span>}</div> : null}
        {yoy && <div className="row" style={{ justifyContent: "flex-start", gap: 8, flexWrap: "wrap" }}><span className="m" style={{ fontSize: 12 }}>{t("vs same month last year")}</span><DeltaText d={yoy} cur={cur} lang={lang} noChange={t("No change")} /></div>}</div>
      {chart.length > 1 && <div className="k"><svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t(name)}>{chart.map((b, i) => { const h = Math.max(3, (b.amount / max) * (H - 28)); const x = 10 + i * slot + (slot - bw) / 2;
        return (<g key={b.id}><rect x={x} y={H - 20 - h} width={bw} height={h} rx="5" fill="var(--gold)" opacity={i === chart.length - 1 ? 1 : 0.5} /><text x={x + bw / 2} y={H - 6} fontSize="9" textAnchor="middle" fill="var(--muted)">{monthLabel(b.period, lang, true)}</text></g>); })}</svg></div>}
      <div className="cgrid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>{([["Average", avg], ["Highest", Math.max(...nums)], ["Lowest", Math.min(...nums)]] as const).map(([l, v]) => (
        <div key={l} className="k" style={{ padding: 12, textAlign: "center" }}><div className="m" style={{ fontSize: 11 }}>{t(l)}</div><b style={{ fontSize: 14 }}>{money(v, cur, lang)}</b></div>))}</div>
      {[...asc].reverse().map((b) => (<div key={b.id} className="k row"><div><b>{monthLabel(b.period, lang)}</b><div className="m" style={{ fontSize: 12 }}>{b.usage != null && b.usage_unit ? `${b.usage.toLocaleString(lang)} ${b.usage_unit}` : ""}{b.note ? ` ${b.note}` : ""}</div>{b.pending && <span className="chip ty" style={{ marginTop: 4, display: "inline-block" }}>{t("Waiting to sync")}</span>}</div>
        <div style={{ textAlign: "end", display: "grid", gap: 2 }}><b>{money(b.amount, b.currency, lang)}</b>{dm.get(b.id) && <DeltaText d={dm.get(b.id)!} cur={b.currency} lang={lang} noChange={t("No change")} />}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>{b.storage_path && <button className="chip g" style={{ background: "none", minHeight: 32 }} onClick={() => open(b)}>{t("Open invoice")}</button>}<button className="chip m" style={{ background: "none", minHeight: 32 }} onClick={() => del(b)}>{t("Delete")}</button></div></div></div>))}</>}
    {img && <div className="viewer" onClick={() => setImg(null)}><img src={img} alt="" /></div>}
  </main>);
}
