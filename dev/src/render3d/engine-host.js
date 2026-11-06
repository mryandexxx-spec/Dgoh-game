// render3d/engine-host.js — один WebGL-контекст на всё приложение (фаза 3b, шаг 3).
// Один Engine и один канвас; канвас переносится между хостами (лагерь, окно героя, арена). Владельцы — сцены-сцены
// (Stage3D, Arena3D, Baker): кто смонтирован последним и чей хост в DOM, тот и рисуется. Хост отпал из DOM →
// владелец снимается со стека (owner.onDetach), рисуется предыдущий. Сглаживание: antialias:false — MSAA×4 + FXAA даёт
// пайплайн сцены. alpha:true, непрозрачные сцены задают clearColor с α=1.
// Потеря контекста: все владельцы получают contextLost()/dispose(), следующий engineHost() создаёт новый движок.
import '../assets/env-hdr.js'; // порядок исполнения
import { errLog } from '../core/errlog.js';
import { B3 } from './base.js';
import { gfx, gfxReport } from './quality.js';

// фаза 3b, шаг 6: планировщик кадров. Каждый кадр rAF хост спрашивает у верхней сцены режим mode(now) и решает, рисовать ли:
//   active — до 60 fps (движение, ввод, первые 0,8 с после wake/ресайза); idle — 30 fps (лагерь, ожидание ввода в бою);
//   idleLow — 20 fps (лагерь в упрощённой графике); static — 0 fps, кадр держится (арена после результата; ресайз → сцена вернёт active);
//   paused — цикл rAF останавливается (сцену перекрыл оверлей); возобновляет hostKick.
// Throttle по времени, а не пропуском rAF: на 120 Гц частоты те же. Допуск 3 мс на дрожание rAF.
// базовые частоты (профиль HIGH); фактические берутся из gfx().fps (профиль графики, render3d/quality.js)
const FPS = { active: 60, idle: 30, idleLow: 20, static: 0 };
let HOST = null;
class EngineHost {
  constructor() {
    const cv = this.cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
    const E = this.engine = new B3.Engine(cv, false, { stencil: true, antialias: false, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' }, false);
    E.enableOfflineSupport = false; E.disableManifestCheck = true;
    // шаг 7: скомпилированные шейдеры не освобождаются при dispose материалов и постпроцессов (кэш движка живёт до потери
    // контекста). Пересоздание пайплайна после лёгкого сна и второй и следующие бои — без компиляций. Программ — десятки, память копеечная.
    B3.Effect.PersistentMode = true;
    this.stack = []; this.owners = new Set(); this.cur = null; this.running = false; this.dead = false;
    this.mode = 'active'; this.lastR = 0; this.frames = 0; this.modeN = {};
    // шаг 6: замер плавности. ring — последние отрисованные кадры (оверлей ?perf); pa — накопитель боя (адаптивное понижение);
    // disp — интервалы rAF между двумя неотрисованными тиками = частота экрана (30 Гц в энергосбережении iOS → «упор», не понижаем)
    this.ring = { t: new Float64Array(128), iv: new Float32Array(128), ct: new Float32Array(128), i: 0, n: 0 };
    this.pa = null; this.warmUntil = 0; this.lastT = 0; this.rendPrev = true; this.disp = []; this.draws = 0; this.drawN = 0; this.prevM = '';
    document.addEventListener('visibilitychange', () => { this.warmUntil = performance.now() + 1000; this.lastT = 0; });
    cv.addEventListener('webglcontextlost', ev => { ev.preventDefault(); this.lose(); }, false);
  }
  adopt(owner) { this.owners.add(owner); return this; }
  forget(owner) {
    this.owners.delete(owner); this.release(owner);
    if (this.pa && this.pa.owner === owner) {
      let dir = null; try { dir = gfxReport(this.perfEnd(owner)); } catch (e) { errLog('perf', e); }
      if (dir) try { window.dispatchEvent(new CustomEvent('dune-gfx', { detail: { dir } })); } catch (e) {}
    }
  }
  // шаг 6: накопитель боя. Первые 3 с (компиляции, запекание) и 1 с после wake/возврата во вкладку не считаются
  perfBegin(owner) { this.pa = { owner, warm: performance.now() + 3000, n: 0, late: 0, sec: 0, hist: new Uint32Array(41) }; }
  // итог: { sec, late (доля > 1,5 цели), p95 (доля цели), capped (экран сам держит ≤ 30 Гц при цели 60) }
  perfEnd(owner) {
    const a = this.pa; if (!a || a.owner !== owner) return null; this.pa = null; if (!a.n) return { sec: 0, late: 0, p95: 0, capped: false };
    let k = 0, c = 0; const lim = a.n * .95; while (k < 40 && (c += a.hist[k]) < lim) k++;
    const d = this.dispMs();
    return { sec: a.sec, n: a.n, late: a.late / a.n, p95: (k + 1) / 10, capped: d > 25 && a.target < 25 };
  }
  // медиана интервала тиков rAF без отрисовки — частота экрана; 0 — нет данных
  dispMs() { const d = this.disp; if (d.length < 8) return 0; const s = [...d].sort((x, y) => x - y); return s[s.length >> 1]; }
  // оверлей ?perf: счёт draw calls обёрткой методов контекста (только пока оверлей включён)
  countDraws(on) {
    const gl = this.engine && this.engine._gl; if (!gl) return;
    if (on && !gl.__dc) { gl.__dc = {}; for (const n of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const f = gl[n]; if (!f) continue; gl.__dc[n] = f; const H = this; gl[n] = function (...a) { H.drawN++; return f.apply(this, a); }; } }
    else if (!on && gl.__dc) { for (const n in gl.__dc) gl[n] = gl.__dc[n]; delete gl.__dc; }
  }
  // сводка для оверлея: по кадрам за последнюю секунду
  perfNow() {
    const R = this.ring, now = performance.now(), iv = [], ct = []; let n = 0;
    for (let j = 0; j < R.n; j++) { const i = (R.i - 1 - j + 128) % 128; if (now - R.t[i] > 1000) break; n++; if (R.iv[i]) iv.push(R.iv[i]); ct.push(R.ct[i]); }
    iv.sort((x, y) => x - y); const Q = gfx(), o = this.cur && this.cur.owner, E = this.engine;
    const tgt = (this.mode === 'active' && o && o.isArena && Q.arenaActive) || (Q.fps[this.mode] ?? 60);
    return { fps: n, target: tgt, iv: iv.length ? iv.reduce((s, x) => s + x, 0) / iv.length : 0, p95: iv.length ? iv[Math.min(iv.length - 1, Math.floor(iv.length * .95))] : 0,
      late: iv.length ? iv.filter(x => x > 1500 / (tgt || 60)).length / iv.length : 0, cpu: ct.length ? ct.reduce((s, x) => s + x, 0) / ct.length : 0,
      mode: this.mode, step: Q.level, dpr: E ? 1 / E.getHardwareScalingLevel() : 0, mpx: E ? E.getRenderWidth() * E.getRenderHeight() / 1e6 : 0,
      draws: this.draws, disp: this.dispMs(), hist: Array.from({ length: Math.min(R.n, 60) }, (_, j) => R.iv[(R.i - Math.min(R.n, 60) + j + 128) % 128]) };
  }
  // o: { cls, id, first (вставить первым ребёнком), replace (узел-заглушка), dpr }
  mount(owner, host, o = {}) {
    if (this.dead || !host) return;
    this.stack = this.stack.filter(e => e.owner !== owner);
    const e = { owner, host, cls: o.cls || '', id: o.id || '', dpr: o.dpr || 2 };
    if (o.replace && o.replace !== this.cv && o.replace.parentNode === host) o.replace.replaceWith(this.cv);
    else if (o.first) host.insertBefore(this.cv, host.firstChild);
    this.stack.push(e); this.show(e, true);
  }
  release(owner) {
    const top = this.cur && this.cur.owner === owner;
    this.stack = this.stack.filter(e => e.owner !== owner);
    if (top) { this.cur = null; if (!this.pick()) this.park(); }
  }
  isCur(owner) { return !!(this.cur && this.cur.owner === owner && this.cv.isConnected); }
  show(e, placed) {
    const cv = this.cv;
    if (!placed || cv.parentNode !== e.host) e.host.appendChild(cv);
    cv.className = e.cls; if (e.id) cv.id = e.id; else cv.removeAttribute('id');
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, e.dpr));
    this.cur = e; this.lastR = 0; this.warmUntil = performance.now() + 1000; this.engine.resize(); this.start();
  }
  // верхний владелец с живым хостом; отпавшие снимаются
  pick() {
    while (this.stack.length) {
      const e = this.stack[this.stack.length - 1];
      if (e.host.isConnected) { this.show(e); return e; }
      this.stack.pop(); if (this.cur === e) this.cur = null;
      try { e.owner.onDetach && e.owner.onDetach(); } catch (err) { errLog('detach', err); }
    }
    return null;
  }
  park() { this.cur = null; this.stop(); if (this.cv.parentNode) this.cv.remove(); this.cv.removeAttribute('id'); }
  start() { if (this.running || this.dead) return; this.running = true; this.engine.runRenderLoop(() => this.frame()); }
  stop() { if (!this.running) return; this.running = false; this.engine.stopRenderLoop(); }
  frame() {
    let e = this.cur;
    if (!e || !e.host.isConnected || this.cv.parentNode !== e.host) { this.cur = null; e = this.pick(); if (!e) { this.park(); return; } }
    const now = performance.now(), o = e.owner;
    let m = 'active'; try { if (o.mode) m = o.mode(now) || 'active'; } catch (err) { errLog('mode', err); }
    this.mode = m; this.modeN[m] = (this.modeN[m] || 0) + 1;
    if (m === 'paused') { this.stop(); return; }
    const Q = gfx(), fps = (m === 'active' && o.isArena && Q.arenaActive) || (Q.fps[m] ?? 60);
    const tick = this.lastT ? now - this.lastT : 0; this.lastT = now;
    if (!fps || now - this.lastR < 1000 / fps - 3) {
      if (!this.rendPrev && tick > 0 && tick < 200) { this.disp.push(tick); if (this.disp.length > 30) this.disp.shift(); }
      this.rendPrev = false; return;
    }
    this.rendPrev = true;
    const iv = this.lastR ? now - this.lastR : 0, pm = this.prevM; this.prevM = m;
    this.lastR = now; this.frames++;
    try { o.frame(); } catch (err) { errLog('frame', err); }
    const ct = performance.now() - now, R = this.ring; R.t[R.i] = now; R.iv[R.i] = iv; R.ct[R.i] = ct; R.i = (R.i + 1) % 128; if (R.n < 128) R.n++;
    if (this.drawN || this.draws) { this.draws = this.drawN; this.drawN = 0; }
    const a = this.pa;
    if (a && m === 'active' && pm === 'active' && iv > 0 && iv < 1000 && now > a.warm && now > this.warmUntil && o === a.owner) {
      const r = iv * fps / 1000; a.target = 1000 / fps; a.n++; a.sec += iv / 1000; if (r > 1.5) a.late++; a.hist[Math.min(40, Math.floor(r * 10))]++;
    }
  }
  lose() {
    if (this.dead) return; this.dead = true; this.stop(); errLog('webgl', 'context lost');
    if (HOST === this) HOST = null;
    const all = [...this.owners]; this.owners.clear(); this.stack = []; this.cur = null;
    for (const o of all) try { o.contextLost ? o.contextLost() : o.dispose(); } catch (e) {}
    try { this.engine.dispose(); } catch (e) {}
    try { this.cv.width = 0; this.cv.height = 0; } catch (e) {}
  }
}
function engineHost() { if (!HOST || HOST.dead) HOST = new EngineHost(); return HOST; }
// возобновить остановленный цикл (paused или хост отпал); текущий хост на месте — без resize (не стирать держащийся кадр)
function hostKick() {
  const H = HOST; if (!H || H.dead || H.running || !H.stack.length) return;
  const e = H.cur; if (e && e.host.isConnected && H.cv.parentNode === e.host) H.start(); else H.pick();
}


// живой хост без создания нового (оверлей ?perf)
const curHost = () => HOST && !HOST.dead ? HOST : null;
export { EngineHost, FPS, engineHost, hostKick, curHost };
