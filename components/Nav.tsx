"use client";
import Link from "next/link";
import { useT } from "./LangProvider";
const items = [["/", "Home"], ["/assistant", "Assistant"], ["/alerts", "Alerts"], ["/settings", "Settings"]] as const;
export default function Nav({ active }: { active: string }) {
  const { t } = useT();
  return (<nav className="nv" aria-label={t("Navigation")}>{items.map(([href, label]) => (
    <Link key={href} href={href} className={active === href ? "on" : ""} aria-current={active === href ? "page" : undefined}>{t(label)}</Link>))}</nav>);
}
