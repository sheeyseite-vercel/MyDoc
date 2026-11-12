// تواصل مع الـ service worker: تحضير التطبيق للعمل دون إنترنت وفحص جاهزيته
type Status = { pages: number; total: number; assets: number; ok?: number };
async function ask(msg: object, ms = 90000): Promise<Status | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready; const sw = reg.active; if (!sw) return null;
    return await new Promise<Status | null>((res) => { const ch = new MessageChannel(); const t = setTimeout(() => res(null), ms); ch.port1.onmessage = (e) => { clearTimeout(t); res(e.data); }; sw.postMessage(msg, [ch.port2]); });
  } catch { return null; }
}
export const offlineStatus = () => ask({ type: "status" }, 8000);
export async function prepareOffline() { const r = await ask({ type: "warm" }); try { localStorage.setItem("mydoc.warm", String(Date.now())); } catch { /* تجاهل */ } return r; }
