"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LANGS } from "@/lib/i18n";
import { useT } from "@/components/LangProvider";
import InstallButton from "@/components/InstallButton";
import Nav from "@/components/Nav";
export default function Settings() {
  const { t, lang, setLang } = useT(); const [consent, setConsent] = useState(false); const [provs, setProvs] = useState<{ id: string; configured: boolean }[]>([]); const [msg, setMsg] = useState("");
  const [theme, setTheme] = useState("dark"); const router = useRouter();
  useEffect(() => {
    const sb = supabaseBrowser(); setTheme(localStorage.getItem("theme") ?? "dark");
    sb.auth.getUser().then(({ data }) => data.user && sb.from("profiles").select("ai_consent").eq("id", data.user.id).single().then(({ data: p }) => setConsent(!!p?.ai_consent)));
    fetch("/api/ai/status").then((r) => r.json()).then((j) => setProvs(j.providers ?? [])).catch(() => {});
  }, []);
  async function toggle() { const sb = supabaseBrowser(); const { data: { user } } = await sb.auth.getUser(); const v = !consent;
    const { error } = await sb.from("profiles").update({ ai_consent: v }).eq("id", user!.id); if (error) return setMsg(t("Could not save.")); setConsent(v); }
  function flip() { const n = theme === "dark" ? "light" : "dark"; setTheme(n); localStorage.setItem("theme", n); document.documentElement.dataset.theme = n; }
  async function wipeChats() { if (!confirm(t("Delete all chats?"))) return; const { error } = await supabaseBrowser().from("ai_conversations").delete().not("id", "is", null); setMsg(error ? t("Could not delete.") : t("Chats deleted.")); }
  async function out() { await supabaseBrowser().auth.signOut(); router.replace("/login"); router.refresh(); }
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Settings")}</h1>
    <div className="k" style={{ display: "grid", gap: 10 }}><b>{t("Language")}</b>
      <div style={{ display: "flex", gap: 8 }}>{LANGS.map(([c, n]) => <button key={c} className={`chip ${lang === c ? "g" : "m"}`} style={{ background: "none", minHeight: 44, flex: 1 }} aria-pressed={lang === c} onClick={() => setLang(c)}>{n}</button>)}</div></div>
    <div className="k" style={{ display: "grid", gap: 10 }}><b>{t("AI")}</b>
      <div className="m" style={{ fontSize: 12 }}>{t("When enabled, parts of your documents' text may be sent to the selected AI provider for analysis. You can turn this off at any time.")}</div>
      <button className={consent ? "btn ghost" : "btn"} onClick={toggle} aria-pressed={consent}>{consent ? t("Disable AI analysis") : t("Enable AI analysis")}</button>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{provs.map((p) => <span key={p.id} className={`chip ${p.configured ? "good" : "m"}`}>{p.id}: {p.configured ? t("configured") : t("not configured")}</span>)}</div></div>
    <InstallButton /><button className="btn ghost" onClick={flip}>{theme === "dark" ? t("Light mode") : t("Dark mode")}</button>
    <Link href="/folders" className="btn ghost">{t("Folders")}</Link><Link href="/trash" className="btn ghost">{t("Trash")}</Link>
    <a href="/api/export" className="btn ghost">{t("Export my data")}</a><button className="btn ghost" onClick={wipeChats}>{t("Delete chat history")}</button>
    {msg && <div className="toast" role="status">{msg}</div>}<button className="btn ghost bad" onClick={out}>{t("Sign out")}</button><Nav active="/settings" /></main>);
}
