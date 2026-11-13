"use client";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";
import { setBillReminder, useStore } from "@/lib/data";
import { pushEnabled } from "@/lib/push";
export default function BillReminder({ category }: { category: string }) {
  const { t } = useT(); const s = useStore(); const day = s.reminders[category] ?? null; const [push, setPush] = useState(true);
  useEffect(() => { void pushEnabled().then(setPush); }, []);
  return (<div className="k" style={{ display: "grid", gap: 10 }}>
    <div className="row"><b>{t("Monthly reminder")}</b><button className="sw" role="switch" aria-checked={day !== null} aria-label={t("Monthly reminder")} onClick={() => void setBillReminder(category, day === null ? 1 : null)}><i /></button></div>
    {day !== null && <div className="row"><span className="m" style={{ fontSize: 14 }}>{t("Day of the month")}</span><select value={day} onChange={(e) => void setBillReminder(category, Number(e.target.value))} style={{ width: 90, height: 44 }}>{Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></div>}
    {day !== null && !push && <div className="m" style={{ fontSize: 12 }}>{t("Turn on notifications in Settings to receive it.")}</div>}</div>);
}
