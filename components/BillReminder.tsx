"use client";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getUid } from "@/lib/data";
import { pushEnabled } from "@/lib/push";
import { useOnline } from "@/lib/useOnline";
export default function BillReminder({ category }: { category: string }) {
  const { t } = useT(); const online = useOnline(); const [day, setDay] = useState<number | null>(null); const [push, setPush] = useState(true); const [msg, setMsg] = useState("");
  useEffect(() => { void pushEnabled().then(setPush); if (!navigator.onLine) return; supabaseBrowser().from("bill_reminders").select("day").eq("category", category).maybeSingle().then(({ data }) => setDay(data?.day ?? null)); }, [category]);
  async function save(d: number | null) {
    setMsg(""); if (!online) return setMsg(t("Needs an internet connection.")); const sb = supabaseBrowser(); const uid = await getUid(); if (!uid) return;
    const r = d === null ? await sb.from("bill_reminders").delete().eq("category", category).eq("user_id", uid) : await sb.from("bill_reminders").upsert({ user_id: uid, category, day: d, last_sent: null }, { onConflict: "user_id,category" });
    if (r.error) return setMsg(t("Could not save.")); setDay(d);
  }
  return (<div className="k" style={{ display: "grid", gap: 10 }}>
    <div className="row"><b>{t("Monthly reminder")}</b><button className="sw" role="switch" aria-checked={day !== null} aria-label={t("Monthly reminder")} onClick={() => save(day === null ? 1 : null)}><i /></button></div>
    {day !== null && <div className="row"><span className="m" style={{ fontSize: 14 }}>{t("Day of the month")}</span><select value={day} onChange={(e) => save(Number(e.target.value))} style={{ width: 90, height: 44 }}>{Array.from({ length: 28 }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select></div>}
    {day !== null && !push && <div className="m" style={{ fontSize: 12 }}>{t("Turn on notifications in Settings to receive it.")}</div>}
    {msg && <div className="err" role="alert">{msg}</div>}</div>);
}
