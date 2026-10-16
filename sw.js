// Ledger service worker: caches only the app shell and the public Firebase SDK scripts.
// It never touches Firestore/Auth network traffic, and never caches any personal data.
const V = "ledger-v1", SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  if (r.mode === "navigate") { // always try the network first so updates show up; fall back to the cached shell offline
    e.respondWith(fetch(r).then(res => { const copy = res.clone(); caches.open(V).then(c => c.put("./", copy)); return res; }).catch(() => caches.match("./")));
    return;
  }
  const shell = u.origin === location.origin, sdk = u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/");
  if (!shell && !sdk) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(r), net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
