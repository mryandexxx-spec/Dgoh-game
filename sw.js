const CACHE = 'dune-goh-670afd436d';
const ASSETS = ["./", "babylon.min.js", "fonts.css", "forum-cyrillic-400-normal.woff2", "forum-latin-400-normal.woff2", "ibm-plex-mono-cyrillic-400-normal.woff2", "ibm-plex-mono-cyrillic-600-normal.woff2", "ibm-plex-mono-latin-400-normal.woff2", "ibm-plex-mono-latin-600-normal.woff2", "ibm-plex-sans-cyrillic-400-normal.woff2", "ibm-plex-sans-cyrillic-500-normal.woff2", "ibm-plex-sans-cyrillic-600-normal.woff2", "ibm-plex-sans-latin-400-normal.woff2", "ibm-plex-sans-latin-500-normal.woff2", "ibm-plex-sans-latin-600-normal.woff2", "icon-180.png", "icon-192.png", "icon-32.png", "icon-512.png", "index.html", "manifest.webmanifest", "maskable-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match('./'))));
});
