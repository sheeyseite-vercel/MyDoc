"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";
import InstallButton from "@/components/InstallButton";
export default function Login() {
  const { t } = useT(); const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg("");
    const f = new FormData(e.currentTarget); const email = String(f.get("email")); const password = String(f.get("password")); const sb = supabaseBrowser();
    const { error } = mode === "in" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(t("Could not complete the request. Check your details and try again."));
    if (mode === "up") return setMsg(t("Account created. Check your email to confirm it if confirmation is enabled."));
    router.replace("/"); router.refresh();
  }
  return (<main className="wrap" style={{ justifyContent: "center" }}>
    <h1 className="h g" style={{ fontSize: 40, margin: 0 }}>MyDoc</h1><p className="m" style={{ marginTop: 0 }}>{t("Your smart document vault")}</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <label>{t("Email")}<input name="email" type="email" required autoComplete="email" dir="ltr" /></label>
      <label>{t("Password")}<input name="password" type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} dir="ltr" /></label>
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn" disabled={busy}>{mode === "in" ? t("Sign in") : t("Create account")}</button>
    </form>
    <InstallButton /><button className="btn ghost" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? t("New account") : t("I have an account")}</button>
  </main>);
}
