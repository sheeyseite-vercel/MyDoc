import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
export default async function Home() {
  const sb = await supabaseServer();
  const { data: recent } = await sb.from("documents").select("id,title,category,mime,expiry_date").is("deleted_at", null).order("created_at", { ascending: false }).limit(5);
  const soon = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  const { data: expiring } = await sb.from("documents").select("id,title,expiry_date").is("deleted_at", null).not("expiry_date", "is", null).lte("expiry_date", soon).order("expiry_date").limit(3);
  const days = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
  return (<main className="wrap">
    <div className="h g" style={{ fontSize: 30 }}>MyDoc</div>
    <Link href="/documents" className="k m">ابحث في وثائقك…</Link>
    {expiring?.map((d) => (<Link key={d.id} href={`/documents/${d.id}`} className="k" style={{ borderColor: "var(--gold)" }}>
      <div className="g" style={{ fontSize: 12, fontWeight: 600 }}>تنبيه</div><div className="h" style={{ fontSize: 20 }}>{d.title}</div>
      <div className="m" style={{ fontSize: 13 }}>{days(d.expiry_date!) < 0 ? "منتهية" : `ينتهي خلال ${days(d.expiry_date!)} يوماً`}</div></Link>))}
    <Link href="/upload" className="btn">+ إضافة وثيقة</Link>
    <div className="h" style={{ fontSize: 19 }}>الأخيرة</div>
    {recent?.length ? recent.map((d) => (<Link key={d.id} href={`/documents/${d.id}`} className="k"><b>{d.title}</b><div className="m" style={{ fontSize: 12 }}>{d.category ?? "بدون فئة"}</div></Link>))
      : <div className="k m">لا توجد وثائق بعد. أضف أول وثيقة لتبدأ.</div>}
    <Nav active="/" /></main>);
}
