import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
// الاستعلام يمر عبر RLS: لا يمكن أن تعيد النتائج إلا وثائق المستخدم الحالي
export async function GET(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 200);
  if (!q) return NextResponse.json({ results: [] });
  const { data, error } = await sb.from("documents")
    .select("id,title,category,issuer,expiry_date,mime")
    .is("deleted_at", null).is("archived_at", null).textSearch("search", q, { type: "websearch", config: "simple" }).limit(10);
  if (error) return NextResponse.json({ error: "search_failed" }, { status: 500 });
  return NextResponse.json({ results: data, ambiguous: (data?.length ?? 0) > 1 });
}
