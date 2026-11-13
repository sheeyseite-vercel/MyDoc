"use client";
import { useEffect } from "react";
import { useT } from "./LangProvider";
import { syncOutbox, useStore } from "@/lib/data";
// لا إشعار «دون إنترنت»: التطبيق يعمل دونه. يظهر شريط فقط إذا فشلت مزامنة عنصر.
export default function OfflineBar() {
  const { t } = useT(); const s = useStore();
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);
  useEffect(() => { // منع التكبير بالقرصة والنقر المزدوج وتحريك الصفحة (iOS وسطح المكتب أيضاً)
    const stop = (e: Event) => e.preventDefault();
    const wh = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    document.addEventListener("gesturestart", stop); document.addEventListener("gesturechange", stop); document.addEventListener("wheel", wh, { passive: false });
    return () => { document.removeEventListener("gesturestart", stop); document.removeEventListener("gesturechange", stop); document.removeEventListener("wheel", wh); };
  }, []);
  return s.failed ? <button type="button" role="status" className="toast" onClick={() => void syncOutbox()} style={{ position: "fixed", top: 10, left: 16, right: 16, zIndex: 90, textAlign: "center", color: "var(--text)", font: "inherit" }}>{t("{n} item(s) could not sync. Tap to retry.", { n: s.failed })}</button> : null;
}
