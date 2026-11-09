"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";
import { loadAlerts, loadBills } from "@/lib/data";
const items = [["/", "Home"], ["/bills", "Bills"], ["/assistant", "Assistant"], ["/alerts", "Alerts"], ["/settings", "Settings"]] as const;
let warmed = false;
export default function Nav() {
  const { t } = useT(); const path = usePathname(); const [pend, setPend] = useState<string | null>(null);
  useEffect(() => setPend(null), [path]);
  useEffect(() => { if (!warmed && !path.startsWith("/login")) { warmed = true; loadAlerts().catch(() => {}); loadBills().catch(() => {}); } }, [path]); // تسخين مسبق لعرض فوري
  if (path.startsWith("/login")) return null;
  const cur = items.slice(1).find(([h]) => path.startsWith(h))?.[0] ?? "/";
  const act = pend ?? cur;
  return (<nav className="nv" aria-label={t("Navigation")}>{items.map(([href, label]) => (
    <Link key={href} href={href} onClick={() => setPend(href)} className={act === href ? "on" : ""} aria-current={act === href ? "page" : undefined}>{t(label)}</Link>))}</nav>);
}
