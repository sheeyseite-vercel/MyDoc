"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shrink, extOf } from "@/lib/image";
import { enqueueDoc, getUid, useStore } from "@/lib/data";
import { useT } from "@/components/LangProvider";
import { handoff } from "@/lib/handoff";
import { useOnline } from "@/lib/useOnline";
const OK = ["application/pdf", "image/jpeg", "image/png", "image/webp"]; const MAX = 15 * 1024 * 1024;
const QUICK = ["ID", "Contract", "Invoice", "Certificate", "Medical", "Other"];
const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export default function Upload() {
  const { t } = useT(); const router = useRouter(); const [files, setFiles] = useState<File[]>([]); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const folders = useStore().folders ?? []; const [cat, setCat] = useState(""); const [titleS, setTitleS] = useState(""); const [issuerS, setIssuerS] = useState(""); const [expiryS, setExpiryS] = useState("");
  const online = useOnline(); const [ai, setAi] = useState(""); const [aiBusy, setAiBusy] = useState(false);
  useEffect(() => { if (handoff.files.length) { setFiles(handoff.files); handoff.files = []; } }, []);
  async function autofill() {
    setAi(""); setAiBusy(true);
    try { const fd = new FormData(); fd.append("file", await shrink(files[0])); const r = await fetch("/api/ai/extract", { method: "POST", body: fd }); const j = await r.json().catch(() => ({}));
      if (!r.ok) setAi(j.error === "consent_required" ? t("Enable AI document analysis in Settings first.") : j.error === "limit_reached" ? t("Daily AI limit reached. Try again tomorrow.") : t("Could not read the document. Fill the fields manually."));
      else { if (j.title && !titleS.trim()) setTitleS(j.title); if (j.category && !cat) setCat(t(j.category)); if (j.issuer && !issuerS) setIssuerS(j.issuer); if (j.expiry_date && !expiryS) setExpiryS(j.expiry_date); setAi(t("Suggestions filled in. Please review them before saving.")); } }
    catch { setAi(t("Could not read the document. Fill the fields manually.")); }
    setAiBusy(false);
  }
  function pick(list: FileList | null) {
    setMsg(""); const arr = Array.from(list ?? []); const bad = arr.find((f) => !OK.includes(f.type) || f.size > MAX);
    if (bad) return setMsg(t("File “{name}” is not accepted. Allowed: PDF, JPG, PNG, WEBP up to 15 MB.", { name: bad.name }));
    setFiles((p) => [...p, ...arr]);
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!files.length) return setMsg(t("Pick a file first.")); setBusy(true); setMsg("");
    const f = new FormData(e.currentTarget); const uid = await getUid(); if (!uid) return router.replace("/login");
    const expiry = expiryS || null; const issuer = issuerS.trim() || null; const folder = String(f.get("folder")) || null; const name = titleS.trim();
    try {
      for (const orig of files) { const file = await shrink(orig); await enqueueDoc({ id: crypto.randomUUID(), uid, file, mime: file.type, size: file.size, meta: { title: files.length === 1 && name ? name : orig.name, category: cat || null, issuer, expiry_date: expiry, folder_id: folder } }); }
      router.replace("/"); // الحفظ محلي فوري، والرفع يجري في الخلفية
    } catch { setBusy(false); setMsg(t("Could not save {n} of the files. Try again.", { n: files.length })); }
  }
  return (<main className="wrap">
    <div className="row" style={{ justifyContent: "flex-start", gap: 12 }}><Link href="/" className="ib" aria-label={t("Home")}><svg {...ic} className="flip"><path d="M15 6l-6 6 6 6" /></svg></Link><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Add document")}</h1></div>
    <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
      <label className="drop"><input type="file" multiple accept={OK.join(",")} onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
        <span className="ico" style={{ width: 52, height: 52, borderRadius: 16 }}><svg {...ic} width={26} height={26}><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg></span>
        <b>{t("Choose files or take a photo")}</b><span className="m" style={{ fontSize: 12 }}>{t("PDF, JPG, PNG or WEBP · up to 15 MB")}</span></label>
      {files.map((x, i) => (<div key={i} className="k row" style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>{x.type.startsWith("image/") ? <img className="thumb" src={URL.createObjectURL(x)} alt="" /> : <span className="thumb"><svg {...ic}><path d="M7 3h7l4 4v14H7zM14 3v4h4" /></svg></span>}
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="auto">{x.name}</div><div className="m" style={{ fontSize: 12 }}>{kb(x.size)}</div></div></div>
        <button type="button" className="ib" style={{ width: 38, height: 38 }} aria-label={t("Remove")} onClick={() => setFiles(files.filter((_, j) => j !== i))}><svg {...ic} width={16} height={16}><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>))}
      <Link href="/scan" className="btn ghost">{t("Scan with camera")}</Link>
      {files.length > 0 && online && <button type="button" className="btn ghost" disabled={aiBusy} onClick={autofill}>{aiBusy ? t("Reading…") : t("Auto-fill with AI")}</button>}
      {ai && <div className="toast" role="status">{ai}</div>}
      <div className="fcard">
        <label>{t("Name")}<input value={titleS} onChange={(e) => setTitleS(e.target.value)} placeholder={files[0]?.name ?? t("Passport — 2028")} /></label>
        <label>{t("Category")}<input value={cat} onChange={(e) => setCat(e.target.value)} placeholder={t("ID, contract, invoice…")} />
          <div className="qp">{QUICK.map((q) => <button type="button" key={q} className={cat === t(q) ? "on" : ""} onClick={() => setCat(t(q))}>{t(q)}</button>)}</div></label>
        <label>{t("Issuer (optional)")}<input value={issuerS} onChange={(e) => setIssuerS(e.target.value)} /></label>
        <label>{t("Expiry date (optional)")}<input type="date" value={expiryS} onChange={(e) => setExpiryS(e.target.value)} /></label>
        <label>{t("Folder (optional)")}<select name="folder" defaultValue=""><option value="">{t("No folder")}</option>{folders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div>
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn" disabled={busy}>{busy ? t("Saving…") : t("Save")}</button>
    </form></main>);
}
