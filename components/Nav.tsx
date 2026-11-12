"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";
import { CATS } from "@/lib/bills";
import { useStore } from "@/lib/data";
const items = [["/", "Home"], ["/bills", "Bills"], ["/assistant", "Assistant"], ["/alerts", "Alerts"], ["/settings", "Settings"]] as const;
const ROUTES = ["/", "/bills", "/alerts", "/settings", "/assistant", "/upload", "/folders", "/trash", "/bills/new", "/bills/report", "/scan", "/doc", ...CATS.map((c) => `/bills/${c[0]}`)];
export default function Nav() {
  const { t } = useT(); const path = usePathname(); const [pend, setPend] = useState<string | null>(null); const login = path.startsWith("/login");
  useStore(); // يبدأ تحميل البيانات المخزّنة فوراً
  useEffect(() => setPend(null), [path]);
  useEffect(() => { // تسخين صفحات التطبيق للعمل دون إنترنت (مرة كل 6 ساعات)
    if (login || !("serviceWorker" in navigator)) return; const last = Number(localStorage.getItem("mydoc.warm") || 0); if (Date.now() - last < 6 * 3600e3) return;
    navigator.serviceWorker.ready.then((r) => { r.active?.postMessage({ type: "warm", urls: ROUTES }); localStorage.setItem("mydoc.warm", String(Date.now())); }).catch(() => {});
  }, [login]);
  if (login) return null;
  const cur = items.slice(1).find(([h]) => path.startsWith(h))?.[0] ?? "/"; const act = pend ?? cur;
  return (<nav className="nv" aria-label={t("Navigation")}>{items.map(([href, label]) => (
    <Link key={href} href={href} onClick={() => setPend(href)} className={act === href ? "on" : ""} aria-current={act === href ? "page" : undefined}>{t(label)}</Link>))}</nav>);
}
