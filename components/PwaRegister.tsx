"use client";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";
export default function PwaRegister() {
  const [online, setOnline] = useState(true); const { t } = useT();
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const on = () => setOnline(true), off = () => setOnline(false); setOnline(navigator.onLine);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online ? null : <div role="status" className="toast" style={{ position: "fixed", top: 10, left: 16, right: 16, zIndex: 9, textAlign: "center" }}>{t("You are offline. Some features are unavailable.")}</div>;
}
