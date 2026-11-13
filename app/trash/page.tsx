"use client";
import { useT } from "@/components/LangProvider";
import { purgeDoc, restoreDoc, useStore } from "@/lib/data";
export default function Trash() {
  const { t } = useT(); const docs = useStore().trash;
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Trash")}</h1>
    {docs && docs.length ? docs.map((d) => (<div key={d.id} className="k"><b>{d.title}</b><div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <button className="btn ghost" style={{ flex: 1, height: 44 }} onClick={() => void restoreDoc(d.id)}>{t("Restore")}</button>
      <button className="btn ghost bad" style={{ flex: 1, height: 44 }} onClick={() => { if (confirm(t("Delete “{title}” forever?", { title: d.title })) && confirm(t("This cannot be undone. Are you sure?"))) void purgeDoc(d); }}>{t("Delete forever")}</button></div></div>))
      : <div className="empty"><div className="h" style={{ fontSize: 20 }}>{t("No deleted documents.")}</div></div>}
  </main>);
}
