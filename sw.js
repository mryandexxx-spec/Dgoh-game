// SW Dune GoH (фаза 5, шаг 4) — шаблон: tools/build.mjs подставляет VER, SHELL, ASSETS.
// Два кэша: оболочка «dune-goh-<ver>» (index, app.js, app.css, babylon3d.js, шрифты, иконки, manifest) и ассеты «dune-goh-assets»
// (имена с хешем содержимого — файл неизменен, cache-first). Установка переносит из старых кэшей всё, что не изменилось
// (оболочка — по sha256 тела, ассеты — по имени), и качает только изменённое; при первой установке ассеты не качаются —
// их докачивает сообщение «warm» (страница шлёт его после интерактивного лобби). Активация удаляет старые кэши оболочки,
// а из кэша ассетов — файлы не из текущего и не из предыдущего списка (открытая старая вкладка ещё может их запросить).
const VER = 'aa046f13de';
const SHELL = {"app.css":"668f458214eee8ed", "app.js":"a6619199380bf270", "babylon3d.js":"564bacc130b012e7", "fonts.css":"2d07ee2ff2a8cc4a", "forum-cyrillic-400-normal.woff2":"d3440e242c8a3edd", "forum-latin-400-normal.woff2":"21eb0ef1c5f416bd", "ibm-plex-mono-cyrillic-400-normal.woff2":"8bc4f83933a03c20", "ibm-plex-mono-cyrillic-600-normal.woff2":"654ae5761804d26b", "ibm-plex-mono-latin-400-normal.woff2":"3c5a451f9ec27a35", "ibm-plex-mono-latin-600-normal.woff2":"c4d3deb734a27e6d", "ibm-plex-sans-cyrillic-400-normal.woff2":"516187957199a04a", "ibm-plex-sans-cyrillic-500-normal.woff2":"54584bd8f91d8956", "ibm-plex-sans-cyrillic-600-normal.woff2":"d696be63fc19d8bd", "ibm-plex-sans-latin-400-normal.woff2":"db71f8a28ad85015", "ibm-plex-sans-latin-500-normal.woff2":"5ef914e59b0047a2", "ibm-plex-sans-latin-600-normal.woff2":"31535a91ce3f6b8e", "icon-180.png":"6dac4b2af5f9bb88", "icon-192.png":"710711258553d935", "icon-32.png":"6e8c31f3b37854c6", "icon-512.png":"96ea7249e8f3c1e9", "index.html":"62e5612fade27724", "manifest.webmanifest":"67584bc117e385b1", "maskable-512.png":"a3e32d19a3cce9e4"};   // путь → sha256 (16 hex)
const ASSETS = ["assets/anim/mocap.d1ba3731.json", "assets/env/desert.20b085fb.hdr", "assets/img/worm-ava.cbb7cf05.png", "assets/img/worm-badge.798f79d1.png", "assets/models/duncan.2c3a1fae.dgm", "assets/models/worm.53cb9f43.dgm", "assets/tex/duncan-cape-alb.a6f6e150.jpg", "assets/tex/duncan-cape-nrm.d124cf28.jpg", "assets/tex/duncan-cape-orm.3ad26949.jpg", "assets/tex/duncan-cloth-alb.f35ea257.jpg", "assets/tex/duncan-cloth-nrm.8e431c28.jpg", "assets/tex/duncan-cloth-orm.2b505409.jpg", "assets/tex/duncan-eye-alb.91d3e2f7.jpg", "assets/tex/duncan-eye-orm.208485f7.jpg", "assets/tex/duncan-hair-alb.54870a5d.jpg", "assets/tex/duncan-hair-nrm.9d23b399.jpg", "assets/tex/duncan-hair-orm.96c02312.jpg", "assets/tex/duncan-leather-alb.1dc39b0c.jpg", "assets/tex/duncan-leather-nrm.36eb212e.jpg", "assets/tex/duncan-leather-orm.904afb18.jpg", "assets/tex/duncan-metal-alb.6aa311d5.jpg", "assets/tex/duncan-metal-orm.aeb43ace.jpg", "assets/tex/duncan-plate-alb.05e5dc18.jpg", "assets/tex/duncan-plate-nrm.5f80cc38.jpg", "assets/tex/duncan-plate-orm.34a0bcdf.jpg", "assets/tex/duncan-skin-alb.dd15704d.jpg", "assets/tex/duncan-skin-nrm.75407371.jpg", "assets/tex/duncan-skin-orm.09d75f62.jpg", "assets/tex/worm-alb.b1a8954f.jpg", "assets/tex/worm-nrm.fed64477.jpg"];
const SC = 'dune-goh-' + VER, AC = 'dune-goh-assets', LIST = '__assets-list__';
const abs = p => new URL(p, self.registration.scope).href;
const hex = b => crypto.subtle.digest('SHA-256', b).then(d => [...new Uint8Array(d)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join(''));
const isUpdate = () => caches.keys().then(ks => ks.some(k => k.startsWith('dune-goh-') && k !== SC && k !== AC) || ks.includes(AC));

async function installShell() {
  const sc = await caches.open(SC);
  for (const [p, h] of Object.entries(SHELL)) {
    const u = abs(p), old = await caches.match(u);   // любой кэш, включая единый кэш v54
    if (old) { const b = await old.arrayBuffer(); if (await hex(b) === h) { await sc.put(u, new Response(b, { headers: old.headers })); continue; } }
    const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(p + ': HTTP ' + r.status);
    const b = await r.arrayBuffer(); if (await hex(b) !== h) throw new Error(p + ': хеш не совпал');   // старая копия CDN — установка отложится
    await sc.put(u, new Response(b, { headers: r.headers }));
  }
}
async function installAssets() {
  const ac = await caches.open(AC), upd = await isUpdate();
  for (const p of ASSETS) {
    const u = abs(p); if (await ac.match(u)) continue;
    const old = await caches.match(u); if (old) { await ac.put(u, old); continue; }
    if (upd) { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(p + ': HTTP ' + r.status); await ac.put(u, r); }
  }
}
self.addEventListener('install', e => { e.waitUntil(installShell().then(installAssets).then(() => self.skipWaiting())); });

self.addEventListener('activate', e => { e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('dune-goh-') && k !== SC && k !== AC) await caches.delete(k);
  const ac = await caches.open(AC), lr = await ac.match(abs(LIST)), prev = lr ? await lr.json() : [];
  const keep = new Set([...ASSETS, ...prev].map(abs));
  for (const q of await ac.keys()) if (q.url !== abs(LIST) && !keep.has(q.url)) await ac.delete(q);
  await ac.put(abs(LIST), new Response(JSON.stringify(ASSETS), { headers: { 'content-type': 'application/json' } }));
  await self.clients.claim();
})()); });

