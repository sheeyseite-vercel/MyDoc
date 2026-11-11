"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useT } from "@/components/LangProvider";
import { allDocs, useStore } from "@/lib/data";
import DocActions from "./DocActions";
import OcrPanel from "./OcrPanel";
function View() {
  const id = useSearchParams().get("id") ?? ""; const { t } = useT(); const s = useStore(); const d = allDocs().find((x) => x.id === id);
  if (!d) return (<main className="wrap">{s.docs === null ? <div className="sk" style={{ flex: 1 }} /> : <div className="empty"><div className="h" style={{ fontSize: 20 }}>{t("Document not found")}</div><Link href="/" className="btn" style={{ padding: "0 28px" }}>{t("Home")}</Link></div>}</main>);
  const rows: [string, string | null][] = [[t("Category"), d.category], [t("Issuer"), d.issuer], [t("Owner"), d.owner_name], [t("Issue date"), d.issue_date], [t("Expiry date"), d.expiry_date], [t("Reference no."), d.reference_no], [t("Notes"), d.notes]];
  return (<main className="wrap">
    <div className="row" style={{ justifyContent: "flex-start", gap: 12 }}><Link href="/" className="ib" aria-label={t("Home")}><svg className="flip" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></Link><h1 className="h g" style={{ fontSize: 28, margin: 0, minWidth: 0 }}>{d.title}</h1></div>
    <div style={{ display: "flex", gap: 8 }}>{d.archived_at && <span className="chip m">{t("Archived")}</span>}{d.pending && <span className={`chip ${d.pending === "failed" ? "tr" : "ty"}`}>{d.pending === "failed" ? t("Sync failed") : t("Waiting to sync")}</span>}</div>
    {rows.filter(([, v]) => v).map(([k, v]) => (<div key={k} className="k"><div className="m" style={{ fontSize: 12 }}>{k}</div>{v}</div>))}
    <DocActions doc={d} />{!d.pending && <OcrPanel id={d.id} status={d.status} />}</main>);
}
export default function Page() { return <Suspense fallback={<main className="wrap"><div className="sk" style={{ flex: 1 }} /></main>}><View /></Suspense>; }
