// يعمل بدون إنترنت: صفحات التطبيق وملفاته الثابتة تُخزَّن، ولا يُخزَّن شيء من /api (المساعد يحتاج إنترنت).
const V = "v4"; const SHELL = "mydoc-shell-" + V; const ASSETS = "mydoc-assets-v1";
const PRE = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRE))); });
self.addEventListener("activate", (e) => e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith("mydoc-shell-") && k !== SHELL) await caches.delete(k); await self.clients.claim(); })()));
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
async function trim(c, max) { const ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
async function cacheFirst(name, req) { const c = await caches.open(name); const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok) { c.put(req, r.clone()); trim(c, 500); } return r; }
async function swr(name, req) { const c = await caches.open(name); const hit = await c.match(req); const net = fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; }
async function nav(req, url) {
  const c = await caches.open(SHELL); const key = url.pathname;
  try { const r = await timeout(fetch(req), 3500); if (r.ok && !r.redirected && (r.headers.get("content-type") || "").includes("text/html")) c.put(key, r.clone()); return r; }
  catch { return (await c.match(key)) || (await c.match("/")) || (await c.match("/offline.html")); }
}
async function rsc(req) {
  const c = await caches.open(SHELL);
  try { const r = await timeout(fetch(req), 3000); if (r.ok) c.put(req, r.clone()); return r; }
  catch { const hit = await c.match(req, { ignoreVary: true }); if (hit) return hit; throw new Error("offline"); }
}
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return; const url = new URL(req.url);
  if (url.origin !== self.location.origin) { if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") e.respondWith(swr(ASSETS, req)); return; }
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) { e.respondWith(cacheFirst(ASSETS, req)); return; }
  if (req.mode === "navigate") { e.respondWith(nav(req, url)); return; }
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) e.respondWith(rsc(req));
});
// تسخين: يخزّن صفحات التطبيق وملفات JS/CSS الخاصة بها ليعمل كل شيء دون إنترنت
self.addEventListener("message", (e) => { if (e.data && e.data.type === "warm") e.waitUntil(warm(e.data.urls || [])); });
async function warm(urls) {
  const shell = await caches.open(SHELL); const assets = await caches.open(ASSETS);
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { Accept: "text/html" } }); if (!r.ok || r.redirected) continue;
      const html = await r.clone().text(); await shell.put(new URL(u, self.location.origin).pathname, r);
      const found = new Set(); for (const m of html.matchAll(/(?:\/_next\/)?static\/(?:chunks|css|media)\/[A-Za-z0-9_\-.\[\]()~%]+\.(?:js|css|woff2)/g)) found.add("/_next/" + m[0].replace(/^\/?_next\//, ""));
      await Promise.all([...found].map(async (a) => { if (await assets.match(a)) return; try { const x = await fetch(a); if (x.ok) await assets.put(a, x); } catch {} }));
    } catch {}
  }
}
