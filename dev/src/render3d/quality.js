// render3d/quality.js — профили графики (фаза 6, шаг 3). Один источник параметров качества для сцен и хоста движка.
// Значение параметра — скаляр или пара [desktop, phone]; phone = «small» (меньшая сторона окна < 600 px), как и раньше в сценах.
// Хранение: localStorage 'dune-gfx' = { p: 'auto'|'high'|'med'|'low', auto: <ступеней понижения от базы auto, 0..3>, bad, good, noUp }.
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
  heroShadow: [2048, 1024],         // пакет 5: карта теней окна героя (свет ортогональный 4×4 м — хватает и меньших карт)
  probe: { arena: [128, 64], hero: 64, camp: 64 },
  groundSeg: [170, 120],
  particles: 1,                     // множитель фоновых частиц окружения
  fps: { active: 60, idle: 30, idleLow: 20, static: 0 }, campIdle: 'idle',
  heroIdle: 'active',               // пакет 5: окно героя в покое (после интро/вспышки/вращения): HIGH 60, MED idle 30, LOW idle 20
  bake: false,                      // запечь тени/AO статичных пропсов в землю и убрать их из карты теней
  glowSel: false,                   // glow только по светящимся мешам (без неба и фона)
  glowKernel: 32,                   // blurKernelSize GlowLayer
  shadowQ: 'medium',                // качество PCF теней (WebGL2): 'medium' | 'low'
  wormSmall: 1,                     // пакет 3: малый червь «Наездника» — доля частиц песка; 0 — без меша, только всплески FX
  arenaActive: 0,                   // шаг 6: потолок active-кадров в бою (0 — как fps.active); 30 — ступень low30,
  // Пакет 8: камера 3/4 из-за союзников. Пара [desktop, phone]; для LOW — чуть шире обзор.
  battleCamera: { x: [-16, -15], y: [13.5, 12], z: [19, 18], lookY: 1.3, fov: [35, 39] },
};
const PROFILES = {
  high: HIGH,
  med: { ...HIGH, dpr: { arena: [1.5, 1.25], hero: [1.75, 1.25], camp: [1.5, 1.25] }, msaa: 1, heroIdle: 'idle',
    grain: false, chromatic: false, sharpen: false, dof: 'hero', ssao: false, shadowSize: 1024, heroShadow: [1024, 512], bake: true, glowSel: true, wormSmall: .5,
    battleCamera: { x: [-16, -15], y: [13.5, 12], z: [19, 18], lookY: 1.3, fov: [35, 39] } },
};
// шаг 5: LOW — от MED вниз: без DoF и bloom, glow дешевле, тени 512 (PCF low), ниже dpr, пробники, сетка земли, частицы, кадр в покое
PROFILES.low = { ...PROFILES.med, dpr: { arena: 1.25, hero: [1.5, 1], camp: 1.25 }, dof: false, bloom: false,
  glowRatio: [.35, .25], glowKernel: 16, shadowSize: 512, heroShadow: [512, 256], shadowQ: 'low',
  probe: { arena: 32, hero: 32, camp: 32 }, groundSeg: [100, 80], particles: .5,
  fps: { active: 60, idle: 20, idleLow: 15, static: 0 }, campIdle: 'idleLow', wormSmall: 0,
  battleCamera: { x: [-17, -16], y: [14, 12.5], z: [20, 19], lookY: 1.3, fov: [37, 42] } };
