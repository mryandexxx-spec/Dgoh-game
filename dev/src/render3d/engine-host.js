// render3d/engine-host.js — один WebGL-контекст на всё приложение (фаза 3b, шаг 3).
// Один Engine и один канвас; канвас переносится между хостами (лагерь, окно героя, арена). Владельцы — сцены-сцены
// (Stage3D, Arena3D, Baker): кто смонтирован последним и чей хост в DOM, тот и рисуется. Хост отпал из DOM →
// владелец снимается со стека (owner.onDetach), рисуется предыдущий. Сглаживание: antialias:false — MSAA×4 + FXAA даёт
// пайплайн сцены. alpha:true, непрозрачные сцены задают clearColor с α=1.
// Потеря контекста: все владельцы получают contextLost()/dispose(), следующий engineHost() создаёт новый движок.
import '../assets/env-hdr.js'; // порядок исполнения
import { errLog } from '../core/errlog.js';
import { B3 } from './base.js';
import { gfx } from './quality.js';

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
    cv.addEventListener('webglcontextlost', ev => { ev.preventDefault(); this.lose(); }, false);
  }
  adopt(owner) { this.owners.add(owner); return this; }
  forget(owner) { this.owners.delete(owner); this.release(owner); }
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
    this.cur = e; this.lastR = 0; this.engine.resize(); this.start();
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
    const fps = gfx().fps[m] ?? 60;
    if (!fps || now - this.lastR < 1000 / fps - 3) return;
    this.lastR = now; this.frames++;
    try { o.frame(); } catch (err) { errLog('frame', err); }
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


export { EngineHost, FPS, engineHost, hostKick };
