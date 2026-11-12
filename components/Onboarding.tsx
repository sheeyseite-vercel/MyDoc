"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "./LangProvider";
import { allBills, allDocs, S, useStore } from "@/lib/data";
const SL = [["All your documents in one place", "Add documents, scan them with your camera and find them instantly.", "M3 7h7l2 2h9v10H3z"], ["Track your bills", "Compare months and see when a bill rises.", "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"], ["Works offline, reminds you", "Use the app without internet and get a reminder before a document expires.", "M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4"]] as const;
export default function Onboarding() {
  const { t } = useT(); const path = usePathname(); useStore(); const [i, setI] = useState(0); const [hide, setHide] = useState(false);
  let seen = true; try { seen = !!localStorage.getItem("mydoc.onboarded"); } catch { /* تجاهل */ }
  const fresh = S.docs !== null && !allDocs().length && !allBills().length; // حساب جديد فارغ فقط
  if (seen || hide || !fresh || path.startsWith("/login")) return null;
  const done = () => { try { localStorage.setItem("mydoc.onboarded", "1"); } catch { /* تجاهل */ } setHide(true); };
  const [h, d, p] = SL[i];
  return (<div className="welcome" role="dialog" aria-modal="true" aria-label="MyDoc">
    <button type="button" className="lk-link" style={{ alignSelf: "flex-end" }} onClick={done}>{t("Skip")}</button>
    <div style={{ display: "grid", gap: 18, justifyItems: "center" }}>
      <span className="ico" style={{ width: 88, height: 88, borderRadius: 28 }}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={p} /></svg></span>
      <h1 className="h" style={{ fontSize: 30, margin: 0 }}>{t(h)}</h1><p className="m" style={{ fontSize: 16, margin: 0, maxWidth: 320, lineHeight: 1.7 }}>{t(d)}</p></div>
    <div style={{ display: "grid", gap: 18, width: "100%", maxWidth: 320 }}>
      <div className="dots" style={{ justifyContent: "center" }} aria-hidden="true">{SL.map((_, k) => <i key={k} className={k === i ? "f" : ""} />)}</div>
      <button className="btn" onClick={() => (i < SL.length - 1 ? setI(i + 1) : done())}>{i < SL.length - 1 ? t("Next") : t("Get started")}</button></div></div>);
}
