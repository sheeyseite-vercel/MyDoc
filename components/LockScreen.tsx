"use client";
import { useEffect, useRef, useState } from "react";
import PinPad from "./PinPad";
import { useT } from "./LangProvider";
import { bioVerify, disableLock, lockedOutFor, verifyPin } from "@/lib/applock";
import { supabaseBrowser } from "@/lib/supabase/client";
const fp = <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18.9 7a8 8 0 0 1 1.1 5v1a6 6 0 0 0 .8 3" /><path d="M8 11a4 4 0 0 1 8 0v1a10 10 0 0 0 2 6" /><path d="M12 11v2a14 14 0 0 0 2.5 8" /><path d="M8 15a18 18 0 0 0 1.8 6" /><path d="M4.9 19a22 22 0 0 1-.9-7v-1a8 8 0 0 1 12-6.95" /></svg>;
type Props = { mode: "set" | "verify"; method?: "pin" | "bio"; cancelable?: boolean; reset?: boolean; onSuccess: (pin: string) => void; onCancel?: () => void };
export default function LockScreen({ mode, method = "pin", cancelable = true, reset = false, onSuccess, onCancel }: Props) {
  const { t } = useT(); const [v, setV] = useState(""); const [first, setFirst] = useState<string | null>(null); const [err, setErr] = useState(""); const [shake, setShake] = useState(false); const busy = useRef(false);
  const useBio = mode === "verify" && method === "bio";
  const tryBio = async () => { setErr(""); if (await bioVerify()) onSuccess(""); else setErr(t("Could not verify. Try again.")); };
  useEffect(() => { if (useBio) void tryBio(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (useBio || v.length !== 4 || busy.current) return; busy.current = true;
    const bad = (m: string) => { setErr(m); setShake(true); navigator.vibrate?.(120); setTimeout(() => setShake(false), 400); setV(""); };
    (async () => {
      if (mode === "verify") { if (await verifyPin(v)) return onSuccess(v); const w = lockedOutFor(); bad(w > 0 ? t("Too many attempts. Try again in {n}s.", { n: Math.ceil(w / 1000) }) : t("Wrong PIN")); }
      else if (first === null) { setFirst(v); setV(""); setErr(""); }
      else if (first === v) return onSuccess(v);
      else { setFirst(null); bad(t("PINs do not match")); }
    })().finally(() => { busy.current = false; });
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  async function resetLock() { if (!confirm(t("Sign out and reset the lock?"))) return; disableLock(); await supabaseBrowser().auth.signOut(); window.location.href = "/login"; }
  const heading = useBio ? t("Unlock MyDoc") : mode === "verify" ? t("Enter your PIN") : first === null ? t("Choose a PIN") : t("Confirm your PIN");
  return (<div className="lockscreen" role="dialog" aria-modal="true" aria-label={heading}>
    <div className="lk-top"><div className="h g" style={{ fontSize: 36, lineHeight: 1.1 }}>MyDoc</div><div className="lk-h">{heading}</div><div className="err" role="alert" style={{ minHeight: 20 }}>{err}</div></div>
    <div className="lk-mid">{useBio ? <><button type="button" className="lk-fp" onClick={tryBio} aria-label={t("Unlock with biometrics")}>{fp}</button><div className="m" style={{ fontSize: 14 }}>{t("Touch to unlock")}</div></> : <PinPad value={v} onChange={setV} shake={shake} />}</div>
    <div className="lk-bot">{cancelable && <button type="button" className="lk-link" onClick={onCancel}>{t("Cancel")}</button>}{reset && <button type="button" className="lk-link" onClick={resetLock}>{t("Can't unlock? Sign out")}</button>}</div></div>);
}
