// Замер цены кадра и VRAM (фаза 6, шаг 1): лагерь, окно героя, бой. SwiftShader — только относительные метрики.
//   node tests/smoke/perf.mjs <game.html> [--phone] [--dpr 3] [--low | --gfx high|med|low] [--out f.json]   (из dev/)
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
const html = args.find(a => !a.startsWith('--') && a.endsWith('.html')), PHONE = has('--phone'), LOW = has('--low'), GFX = opt('--gfx', '');
const HERO = opt('--hero','paul');
if (!/^[a-z0-9_]+$/.test(HERO)) throw new Error('Invalid hero ID');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(f => fs.existsSync(f));
const fixture = JSON.parse(fs.readFileSync(path.join(DEV, 'tests/fixtures/saves/03-late.json'), 'utf8'));
// Isolated test fixture: same unlocked G10 equipment state on both builds.
if (fixture.roster[HERO]) fixture.roster[HERO].relic = 0;
const LATE = JSON.stringify(fixture);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--font-render-hinting=none'] });
const page = await browser.newPage(); page.on('console', m => { if (/bake|camp stage/.test(m.text())) console.log('console:', m.text()); }); page.on('pageerror', e => console.log('pageerror:', e.message));
await page.setViewport(PHONE ? { width: +opt('--width',844), height: +opt('--height',390), deviceScaleFactor: +opt('--dpr', 1), isMobile: true, hasTouch: true, isLandscape: true } : { width: 960, height: 600, deviceScaleFactor: +opt('--dpr', 1) });
await page.setRequestInterception(true); page.on('request', r => /^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url()) ? r.continue() : r.abort());
await page.evaluateOnNewDocument((save, low, gfx) => {
  // Installed before app boot so the baker never creates transient portrait
  // MSAA targets during the camp baseline/candidate comparison.
  window.__DGOH_PERF_NO_BAKE__ = true;
  try { localStorage.clear(); localStorage.setItem('dune-goh-v1', save); localStorage.setItem('dune-cine-off', 'true'); if (low) localStorage.setItem('dune-gfx-low', 'true'); if (gfx) localStorage.setItem('dune-gfx', JSON.stringify({ p: gfx, auto: 0 })); } catch (e) {}
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
}, LATE, LOW, GFX);
const SRV = await serve(path.dirname(path.resolve(html)));
await page.goto(SRV.url(path.basename(html)), { waitUntil: 'load' });
// Benchmark mode is enabled before the game initializes (see injected flag).
// A late overwrite of bakePortraits() could not cancel the async task already
// scheduled by baker.js at startup and caused random +4 MB of portrait RT VRAM.
await page.evaluate(() => {
  if (!window.__DGOH_PERF_NO_BAKE__) throw Error('Portrait baker benchmark opt-out not installed');
  if (typeof bakePortraits !== 'function') throw Error('Portrait baker absent');
});
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
try {
  await run(LOBBY); await sleep(1800);
  await run("openDetail("+JSON.stringify(HERO)+");");
  await page.waitForFunction(id => window.HERO_STAGE && HERO_STAGE.o?.def?.id === id && HERO_STAGE.backdropTexture?.isReady() && HERO_STAGE.scene.getFrameId() > 10,{timeout:45000},HERO);
  await page.waitForFunction(() => HERO_STAGE.pfIdle(),{timeout:30000});
  await run("HERO_STAGE.auto=false; HERO_STAGE.yaw=-.35; HERO_STAGE.yawV=0;");
  await sleep(1500);
  await run("NOTES.length=0; renderNotes();"); // isolated fixture only, no reward claim
  const shot=opt('--shot','hero.png'), output=opt('--out','hero.json');
  fs.mkdirSync(path.dirname(shot),{recursive:true});
  const layout = await page.evaluate(() => {
    const panel=document.querySelector('.hcpilot-controls');
    if (!document.querySelector('.hc.gfx02-pilot') || !panel) return null;
    const p=panel.getBoundingClientRect(), slots=[...panel.querySelectorAll('.hcgs')];
    const skills=panel.querySelector('.hcsks'), sr=skills.getBoundingClientRect(), skillBtns=[...skills.querySelectorAll('[data-hcsk]')];
    return {skillCount:skillBtns.length,skillVisible:skillBtns.filter(e=>{const r=e.getBoundingClientRect();return r.top>=sr.top-1&&r.bottom<=sr.bottom+1&&r.left>=sr.left-1&&r.right<=sr.right+1}).length,slots:slots.length,visible:slots.filter(e=>{const r=e.getBoundingClientRect();return r.top>=p.top-1&&r.bottom<=p.bottom+1&&r.left>=p.left-1&&r.right<=p.right+1}).length, rows:new Set(slots.map(e=>Math.round(e.getBoundingClientRect().top))).size};
  });
  out.layout=layout;
  await page.screenshot({path:shot});
  if(HERO==='baron' && layout && (layout.slots!==6 || layout.visible!==6 || layout.rows!==1 || layout.skillCount!==5 || layout.skillVisible!==5)) throw Error('Compact pilot gear layout: '+JSON.stringify(layout));
  out.hero={cost:await cost('HERO_STAGE'),vram:await vram()};
  out.sample=await page.evaluate(async () => {
    const h=HERO_STAGE, e=h.engine, gl=e._gl, ext=gl.getExtension('WEBGL_debug_renderer_info');
    const intervals=[]; let last=0;
    const obs=h.scene.onAfterRenderObservable.add(()=>{const t=performance.now();if(last)intervals.push(t-last);last=t;});
    await new Promise(r=>setTimeout(r,10000));h.scene.onAfterRenderObservable.remove(obs);
    intervals.sort((a,b)=>a-b);
    const rect=el=>{const a=el.getBoundingClientRect();return [a.x,a.y,a.width,a.height].map(Math.round)};
    return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),profile:gfx(h.small).level,frameIntervals:intervals.length,p95Interval:intervals[Math.ceil(intervals.length*.95)-1]??null,
      model:!!h.o.root._authored,hero:h.o.def.id,canvas:rect(h.cv),viewport:[innerWidth,innerHeight],
      controls:[...document.querySelectorAll('.hc button')].filter(b=>b.offsetWidth).map(b=>({name:b.getAttribute('aria-label')||b.innerText,rect:rect(b),disabled:b.disabled})),
      scroll:[...document.querySelectorAll('.hc .hcsks,.hc .hcright,.hc .hcpilot-controls')].map(e=>({class:e.className,visible:e.clientHeight,content:e.scrollHeight}))};
  });
  if(out.sample.profile!==GFX || out.sample.hero!==HERO || !out.sample.frameIntervals)throw Error('Invalid sample '+JSON.stringify(out.sample));
  fs.writeFileSync(output,JSON.stringify(out,null,2));console.log(JSON.stringify({shot,output,cost:out.hero.cost,sample:out.sample}));
} finally { await browser.close(); await SRV.close(); }
