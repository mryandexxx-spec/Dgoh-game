// 3D-смоук (фаза 3b, шаг 1): реальный WebGL (SwiftShader), цикл лагерь → окно героя → бой → выход ×N.
//   node tests/smoke/3d.mjs <game.html> [--cycles 5] [--phone] [--babylon path] [--shots dir] [--out file.json] [--chrome path] [--strict]
// Метрики: живые WebGL-контексты (после gc), сумма scene.meshes/textures/materials по всем движкам, gpuTex — внутренние текстуры движка (без сцены Baker — камера 'bc'),
// линковки шейдеров в бою после «пробуждения» арены, время входа в бой / возврата в лагерь (до первого кадра),
// ошибки консоли. Критерии фазы 3b печатаются как PASS/FAIL; --strict → код выхода 1 при FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const html = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a)) || path.join(HERE, '../../dist/pwa/index.html');
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const has = k => args.includes(k);
const CYCLES = +opt('--cycles', 5), PHONE = has('--phone'), SHOTS = opt('--shots'), OUT = opt('--out');
const babylon = opt('--babylon') || [path.join(path.dirname(path.resolve(html)), 'babylon.min.js'), path.join(HERE, '../../../babylon.min.js')].find(f => fs.existsSync(f));
const chrome = opt('--chrome') || process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(f => fs.existsSync(f));
if (!chrome) { console.error('нужен Chrome: --chrome <путь> или CHROME_PATH'); process.exit(2); }
const LATE = fs.readFileSync(path.join(HERE, '../fixtures/saves/03-late.json'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: chrome, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport(PHONE ? { width: 844, height: 390, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: true } : { width: 960, height: 600, deviceScaleFactor: 1 });
await page.emulateTimezone('Europe/Moscow');
await page.setRequestInterception(true);
page.on('request', r => {
  const u = r.url();
  if (/babylon(\.min)?\.js$/.test(u) && babylon) return r.respond({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(babylon) });
  if (/^(file|data|blob):/.test(u)) return r.continue();
  return r.abort();
});
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + String(e.message).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' && !/manifest/.test(m.text() + (m.location() && m.location().url || ''))) errors.push('console: ' + m.text().slice(0, 200)); });
await page.evaluateOnNewDocument(save => {
  let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  try { localStorage.clear(); localStorage.setItem('dune-goh-v1', save); localStorage.setItem('dune-cine-off', 'true'); } catch (e) {}
  try { navigator.serviceWorker && Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
  const SM = window.__sm = { ctx: [], link: 0 };
  const g = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) { const c = g.call(this, t, o); if (c && /webgl/.test(t) && !SM.ctx.some(w => w.deref() === c)) SM.ctx.push(new WeakRef(c)); return c; };
  for (const P of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (P) { const l = P.prototype.linkProgram; P.prototype.linkProgram = function (p) { SM.link++; return l.call(this, p); }; }
}, LATE);

// в странице: состояние 3D
const probe = () => page.evaluate(() => {
  try { window.gc && window.gc(); } catch (e) {}
  const SM = window.__sm; SM.ctx = SM.ctx.filter(w => w.deref());
  const live = SM.ctx.map(w => w.deref()).filter(c => !c.isContextLost());
  const r = { contexts: live.length, contextsInDom: live.filter(c => c.canvas && c.canvas.isConnected).length, engines: 0, scenes: 0, meshes: 0, textures: 0, materials: 0, link: SM.link, canv: live.map(c => (c.canvas.className || c.canvas.id || '?') + (c.canvas.isConnected ? '' : '(off)')).join(',') };
  const E = ((B => B && B.EngineStore && B.EngineStore.Instances)(window.__B3 || window.BABYLON)) || [];
  for (const e of E) { if (e.isDisposed) continue; r.engines++; r.gpuTex = (r.gpuTex || 0) + (e.getLoadedTexturesCache ? e.getLoadedTexturesCache().length : 0); if (e.getLoadedTexturesCache) { const K = r.gpuKinds = r.gpuKinds || {}; for (const t of e.getLoadedTexturesCache()) { const k = t.source + ':' + (t.url ? t.url.slice(0, 24) : '') + ':' + t.width + 'x' + t.height + (t.isCube ? 'c' : ''); K[k] = (K[k] || 0) + 1; } } for (const s of e.scenes) { if (s.cameras.some(c => c.name === 'bc')) { r.baker = (r.baker || 0) + 1; continue; } r.scenes++; r.meshes += s.meshes.length; r.textures += s.textures.length; r.materials += s.materials.length; } }
  return r;
});
const run = code => page.evaluate(c => { (0, eval)(c); }, code);
// ждать, пока выражение станет истинным; вернуть мс
const until = async (expr, max = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if (await page.evaluate(c => { try { return !!(0, eval)(c); } catch (e) { return false; } }, expr)) return Date.now() - t0; await sleep(20); } return -1; };
const frameOf = v => `(${v} && ${v}.scene && ${v}.scene.getFrameId && ${v}.scene.getFrameId()) || 0`;

// ключи кэша эффектов движка; с аргументом — только новые относительно снимка
const effKeys = (prev = null) => page.evaluate(prev => {
  const E = (((B => B && B.EngineStore && B.EngineStore.Instances)(window.__B3 || window.BABYLON)) || []).find(e => !e.isDisposed), C = E ? E._compiledEffects || {} : {}, k = Object.keys(C);
  if (!prev) return k;
  // новые эффекты: имя шейдера, материалы и меши, которые им рисуются, и defines, отличные от ближайшего уже бывшего эффекта того же шейдера
  return k.filter(x => !prev.includes(x)).map(x => {
    const ef = C[x], nm = x.split('@')[0], df = new Set((x.split('@')[1] || '').split('\n').map(t => t.trim()).filter(Boolean));
    const mats = [], meshes = [];
    for (const sc of E.scenes || []) { for (const m of sc.materials) { try { if (m.getEffect && m.getEffect() === ef) mats.push(m.name); } catch (e) {} }
      for (const me of sc.meshes) for (const sm of me.subMeshes || []) if (sm.effect === ef) meshes.push(me.name); }
    let best = null; for (const y of prev) { if (y.split('@')[0] !== nm) continue; const d2 = new Set((y.split('@')[1] || '').split('\n').map(t => t.trim()).filter(Boolean)); const a = [...df].filter(t => !d2.has(t)), b = [...d2].filter(t => !df.has(t)); if (!best || a.length + b.length < best.n) best = { n: a.length + b.length, add: a, del: b }; }
    return { shader: nm, mats: [...new Set(mats)].slice(0, 6), meshes: [...new Set(meshes)].slice(0, 6), defs: best ? { add: best.add.slice(0, 12), del: best.del.slice(0, 12) } : null };
  });
}, prev);
const has3d = async () => page.evaluate(async () => typeof loadB3 === 'function' ? await loadB3() : typeof HAS3D !== 'undefined' && HAS3D);   // фаза 4: чанк Babylon ленивый
await page.goto(pathToFileURL(path.resolve(html)).href, { waitUntil: 'load' });
await sleep(3000);
if (!await has3d()) { console.error('HAS3D = false — WebGL недоступен в Chrome'); await browser.close(); process.exit(2); }
const LOBBY = `closeInfo(true); closeOverlay(); view = 'lobby'; render();`;
const BATTLE = `{ const i = 0, n = NODES[i]; S.skipDlg = true; launch({ mode: 'camp', dlg: false, scene: NODE_SCENES[i], i, title: nodeTitle(i), desert: n.desert, squad: campSquad(i).filter(id => sideOk(n.camp, id) && prog(id).stars), enemy: n.enemy.map(id => enemyProg(id, n.lvl, n.m === 9)) }); BT.auto = true; BT.speed = 4; }`;

const cycles = [];
await run(LOBBY); await sleep(1500);
const start = await probe();
if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `camp${PHONE ? '-phone' : ''}.png`) }); }
for (let c = 0; c < CYCLES; c++) {
  const C = { n: c + 1 };
  await run(LOBBY); await sleep(800); C.camp = await probe();
  await run(`openDetail('paul');`); await sleep(1200); C.hero = await probe();
  await run(`closeInfo(true); closeOverlay(); view = 'lobby';`);
  // вход в бой: от вызова до первого кадра арены
  await page.evaluate(() => { window.__t0 = performance.now(); });
  await run(BATTLE);
  C.enterSyncMs = await page.evaluate(() => Math.round(performance.now() - window.__t0));
  C.enterMs = await until(frameOf('BT.arena') + ' > 0') + C.enterSyncMs;
  await sleep(500); // «wake» + первый кадр с эффектами
  const l0 = (await probe()).link, fx0 = await effKeys();
  await sleep(+opt('--battle-ms', 6000));
  C.battle = await probe(); C.compilesAfterWake = C.battle.link - l0;
  if (C.compilesAfterWake) C.newEffects = await effKeys(fx0); // какие эффекты скомпилированы после wake (имя@defines, усечено)
  C.log = await page.evaluate(() => (BT && BT.B && BT.B.log && BT.B.log.length) || 0);
  if (SHOTS && c === 0) await page.screenshot({ path: path.join(SHOTS, `arena${PHONE ? '-phone' : ''}.png`) });
  // выход: от leaveBattle до кадра лагеря
  const fxX = await effKeys();
  const f0 = await page.evaluate(c => { try { return (0, eval)(c); } catch (e) { return 0; } }, frameOf('CAMP_STAGE'));
  await page.evaluate(() => { window.__t0 = performance.now(); });
  await run(`leaveBattle(); ${LOBBY}`);
  const syncX = await page.evaluate(() => Math.round(performance.now() - window.__t0));
  const w = await until(`(${frameOf('CAMP_STAGE')}) > ${f0}`);
  C.exitMs = w < 0 ? -1 : w + syncX; C.exitSyncMs = syncX;
  await sleep(600); C.after = await probe(); C.exitLinks = C.after.link - C.battle.link; if (C.exitLinks) C.exitEffects = await effKeys(fxX);
  cycles.push(C);
  process.stdout.write(`цикл ${C.n}: контекстов ${C.after.contexts} [${C.after.canv}] (в бою ${C.battle.contexts} [${C.battle.canv}]), meshes ${C.after.meshes}, tex ${C.after.textures} (gpu ${C.after.gpuTex}, в бою ${C.battle.gpuTex}), mat ${C.after.materials}, вход ${C.enterMs} мс, выход ${C.exitMs} мс (синхронно ${C.exitSyncMs}), компиляций после wake ${C.compilesAfterWake}, при выходе ${C.exitLinks} (журнал боя ${C.log})\n`);
}
await browser.close();

