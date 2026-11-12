"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";
import { useStore } from "@/lib/data";
import { prepareOffline } from "@/lib/offlineStatus";
const items = [["/", "Home"], ["/bills", "Bills"], ["/assistant", "Assistant"], ["/alerts", "Alerts"], ["/settings", "Settings"]] as const;
export default function Nav() {
  const { t } = useT(); const path = usePathname(); const [pend, setPend] = useState<string | null>(null); const login = path.startsWith("/login");
  useStore(); // يبدأ تحميل البيانات المخزّنة فوراً
  useEffect(() => setPend(null), [path]);
  useEffect(() => { // تحضير العمل دون إنترنت: عند أول تشغيل ثم كل 30 دقيقة
    if (login || !navigator.onLine) return; const last = Number(localStorage.getItem("mydoc.warm") || 0); if (Date.now() - last < 30 * 60e3) return; void prepareOffline();
  }, [login]);
  if (login) return null;
  const cur = items.slice(1).find(([h]) => path.startsWith(h))?.[0] ?? "/"; const act = pend ?? cur;
  return (<nav className="nv" aria-label={t("Navigation")}>{items.map(([href, label]) => (
    <Link key={href} href={href} onClick={() => setPend(href)} className={act === href ? "on" : ""} aria-current={act === href ? "page" : undefined}>{t(label)}</Link>))}</nav>);
}
