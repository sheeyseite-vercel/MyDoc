import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
export default async function Alerts() {
  const sb = await supabaseServer(); const { t, lang } = await getT();
  const { data: docs } = await sb.from("documents").select("id,title,expiry_date").is("deleted_at", null).is("archived_at", null).not("expiry_date", "is", null).order("expiry_date");
  const { data: due } = await sb.from("reminders").select("id,days_before,documents(id,title)").lte("remind_at", new Date().toISOString()).order("remind_at", { ascending: false }).limit(10);
  const days = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
  const st = (d: string) => { const n = days(d); return n < 0 ? [t("Expired"), "bad", t("Expired {n} days ago", { n: -n })] : n <= 90 ? [t("Expiring soon"), "warn", t("{n} days left", { n })] : [t("Valid"), "good", t("{n} days left", { n })]; };
  const byMonth = new Map<string, typeof docs>();
  (docs ?? []).forEach((d) => { const k = new Date(d.expiry_date!).toLocaleDateString(lang, { month: "long", year: "numeric" }); byMonth.set(k, [...(byMonth.get(k) ?? []), d]); });
  const dueList = ((due ?? []) as unknown as { id: string; days_before: number; documents: { id: string; title: string } | { id: string; title: string }[] | null }[]).map((r) => ({ ...r, doc: Array.isArray(r.documents) ? r.documents[0] : r.documents })).filter((r) => r.doc);
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Dates & alerts")}</h1>
    {dueList.length > 0 && <><div className="h g" style={{ fontSize: 18 }}>{t("Due reminders")}</div>{dueList.map((r) => (<Link key={r.id} href={`/documents/${r.doc!.id}`} className="k" style={{ borderColor: "var(--gold)" }}><b>{r.doc!.title}</b><div className="m" style={{ fontSize: 12 }}>{t("Reminder {n} days before expiry", { n: r.days_before })}</div></Link>))}</>}
    {[...byMonth].map(([m, list]) => (<div key={m} style={{ display: "grid", gap: 10 }}><div className="h" style={{ fontSize: 18 }}>{m}</div>
      {list!.map((d) => { const [label, cls, sub] = st(d.expiry_date!); return (<Link key={d.id} href={`/documents/${d.id}`} className="k row"><div><b>{d.title}</b><div className="m" style={{ fontSize: 12 }}>{d.expiry_date} • {sub}</div></div><span className={`chip ${cls}`}>{label}</span></Link>); })}</div>))}
    {!docs?.length && <div className="empty"><div className="m">{t("No documents with an expiry date. Add a date when uploading to get reminders.")}</div></div>}
</main>);
}
