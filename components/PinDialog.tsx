"use client";
import { useEffect, useRef, useState } from "react";
import PinPad from "./PinPad";
import { useT } from "./LangProvider";
import { bioVerify, lockedOutFor, verifyPin } from "@/lib/applock";
const lockIcon = <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>;
export default function PinDialog({ mode, cancelable = true, bio = false, onSuccess, onCancel }: { mode: "set" | "verify"; cancelable?: boolean; bio?: boolean; onSuccess: (pin: string) => void; onCancel?: () => void }) {
  const { t } = useT(); const [v, setV] = useState(""); const [first, setFirst] = useState<string | null>(null); const [err, setErr] = useState(""); const busy = useRef(false);
  useEffect(() => { if (bio) bioVerify().then((ok) => ok && onSuccess("")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (v.length !== 4 || busy.current) return; busy.current = true;
    (async () => {
      if (mode === "verify") { if (await verifyPin(v)) return onSuccess(v); const w = lockedOutFor(); setErr(w > 0 ? t("Too many attempts. Try again in {n}s.", { n: Math.ceil(w / 1000) }) : t("Wrong PIN")); navigator.vibrate?.(120); setV(""); }
      else if (first === null) { setFirst(v); setV(""); setErr(""); }
      else if (first === v) return onSuccess(v);
      else { setErr(t("PINs do not match")); setFirst(null); setV(""); }
    })().finally(() => { busy.current = false; });
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const heading = mode === "verify" ? t("Enter your PIN") : first === null ? t("Choose a PIN") : t("Confirm your PIN");
  return (<div className="lockscreen" role="dialog" aria-modal="true" aria-label={heading}>
    <span className="ava" style={{ width: 64, height: 64 }}>{lockIcon}</span><div className="h g" style={{ fontSize: 28 }}>MyDoc</div><div style={{ fontSize: 16 }}>{heading}</div>
    <div className="err" role="alert" style={{ minHeight: 20 }}>{err}</div><PinPad value={v} onChange={setV} />
    {bio && <button type="button" className="chip g" style={{ background: "none", minHeight: 44 }} onClick={() => bioVerify().then((ok) => ok && onSuccess(""))}>{t("Unlock with biometrics")}</button>}
    {cancelable && <button type="button" className="chip m" style={{ background: "none", minHeight: 44 }} onClick={onCancel}>{t("Cancel")}</button>}</div>);
}
