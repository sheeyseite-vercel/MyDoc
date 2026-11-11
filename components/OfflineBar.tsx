"use client";
import { useEffect } from "react";
import { useT } from "./LangProvider";
import { useOnline } from "@/lib/useOnline";
import { syncOutbox, useStore } from "@/lib/data";
export default function OfflineBar() {
  const { t } = useT(); const on = useOnline(); const s = useStore(); const pending = s.outDocs.length + s.outBills.length;
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);
  const msg = !on ? t("You are offline. Your changes will sync when the connection returns.") : s.failed ? t("{n} item(s) could not sync. Tap to retry.", { n: s.failed }) : pending ? t("Syncing {n} item(s)…", { n: pending }) : "";
  return msg ? <button type="button" role="status" className="toast" onClick={() => void syncOutbox()} style={{ position: "fixed", top: 10, left: 16, right: 16, zIndex: 90, textAlign: "center", color: "var(--text)", font: "inherit" }}>{msg}</button> : null;
}
