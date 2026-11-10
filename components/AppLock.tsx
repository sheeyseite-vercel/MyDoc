"use client";
import { useEffect, useState } from "react";
import PinDialog from "./PinDialog";
import { bioEnabled, hiddenKey, lockDelay, lockEnabled } from "@/lib/applock";
export default function AppLock() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const lock = () => { if (!lockEnabled()) return; sessionStorage.removeItem("lock.ok"); document.documentElement.dataset.lock = "1"; setLocked(true); };
    if (lockEnabled() && !sessionStorage.getItem("lock.ok")) lock(); else document.documentElement.removeAttribute("data-lock");
    const vis = () => {
      if (!lockEnabled()) return;
      if (document.visibilityState === "hidden") { if (Number(sessionStorage.getItem("lock.grace") || 0) > Date.now()) return; localStorage.setItem(hiddenKey, String(Date.now())); }
      else { const h = Number(localStorage.getItem(hiddenKey) || 0); localStorage.removeItem(hiddenKey); if (h && Date.now() - h >= lockDelay() * 1000) lock(); }
    };
    const grace = (e: Event) => { if ((e.target as HTMLElement)?.closest?.("input[type=file], label.drop")) sessionStorage.setItem("lock.grace", String(Date.now() + 180000)); }; // لا تقفل أثناء اختيار ملف/الكاميرا
    document.addEventListener("visibilitychange", vis); document.addEventListener("click", grace, true); window.addEventListener("mydoc-lock", lock);
    return () => { document.removeEventListener("visibilitychange", vis); document.removeEventListener("click", grace, true); window.removeEventListener("mydoc-lock", lock); };
  }, []);
  if (!locked) return null;
  return <PinDialog mode="verify" cancelable={false} bio={bioEnabled()} onSuccess={() => { sessionStorage.setItem("lock.ok", "1"); document.documentElement.removeAttribute("data-lock"); setLocked(false); }} />;
}
