"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { createReminders } from "@/lib/reminders";
import { shrink, extOf } from "@/lib/image";
import { docsCache, titlesCache } from "@/lib/data";
import { useT } from "@/components/LangProvider";
const OK = ["application/pdf", "image/jpeg", "image/png", "image/webp"]; const MAX = 15 * 1024 * 1024;
const QUICK = ["ID", "Contract", "Invoice", "Certificate", "Medical", "Other"];
const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export default function Upload() {
  const { t } = useT(); const router = useRouter(); const [files, setFiles] = useState<File[]>([]); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]); const [cat, setCat] = useState("");
  useEffect(() => { supabaseBrowser().from("folders").select("id,name").order("name").then(({ data }) => setFolders(data ?? [])); }, []);
  function pick(list: FileList | null) {
    setMsg(""); const arr = Array.from(list ?? []); const bad = arr.find((f) => !OK.includes(f.type) || f.size > MAX);
    if (bad) return setMsg(t("File “{name}” is not accepted. Allowed: PDF, JPG, PNG, WEBP up to 15 MB.", { name: bad.name }));
    setFiles((p) => [...p, ...arr]);
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!files.length) return setMsg(t("Pick a file first.")); setBusy(true); setMsg("");
    const f = new FormData(e.currentTarget); const sb = supabaseBrowser();
    const { data: { session } } = await sb.auth.getSession(); if (!session) return router.replace("/login");
    const uid = session.user.id; const expiry = String(f.get("expiry")) || null; const issuer = String(f.get("issuer")) || null; const folder = String(f.get("folder")) || null; const name = String(f.get("title")).trim();
    const jobs = files.map(async (orig) => {
      const file = await shrink(orig); const id = crypto.randomUUID(); const path = `${uid}/${id}.${extOf(file)}`; const title = files.length === 1 && name ? name : orig.name;
      const [up, ins] = await Promise.all([ // الرفع والإدخال بالتوازي
        sb.storage.from("documents").upload(path, file, { contentType: file.type }),
        sb.from("documents").insert({ id, user_id: uid, title, category: cat || null, issuer, expiry_date: expiry, folder_id: folder, storage_path: path, mime: file.type, size_bytes: file.size, status: "ready" })]);
      if (up.error || ins.error) { if (!ins.error) await sb.from("documents").delete().eq("id", id); if (!up.error) await sb.storage.from("documents").remove([path]); throw new Error("fail"); }
      return { id, title };
    });
    const res = await Promise.allSettled(jobs); const ok = res.filter((r): r is PromiseFulfilledResult<{ id: string; title: string }> => r.status === "fulfilled").map((r) => r.value);
    const failed = res.length - ok.length;
    ok.forEach((d) => { void createReminders(sb, uid, d.id, expiry); void sb.from("activity_logs").insert({ user_id: uid, action: "upload", document_id: d.id }); }); // دون انتظار
    const c = docsCache.get("all|"); if (c) docsCache.set("all|", [...ok.map((d) => ({ id: d.id, title: d.title, category: cat || null, issuer })), ...c]);
    if (titlesCache.items) titlesCache.items = [...ok.map((d) => ({ id: d.id, title: d.title, category: cat || null })), ...titlesCache.items];
    setBusy(false);
    if (failed) return setMsg(t("Could not save {n} of the files. Try again.", { n: failed }));
    router.replace("/");
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
      <div className="fcard">
        <label>{t("Name")}<input name="title" placeholder={files[0]?.name ?? t("Passport — 2028")} /></label>
        <label>{t("Category")}<input value={cat} onChange={(e) => setCat(e.target.value)} placeholder={t("ID, contract, invoice…")} />
          <div className="qp">{QUICK.map((q) => <button type="button" key={q} className={cat === t(q) ? "on" : ""} onClick={() => setCat(t(q))}>{t(q)}</button>)}</div></label>
        <label>{t("Issuer (optional)")}<input name="issuer" /></label>
        <label>{t("Expiry date (optional)")}<input name="expiry" type="date" /></label>
        <label>{t("Folder (optional)")}<select name="folder" defaultValue=""><option value="">{t("No folder")}</option>{folders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div>
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn" disabled={busy}>{busy ? t("Saving…") : t("Save")}</button>
    </form></main>);
}