// шаг 6: ступени auto; low30 — LOW с 30 fps в бою, только для авто (ручного выбора нет)
PROFILES.low30 = { ...PROFILES.low, arenaActive: 30 };
const ORDER = ['high', 'med', 'low'], STEPS = ['high', 'med', 'low', 'low30'];
const KEY = 'dune-gfx';
// Отдельный тестовый лимит FPS активного боя. null — профиль управляет FPS как раньше.
const BATTLE_FPS_KEY = 'dune-battle-fps';
function readBattleFps() {
  try { const value = localStorage.getItem(BATTLE_FPS_KEY); return value === '30' ? 30 : value === '60' ? 60 : null; } catch (e) { return null; }
}
function setBattleFps(value) {
  if (value !== 30 && value !== 60) return;
  try { localStorage.setItem(BATTLE_FPS_KEY, String(value)); } catch (e) {}
}
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
  const n = (v, m) => Math.max(0, Math.min(m, v | 0));
  return (STORE = { p: ORDER.includes(o.p) ? o.p : 'auto', auto: n(o.auto, 3), bad: n(o.bad, 9), good: n(o.good, 99), noUp: !!o.noUp });
}
function writeGfx(o) { STORE = o; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} CACHE = {}; }
// ступень профиля: 'high' | 'med' | 'low' | 'low30' (последняя — только в auto)
const autoBase = small => small ? 1 : 0, autoMax = small => STEPS.length - 1 - autoBase(small);
function gfxStep(small = isSmall()) {
  const o = readGfx(); if (o.p !== 'auto') return o.p;
  return STEPS[Math.min(STEPS.length - 1, autoBase(small) + o.auto)];
}
// выбранный уровень: 'high' | 'med' | 'low'
function gfxLevel(small = isSmall()) { const s = gfxStep(small); return s === 'low30' ? 'low' : s; }
let CACHE = {};
// разрешённые параметры текущего профиля для desktop/phone
function gfx(small = isSmall()) {
  const lv = gfxStep(small), k = lv + (small ? 'p' : 'd'); if (CACHE[k]) return CACHE[k];
  const pick = v => Array.isArray(v) ? v[small ? 1 : 0] : v && typeof v === 'object' && !('active' in v) ? Object.fromEntries(Object.entries(v).map(([n, x]) => [n, pick(x)])) : v;
  const P = PROFILES[lv], r = { level: lv };
  for (const n in P) r[n] = pick(P[n]);
  return (CACHE[k] = r);
}
// p: 'auto' | 'high' | 'med' | 'low'; любой ручной выбор (в т.ч. «Авто») сбрасывает понижение auto и счётчики (шаг 6)
function setGfx(p) { writeGfx({ p, auto: 0, bad: 0, good: 0, noUp: false }); }
// откат по нехватке памяти (baker): остаёмся в auto на ступени LOW, повышение запрещено
function gfxMemFallback(small = isSmall()) {
  const lowAt = STEPS.indexOf('low') - autoBase(small), o = readGfx();
  writeGfx({ p: 'auto', auto: Math.max(lowAt, o.p === 'auto' ? o.auto : 0), bad: 0, good: 0, noUp: true });
}
// шаг 6: адаптивное понижение. r — итог боя от engine-host.perfEnd(): { sec, late, p95, capped } (p95 — доля целевого интервала).
// Плохой бой: опозданий > 15% или p95 > 1,6; хороший: < 3% и p95 <= 1,2. 2 плохих подряд — ступень вниз, 6 хороших подряд — вверх
// (если не запрещено откатом по памяти). Бой короче 15 с активных кадров и упор во внешний предел частоты (энергосбережение) не считаются.
// Возвращает 'down' | 'up' | null; новый профиль действует со следующей сцены.
const PERF_MIN_SEC = 15;
function gfxReport(r, small = isSmall()) {
  const o = readGfx(); if (o.p !== 'auto' || !r || r.sec < PERF_MIN_SEC || r.capped) return null;
  const bad = r.late > .15 || r.p95 > 1.6, good = r.late < .03 && r.p95 <= 1.2;
  const n = { ...o, bad: bad ? o.bad + 1 : 0, good: good ? o.good + 1 : 0 }; let dir = null;
  if (n.bad >= 2 && o.auto < autoMax(small)) { n.auto = o.auto + 1; n.bad = n.good = 0; dir = 'down'; }
  else if (n.good >= 6 && o.auto > 0 && !o.noUp) { n.auto = o.auto - 1; n.bad = n.good = 0; dir = 'up'; }
  writeGfx(n); return dir;
}
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

export { gfx, gfxLevel, gfxStep, readGfx, setGfx, gfxMemFallback, gfxReport, SAVE_LOW, dofOn, glowOnly, readBattleFps, setBattleFps };
