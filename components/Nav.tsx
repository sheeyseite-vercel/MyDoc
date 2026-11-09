"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "./LangProvider";
const items = [["/", "Home"], ["/assistant", "Assistant"], ["/alerts", "Alerts"], ["/settings", "Settings"]] as const;
export default function Nav() {
  const { t } = useT(); const path = usePathname(); const [pend, setPend] = useState<string | null>(null);
  useEffect(() => setPend(null), [path]);
  if (path.startsWith("/login")) return null;
  const cur = pend ?? (path.startsWith("/assistant") ? "/assistant" : path.startsWith("/alerts") ? "/alerts" : path.startsWith("/settings") ? "/settings" : "/");
  return (<nav className="nv" aria-label={t("Navigation")}>{items.map(([href, label]) => (
    <Link key={href} href={href} onClick={() => setPend(href)} className={cur === href ? "on" : ""} aria-current={cur === href ? "page" : undefined}>{t(label)}</Link>))}</nav>);
}
