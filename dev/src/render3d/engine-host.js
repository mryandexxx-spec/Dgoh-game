// render3d/engine-host.js — один WebGL-контекст на всё приложение (фаза 3b, шаг 3).
// Один Engine и один канвас; канвас переносится между хостами (лагерь, окно героя, арена). Владельцы — сцены-сцены
// (Stage3D, Arena3D, Baker): кто смонтирован последним и чей хост в DOM, тот и рисуется. Хост отпал из DOM →
// владелец снимается со стека (owner.onDetach), рисуется предыдущий. Сглаживание: antialias:false — MSAA×4 + FXAA даёт
// пайплайн сцены. alpha:true, непрозрачные сцены задают clearColor с α=1.
// Потеря контекста: все владельцы получают contextLost()/dispose(), следующий engineHost() создаёт новый движок.
import '../assets/env-hdr.js'; // порядок исполнения
import { errLog } from '../core/errlog.js';
import { B3 } from './base.js';

let HOST = null;
class EngineHost {
  constructor() {
    const cv = this.cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
    const E = this.engine = new B3.Engine(cv, false, { stencil: true, antialias: false, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' }, false);
    E.enableOfflineSupport = false; E.disableManifestCheck = true;
    this.stack = []; this.owners = new Set(); this.cur = null; this.running = false; this.dead = false;
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
    this.cur = e; this.engine.resize(); this.start();
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
    try { e.owner.frame(); } catch (err) { errLog('frame', err); }
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
function hostKick() { const H = HOST; if (H && !H.dead && !H.running && H.stack.length) H.pick(); }


export { EngineHost, engineHost, hostKick };
