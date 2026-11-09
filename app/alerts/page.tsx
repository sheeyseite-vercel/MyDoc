"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { alertsCache, loadAlerts } from "@/lib/data";
export default function Alerts() {
  const { t, lang } = useT(); const [d, setD] = useState({ ...alertsCache }); const [err, setErr] = useState(false);
  useEffect(() => { loadAlerts().then((x) => setD({ ...x })).catch(() => setErr(true)); }, []);
  const days = (s: string) => Math.ceil((new Date(s).getTime() - Date.now()) / 864e5);
  // أحمر خفيف: منتهية/قريبة (≤90 يوماً) • أصفر خفيف: أقل من عام • أخضر خفيف: أكثر من عام
  const st = (s: string) => { const n = days(s); return n < 0 ? [t("Expired"), "tr", t("Expired {n} days ago", { n: -n })] : n <= 90 ? [t("Expiring soon"), "tr", t("{n} days left", { n })] : n <= 365 ? [t("Valid"), "ty", t("{n} days left", { n })] : [t("Valid"), "tg", t("{n} days left", { n })]; };
  const byMonth = new Map<string, NonNullable<typeof d.docs>>();
  (d.docs ?? []).forEach((x) => { const k = new Date(x.expiry_date).toLocaleDateString(lang, { month: "long", year: "numeric" }); byMonth.set(k, [...(byMonth.get(k) ?? []), x]); });
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Dates & alerts")}</h1>
    {err && !d.docs && <div className="err" role="alert">{t("Could not load documents. Check your connection.")}</div>}
    {!d.docs && !err && <div className="sk" style={{ flex: 1 }} aria-busy="true" />}
    {!!d.due?.length && <><div className="h g" style={{ fontSize: 18 }}>{t("Due reminders")}</div>{d.due.map((r) => (<Link key={r.id} href={`/documents/${r.doc.id}`} className="k" style={{ borderColor: "var(--gold)" }}><b>{r.doc.title}</b><div className="m" style={{ fontSize: 12 }}>{t("Reminder {n} days before expiry", { n: r.days_before })}</div></Link>))}</>}
    {[...byMonth].map(([m, list]) => (<div key={m} style={{ display: "grid", gap: 10 }}><div className="h" style={{ fontSize: 18 }}>{m}</div>
      {list.map((x) => { const [label, cls, sub] = st(x.expiry_date); return (<Link key={x.id} href={`/documents/${x.id}`} className="k row"><div><b>{x.title}</b><div className={cls} style={{ fontSize: 12 }}>{x.expiry_date} • {sub}</div></div><span className={`chip ${cls}`}>{label}</span></Link>); })}</div>))}
    {d.docs && !d.docs.length && <div className="empty"><div className="m">{t("No documents with an expiry date. Add a date when uploading to get reminders.")}</div></div>}
  </main>);
}
