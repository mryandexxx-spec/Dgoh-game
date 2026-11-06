// Замер цены кадра и VRAM (фаза 6, шаг 1): лагерь, окно героя, бой. SwiftShader — только относительные метрики.
//   node tests/smoke/perf.mjs <game.html> [--phone] [--dpr 3] [--low] [--out f.json]   (из dev/)
//   draws — draw calls за кадр; passes — проходы (сегменты framebuffer+viewport с отрисовкой); mpx — Σ площадей проходов, Мпикс/кадр;
//   VRAM — внутренние текстуры движка (RT с MSAA-буфером), depth-renderbuffer обёрток RT, backbuffer канваса.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const DEV = process.cwd();
const require = createRequire(path.join(DEV, 'package.json'));
const puppeteer = require('puppeteer-core');
const { serve } = await import(path.join(DEV, 'tests/lib/serve.mjs'));
const args = process.argv.slice(2), has = k => args.includes(k), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const html = args.find(a => !a.startsWith('--') && a.endsWith('.html')), PHONE = has('--phone'), LOW = has('--low');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(f => fs.existsSync(f));
const LATE = fs.readFileSync(path.join(DEV, 'tests/fixtures/saves/03-late.json'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport(PHONE ? { width: 844, height: 390, deviceScaleFactor: +opt('--dpr', 1), isMobile: true, hasTouch: true, isLandscape: true } : { width: 960, height: 600, deviceScaleFactor: +opt('--dpr', 1) });
await page.setRequestInterception(true); page.on('request', r => /^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url()) ? r.continue() : r.abort());
await page.evaluateOnNewDocument((save, low) => {
  try { localStorage.clear(); localStorage.setItem('dune-goh-v1', save); localStorage.setItem('dune-cine-off', 'true'); if (low) localStorage.setItem('dune-gfx-low', 'true'); } catch (e) {}
  try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
  // счётчики GL: draw calls, смены framebuffer, «пиксели проходов» = Σ площади вьюпорта по сегментам (fb, viewport) с ≥1 draw
  const G = window.__gl = { draws: 0, tris: 0, fbBinds: 0, passes: 0, px: 0, clears: 0, seg: null };
  for (const P of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (P) {
    const pr = P.prototype, vp = pr.viewport, bf = pr.bindFramebuffer, cl = pr.clear;
    pr.viewport = function (x, y, w, h) { this.__vp = w * h; G.seg = null; return vp.call(this, x, y, w, h); };
    pr.bindFramebuffer = function (t, f) { if (t !== 0x8CA8) { G.fbBinds++; G.seg = null; G.fb = f; } return bf.call(this, t, f); };
    pr.clear = function (m) { G.clears++; return cl.call(this, m); };
    for (const n of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const f = pr[n]; if (!f) continue;
      pr[n] = function (...a) { G.draws++; if (!G.seg) { G.seg = { fb: G.fb, px: this.__vp || 0, n: 0 }; G.passes++; G.px += this.__vp || 0; if (G.rec) G.rec.push(G.seg); } G.seg.n++; return f.apply(this, a); }; }
  }
}, LATE, LOW);
const SRV = await serve(path.dirname(path.resolve(html)));
await page.goto(SRV.url(path.basename(html)), { waitUntil: 'load' });
await sleep(3000);
await page.evaluate(async () => { await loadB3(); });
const run = c => page.evaluate(c => { (0, eval)(c); }, c);
const LOBBY = `closeInfo(true); closeOverlay(); view = 'lobby'; render();`;
const BATTLE = `{ const i = 0, n = NODES[i]; S.skipDlg = true; launch({ mode: 'camp', dlg: false, scene: NODE_SCENES[i], i, title: nodeTitle(i), desert: n.desert, squad: campSquad(i).filter(id => sideOk(n.camp, id) && prog(id).stars), enemy: n.enemy.map(id => enemyProg(id, n.lvl, n.m === 9)) }); BT.auto = false; }`;

// VRAM: внутренние текстуры движка с атрибуцией по владельцу; MSAA-renderbuffer'ы и depth — по обёрткам RT
const vram = (stageExpr) => page.evaluate(stageExpr => {
  const B = window.__B3 || window.BABYLON, E = B.EngineStore.Instances.find(e => !e.isDisposed);
  const CH = { 5: 4, 4: 3, 6: 1, 7: 2, 0: 1, 1: 1, 2: 2 };   // RGBA, RGB, RED, RG, ALPHA, LUMINANCE, LUM_ALPHA
  const BPC = { 0: 1, 1: 4, 2: 2, 13: 4, 14: 4 };            // UNSIGNED_BYTE, FLOAT, HALF_FLOAT, ...
  const own = new Map();
  const tag = (it, name) => { if (it && !own.has(it)) own.set(it, name); };
  for (const sc of E.scenes) {
    const sn = sc === (window.CAMP_STAGE && CAMP_STAGE.scene) ? 'camp' : sc === (window.HERO_STAGE && HERO_STAGE.scene) ? 'hero' : sc === (window.BT && BT.arena && BT.arena.scene) ? 'arena' : 'other';
    for (const pp of sc.postProcesses || []) { const d = pp._textures && pp._textures.data || []; for (const t of d) if (t) tag(t.texture || t, sn + '/pp:' + pp.name); }
    for (const c of sc.cameras) for (const pp of c._postProcesses || []) if (pp) { const d = pp._textures && pp._textures.data || []; for (const t of d) if (t) tag(t.texture || t, sn + '/pp:' + pp.name); }
    for (const t of sc.textures) { const it = t.getInternalTexture && t.getInternalTexture(); if (it) tag(it, sn + (t.renderList || t.isRenderTarget ? '/rt:' : '/tex:') + t.name); }
    for (const l of sc.lights) { const g = l.getShadowGenerator && l.getShadowGenerator(); const m = g && g.getShadowMap(); if (m) tag(m.getInternalTexture(), sn + '/shadow:' + l.name); }
    for (const l of sc.effectLayers || []) for (const t of l._textures || []) tag(t.getInternalTexture && t.getInternalTexture(), sn + '/glow:' + t.name);
    try { const gb = sc.geometryBufferRenderer; if (gb) { const mrt = gb.getGBuffer(); for (const t of mrt.textures) tag(t.getInternalTexture(), sn + '/gbuffer'); } } catch (e) {}
  }
  const rows = [];
  for (const t of E.getLoadedTexturesCache()) {
    const ch = CH[t.format] ?? 4, bpc = BPC[t.type] ?? 1, faces = t.isCube ? 6 : 1, mip = t.generateMipMaps ? 4 / 3 : 1;
    let bytes = t.width * t.height * ch * bpc * faces * mip;
    if (t._compression || /ktx2|basis/i.test(t.url || '') || t._isCompressed) bytes = t.width * t.height * (t.format === 0x9274 || /etc|pvrtc|bc1|dxt1/i.test(String(t.format)) ? .5 : 1) * mip;
    const isRT = t.source === 5 || t.source === 12 || t.source === 11 || t.source === 13 || t.isRenderTarget;
    if (t.samples > 1) bytes += t.width * t.height * ch * bpc * t.samples;                 // MSAA renderbuffer цвета
    rows.push({ o: own.get(t) || ('?' + (t.source) + ':' + (t.url ? t.url.slice(-30) : t.label || '')), w: t.width, h: t.height, f: t.format, ty: t.type, s: t.samples || 1, cube: !!t.isCube, rt: !!isRT, mb: bytes / 1048576 });
  }
  // depth/stencil renderbuffer'ы обёрток RT
  let depth = 0; for (const w of E._renderTargetWrapperCache || []) { if (w._depthStencilBuffer || w._generateDepthBuffer) { const s = w.samples || 1; depth += w.width * w.height * 4 * (w.isCube ? 6 : 1) * s; } }
  const cv = E.getRenderingCanvas(); const back = cv.width * cv.height * (4 + 4) * 2;   // back+front RGBA8 + depth24s8 (без MSAA, antialias:false)
  return { rows, depthMB: depth / 1048576, canvas: [cv.width, cv.height, E.getHardwareScalingLevel()], backbufMB: back / 1048576 };
}, stageExpr);

// цена кадра: средние за N отрисованных кадров текущей сцены
const cost = (stageExpr, ms = 4000) => page.evaluate(async (stageExpr, ms) => {
  const st = (0, eval)(stageExpr), sc = st.scene, G = window.__gl;
  const f0 = sc.getFrameId(), g0 = { ...G };
  await new Promise(r => setTimeout(r, ms));
  const n = sc.getFrameId() - f0 || 1, d = k => (G[k] - g0[k]) / n;
  // один кадр: проходы по framebuffer'ам с именами обёрток RT
  const E = sc.getEngine(), nm = new Map(); for (const w of E._renderTargetWrapperCache || []) { const t = w.texture; nm.set(w._framebuffer, (w.label || (t && t.label) || '') + ' ' + w.width + 'x' + w.height); nm.set(w._MSAAFramebuffer, 'MSAA ' + (w.label || (t && t.label) || '') + ' ' + w.width + 'x' + w.height); }
  for (const pp of sc.postProcesses.concat(sc.activeCamera._postProcesses || [])) if (pp) for (const w of (pp._textures && pp._textures.data) || []) if (w) { nm.set(w._framebuffer, 'pp:' + pp.name); nm.set(w._MSAAFramebuffer, 'MSAA pp:' + pp.name); }
  for (const t of sc.textures) { const w = t.renderTarget || t._renderTarget; if (w) { nm.set(w._framebuffer, 'rt:' + t.name); nm.set(w._MSAAFramebuffer, 'MSAA rt:' + t.name); } }
  G.rec = []; const fA = sc.getFrameId(); await new Promise(r => { const o = sc.onAfterRenderObservable.add(() => { if (sc.getFrameId() > fA) { sc.onAfterRenderObservable.remove(o); r(); } }); setTimeout(r, 8000); });
  G.rec = []; const fB = sc.getFrameId(); await new Promise(r => { const o = sc.onAfterRenderObservable.add(() => { sc.onAfterRenderObservable.remove(o); r(); }); setTimeout(r, 8000); });
  const segs = G.rec.map(s => ({ fb: s.fb ? (nm.get(s.fb) || '?') : 'screen', n: s.n, kpx: Math.round(s.px / 1000) })); G.rec = null;
  return { segs, frames: n, fps: +(n / ms * 1000).toFixed(1), draws: +d('draws').toFixed(0), passes: +d('passes').toFixed(1), fbBinds: +d('fbBinds').toFixed(1), mpx: +(d('px') / 1e6).toFixed(2), active: sc.getActiveMeshes().length, rt: sc.customRenderTargets.length, pp: (sc.activeCamera._postProcesses || []).filter(Boolean).length, parts: sc.particleSystems.length };
}, stageExpr, ms);

const out = {};
await run(LOBBY); await sleep(2500);
out.camp = { cost: await cost('CAMP_STAGE'), vram: await vram() };
await run(`openDetail('paul');`); await sleep(3000);
out.hero = { cost: await cost('HERO_STAGE'), vram: await vram() };
await run(`closeInfo(true); closeOverlay(); view = 'lobby';`);
await run(BATTLE); await sleep(4000);
out.battle = { cost: await cost('BT.arena'), vram: await vram() };
await browser.close(); SRV.close && SRV.close();

const sum = (rows, f) => rows.filter(f).reduce((a, r) => a + r.mb, 0);
for (const [k, v] of Object.entries(out)) {
  const R = v.vram.rows, rt = sum(R, r => r.rt), tex = sum(R, r => !r.rt);
  const grp = {}; for (const r of R.filter(r => r.rt)) { const g = r.o.replace(/:(.*)$/, (m, n) => ':' + n.replace(/\d+$/, '')); grp[g] = (grp[g] || 0) + r.mb; }
  console.log(`\n== ${k}${PHONE ? ' phone' : ''}${LOW ? ' LOW' : ''}: canvas ${v.vram.canvas.join('×')}  кадр: ${JSON.stringify(v.cost)}`);
  console.log(`   RT ${rt.toFixed(1)} МБ + depth RB ${v.vram.depthMB.toFixed(1)} + backbuffer ${v.vram.backbufMB.toFixed(1)}; текстуры ${tex.toFixed(1)} МБ`);
  for (const [g, mb] of Object.entries(grp).sort((a, b) => b[1] - a[1])) if (mb > .05) console.log(`     ${mb.toFixed(1).padStart(6)}  ${g}`);
}
if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(out, null, 1));
