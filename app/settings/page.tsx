"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LANGS } from "@/lib/i18n";
import { bioSupported, disableLock, enableBio, lockDelay, lockMode, setLockDelay, setPin, type LockMode } from "@/lib/applock";
import { useT } from "@/components/LangProvider";
import { useInstall } from "@/components/InstallProvider";
import { cacheAllFiles, clearOffline } from "@/lib/data";
import { buildBackup } from "@/lib/backup";
import { disablePush, enablePush, pushEnabled, syncPushLang } from "@/lib/push";
import LockScreen from "@/components/LockScreen";
const ic = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const chev = <svg {...ic} className="chev"><path d="M6 9l6 6 6-6" /></svg>; const arrow = <svg {...ic} className="chev" style={{ transform: "none" }}><path d="M9 6l6 6-6 6" /></svg>;
const NAMES: Record<string, string> = { gemini: "Gemini", groq: "Groq", openrouter: "OpenRouter", nvidia: "NVIDIA", cloudflare: "Cloudflare", ollama: "Ollama", anyapi: "AnyAPI", opencode: "OpenCode", siliconflow: "SiliconFlow", sambanova: "SambaNova", huggingface: "Hugging Face" };
type P = { id: string; configured: boolean; limited: boolean };
type Target = "pin" | "bio" | "off" | "change";
type Dlg = null | { kind: "verify"; then: Target } | { kind: "set" };
export default function Settings() {
  const { t, lang, setLang } = useT(); const router = useRouter(); const [dl, setDl] = useState(""); const [bk, setBk] = useState(""); const [pushOn, setPushOn] = useState(false); const { installed, open: openInstall } = useInstall();
  const [consent, setConsent] = useState(false); const [provs, setProvs] = useState<P[]>([]); const [msg, setMsg] = useState("");
  const [theme, setTheme] = useState("dark"); const [openL, setOpenL] = useState(false); const [openP, setOpenP] = useState(false);
  const [mode, setMode] = useState<LockMode | null>(null); const [delay, setDelay] = useState(60); const [bioOk, setBioOk] = useState(false); const [dlg, setDlg] = useState<Dlg>(null); const [openS, setOpenS] = useState(false);
  useEffect(() => {
    const sb = supabaseBrowser(); setTheme(localStorage.getItem("theme") ?? "dark");
    setMode(lockMode()); setDelay(lockDelay()); bioSupported().then(setBioOk);
    sb.auth.getSession().then(({ data }) => data.session && sb.from("profiles").select("ai_consent").eq("id", data.session.user.id).single().then(({ data: p }) => setConsent(!!p?.ai_consent)));
    fetch("/api/ai/status").then((r) => r.json()).then((j) => setProvs(j.providers ?? [])).catch(() => {});
  }, []);
  async function toggle() { const sb = supabaseBrowser(); const { data: { session } } = await sb.auth.getSession(); const v = !consent; setConsent(v);
    const { error } = await sb.from("profiles").update({ ai_consent: v }).eq("id", session!.user.id); if (error) { setConsent(!v); setMsg(t("Could not save.")); } }
  function flip() { const n = theme === "dark" ? "light" : "dark"; setTheme(n); localStorage.setItem("theme", n); document.documentElement.dataset.theme = n; }
  async function wipeChats() { if (!confirm(t("Delete all chats?"))) return; const { error } = await supabaseBrowser().from("ai_conversations").delete().not("id", "is", null); setMsg(error ? t("Could not delete.") : t("Chats deleted.")); }
  async function out() { await supabaseBrowser().auth.signOut().catch(() => {}); await clearOffline(); router.replace("/login"); router.refresh(); }
  useEffect(() => { void pushEnabled().then(setPushOn); }, []);
  useEffect(() => { if (pushOn) void syncPushLang(lang); }, [lang, pushOn]);
  async function togglePush() {
    setMsg(""); if (pushOn) { await disablePush(); setPushOn(false); return; }
    const r = await enablePush(lang); if (r === "ok") setPushOn(true); else setMsg(r === "denied" ? t("Notifications are blocked. Allow them in your browser settings.") : r === "unsupported" ? t("Notifications aren't supported here. On iPhone, install the app to the Home Screen first.") : t("Could not enable notifications."));
  }
  async function backup() {
    if (!navigator.onLine) { setMsg(t("Needs an internet connection.")); return; } setBk("…");
    try { const blob = await buildBackup((n, tot) => setBk(`${n}/${tot}`)); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `mydoc-backup-${new Date().toISOString().slice(0, 10)}.zip`; a.click(); setBk(t("Done")); } catch { setBk(""); setMsg(t("Could not create the backup.")); }
  }
  async function downloadAll() { setDl("…"); await cacheAllFiles((n, tot) => setDl(`${n}/${tot}`)); setDl(t("Done")); }
  async function apply(target: Target) {
    setMsg("");
    if (target === "off") { disableLock(); setMode(null); }
    else if (target === "bio") { if (await enableBio()) { setMode("bio"); sessionStorage.setItem("lock.ok", "1"); } else setMsg(t("Biometrics are not available on this device.")); }
    else setDlg({ kind: "set" });
  }
  function request(target: Target) { if (!mode) apply(target); else if (target !== mode) setDlg({ kind: "verify", then: target }); else if (target === "pin") return; }
  const cur = LANGS.find(([c]) => c === lang)?.[1];
  return (<main className="wrap">
    <div className="row"><h1 className="h" style={{ fontSize: 30, margin: 0 }}>{t("Settings")}</h1>
      <button className="ib" onClick={flip} aria-label={t("Toggle light or dark mode")}>{theme === "dark"
        ? <svg {...ic}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></svg>
        : <svg {...ic}><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" /></svg>}</button></div>
    <div className="cap">{t("Language")}</div>
    <div className={`grp ${openL ? "open" : ""}`}>
      <button className="srow" onClick={() => setOpenL(!openL)} aria-expanded={openL}><span className="ico"><svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg></span><span style={{ flex: 1 }}>{t("Language")}</span><span className="m" style={{ fontSize: 14 }}>{cur}</span>{chev}</button>
      {openL && LANGS.map(([c, n]) => <button key={c} className="srow sub" onClick={() => { setLang(c); setOpenL(false); }}><span style={{ flex: 1 }}>{n}</span>{lang === c && <span className="g"><svg {...ic}><path d="M5 12l5 5 9-10" /></svg></span>}</button>)}</div>
    <div className="cap">{t("Security")}</div>
    <div className={`grp ${openS ? "open" : ""}`}>
      <button className="srow" onClick={() => setOpenS(!openS)} aria-expanded={openS}><span className="ico"><svg {...ic}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg></span><span style={{ flex: 1 }}>{t("App lock")}</span><span className="m" style={{ fontSize: 14 }}>{mode === "pin" ? t("PIN") : mode === "bio" ? t("Biometrics") : t("Off")}</span>{chev}</button>
      {openS && ([[null, "Off", ""], ["bio", "Biometrics", "Unlock with fingerprint or face"], ["pin", "PIN", "4-digit code"]] as const).filter(([k]) => k !== "bio" || bioOk).map(([k, l, d]) => (
        <button key={String(k)} className="srow sub" onClick={() => (k === null ? mode && request("off") : request(k))}><span style={{ flex: 1 }}><span style={{ display: "block" }}>{t(l)}</span>{d && <span className="m" style={{ display: "block", fontSize: 12 }}>{t(d)}</span>}</span>{mode === k && <span className="g"><svg {...ic}><path d="M5 12l5 5 9-10" /></svg></span>}</button>))}
      {mode && <>
        <div className="srow sub" style={{ cursor: "default" }}><span style={{ flex: 1 }}>{t("Lock after")}</span>
          <div className="seg" style={{ flex: "none" }}>{([[0, "Immediately"], [60, "1 minute"], [300, "5 minutes"]] as const).map(([n, l]) => <button key={n} className={delay === n ? "on" : ""} style={{ padding: "0 10px", fontSize: 12 }} onClick={() => { setLockDelay(n); setDelay(n); }}>{t(l)}</button>)}</div></div>
        {mode === "pin" && <button className="srow sub" onClick={() => request("change")}><span style={{ flex: 1 }}>{t("Change PIN")}</span>{arrow}</button>}
        <button className="srow sub" onClick={() => window.dispatchEvent(new Event("mydoc-lock"))}><span style={{ flex: 1 }}>{t("Lock now")}</span></button></>}</div>
    {openS && !bioOk && <div className="cap">{t("Biometrics are not available on this device.")}</div>}
    <div className="cap">{t("Locks the app on this device. It does not encrypt your data.")}</div>
    <div className="cap">{t("AI")}</div>
    <div className={`grp ${openP ? "open" : ""}`}>
      <div className="srow" style={{ cursor: "default" }}><span className="ico"><svg {...ic}><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></svg></span><span style={{ flex: 1 }}>{t("AI document analysis")}</span>
        <button className="sw" role="switch" aria-checked={consent} aria-label={t("AI document analysis")} onClick={toggle}><i /></button></div>
      <button className="srow" onClick={() => setOpenP(!openP)} aria-expanded={openP}><span className="ico"><svg {...ic}><path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4" /></svg></span><span style={{ flex: 1 }}>{t("AI providers")}</span><span className="m" style={{ fontSize: 14 }}>{t("Automatic")}</span>{chev}</button>
      {openP && <><div className="srow sub m" style={{ fontSize: 12, cursor: "default" }}>{t("Picks the first available provider and switches automatically when one reaches its limit.")}</div>
        {provs.map((p) => { const ok = p.configured && !p.limited; return (<div key={p.id} className="srow sub" style={{ cursor: "default" }}><span className={`dot ${ok ? "on" : "off"}`} /><span style={{ flex: 1 }}>{NAMES[p.id] ?? p.id}</span>
          <span className="m" style={{ fontSize: 12 }}>{ok ? t("Ready") : p.limited ? t("Limit reached") : t("Not configured")}</span></div>); })}</>}</div>
    <div className="cap">{t("AI document analysis")}: {t("When enabled, parts of your documents' text may be sent to the selected AI provider for analysis. You can turn this off at any time.")}</div>
    <div className="cap">{t("Data")}</div>
    <div className="grp">
      <Link href="/folders" className="srow"><span className="ico"><svg {...ic}><path d="M3 7h7l2 2h9v10H3z" /></svg></span><span style={{ flex: 1 }}>{t("Folders")}</span>{arrow}</Link>
      <Link href="/trash" className="srow"><span className="ico"><svg {...ic}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg></span><span style={{ flex: 1 }}>{t("Trash")}</span>{arrow}</Link>
      <a href="/api/export" className="srow"><span className="ico"><svg {...ic}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg></span><span style={{ flex: 1 }}>{t("Export my data")}</span>{arrow}</a>
      <button className="srow" onClick={wipeChats}><span className="ico"><svg {...ic}><path d="M4 5h16v11H9l-5 4z" /></svg></span><span style={{ flex: 1 }}>{t("Delete chat history")}</span></button>
      {!installed && <button className="srow" onClick={openInstall}><span className="ico"><svg {...ic}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg></span><span style={{ flex: 1 }}>{t("Install app")}</span>{arrow}</button>}</div>
    {msg && <div className="toast" role="status">{msg}</div>}
    <div className="cap">{t("Offline")}</div>
    <div className="grp"><button className="srow" onClick={downloadAll} disabled={!!dl && dl !== t("Done")}><span className="ico"><svg {...ic}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg></span><span style={{ flex: 1 }}>{t("Download all files for offline use")}</span><span className="m" style={{ fontSize: 12 }}>{dl}</span></button></div>
    <div className="cap">{t("Documents and bills you add offline are saved on this device and sync automatically when you're back online.")}</div>
    <div className="grp"><button className="srow" onClick={backup} disabled={!!bk && bk !== t("Done")}><span className="ico"><svg {...ic}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg></span><span style={{ flex: 1 }}>{t("Download full backup (ZIP)")}</span><span className="m" style={{ fontSize: 12 }}>{bk}</span></button></div>
    <div className="cap">{t("Notifications")}</div>
    <div className="grp"><div className="srow" style={{ cursor: "default" }}><span className="ico"><svg {...ic}><path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4" /></svg></span><span style={{ flex: 1 }}>{t("Expiry reminders")}</span><button className="sw" role="switch" aria-checked={pushOn} aria-label={t("Expiry reminders")} onClick={togglePush}><i /></button></div></div>
    <div className="cap">{t("Get a notification before your documents expire and when it's time to add a bill.")}</div>
    <div className="cap">{t("Account")}</div>
    <div className="grp"><button className="srow bad" onClick={out}><span className="ico bad"><svg {...ic}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg></span><span style={{ flex: 1 }}>{t("Sign out")}</span></button></div>
    <div className="m" style={{ fontSize: 12, textAlign: "center", marginTop: 4 }}>MyDoc</div>
    {dlg?.kind === "verify" && <LockScreen mode="verify" method={mode === "bio" ? "bio" : "pin"} onCancel={() => setDlg(null)} onSuccess={() => { const nx = dlg.then; setDlg(null); apply(nx); }} />}
    {dlg?.kind === "set" && <LockScreen mode="set" onCancel={() => setDlg(null)} onSuccess={async (pin) => { await setPin(pin); sessionStorage.setItem("lock.ok", "1"); setMode("pin"); setDelay(lockDelay()); setDlg(null); }} />}
  </main>);
}
