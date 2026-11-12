// يعمل بدون إنترنت: صفحات التطبيق وملفاته الثابتة تُخزَّن، ولا يُخزَّن شيء من /api (المساعد يحتاج إنترنت).
// أسماء الذاكرة ثابتة عمداً: تحديث هذا الملف لا يمسح الصفحات المخزّنة (كان ذلك يعطّل العمل دون إنترنت بعد كل تحديث).
const SHELL = "mydoc-shell"; const ASSETS = "mydoc-assets";
const ROUTES = ["/", "/bills", "/alerts", "/settings", "/assistant", "/upload", "/folders", "/trash", "/bills/new", "/bills/report", "/scan", "/doc", "/bills/electricity", "/bills/water", "/bills/gas", "/bills/internet", "/bills/phone", "/bills/tax", "/bills/rent", "/bills/other"];
const PRE = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
async function trim(c, max) { const ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
async function cacheFirst(name, req) { const c = await caches.open(name); const hit = await c.match(req, { ignoreVary: true }); if (hit) return hit; const r = await fetch(req); if (r.ok) { c.put(req, r.clone()); trim(c, 800); } return r; }
async function swr(name, req) { const c = await caches.open(name); const hit = await c.match(req, { ignoreVary: true }); const net = fetch(req).then((r) => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; }
async function nav(req, url) {
  const c = await caches.open(SHELL); const key = url.pathname;
  try { const r = await timeout(fetch(req), 3500); if (r.ok && !r.redirected && (r.headers.get("content-type") || "").includes("text/html")) c.put(key, r.clone()); return r; }
  catch { return (await c.match(key, { ignoreVary: true })) || (await c.match("/", { ignoreVary: true })) || (await caches.match("/offline.html")); }
}
async function rsc(req) {
  const c = await caches.open(SHELL);
  try { const r = await timeout(fetch(req), 3000); if (r.ok) c.put(req, r.clone()); return r; }
  catch { const hit = await c.match(req, { ignoreVary: true }); if (hit) return hit; throw new Error("offline"); }
}
// تسخين: يخزّن صفحات التطبيق وملفات JS/CSS الخاصة بها. يعيد عدد الصفحات التي خُزّنت.
async function warm(urls) {
  const shell = await caches.open(SHELL); const assets = await caches.open(ASSETS); let ok = 0;
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { Accept: "text/html" } }); if (!r.ok || r.redirected || !(r.headers.get("content-type") || "").includes("text/html")) continue;
      const html = await r.clone().text(); await shell.put(new URL(u, self.location.origin).pathname, r); ok++;
      const found = new Set(); for (const m of html.matchAll(/(?:\/_next\/)?static\/(?:chunks|css|media)\/[A-Za-z0-9_\-.\[\]()~%]+\.(?:js|css|woff2)/g)) found.add("/_next/" + m[0].replace(/^\/?_next\//, ""));
      await Promise.all([...found].map(async (a) => { if (await assets.match(a)) return; try { const x = await fetch(a); if (x.ok) await assets.put(a, x); } catch (_) {} }));
    } catch (_) {}
  }
  return ok;
}
async function status() { const keys = (await (await caches.open(SHELL)).keys()).map((k) => new URL(k.url).pathname); const have = new Set(keys); return { pages: ROUTES.filter((r) => have.has(r)).length, total: ROUTES.length, assets: (await (await caches.open(ASSETS)).keys()).length }; }
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil((async () => { const c = await caches.open(SHELL); await Promise.all(PRE.map((u) => c.add(u).catch(() => {}))); })()); });
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (/^mydoc-shell-/.test(k) || /^mydoc-assets-v/.test(k)) await caches.delete(k); // أسماء قديمة فقط
  await self.clients.claim(); await warm(ROUTES);
})()));
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return; const url = new URL(req.url);
  if (url.origin !== self.location.origin) { if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") e.respondWith(swr(ASSETS, req)); return; }
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/static/")) { e.respondWith(cacheFirst(ASSETS, req)); return; }
  if (url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icons/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) { e.respondWith(swr(ASSETS, req)); return; }
  if (req.mode === "navigate") { e.respondWith(nav(req, url)); return; }
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) e.respondWith(rsc(req));
});
self.addEventListener("message", (e) => {
  const d = e.data || {}; const reply = (v) => { try { e.ports[0] && e.ports[0].postMessage(v); } catch (_) {} };
  if (d.type === "warm") e.waitUntil(warm(d.urls && d.urls.length ? d.urls : ROUTES).then(async (ok) => reply({ ok, ...(await status()) })));
  else if (d.type === "status") e.waitUntil(status().then(reply));
});
// إشعارات الدفع (تذكير انتهاء الوثائق وموعد الفواتير)
self.addEventListener("push", (e) => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {} e.waitUntil(self.registration.showNotification(d.title || "MyDoc", { body: d.body || "", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: d.url || "/" } })); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil((async () => { const all = await clients.matchAll({ type: "window", includeUncontrolled: true }); for (const c of all) { if ("focus" in c) { await c.focus(); if ("navigate" in c) { try { await c.navigate(url); } catch (_) {} } return; } } await clients.openWindow(url); })());
});
