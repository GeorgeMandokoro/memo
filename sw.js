/* memo – オフライン用の最小 Service Worker
   ネットワーク優先。つながれば常に最新を取りに行き、失敗したらキャッシュを返す。 */
const CACHE = "memo-v1";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 1 つずつ入れる。addAll だと 1 件失敗しただけで全部キャッシュされなくなる
    for (const u of ASSETS){
      try{
        const res = await fetch(u, { cache: "reload" });
        if (res.ok) await c.put(u, res);
      }catch(err){ /* 取れないものは飛ばす */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(m => m || caches.match("./index.html")))
  );
});
