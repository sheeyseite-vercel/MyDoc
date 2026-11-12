"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import { handoff } from "@/lib/handoff";
type Pg = { id: string; file: File; url: string; rot: number };
type Mode = "original" | "document" | "bw";
const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const CSS: Record<Mode, string> = { original: "none", document: "grayscale(1) contrast(1.45) brightness(1.08)", bw: "grayscale(1) contrast(3)" };
function otsu(g: Uint8Array) { const h = new Array(256).fill(0); g.forEach((v) => h[v]++); const tot = g.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * h[i]; let sb = 0, wb = 0, mx = 0, th = 128; for (let i = 0; i < 256; i++) { wb += h[i]; if (!wb) continue; const wf = tot - wb; if (!wf) break; sb += i * h[i]; const mb = sb / wb, mf = (sum - sb) / wf, v = wb * wf * (mb - mf) ** 2; if (v > mx) { mx = v; th = i; } } return th; }
// قص تلقائي تقريبي: يبحث عن مستطيل الورقة الأفتح من الخلفية، ويتجاهل النتيجة إن بدت غير منطقية
function autoCrop(c: HTMLCanvasElement) {
  const s = 360 / Math.max(c.width, c.height); const w = Math.max(1, Math.round(c.width * s)), h = Math.max(1, Math.round(c.height * s));
  const t = document.createElement("canvas"); t.width = w; t.height = h; const x = t.getContext("2d")!; x.drawImage(c, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data; const g = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0;
  const th = otsu(g); const col = new Array(w).fill(0), row = new Array(h).fill(0); let on = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[j * w + i] > th) { col[i]++; row[j]++; on++; }
  if (on / (w * h) < 0.25 || on / (w * h) > 0.97) return c;
  const x0 = col.findIndex((v) => v > h * 0.08), x1 = w - 1 - [...col].reverse().findIndex((v) => v > h * 0.08), y0 = row.findIndex((v) => v > w * 0.08), y1 = h - 1 - [...row].reverse().findIndex((v) => v > w * 0.08);
  const ratio = ((x1 - x0) * (y1 - y0)) / (w * h); if (x0 < 0 || y0 < 0 || x1 <= x0 || y1 <= y0 || ratio < 0.3 || ratio > 0.95) return c;
  const m = 0.015, sx = Math.max(0, Math.floor((x0 / w - m) * c.width)), sy = Math.max(0, Math.floor((y0 / h - m) * c.height)), ex = Math.min(c.width, Math.ceil(((x1 + 1) / w + m) * c.width)), ey = Math.min(c.height, Math.ceil(((y1 + 1) / h + m) * c.height));
  const o = document.createElement("canvas"); o.width = ex - sx; o.height = ey - sy; o.getContext("2d")!.drawImage(c, sx, sy, o.width, o.height, 0, 0, o.width, o.height); return o;
}
async function render(p: Pg, mode: Mode, crop: boolean) {
  const bmp = await createImageBitmap(p.file); const sc = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)); const w = Math.round(bmp.width * sc), h = Math.round(bmp.height * sc);
  let c = document.createElement("canvas"); const r = p.rot % 180 !== 0; c.width = r ? h : w; c.height = r ? w : h; const x = c.getContext("2d")!;
  x.translate(c.width / 2, c.height / 2); x.rotate((p.rot * Math.PI) / 180); x.drawImage(bmp, -w / 2, -h / 2, w, h);
  if (crop) c = autoCrop(c);
  if (mode !== "original") {
    const cx = c.getContext("2d")!; const im = cx.getImageData(0, 0, c.width, c.height); const d = im.data; const g = new Uint8Array(c.width * c.height);
    for (let i = 0; i < g.length; i++) g[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0;
    const th = mode === "bw" ? otsu(g) : 0;
    for (let i = 0; i < g.length; i++) { const v = mode === "bw" ? (g[i] > th ? 255 : 0) : Math.max(0, Math.min(255, (g[i] - 128) * 1.45 + 128 + 14)); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
    cx.putImageData(im, 0, 0);
  }
  return c;
}
export default function Scan() {
  const { t } = useT(); const router = useRouter(); const [pages, setPages] = useState<Pg[]>([]); const [mode, setMode] = useState<Mode>("document"); const [crop, setCrop] = useState(true); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  function add(list: FileList | null) { const arr = Array.from(list ?? []).filter((f) => f.type.startsWith("image/")); if (!arr.length) return; const np = arr.map((f) => { const url = URL.createObjectURL(f); urls.current.push(url); return { id: crypto.randomUUID(), file: f, url, rot: 0 }; }); setPages((p) => [...p, ...np]); }
  const upd = (id: string, f: (p: Pg) => Pg | null) => setPages((a) => a.flatMap((p) => (p.id === id ? (f(p) ? [f(p)!] : []) : [p])));
  const move = (i: number, d: number) => setPages((a) => { const b = [...a], j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; });
  async function make() {
    setBusy(true); setErr("");
    try {
      const { PDFDocument } = await import("pdf-lib"); let q = 0.85, bytes: Uint8Array = new Uint8Array();
      for (let attempt = 0; attempt < 3; attempt++) {
        const pdf = await PDFDocument.create();
        for (const p of pages) { const c = await render(p, mode, crop); const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", q)); const img = await pdf.embedJpg(new Uint8Array(await blob.arrayBuffer())); const k = 842 / Math.max(c.width, c.height); const pg = pdf.addPage([c.width * k, c.height * k]); pg.drawImage(img, { x: 0, y: 0, width: c.width * k, height: c.height * k }); }
        bytes = await pdf.save(); if (bytes.length <= 14 * 1024 * 1024) break; q -= 0.15;
      }
      const d = new Date(); handoff.files = [new File([bytes as BlobPart], `Scan ${d.toISOString().slice(0, 10)}.pdf`, { type: "application/pdf" })]; router.push("/upload");
    } catch { setErr(t("Could not create the PDF.")); setBusy(false); }
  }
  return (<main className="wrap">
    <div className="row" style={{ justifyContent: "flex-start", gap: 12 }}><Link href="/upload" className="ib" aria-label={t("Back")}><svg {...ic} className="flip"><path d="M15 6l-6 6 6 6" /></svg></Link><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Scan with camera")}</h1></div>
    <div style={{ display: "flex", gap: 10 }}>
      <label className="btn" style={{ flex: 1, cursor: "pointer" }}><input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />{t("Take photo")}</label>
      <label className="btn ghost" style={{ flex: 1, cursor: "pointer" }}><input type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />{t("From gallery")}</label></div>
    {pages.length > 0 && <>
      <div className="seg" role="tablist">{([["original", "Original"], ["document", "Document"], ["bw", "Black & white"]] as const).map(([m, l]) => <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{t(l)}</button>)}</div>
      <label className="row" style={{ justifyContent: "flex-start", gap: 10, fontSize: 14 }}><input type="checkbox" checked={crop} onChange={(e) => setCrop(e.target.checked)} style={{ width: 20, height: 20 }} />{t("Auto-crop edges")}</label>
      {pages.map((p, i) => (<div key={p.id} className="k" style={{ display: "grid", gap: 10 }}>
        <div className="row"><b>{t("Page")} {i + 1}</b><div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="ib" style={{ width: 38, height: 38 }} aria-label={t("Move up")} disabled={i === 0} onClick={() => move(i, -1)}><svg {...ic} width={16} height={16}><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>
          <button type="button" className="ib" style={{ width: 38, height: 38 }} aria-label={t("Move down")} disabled={i === pages.length - 1} onClick={() => move(i, 1)}><svg {...ic} width={16} height={16}><path d="M12 5v14M5 12l7 7 7-7" /></svg></button>
          <button type="button" className="ib" style={{ width: 38, height: 38 }} aria-label={t("Rotate")} onClick={() => upd(p.id, (x) => ({ ...x, rot: (x.rot + 90) % 360 }))}><svg {...ic} width={16} height={16}><path d="M20 12a8 8 0 11-3-6.2M20 4v5h-5" /></svg></button>
          <button type="button" className="ib" style={{ width: 38, height: 38 }} aria-label={t("Remove")} onClick={() => upd(p.id, () => null)}><svg {...ic} width={16} height={16}><path d="M6 6l12 12M18 6L6 18" /></svg></button></div></div>
        <div style={{ display: "grid", placeItems: "center", background: "var(--bg)", borderRadius: 12, padding: 8, minHeight: 180 }}><img src={p.url} alt="" style={{ maxWidth: "100%", maxHeight: 320, transform: `rotate(${p.rot}deg)`, filter: CSS[mode], transition: "transform .2s" }} /></div></div>))}
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" disabled={busy} onClick={make}>{busy ? t("Creating PDF…") : t("Create PDF")}</button></>}
    {!pages.length && <div className="empty"><div className="h" style={{ fontSize: 22 }}>{t("Scan documents with your camera")}</div><div className="m" style={{ fontSize: 14 }}>{t("Take one photo per page. Pages are combined into a single PDF.")}</div></div>}
  </main>);
}
