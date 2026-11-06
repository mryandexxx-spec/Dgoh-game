// Смоук SW (фаза 5, шаг 4): обновление PWA на localhost, как на iPhone.
//   node tests/smoke/sw.mjs <A> <B> [<C>] [--chrome path]   — A, B, C — каталоги собранной PWA (dist/pwa или корень выкатки)
// A → (докачка) → B: новый SW ставится без 404, качает только изменённые файлы оболочки, ассеты и babylon3d.js — из старого кэша;
// открытая вкладка A продолжает работать; новая вкладка — версия B; докачка ничего не качает.
// B → C (C — с изменённым ассетом): качается ровно изменённый ассет; прежняя версия файла остаётся в кэше (предыдущее поколение).
// Затем «нет сети»: новая вкладка открывается из кэша, loadB3() → true, модели и клипы из кэша.
// Первая установка (новый профиль, C): докачка заполняет кэш ассетов целиком.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const args = process.argv.slice(2), opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [A, B, C] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--chrome').map(d => path.resolve(d));
const chrome = opt('--chrome') || process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(f => fs.existsSync(f));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const swVer = d => /const (?:VER = '|CACHE = 'dune-goh-)([0-9a-f]+)'/.exec(fs.readFileSync(path.join(d, 'sw.js'), 'utf8'))[1];
let LOG = []; const srv = await serve(A, { onReq: (f, c) => LOG.push([f, c]) });
const url = p => srv.url(p).replace('127.0.0.1', 'localhost');   // SW регистрируется только на https или localhost
let fails = 0; const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
async function open(ctx = browser.defaultBrowserContext()) {
  const p = await ctx.newPage(); await p.setViewport({ width: 960, height: 600 });
  p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem('dune-cine-off', 'true'); } catch (e) {}
    window.__warm = null; navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'warm') window.__warm = e.data; });
  });
  await p.goto(url('index.html'), { waitUntil: 'load', timeout: 180000 }); return p;
}
const until = async (p, fn, max = 60000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < max) { const v = await p.evaluate(fn, arg).catch(() => null); if (v) return v; await sleep(200); } return null; };
const cacheState = p => p.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).map(q => new URL(q.url).pathname.slice(1)); return o; });
const ver = p => p.evaluate(() => (document.getElementById('appver') || {}).textContent || '');
const assetHits = () => LOG.filter(([f]) => f.startsWith('assets/'));

// 1. A: установка, докачка
let pa = await open();
await until(pa, () => navigator.serviceWorker.controller && caches.keys().then(k => k.length > 0));
await sleep(6000);   // A (v54) докачки не знает — всё предкэшировано при установке
const vA = swVer(A), vB = swVer(B);
console.log(`A: ${await ver(pa)}, controller ${await pa.evaluate(() => !!navigator.serviceWorker.controller)}, ${pa.url()}, кэши ${Object.keys(await cacheState(pa)).join(', ')}`);

// 2. A → B
LOG = []; srv.dir(B);
await pa.evaluate(() => navigator.serviceWorker.ready.then(r => r.update()));
await until(pa, v => caches.keys().then(ks => ks.includes('dune-goh-' + v) && !ks.some(k => /^dune-goh-[0-9a-f]+$/.test(k) && k !== 'dune-goh-' + v)), 120000, vB);
const stB = await cacheState(pa);
check(Object.keys(stB).includes('dune-goh-' + vB) && !Object.keys(stB).includes('dune-goh-' + vA), `A→B: кэш оболочки dune-goh-${vB}, старый удалён (${Object.keys(stB).join(', ')})`);
check(!LOG.some(([, c]) => c === 404), `A→B: без 404 (${LOG.filter(([, c]) => c === 404).map(x => x[0]).join(', ') || '—'})`);
check(assetHits().length === 0 && !LOG.some(([f]) => f === 'babylon3d.js' || /\.woff2$|\.png$/.test(f)), `A→B: ассеты, babylon3d.js, шрифты, иконки не качались; запросы: ${[...new Set(LOG.map(x => x[0]))].join(', ')}`);
check((stB['dune-goh-assets'] || []).length >= 30, `A→B: кэш ассетов — ${(stB['dune-goh-assets'] || []).length} записей (перенос из кэша A)`);
// старая вкладка: открыть героя, вернуться в лобби, 3D
const oldOk = await pa.evaluate(async () => { try { (0, eval)("closeInfo(true); closeOverlay(); view = 'lobby'; render(); openDetail('paul');"); await new Promise(r => setTimeout(r, 1500)); (0, eval)("closeInfo(true); closeOverlay(); view = 'lobby'; render();"); return await loadB3(); } catch (e) { return String(e); } });
check(oldOk === true, `старая вкладка A работает (герой → лобби, loadB3: ${oldOk})`);

