"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import InstallButton from "@/components/InstallButton";
export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg("");
    const f = new FormData(e.currentTarget); const email = String(f.get("email")); const password = String(f.get("password"));
    const sb = supabaseBrowser();
    const { error } = mode === "in" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg("تعذر إكمال العملية. تحقق من البيانات وحاول مجدداً.");
    if (mode === "up") return setMsg("تم إنشاء الحساب. تحقق من بريدك لتأكيده إن كان التأكيد مفعّلاً.");
    router.replace("/"); router.refresh();
  }
  return (<main className="wrap" style={{ justifyContent: "center", minHeight: "100dvh" }}>
    <h1 className="h g" style={{ fontSize: 40, margin: 0 }}>MyDoc</h1>
    <p className="m" style={{ marginTop: 0 }}>خزنتك الذكية للوثائق</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <label>البريد الإلكتروني<input name="email" type="email" required autoComplete="email" /></label>
      <label>كلمة المرور<input name="password" type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} /></label>
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn" disabled={busy}>{mode === "in" ? "تسجيل الدخول" : "إنشاء حساب"}</button>
    </form>
    <InstallButton /><button className="btn ghost" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "حساب جديد" : "لدي حساب"}</button>
  </main>);
}
