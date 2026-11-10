"use client";
import { useEffect } from "react";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
export default function PinPad({ value, onChange, max = 4 }: { value: string; onChange: (v: string) => void; max?: number }) {
  const press = (k: string) => { if (k === "⌫") onChange(value.slice(0, -1)); else if (value.length < max) onChange(value + k); };
  useEffect(() => { const h = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("⌫"); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); });
  return (<div className="pad" dir="ltr"><div className="dots" aria-hidden="true">{Array.from({ length: max }).map((_, i) => <i key={i} className={i < value.length ? "f" : ""} />)}</div>
    <div className="keys">{KEYS.map((k, i) => k === "" ? <span key={i} /> : <button type="button" key={k} aria-label={k === "⌫" ? "Delete" : k} onClick={() => press(k)}>{k}</button>)}</div></div>);
}