// 3. новая вкладка B, докачка
LOG = [];
const pb = await open();
const wb = await until(pb, () => window.__warm, 30000);
check((await ver(pb)).includes(vB), `новая вкладка — ${await ver(pb)}`);
check(wb && wb.fetched === 0, `докачка в B: ${JSON.stringify(wb)}; ассетов с сервера ${assetHits().length}`);

let cName = null;
if (C) {   // 4. B → C: изменён один ассет
  const vC = swVer(C), listB = new Set(stB['dune-goh-assets']);
  LOG = []; srv.dir(C);
  await pb.evaluate(() => navigator.serviceWorker.ready.then(r => r.update()));
  await until(pb, v => caches.has('dune-goh-' + v).then(h => h && caches.keys().then(ks => ks.filter(k => /^dune-goh-[0-9a-f]+$/.test(k)).length === 1)), 120000, vC);
  const stC = await cacheState(pb), listC = new Set(stC['dune-goh-assets']);
  const added = [...listC].filter(f => !listB.has(f)), hits = assetHits().map(x => x[0]);
  cName = added.find(f => f.startsWith('assets/'));
  check(added.length >= 1 && hits.length === 1 && hits[0] === cName, `B→C: скачан ровно изменённый ассет (${hits.join(', ')}), новых в кэше ${added.length}`);
  check([...listB].filter(f => f.startsWith('assets/')).every(f => listC.has(f)), 'B→C: прежние версии ассетов остались (предыдущее поколение)');
  check(Object.keys(stC).includes('dune-goh-' + vC) && !LOG.some(([, c]) => c === 404), `B→C: оболочка dune-goh-${vC}, без 404`);
}

// 5. нет сети: новая вкладка из кэша, 3D из кэша
srv.dir(null);
const po = await open();
const off = await po.evaluate(async () => ({ v: (document.getElementById('appver') || {}).textContent, b3: await loadB3(), duncan: !!(MODEL_DATA.duncan && MODEL_DATA.duncan.parts || MODEL_DATA.duncan), worm: !!MODEL_DATA.worm, mocap: typeof MOCAP_OK !== 'undefined' && MOCAP_OK }));
check(off.b3 === true && off.duncan && off.worm && off.mocap, `офлайн: ${JSON.stringify(off)}`);

// 6. первая установка в новом профиле: докачка заполняет кэш ассетов
srv.dir(C || B); LOG = [];
const ctx = await browser.createBrowserContext(), pf = await open(ctx);
await until(pf, () => navigator.serviceWorker.controller, 60000);
const wf = await until(pf, () => window.__warm, 60000), stF = await cacheState(pf);
const per = {}; for (const [f] of assetHits()) per[f] = (per[f] || 0) + 1;
check(wf && wf.fetched + wf.cached === wf.total && (stF['dune-goh-assets'] || []).filter(f => f.startsWith('assets/')).length === wf.total,
  `первая установка: докачка ${JSON.stringify(wf)}; запросов ассетов ${assetHits().length}, повторных ${Object.values(per).filter(n => n > 1).length}`);

check(!errs.length, `ошибки консоли: ${errs.length}${errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''}`);
await browser.close(); await srv.close();
console.log(fails ? `FAIL: ${fails}` : 'все проверки SW пройдены'); process.exit(fails ? 1 : 0);
