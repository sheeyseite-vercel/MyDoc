import Link from "next/link";
const items = [["/", "الرئيسية"], ["/documents", "وثائقي"], ["/assistant", "المساعد"], ["/alerts", "التنبيهات"], ["/settings", "الإعدادات"]] as const;
export default function Nav({ active }: { active: string }) {
  return (<nav className="nv" aria-label="التنقل">{items.map(([href, label]) => (
    <Link key={href} href={href} className={active === href ? "on" : ""} aria-current={active === href ? "page" : undefined}>{label}</Link>))}</nav>);
}
