import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const sb = await supabaseServer();
  const { data: b } = await sb.from("bills").select("storage_path").eq("id", id).single(); // RLS يتحقق من الملكية
  if (!b?.storage_path) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data } = await sb.storage.from("documents").createSignedUrl(b.storage_path, 60);
  return NextResponse.json({ url: data?.signedUrl });
}
