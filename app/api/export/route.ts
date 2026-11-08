import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET() {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const t = async (n: string) => (await sb.from(n).select("*")).data ?? [];
  const out = { exported_at: new Date().toISOString(), documents: (await t("documents")).map(({ search, ...d }: Record<string, unknown>) => d), folders: await t("folders"), tags: await t("tags"), reminders: await t("reminders"), conversations: await t("ai_conversations"), messages: await t("ai_messages") };
  return new NextResponse(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="mydoc-export.json"' } });
}
