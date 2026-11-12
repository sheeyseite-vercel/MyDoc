"use client";
import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { allBills, useStore, type Bill } from "@/lib/data";
import { CATS, money, monthLabel } from "@/lib/bills";
const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const sumBy = (l: Bill[]) => { const m = new Map<string, number>(); l.forEach((b) => m.set(b.currency, (m.get(b.currency) ?? 0) + b.amount)); return [...m]; };
export default function Report() {
  const { t, lang } = useT(); const s = useStore(); const bills = allBills(); const years = [...new Set(bills.map((b) => b.period.slice(0, 4)))].sort().reverse();
  const [year, setYear] = useState(""); const y = year || years[0] || String(new Date().getFullYear()); const list = bills.filter((b) => b.period.startsWith(y)).sort((a, b) => a.period.localeCompare(b.period));
  function csv() {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Month", "Category", "Amount", "Currency", "Usage", "Unit", "Note"], ...list.map((b) => [b.period.slice(0, 7), b.category, b.amount, b.currency, b.usage ?? "", b.usage_unit ?? "", b.note ?? ""])];
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `mydoc-bills-${y}.csv`; a.click();
  }
  return (<main className="wrap">
    <div className="row noprint"><div style={{ display: "flex", gap: 12, alignItems: "center" }}><Link href="/bills" className="ib" aria-label={t("Bills")}><svg {...ic} className="flip"><path d="M15 6l-6 6 6 6" /></svg></Link><h1 className="h" style={{ fontSize: 26, margin: 0 }}>{t("Yearly report")}</h1></div>
      <select value={y} onChange={(e) => setYear(e.target.value)} aria-label={t("Year")} style={{ width: 100, height: 44 }}>{(years.length ? years : [y]).map((x) => <option key={x}>{x}</option>)}</select></div>
    <h1 className="h" style={{ fontSize: 26, margin: 0, display: "none" }} id="print-title">MyDoc — {t("Yearly report")} {y}</h1>
    {s.bills === null && !bills.length ? <div className="sk" style={{ flex: 1 }} aria-busy="true" /> : !list.length ? <div className="empty"><div className="h" style={{ fontSize: 22 }}>{t("No bills yet")}</div></div> : <>
      <div className="k" style={{ display: "grid", gap: 6 }}><div className="m" style={{ fontSize: 12 }}>{t("Total")} • {y}</div>{sumBy(list).map(([c, v]) => <div key={c} className="h" style={{ fontSize: 30 }}>{money(v, c, lang)}</div>)}</div>
      {CATS.map(([c, name]) => { const l = list.filter((b) => b.category === c); if (!l.length) return null; const top = [...l].sort((a, b) => b.amount - a.amount)[0];
        return (<details key={c} className="k"><summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10, listStyle: "none" }}><b>{t(name)}</b><span style={{ textAlign: "end" }}>{sumBy(l).map(([cu, v]) => <div key={cu}><b>{money(v, cu, lang)}</b></div>)}</span></summary>
          <div className="m" style={{ fontSize: 12, margin: "8px 0" }}>{t("Average")}: {sumBy(l).map(([cu, v]) => money(v / l.filter((b) => b.currency === cu).length, cu, lang)).join(" • ")} · {t("Highest")}: {monthLabel(top.period, lang)} ({money(top.amount, top.currency, lang)})</div>
          {l.map((b) => <div key={b.id} className="row" style={{ fontSize: 14, padding: "4px 0" }}><span>{monthLabel(b.period, lang)}</span><span>{money(b.amount, b.currency, lang)}</span></div>)}</details>); })}
      <div className="noprint" style={{ display: "grid", gap: 10 }}><button className="btn" onClick={csv}>{t("Export CSV (Excel)")}</button><button className="btn ghost" onClick={() => window.print()}>{t("Print / Save as PDF")}</button></div></>}
  </main>);
}
