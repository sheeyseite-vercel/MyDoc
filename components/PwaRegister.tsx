"use client";
import { useEffect, useState } from "react";
export default function PwaRegister() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const on = () => setOnline(true), off = () => setOnline(false); setOnline(navigator.onLine);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online ? null : <div role="status" className="toast" style={{ position: "fixed", top: 10, left: 16, right: 16, zIndex: 9, textAlign: "center" }}>لا يوجد اتصال بالإنترنت. بعض الميزات غير متاحة.</div>;
}
