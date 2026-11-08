import type { SupabaseClient } from "@supabase/supabase-js";
export async function createReminders(sb: SupabaseClient, userId: string, docId: string, expiry: string | null) {
  await sb.from("reminders").delete().eq("document_id", docId).is("sent_at", null);
  if (!expiry) return;
  const { data: pref } = await sb.from("notification_preferences").select("days_before").eq("user_id", userId).single();
  const rows = ((pref?.days_before as number[] | undefined) ?? [90, 30, 7, 1]).map((n) => ({ user_id: userId, document_id: docId, days_before: n, remind_at: new Date(new Date(expiry).getTime() - n * 864e5).toISOString() })).filter((r) => new Date(r.remind_at).getTime() > Date.now() - 864e5);
  if (rows.length) await sb.from("reminders").insert(rows);
}
