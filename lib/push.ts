import { supabaseBrowser } from "./supabase/client";
import { getUid } from "./data";
const key64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); return Uint8Array.from(atob((s + p).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)); };
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export async function pushEnabled() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  try { return !!(await (await navigator.serviceWorker.ready).pushManager.getSubscription()); } catch { return false; }
}
export async function enablePush(lang: string): Promise<"ok" | "denied" | "unsupported" | "blocked" | "server" | "error"> {
  if (!pushSupported()) return "unsupported";
  if ((await Notification.requestPermission()) !== "granted") return "denied";
  try {
    const sb = supabaseBrowser(); const { data: vk, error } = await sb.rpc("vapid_public"); if (error || !vk) return "server";
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("sw")), 8000))]); let sub = await reg.pushManager.getSubscription();
    if (!sub) { try { sub = await Promise.race([reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key64(vk as string) as BufferSource }), new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000))]); } catch (e) { return (e as Error).name === "NotAllowedError" ? "denied" : "blocked"; } } // AbortError = المتصفح يمنع خدمة الدفع (مثل Brave)
    const j = sub.toJSON(); const uid = await getUid(); if (!uid || !j.keys) return "error";
    const { error: e2 } = await sb.from("push_subscriptions").upsert({ user_id: uid, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, lang }, { onConflict: "endpoint" });
    return e2 ? "error" : "ok";
  } catch { return "error"; }
}
export async function disablePush() {
  try { const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription(); if (sub) { await supabaseBrowser().from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); } } catch { /* تجاهل */ }
}
export async function syncPushLang(lang: string) {
  try { const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription(); if (sub) await supabaseBrowser().from("push_subscriptions").update({ lang }).eq("endpoint", sub.endpoint); } catch { /* تجاهل */ }
}
