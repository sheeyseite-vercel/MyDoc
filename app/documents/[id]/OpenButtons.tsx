"use client";
import { useState } from "react";
export default function OpenButtons({ id }: { id: string }) {
  const [err, setErr] = useState("");
  async function go(download: boolean) {
    setErr(""); const r = await fetch(`/api/documents/${id}/url`); const j = await r.json();
    if (!j.url) return setErr("تعذر فتح الوثيقة.");
    if (download) { const a = document.createElement("a"); a.href = j.url; a.download = ""; a.click(); } else window.open(j.url, "_blank", "noopener");
  }
  return (<div style={{ display: "grid", gap: 10 }}><button className="btn" onClick={() => go(false)}>فتح الوثيقة</button>
    <button className="btn ghost" onClick={() => go(true)}>تنزيل</button>{err && <div className="err" role="alert">{err}</div>}</div>);
}
