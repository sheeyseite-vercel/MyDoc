"use client";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { CatIcon, DeltaText } from "@/components/BillBits";
import { allBills, useStore } from "@/lib/data";
import { useEffect, useState } from "react";
import { CATS, deltas, getAlertPct, group, money, setAlertPct } from "@/lib/bills";
export default function Bills() {
  const { t, lang } = useT(); const s = useStore(); const g = group(allBills()); const [thr, setThr] = useState(10); useEffect(() => setThr(getAlertPct()), []);
  return (<main className="wrap">
    <div className="row"><h1 className="h" style={{ fontSize: 30, margin: 0 }}>{t("Bills")}</h1><Link href="/bills/new" className="addbtn" style={{ height: 46 }}>+ {t("Add bill")}</Link></div>
    <div className="row" style={{ gap: 10 }}><Link href="/bills/report" className="chip g" style={{ minHeight: 40, display: "flex", alignItems: "center" }}>{t("Yearly report")}</Link>
      <label style={{ flexDirection: "row", alignItems: "center", gap: 8, fontSize: 12 }}>{t("Alert when a bill rises by more than")}<input type="number" inputMode="numeric" min={0} max={500} value={thr} onChange={(e) => { const n = Math.max(0, Number(e.target.value) || 0); setThr(n); setAlertPct(n); }} style={{ width: 64, height: 40, padding: "0 8px" }} aria-label="%" />%</label></div>
    {s.bills === null && !s.outBills.length ? <div className="sk" style={{ flex: 1 }} aria-busy="true" /> : <div className="cgrid">
      {CATS.map(([c, name]) => { const asc = [...(g.get(c) ?? [])].sort((a, b) => a.period.localeCompare(b.period)); const last = asc[asc.length - 1]; const d = last ? deltas(asc).get(last.id) : undefined;
        return (<Link key={c} href={`/bills/${c}`} className="k bcard"><span className="ico"><CatIcon cat={c} /></span><b>{t(name)}</b>
          {last ? <><span className="h" style={{ fontSize: 20 }}>{money(last.amount, last.currency, lang)}</span>{d ? <DeltaText d={d} cur={last.currency} lang={lang} noChange={t("No change")} /> : <span className="m" style={{ fontSize: 12 }}>{asc.length} {t("Bills").toLowerCase()}</span>}</>
            : <span className="m" style={{ fontSize: 12 }}>{t("No bills yet")}</span>}</Link>); })}</div>}
  </main>);
}