const INF = new Map();   // ассет в пути: запрос страницы (loadB3) и докачка не качают его дважды
function asset(u) {
  return caches.open(AC).then(ac => ac.match(u).then(r => r || INF.get(u) || (INF.set(u, fetch(u).then(res => res.ok ? ac.put(u, res.clone()).then(() => res) : res)
    .finally(() => INF.delete(u)))).get(u))).then(r => r.clone());
}
async function warm() {
  const ac = await caches.open(AC); let fetched = 0, cached = 0;
  for (const p of ASSETS) { const u = abs(p); if (await ac.match(u)) { cached++; continue; } try { if ((await asset(u)).ok) fetched++; } catch (_) {} }
  return { fetched, cached, total: ASSETS.length };
}
self.addEventListener('message', e => { if (e.data && e.data.type === 'warm') e.waitUntil(warm().then(r => e.source && e.source.postMessage({ type: 'warm', ver: VER, ...r }))); });

const ASSET_URLS = new Set(ASSETS.map(abs)), SHELL_URLS = new Set(Object.keys(SHELL).map(abs));
self.addEventListener('fetch', e => {
  const q = e.request; if (q.method !== 'GET') return;
  const url = new URL(q.url); url.search = ''; url.hash = ''; let u = url.href;
  if (q.mode === 'navigate' || u === abs('./')) u = abs('index.html');
  // и файлы прошлого списка (assets/*) — для открытой старой вкладки
  if (ASSET_URLS.has(u) || u.startsWith(abs('assets/'))) return e.respondWith(asset(u).catch(() => Response.error()));
  if (!SHELL_URLS.has(u)) return;   // прочее — сеть без кэширования
  e.respondWith(caches.open(SC).then(sc => sc.match(u)).then(r => r || fetch(q)).catch(() => q.mode === 'navigate' ? caches.match(abs('index.html')) : Response.error()));
});
