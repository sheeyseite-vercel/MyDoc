"use client";
import { useEffect } from "react";
import { useT } from "./LangProvider";
import { syncOutbox, useStore } from "@/lib/data";
// لا إشعار «دون إنترنت»: التطبيق يعمل دونه. يظهر شريط فقط إذا فشلت مزامنة عنصر.
export default function OfflineBar() {
  const { t } = useT(); const s = useStore();
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);
  return s.failed ? <button type="button" role="status" className="toast" onClick={() => void syncOutbox()} style={{ position: "fixed", top: 10, left: 16, right: 16, zIndex: 90, textAlign: "center", color: "var(--text)", font: "inherit" }}>{t("{n} item(s) could not sync. Tap to retry.", { n: s.failed })}</button> : null;
}
