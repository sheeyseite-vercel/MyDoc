"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
import InstallButton from "@/components/InstallButton";
export default function Settings() {
  const [consent, setConsent] = useState(false); const [provs, setProvs] = useState<{ id: string; configured: boolean }[]>([]); const [msg, setMsg] = useState("");
  const [theme, setTheme] = useState("dark"); const router = useRouter();
  useEffect(() => {
    const sb = supabaseBrowser(); setTheme(localStorage.getItem("theme") ?? "dark");
    sb.auth.getUser().then(({ data }) => data.user && sb.from("profiles").select("ai_consent").eq("id", data.user.id).single().then(({ data: p }) => setConsent(!!p?.ai_consent)));
    fetch("/api/ai/status").then((r) => r.json()).then((j) => setProvs(j.providers ?? [])).catch(() => {});
  }, []);
  async function toggle() { const sb = supabaseBrowser(); const { data: { user } } = await sb.auth.getUser(); const v = !consent;
    const { error } = await sb.from("profiles").update({ ai_consent: v }).eq("id", user!.id); if (error) return setMsg("تعذر الحفظ."); setConsent(v); }
  function flip() { const t = theme === "dark" ? "light" : "dark"; setTheme(t); localStorage.setItem("theme", t); document.documentElement.dataset.theme = t; }
  async function wipeChats() { if (!confirm("حذف كل المحادثات؟")) return; const { error } = await supabaseBrowser().from("ai_conversations").delete().not("id", "is", null); setMsg(error ? "تعذر الحذف." : "تم حذف المحادثات."); }
  async function out() { await supabaseBrowser().auth.signOut(); router.replace("/login"); router.refresh(); }
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>الإعدادات</h1>
    <div className="k" style={{ display: "grid", gap: 10 }}><b>الذكاء الاصطناعي</b>
      <div className="m" style={{ fontSize: 12 }}>عند التفعيل قد تُرسل أجزاء من نص وثائقك إلى مزود الذكاء الاصطناعي المختار لتحليلها. يمكنك التعطيل في أي وقت.</div>
      <button className={consent ? "btn ghost" : "btn"} onClick={toggle} aria-pressed={consent}>{consent ? "تعطيل تحليل الوثائق" : "تفعيل تحليل الوثائق"}</button>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{provs.map((p) => <span key={p.id} className={`chip ${p.configured ? "good" : "m"}`}>{p.id}: {p.configured ? "مُعدّ" : "غير مُعدّ"}</span>)}</div></div>
    <InstallButton /><button className="btn ghost" onClick={flip}>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</button>
    <Link href="/folders" className="btn ghost">المجلدات</Link><Link href="/trash" className="btn ghost">المحذوفات</Link>
    <a href="/api/export" className="btn ghost">تصدير بياناتي</a><button className="btn ghost" onClick={wipeChats}>حذف سجل المحادثات</button>
    {msg && <div className="toast" role="status">{msg}</div>}<button className="btn ghost bad" onClick={out}>تسجيل الخروج</button><Nav active="/settings" /></main>);
}
