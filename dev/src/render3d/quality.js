// render3d/quality.js — профили графики (фаза 6, шаг 3). Один источник параметров качества для сцен и хоста движка.
// Значение параметра — скаляр или пара [desktop, phone]; phone = «small» (меньшая сторона окна < 600 px), как и раньше в сценах.
// Хранение: localStorage 'dune-gfx' = { p: 'auto'|'high'|'med'|'low', auto: <ступеней понижения от базы auto> }.
// auto: база desktop — high, phone — med; адаптивное понижение (шаг 6) двигает её вниз на auto ступеней.
// Шаг 3: HIGH = вид v59. Шаг 5: LOW от MED вниз (см. PROFILES.low).
// Шаг 4: MED — без SSAO, grain, хроматики и резкости, MSAA 1, DoF только у героя, тени 1024 только по персонажам (тени и контактный AO
// статичных пропсов запечены в карту освещения земли, build-env bakeStatic), glow только по светящимся мешам без неба (glowOnly), ниже dpr.
import './base.js'; // порядок исполнения

const isSmall = () => Math.min(innerWidth, innerHeight) < 600;
const HIGH = {
  dpr: { arena: [2, 1.5], hero: 2, camp: 1.75 }, // потолок devicePixelRatio по сценам
  msaa: [4, 1],                     // samples пайплайна (только WebGL2)
  bloom: true, glow: true, glowRatio: [.5, .35],
  grain: true, chromatic: [true, false], sharpen: [true, false], // хроматика и резкость — только арена
  dof: true, dofBlur: ['med', 'low'],
  ssao: true, ssaoRatio: [.75, .5], ssaoSamples: [16, 8], ssaoExpBlur: [true, false], // expensiveBlur задаёт только арена
  shadowSize: [2048, 1024], shadowRefresh: 2, // refresh — сцены окружения (арена, лагерь); окно героя — каждый кадр
  probe: { arena: [128, 64], hero: 64, camp: 64 },
  groundSeg: [170, 120],
  particles: 1,                     // множитель фоновых частиц окружения
  fps: { active: 60, idle: 30, idleLow: 20, static: 0 }, campIdle: 'idle',
  bake: false,                      // запечь тени/AO статичных пропсов в землю и убрать их из карты теней
  glowSel: false,                   // glow только по светящимся мешам (без неба и фона)
  glowKernel: 32,                   // blurKernelSize GlowLayer
  shadowQ: 'medium',                // качество PCF теней (WebGL2): 'medium' | 'low'
};
const PROFILES = {
  high: HIGH,
  med: { ...HIGH, dpr: { arena: [1.5, 1.25], hero: [1.75, 1.5], camp: [1.5, 1.25] }, msaa: 1,
    grain: false, chromatic: false, sharpen: false, dof: 'hero', ssao: false, shadowSize: 1024, bake: true, glowSel: true },
};
// шаг 5: LOW — от MED вниз: без DoF и bloom, glow дешевле, тени 512 (PCF low), ниже dpr, пробники, сетка земли, частицы, кадр в покое
PROFILES.low = { ...PROFILES.med, dpr: { arena: 1.25, hero: [1.5, 1.25], camp: 1.25 }, dof: false, bloom: false,
  glowRatio: [.35, .25], glowKernel: 16, shadowSize: 512, shadowQ: 'low',
  probe: { arena: 32, hero: 32, camp: 32 }, groundSeg: [100, 80], particles: .5,
  fps: { active: 60, idle: 20, idleLow: 15, static: 0 }, campIdle: 'idleLow' };
const ORDER = ['high', 'med', 'low'];
const KEY = 'dune-gfx';
let STORE = null; // прочитанное значение; пишется только через setGfx
function readGfx() {
  if (STORE) return STORE;
  let o = null;
  try {
    o = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!o) { // миграция dune-gfx-low (до v60)
      const old = localStorage.getItem('dune-gfx-low');
      if (old !== null) { o = { p: JSON.parse(old) === true ? 'low' : 'auto', auto: 0 }; localStorage.setItem(KEY, JSON.stringify(o)); localStorage.removeItem('dune-gfx-low'); }
    }
  } catch (e) {}
  if (!o || typeof o !== 'object') o = {};
  return (STORE = { p: ORDER.includes(o.p) ? o.p : 'auto', auto: Math.max(0, Math.min(2, o.auto | 0)) });
}
function writeGfx(o) { STORE = o; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} CACHE = {}; }
// выбранный уровень: 'high' | 'med' | 'low'
function gfxLevel(small = isSmall()) {
  const o = readGfx(); if (o.p !== 'auto') return o.p;
  return ORDER[Math.min(ORDER.length - 1, (small ? 1 : 0) + o.auto)];
}
let CACHE = {};
// разрешённые параметры текущего профиля для desktop/phone
function gfx(small = isSmall()) {
  const lv = gfxLevel(small), k = lv + (small ? 'p' : 'd'); if (CACHE[k]) return CACHE[k];
  const pick = v => Array.isArray(v) ? v[small ? 1 : 0] : v && typeof v === 'object' && !('active' in v) ? Object.fromEntries(Object.entries(v).map(([n, x]) => [n, pick(x)])) : v;
  const P = PROFILES[lv], r = { level: lv };
  for (const n in P) r[n] = pick(P[n]);
  return (CACHE[k] = r);
}
// p: 'auto' | 'high' | 'med' | 'low'; понижение auto сбрасывается при ручном выборе
function setGfx(p, auto) { const o = readGfx(); writeGfx({ p, auto: auto ?? (p === 'auto' ? o.auto : 0) }); }
// обёртка прежнего флага упрощённой графики (battle-settings, baker, camp, arena)
const SAVE_LOW = () => gfxLevel() === 'low';
// DoF сцены: true — везде, 'hero' — только окно героя
const dofOn = (Q, kind) => Q.dof === true || Q.dof === kind;
// шаг 4: glow только по светящимся мешам; keep — меши, которые рисуются всегда (небо/фон и земля-заслонка: без перекрытия
// свечение неба заливает кадр, см. шаг 2), остальные непрозрачные несветящиеся в проход glow не попадают
function glowOnly(G, keep = []) {
  const T = G && (G._thinEffectLayer || G); if (!T || !T._shouldRenderMesh) return;
  const base = T._shouldRenderMesh.bind(T), K = new Set(keep.filter(Boolean));
  T._shouldRenderMesh = m => (K.has(m) || glowy(m.material)) && base(m);
}
function glowy(M) {
  if (!M) return false; if (M.disableLighting || M.emissiveTexture) return true;
  const c = M.emissiveColor; return !!c && c.r + c.g + c.b > .02;
}

export { gfx, gfxLevel, readGfx, setGfx, SAVE_LOW, dofOn, glowOnly };
