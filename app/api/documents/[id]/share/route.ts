import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
const HOURS = [1, 24, 168]; // ساعة، يوم، أسبوع
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const h = Number(new URL(req.url).searchParams.get("hours"));
  if (!HOURS.includes(h)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const sb = await supabaseServer();
  const { data: d } = await sb.from("documents").select("storage_path").eq("id", id).is("deleted_at", null).single(); // RLS: ملكية المستخدم فقط
  if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data } = await sb.storage.from("documents").createSignedUrl(d.storage_path, h * 3600);
  return NextResponse.json({ url: data?.signedUrl, hours: h });
}
