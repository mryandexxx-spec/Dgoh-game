// A/B рендера (фаза 3b): одинаковые кадры двух сборок при виртуальных часах и попиксельное сравнение.
//   node tests/smoke/ab.mjs <A.html> <B.html> [--out dir] [--phone] [--gfx high,med] [--babylon path — только для старых сборок] [--chrome path]
// --gfx a,b — принудительный уровень графики (localStorage 'dune-gfx') для A и B; пусто — авто
// Часы: performance.now/Date.now идут только по команде tick(n) — по 1/60 с на реальный кадр, поэтому сцена в момент
// снимка определяется числом кадров, а не скоростью машины. Снимки: лагерь, окно героя, арена (бой заморожен
// до первого хода), портрет Baker. Печатает долю отличающихся пикселей (|Δ| > 8 в любом канале) и макс. Δ.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serve } from '../lib/serve.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const VAL = new Set(['--out', '--babylon', '--chrome', '--gfx']);
const GFX = (opt('--gfx') || '').split(',');
const [A, B] = args.filter((a, i) => !a.startsWith('--') && !VAL.has(args[i - 1]));
const OUT = opt('--out', path.join(HERE, 'ab-out')), PHONE = args.includes('--phone');
const chrome = opt('--chrome') || process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(f => fs.existsSync(f));
const LATE = fs.readFileSync(path.join(HERE, '../fixtures/saves/03-late.json'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });

async function shots(html, tag) {
  // --babylon нужен только старым сборкам (до фазы 4), где в HTML есть тег babylon.min.js; новые грузят чанк babylon3d.js сами
  const old = /babylon\.min\.js/.test(fs.readFileSync(html, 'utf8').slice(0, 300000)), babylon = old && (opt('--babylon') || [path.join(path.dirname(path.resolve(html)), 'babylon.min.js'), path.join(HERE, '../../../babylon.min.js')].find(f => fs.existsSync(f)));
  if (old && !babylon) throw new Error(`${html}: старая сборка — нужен --babylon <babylon.min.js>`);
  const page = await browser.newPage();
  await page.setViewport(PHONE ? { width: 844, height: 390, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: true } : { width: 960, height: 600, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', r => { const u = r.url(); if (babylon && /babylon\.min\.js$/.test(u)) return r.respond({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(babylon) }); if (/^(file|data|blob):|^http:\/\/127\.0\.0\.1:/.test(u)) return r.continue(); return r.abort(); });
  await page.evaluateOnNewDocument((save, gfx) => {
    let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    try { localStorage.clear(); localStorage.setItem('dune-goh-v1', save); localStorage.setItem('dune-cine-off', 'true'); if (gfx) localStorage.setItem('dune-gfx', JSON.stringify({ p: gfx, auto: 0 })); } catch (e) {}
    try { navigator.serviceWorker && Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
    const C = window.__clock = { vt: 5000, pending: 0, last: -1 };
    performance.now = () => C.vt; const D0 = 1762074000000; Date.now = () => D0 + C.vt;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => raf(t => { if (t !== C.last) { C.last = t; if (C.pending > 0) { C.pending--; C.vt += 1000 / 60; } } cb(C.vt); });
  }, LATE, GFX[tag === 'A' ? 0 : 1] || '');
  const srv = await serve(path.dirname(path.resolve(html)));   // фаза 5: HTTP вместо file:// — ассеты грузятся через fetch
  await page.goto(srv.url(path.basename(html)), { waitUntil: 'load' });
  await page.evaluate(async () => typeof loadB3 === 'function' && await loadB3()); await sleep(400);   // фаза 4: дождаться чанка и проявления 3D
  const run = c => page.evaluate(x => { (0, eval)(x); }, c);
  const tick = async n => { await page.evaluate(n => { window.__clock.pending += n; }, n); for (let k = 0; k < 600 && await page.evaluate(() => window.__clock.pending > 0); k++) await sleep(25); await sleep(1500); };
  const out = {};
  await sleep(2500); await run(`window.bakePortraits = () => {};`);
  await run(`closeInfo(true); closeOverlay(); view = 'lobby'; render();`); await tick(90);
  out.camp = await page.screenshot();
  await run(`openDetail('paul');`); await tick(90);
  out.hero = await page.screenshot();
  await run(`closeInfo(true); closeOverlay(); view = 'lobby'; render();`); await tick(10);
  await run(`{ const i = 0, n = NODES[i]; S.skipDlg = true; launch({ mode: 'camp', dlg: false, scene: NODE_SCENES[i], i, title: nodeTitle(i), desert: n.desert, squad: campSquad(i).filter(id => sideOk(n.camp, id) && prog(id).stars), enemy: n.enemy.map(id => enemyProg(id, n.lvl, n.m === 9)) }); clearTimeout(BT.timer); }`);
  await tick(90);
  out.arena = await page.screenshot();
  await run(`leaveBattle(); closeInfo(true); closeOverlay(); view = 'lobby'; render();`); await tick(5);
  out.bake = await page.evaluate(async () => { const bk = new Baker(); const r = await bk.bake(CH.paul); bk.dispose(); const rd = b => new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); }); return r.full ? rd(r.full) : null; });
  out.bake = out.bake ? Buffer.from(out.bake.split(',')[1], 'base64') : null;
  for (const [k, v] of Object.entries(out)) if (v) fs.writeFileSync(path.join(OUT, `${k}-${tag}${PHONE ? '-phone' : ''}.png`), v);
  await page.close(); await srv.close();
  return out;
}
const a = await shots(A, 'A'), b = await shots(B, 'B');
// сравнение в странице: обе картинки → canvas → пиксели
const cmp = await browser.newPage();
for (const k of Object.keys(a)) {
  if (!a[k] || !b[k]) { console.log(k, 'нет снимка', !!a[k], !!b[k]); continue; }
  const r = await cmp.evaluate(async (x, y) => {
    const load = u => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = u; });
    const [ia, ib] = await Promise.all([load(x), load(y)]); const w = ia.width, h = ia.height;
    if (w !== ib.width || h !== ib.height) return { size: [w, h, ib.width, ib.height] };
    const px = im => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, w, h); };
    const pa = px(ia).data, pb = px(ib).data, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), d = g.createImageData(w, h);
    let n = 0, mx = 0; for (let i = 0; i < pa.length; i += 4) { const m = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]), Math.abs(pa[i + 3] - pb[i + 3])); if (m > mx) mx = m; if (m > 8) n++; d.data[i] = d.data[i + 1] = d.data[i + 2] = m > 8 ? 255 : m * 8; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); return { frac: n / (w * h), max: mx, diff: c.toDataURL() };
  }, 'data:image/png;base64,' + a[k].toString('base64'), 'data:image/png;base64,' + b[k].toString('base64'));
  if (r.diff) fs.writeFileSync(path.join(OUT, `${k}-diff${PHONE ? '-phone' : ''}.png`), Buffer.from(r.diff.split(',')[1], 'base64'));
  console.log(`${k}: ${r.size ? 'размеры ' + r.size : `отличается ${(r.frac * 100).toFixed(3)}% пикселей, макс Δ ${r.max}`}`);
}
await browser.close();
