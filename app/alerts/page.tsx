"use client";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { allDocs, S, useStore, type DocRow } from "@/lib/data";
export default function Alerts() {
  const { t, lang } = useT(); const s = useStore();
  const days = (x: string) => Math.round((new Date(x + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 864e5); // فرق الأيام بالتاريخ المحلي
  // أحمر: منتهية أو ≤90 يوماً • أصفر: أقل من عام • أخضر: أكثر من عام
  const left = (n: number) => (n === 1 ? t("1 day left") : t("{n} days left", { n }));
  const st = (x: string) => { const n = days(x); return n <= 0 ? [t("Expired"), "tr", n === 0 ? t("Expired today") : n === -1 ? t("Expired yesterday") : t("Expired {n} days ago", { n: -n })] : n <= 90 ? [t("Expiring soon"), "tr", left(n)] : n <= 365 ? [t("Valid"), "ty", left(n)] : [t("Valid"), "tg", left(n)]; };
  const docs = allDocs().filter((d) => d.expiry_date && !d.archived_at).sort((a, b) => a.expiry_date!.localeCompare(b.expiry_date!));
  const byMonth = new Map<string, DocRow[]>(); docs.forEach((x) => { const k = new Date(x.expiry_date!).toLocaleDateString(lang, { month: "long", year: "numeric" }); byMonth.set(k, [...(byMonth.get(k) ?? []), x]); });
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Dates & alerts")}</h1>
    {s.docs === null && !docs.length && <div className="sk" style={{ flex: 1 }} aria-busy="true" />}
    {!!S.due?.length && <><div className="h g" style={{ fontSize: 18 }}>{t("Due reminders")}</div>{S.due.map((r) => (<Link key={r.id} href={`/doc?id=${r.doc.id}`} className="k" style={{ borderColor: "var(--gold)" }}><b>{r.doc.title}</b><div className="m" style={{ fontSize: 12 }}>{(r.days_before === 1 ? t("Reminder 1 day before expiry") : t("Reminder {n} days before expiry", { n: r.days_before }))}</div></Link>))}</>}
    {[...byMonth].map(([m, list]) => (<div key={m} style={{ display: "grid", gap: 10 }}><div className="h" style={{ fontSize: 18 }}>{m}</div>
      {list.map((x) => { const [label, cls, sub] = st(x.expiry_date!); return (<Link key={x.id} href={`/doc?id=${x.id}`} className="k row"><div><b>{x.title}</b><div style={{ fontSize: 12, color: "var(--text)" }}>{x.expiry_date} • {sub}</div></div><span className={`chip ${cls}`}>{label}</span></Link>); })}</div>))}
    {s.docs !== null && !docs.length && <div className="empty"><div className="m">{t("No documents with an expiry date. Add a date when uploading to get reminders.")}</div></div>}
  </main>);
}
