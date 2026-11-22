// Red Pen service worker: works offline after the first visit.
// Bump VERSION whenever app files or data/questions.json change, so phones download the new version.
const VERSION = "redpen-2026-11-22a";
const SHELL = ["./", "index.html", "style.css", "app.js", "merge.js", "firebase-config.js", "sync.js", "manifest.webmanifest", "data/questions.json", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"];
const FONTS = "redpen-fonts";
// Firebase SDK (pinned version in the URL, so it never changes): cache-first, kept across app updates.
// Only downloaded once someone signs in; then a signed-in user can open the app offline.
const FIREBASE = "redpen-firebase";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS && k !== FIREBASE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    e.respondWith(caches.open(FIREBASE).then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => req.mode === "navigate" ? caches.match("index.html") : undefined)));
});
