"use client";
import { useEffect } from "react";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
export default function PinPad({ value, onChange, max = 4, shake = false }: { value: string; onChange: (v: string) => void; max?: number; shake?: boolean }) {
  const press = (k: string) => { if (k === "del") onChange(value.slice(0, -1)); else if (value.length < max) onChange(value + k); };
  useEffect(() => { const h = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("del"); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); });
  return (<div className="pad" dir="ltr"><div className={`dots${shake ? " shake" : ""}`} aria-hidden="true">{Array.from({ length: max }).map((_, i) => <i key={i} className={i < value.length ? "f" : ""} />)}</div>
    <div className="keys">{KEYS.map((k, i) => k === "" ? <span key={i} /> : k === "del"
      ? <button type="button" key={k} className="del" aria-label="Delete" onClick={() => press(k)}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6h11a1 1 0 011 1v10a1 1 0 01-1 1H9l-6-6 6-6zM13 10l4 4M17 10l-4 4" /></svg></button>
      : <button type="button" key={k} aria-label={k} onClick={() => press(k)}>{k}</button>)}</div></div>);
}
