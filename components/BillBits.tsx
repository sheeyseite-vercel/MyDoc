"use client";
import type { Delta } from "@/lib/bills";
import { ICONS, money } from "@/lib/bills";
export function CatIcon({ cat, size = 22 }: { cat: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[cat] ?? ICONS.other} /></svg>;
}
export function DeltaText({ d, cur, lang, noChange }: { d: Delta; cur: string; lang: string; noChange: string }) {
  if (Math.abs(d.amt) < 0.005) return <span className="m" style={{ fontSize: 12 }}>{noChange}</span>;
  const up = d.amt > 0; const pct = d.pct == null ? "" : ` (${up ? "+" : "−"}${Math.abs(d.pct).toFixed(1)}%)`;
  return <span className={up ? "tr" : "tg"} style={{ fontSize: 12, fontWeight: 600 }}>{up ? "▲" : "▼"} {money(Math.abs(d.amt), cur, lang)}{pct}</span>;
}
