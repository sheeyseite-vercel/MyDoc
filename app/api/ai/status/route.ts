import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { buildChain, PROVIDER_IDS } from "@/lib/ai/providers";
import { cooldownInfo } from "@/lib/ai/router";
export async function GET() {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const on = new Set(buildChain().map((p) => p.id));
  return NextResponse.json({ providers: PROVIDER_IDS.map((id) => ({ id, configured: on.has(id) })), limited: cooldownInfo() });
}
