import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: doc } = await sb.from("documents").select("storage_path").eq("id", id).is("deleted_at", null).single(); // RLS يتحقق من الملكية
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data } = await sb.storage.from("documents").createSignedUrl(doc.storage_path, 60);
  return NextResponse.json({ url: data?.signedUrl });
}
