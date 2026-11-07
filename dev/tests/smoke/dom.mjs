// Замер DOM-нагрузки в простое (фаза 7, шаг 1): layout / recalc style / paint за окно, слои, источники принудительного layout.
//   node tests/smoke/dom.mjs <game.html> [--phone] [--dpr 1] [--win 3000] [--only lobby,squad] [--out f.json] [--stacks]   (из dev/)
//   Экраны: lobby, squad (ростер), hero (окно героя), bwait (бой, ожидание хода), bact (бой, авто-ходы), result (экран результатов).
//   layout/style/paint — число событий трассы за окно; paintMpx — Σ площадей Paint, Мпикс; forced — Layout со стеком JS (принудительный).
//   --inval — топ причин инвалидации layout/стиля (узел и причина).
//   SwiftShader: абсолютные мс ненадёжны, сравнивать только счётчики и площади между сборками.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const DEV = process.cwd();
const require = createRequire(path.join(DEV, 'package.json'));
const puppeteer = require('puppeteer-core');
const { serve } = await import(path.join(DEV, 'tests/lib/serve.mjs'));
const args = process.argv.slice(2), has = k => args.includes(k), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const html = args.find(a => !a.startsWith('--') && a.endsWith('.html')), PHONE = has('--phone'), WIN = +opt('--win', 3000);
const ONLY = opt('--only', '') ? opt('--only').split(',') : null;
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(f => fs.existsSync(f));
const LATE = fs.readFileSync(path.join(DEV, 'tests/fixtures/saves/03-late.json'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const V = v => `closeInfo(true); closeOverlay(); view = '${v}'; render();`;
const BATTLE = auto => `{ const i = 0, n = NODES[i]; S.skipDlg = true; launch({ mode: 'camp', dlg: false, scene: NODE_SCENES[i], i, title: nodeTitle(i), desert: n.desert, squad: campSquad(i).filter(id => sideOk(n.camp, id) && prog(id).stars), enemy: n.enemy.map(id => enemyProg(id, n.lvl, n.m === 9)) }); BT.auto = ${auto}; }`;
// [имя, код, ожидание готовности (выражение), пауза перед окном, мс]
const SCREENS = [
  ['lobby', V('lobby'), 'true', 2500],
  ['squad', V('squad'), 'true', 2000],
  ['hero', `${V('squad')} openDetail('paul');`, 'true', 3500],
  ['skill', `${V('squad')} openDetail('paul'); hcSkill('paul:special');`, 'true', 2500],   // пакет 6: окно умения поверх карточки
  ['memory', `${V('squad')} { const p = prog('paul'); p.stars = 7; } openDetail('paul'); hcMem('paul');`, 'true', 2500],   // пакет 6: «Другая память», 3D на паузе
  ['bwait', BATTLE(false), '!!(BT && BT.waiting)', 1500],
  ['bact', BATTLE(true), '!!(BT && BT.B && BT.B.log.length > 2)', 300],
  ['result', `${BATTLE(false)}`, '!!(BT && BT.waiting)', 0, `BT.B.over = 'A'; finish();`, 1500],
].filter(s => !ONLY || ONLY.includes(s[0]));

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
const SRV = await serve(path.dirname(path.resolve(html)));
const out = { build: null, phone: PHONE, win: WIN, screens: {} };
for (const [name, code, ready, pause, after, pause2] of SCREENS) {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log(name, 'pageerror:', e.message));
  await page.setViewport(PHONE ? { width: 844, height: 390, deviceScaleFactor: +opt('--dpr', 1), isMobile: true, hasTouch: true, isLandscape: true } : { width: 960, height: 600, deviceScaleFactor: +opt('--dpr', 1) });
  await page.setRequestInterception(true); page.on('request', r => /^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url()) ? r.continue() : r.abort());
  await page.evaluateOnNewDocument(save => {
    try { localStorage.clear(); localStorage.setItem('dune-goh-v1', save); localStorage.setItem('dune-cine-off', 'true'); } catch (e) {}
    try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
  }, LATE);
  await page.goto(SRV.url(path.basename(html)), { waitUntil: 'load' });
  await sleep(3000);
  await page.evaluate(async () => { if (typeof loadB3 === 'function') await loadB3(); });
  out.build = out.build || await page.evaluate(() => (document.querySelector('.appver') || {}).textContent || '');
  await page.evaluate(c => { (0, eval)(c); }, code);
  await page.waitForFunction(r => (0, eval)(r), { timeout: 60000, polling: 100 }, ready).catch(() => console.log(name, 'ready: таймаут'));
  if (after) { await page.evaluate(c => { (0, eval)(c); }, after); await sleep(pause2); } else await sleep(pause);
  const cdp = await page.createCDPSession();
  let layers = null;
  cdp.on('LayerTree.layerTreeDidChange', e => { if (e.layers) layers = e.layers; });
  await cdp.send('LayerTree.enable');
  await page.tracing.start({ categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack', 'blink', 'cc', ...(has('--inval') ? ['disabled-by-default-devtools.timeline.invalidationTracking'] : [])] });
  await sleep(WIN);
  const tr = JSON.parse(Buffer.from(await page.tracing.stop()).toString());
  await sleep(200);
  const ev = tr.traceEvents.filter(e => e.ph === 'X' || e.ph === 'B' || e.ph === 'I' || e.ph === 'i');
  const cnt = n => ev.filter(e => e.name === n);
  const VW = PHONE ? 844 : 960, VH = PHONE ? 390 : 600, cx = v => Math.max(0, Math.min(VW, v)), cy = v => Math.max(0, Math.min(VH, v));   // клип по вьюпорту: у скрытых/внеэкранных слоёв клип бесконечный
  const area = q => q && q.length >= 8 ? (cx(Math.max(q[0], q[2], q[4], q[6])) - cx(Math.min(q[0], q[2], q[4], q[6]))) * (cy(Math.max(q[1], q[3], q[5], q[7])) - cy(Math.min(q[1], q[3], q[5], q[7]))) : 0;
  const L = cnt('Layout'), St = cnt('UpdateLayoutTree'), P = cnt('Paint');
  const forced = L.filter(e => e.args && e.args.beginData && e.args.beginData.stackTrace && e.args.beginData.stackTrace.length);
  const stacks = {};
  for (const e of forced) { const k = e.args.beginData.stackTrace.slice(0, 3).map(f => `${f.functionName || '(anon)'}@${(f.url || '').split('/').pop()}:${f.lineNumber}`).join(' < '); stacks[k] = (stacks[k] || 0) + 1; }
  const paintBy = {};
  for (const e of P) { const d = e.args && e.args.data || {}; const k = d.nodeName || d.nodeId || 'layer'; paintBy[k] = (paintBy[k] || 0) + area(d.clip) / 1e6; }
  const rawLayers = layers || [];
  const drawn = rawLayers.filter(l => l.drawsContent);
  const r = {
    layout: L.length, layoutMs: +(L.reduce((s, e) => s + (e.dur || 0), 0) / 1000).toFixed(1),
    style: St.length, styleMs: +(St.reduce((s, e) => s + (e.dur || 0), 0) / 1000).toFixed(1),
    paint: P.length, paintMpx: +P.reduce((s, e) => s + area(e.args && e.args.data && e.args.data.clip), 0).toFixed(2) / 1e6,
    forced: forced.length, layers: drawn.length, layersMpx: +(drawn.reduce((s, l) => s + l.width * l.height, 0) / 1e6).toFixed(2),
    topPaint: Object.entries(paintBy).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v.toFixed(2)}`),
    stacks: Object.entries(stacks).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${v}× ${k}`),
    anims: await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => a.animationName || a.transitionProperty || a.constructor.name).reduce((m, n) => (m[n] = (m[n] || 0) + 1, m), {})),
  };
  r.paintMpx = +(P.reduce((s, e) => s + area(e.args && e.args.data && e.args.data.clip), 0) / 1e6).toFixed(2);
  out.screens[name] = r;
  console.log(`${name.padEnd(7)} layout ${String(r.layout).padStart(4)} (${r.layoutMs} мс)  style ${String(r.style).padStart(4)}  paint ${String(r.paint).padStart(4)} / ${r.paintMpx} Мпкс  forced ${r.forced}  слоёв ${r.layers} / ${r.layersMpx} Мпкс`);
  if (has('--inval')) {   // кто грязнит layout/стиль: причина + узел
    const inv = {};
    for (const e of tr.traceEvents) if (/^(LayoutInvalidationTracking|StyleRecalcInvalidationTracking|ScheduleStyleInvalidationTracking)$/.test(e.name)) { const d = e.args && e.args.data || {}; const k = `${e.name.replace('InvalidationTracking', '')}: ${d.reason || d.invalidationSet || ''} ${d.nodeName || ''}`; inv[k] = (inv[k] || 0) + 1; }
    for (const [k, v] of Object.entries(inv).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`    inval ${v}× ${k}`.slice(0, 200));
  }
  if (has('--stacks')) { for (const s of r.stacks) console.log('   ', s); console.log('    paint:', r.topPaint.join('; ')); console.log('    anim:', JSON.stringify(r.anims)); }
  await page.close();
}
console.log('сборка:', out.build, PHONE ? '(phone 844×390)' : '(desktop 960×600)', `окно ${WIN} мс`);
if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(out, null, 1));
await browser.close(); SRV.close && SRV.close();
