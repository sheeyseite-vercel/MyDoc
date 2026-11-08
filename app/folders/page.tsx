"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
export default function Folders() {
  const [fs, setFs] = useState<{ id: string; name: string }[]>([]); const [name, setName] = useState(""); const [err, setErr] = useState("");
  const load = useCallback(async () => { const { data } = await supabaseBrowser().from("folders").select("id,name").order("name"); setFs(data ?? []); }, []);
  useEffect(() => { load(); }, [load]);
  async function add(e: React.FormEvent) { e.preventDefault(); const n = name.trim(); if (!n) return; const sb = supabaseBrowser(); const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("folders").insert({ user_id: user!.id, name: n }); setErr(error ? "تعذر إنشاء المجلد." : ""); setName(""); load(); }
  async function rename(f: { id: string; name: string }) { const n = prompt("الاسم الجديد", f.name)?.trim(); if (n) { await supabaseBrowser().from("folders").update({ name: n }).eq("id", f.id); load(); } }
  async function del(f: { id: string }) { if (confirm("حذف المجلد؟ الوثائق داخله تبقى دون مجلد.")) { await supabaseBrowser().from("folders").delete().eq("id", f.id); load(); } }
  return (<main className="wrap"><h1 className="h" style={{ fontSize: 28, margin: 0 }}>المجلدات</h1>
    <form onSubmit={add} style={{ display: "flex", gap: 8 }}><input aria-label="اسم المجلد" placeholder="مجلد جديد" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn" style={{ padding: "0 20px" }}>إضافة</button></form>
    {err && <div className="err" role="alert">{err}</div>}
    {fs.length ? fs.map((f) => (<div key={f.id} className="k row"><Link href={`/documents?folder=${f.id}`} style={{ color: "inherit", flex: 1 }}><b>{f.name}</b></Link><button className="chip g" style={{ background: "none", minHeight: 40 }} onClick={() => rename(f)}>تسمية</button><button className="chip bad" style={{ background: "none", minHeight: 40 }} onClick={() => del(f)}>حذف</button></div>)) : <div className="k m">لا توجد مجلدات بعد.</div>}
    <Nav active="/documents" /></main>);
}
