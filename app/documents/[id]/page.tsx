import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import DocActions from "./DocActions";
import OcrPanel from "./OcrPanel";
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const sb = await supabaseServer(); const { t } = await getT();
  const { data: d } = await sb.from("documents").select("*").eq("id", id).is("deleted_at", null).single();
  if (!d) notFound();
  const rows: [string, string | null][] = [[t("Category"), d.category], [t("Issuer"), d.issuer], [t("Owner"), d.owner_name], [t("Issue date"), d.issue_date], [t("Expiry date"), d.expiry_date], [t("Reference no."), d.reference_no], [t("Notes"), d.notes]];
  return (<main className="wrap"><h1 className="h g" style={{ fontSize: 28, margin: 0 }}>{d.title}</h1>
    {d.archived_at && <span className="chip m" style={{ alignSelf: "flex-start" }}>{t("Archived")}</span>}
    {rows.filter(([, v]) => v).map(([k, v]) => (<div key={k} className="k"><div className="m" style={{ fontSize: 12 }}>{k}</div>{v}</div>))}
    <DocActions doc={{ id: d.id, title: d.title, is_favorite: d.is_favorite, archived: !!d.archived_at, notes: d.notes }} />
    <OcrPanel id={d.id} hasText={!!d.ocr_text} status={d.status} /></main>);
}