const last = cycles[cycles.length - 1], first = cycles[0];
const maxCtx = Math.max(...cycles.flatMap(c => [c.camp.contexts, c.hero.contexts, c.battle.contexts, c.after.contexts]));
const crit = {
  'один WebGL-контекст': maxCtx <= 1,
  'нет компиляций после wake': cycles.every(c => c.compilesAfterWake === 0),
  'лагерь ↔ бой ≤ 400 мс': cycles.every(c => c.enterMs >= 0 && c.enterMs <= 400 && c.exitMs >= 0 && c.exitMs <= 400),
  'нет роста meshes/textures': cycles.length < 2 || (last.after.meshes <= cycles[1].after.meshes && last.after.textures <= cycles[1].after.textures),
  'нет ошибок консоли': errors.length === 0,
};
const res = { html: path.basename(html), mode: PHONE ? 'phone' : 'desktop', cycles: CYCLES, start, maxCtx, crit, errors: errors.slice(0, 20), cycleData: cycles };
console.log(`\n${res.mode}: контекстов макс ${maxCtx}; meshes ${first.after.meshes}→${last.after.meshes}, textures ${first.after.textures}→${last.after.textures}, materials ${first.after.materials}→${last.after.materials}; ошибок ${errors.length}`);
for (const [k, v] of Object.entries(crit)) console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
if (errors.length) console.log(errors.slice(0, 5).join('\n'));
if (OUT) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); }
if (has('--strict') && Object.values(crit).some(v => !v)) process.exit(1);
