// لا نخزّن الوثائق ولا استجابات API. فقط صفحة بديلة عند انقطاع الاتصال.
const C = "mydoc-offline-v1";
self.addEventListener("install", (e) => e.waitUntil(caches.open(C).then((c) => c.add("/offline.html"))));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k))))));
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") e.respondWith(fetch(e.request).catch(() => caches.match("/offline.html")));
});
