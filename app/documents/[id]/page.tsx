import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import DocActions from "./DocActions";
import OcrPanel from "./OcrPanel";
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const sb = await supabaseServer();
  const { data: d } = await sb.from("documents").select("*").eq("id", id).is("deleted_at", null).single();
  if (!d) notFound();
  const rows: [string, string | null][] = [["الفئة", d.category], ["الجهة", d.issuer], ["صاحب الوثيقة", d.owner_name], ["تاريخ الإصدار", d.issue_date], ["تاريخ الانتهاء", d.expiry_date], ["الرقم المرجعي", d.reference_no], ["الملاحظات", d.notes]];
  return (<main className="wrap"><h1 className="h g" style={{ fontSize: 28, margin: 0 }}>{d.title}</h1>
    {d.archived_at && <span className="chip m" style={{ alignSelf: "flex-start" }}>مؤرشفة</span>}
    {rows.filter(([, v]) => v).map(([k, v]) => (<div key={k} className="k"><div className="m" style={{ fontSize: 12 }}>{k}</div>{v}</div>))}
    <DocActions doc={{ id: d.id, title: d.title, is_favorite: d.is_favorite, archived: !!d.archived_at, notes: d.notes }} />
    <OcrPanel id={d.id} hasText={!!d.ocr_text} status={d.status} /><Nav active="/documents" /></main>);
}
