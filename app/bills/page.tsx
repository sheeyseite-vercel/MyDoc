"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { CatIcon, DeltaText } from "@/components/BillBits";
import { billsCache, loadBills } from "@/lib/data";
import { CATS, deltas, group, money } from "@/lib/bills";
export default function Bills() {
  const { t, lang } = useT(); const [items, setItems] = useState(billsCache.items); const [err, setErr] = useState(false);
  useEffect(() => { loadBills().then((x) => setItems([...x])).catch(() => setErr(true)); }, []);
  const g = group(items ?? []);
  return (<main className="wrap">
    <div className="row"><h1 className="h" style={{ fontSize: 30, margin: 0 }}>{t("Bills")}</h1><Link href="/bills/new" className="addbtn" style={{ height: 46 }}>+ {t("Add bill")}</Link></div>
    {err && !items && <div className="err" role="alert">{t("Could not load documents. Check your connection.")}</div>}
    {!items && !err ? <div className="sk" style={{ flex: 1 }} aria-busy="true" /> : <div className="cgrid">
      {CATS.map(([c, name]) => { const asc = [...(g.get(c) ?? [])].sort((a, b) => a.period.localeCompare(b.period)); const last = asc[asc.length - 1]; const d = last ? deltas(asc).get(last.id) : undefined;
        return (<Link key={c} href={`/bills/${c}`} className="k bcard"><span className="ico"><CatIcon cat={c} /></span><b>{t(name)}</b>
          {last ? <><span className="h" style={{ fontSize: 20 }}>{money(last.amount, last.currency, lang)}</span>{d ? <DeltaText d={d} cur={last.currency} lang={lang} noChange={t("No change")} /> : <span className="m" style={{ fontSize: 12 }}>{asc.length} {t("Bills").toLowerCase()}</span>}</>
            : <span className="m" style={{ fontSize: 12 }}>{t("No bills yet")}</span>}</Link>); })}</div>}
  </main>);
}
