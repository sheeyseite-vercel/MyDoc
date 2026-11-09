"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { createReminders } from "@/lib/reminders";
import { useT } from "@/components/LangProvider";
const OK = ["application/pdf", "image/jpeg", "image/png", "image/webp"]; const MAX = 15 * 1024 * 1024;
export default function Upload() {
  const { t } = useT(); const [files, setFiles] = useState<File[]>([]); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]); const router = useRouter();
  useEffect(() => { supabaseBrowser().from("folders").select("id,name").order("name").then(({ data }) => setFolders(data ?? [])); }, []);
  function pick(list: FileList | null) {
    setMsg(""); const arr = Array.from(list ?? []); const bad = arr.find((f) => !OK.includes(f.type) || f.size > MAX);
    if (bad) return setMsg(t("File “{name}” is not accepted. Allowed: PDF, JPG, PNG, WEBP up to 15 MB.", { name: bad.name }));
    setFiles(arr);
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!files.length) return setMsg(t("Pick a file first.")); setBusy(true); setMsg("");
    const f = new FormData(e.currentTarget); const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser(); if (!user) return router.replace("/login");
    let last = ""; let failed = 0;
    for (const file of files) {
      const path = `${user.id}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
      const up = await sb.storage.from("documents").upload(path, file, { contentType: file.type });
      if (up.error) { failed++; continue; }
      const expiry = String(f.get("expiry")) || null;
      const { data, error } = await sb.from("documents").insert({ user_id: user.id, title: files.length === 1 ? String(f.get("title")) || file.name : file.name,
        category: String(f.get("category")) || null, issuer: String(f.get("issuer")) || null, expiry_date: expiry, folder_id: String(f.get("folder")) || null,
        storage_path: path, mime: file.type, size_bytes: file.size, status: "ready" }).select("id").single();
      if (error || !data) { await sb.storage.from("documents").remove([path]); failed++; continue; }
      last = data.id; await createReminders(sb, user.id, data.id, expiry);
      await sb.from("activity_logs").insert({ user_id: user.id, action: "upload", document_id: data.id });
    }
    setBusy(false);
    if (failed) return setMsg(t("Could not save {n} of the files. Try again.", { n: failed }));
    router.replace(files.length === 1 ? `/documents/${last}` : "/");
  }
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>{t("Add document")}</h1>
    <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
      <label>{t("Files (pick several or take a photo)")}<input type="file" multiple accept={OK.join(",")} onChange={(e) => pick(e.target.files)} style={{ paddingTop: 12 }} /></label>
      <label>{t("Name")}<input name="title" placeholder={files[0]?.name ?? t("Passport — 2028")} /></label>
      <label>{t("Category")}<input name="category" placeholder={t("ID, contract, invoice…")} /></label>
      <label>{t("Issuer (optional)")}<input name="issuer" /></label>
      <label>{t("Expiry date (optional)")}<input name="expiry" type="date" /></label>
      <label>{t("Folder (optional)")}<select name="folder" defaultValue=""><option value="">{t("No folder")}</option>{folders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      {msg && <div className="err" role="alert">{msg}</div>}
      <button className="btn" disabled={busy}>{busy ? t("Saving…") : t("Save")}</button>
    </form></main>);
}
