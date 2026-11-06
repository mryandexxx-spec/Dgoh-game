// SW Dune GoH (фаза 5, шаг 4) — шаблон: tools/build.mjs подставляет VER, SHELL, ASSETS.
// Два кэша: оболочка «dune-goh-<ver>» (index, app.js, app.css, babylon3d.js, шрифты, иконки, manifest) и ассеты «dune-goh-assets»
// (имена с хешем содержимого — файл неизменен, cache-first). Установка переносит из старых кэшей всё, что не изменилось
// (оболочка — по sha256 тела, ассеты — по имени), и качает только изменённое; при первой установке ассеты не качаются —
// их докачивает сообщение «warm» (страница шлёт его после интерактивного лобби). Активация удаляет старые кэши оболочки,
// а из кэша ассетов — файлы не из текущего и не из предыдущего списка (открытая старая вкладка ещё может их запросить).
const VER = '__VER__';
const SHELL = __SHELL__;   // путь → sha256 (16 hex)
const ASSETS = __ASSETS__;
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
