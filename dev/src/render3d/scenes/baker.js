// render3d/scenes/baker.js — строки 2586–2667 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './camp.js'; // порядок исполнения
import { SQ } from '../../ui/overlays/squad-select.js';
import { detailCid, openDetail } from '../../ui/overlays/detail.js';
import { render } from '../../ui/router.js';
import { toast } from '../../ui/common.js';
import { errLog } from '../../core/errlog.js';
import { BT, S } from '../../core/state.js';
import { SAVE_LOW } from './base-scene.js';
import { engineHost } from '../engine-host.js';
import { poseHuman } from '../characters/pose-generic.js';
import { makeHuman3 } from '../characters/procedural.js';
import { V3, col3 } from '../materials.js';
import { B3, HAS3D, loadB3 } from '../base.js';
import { figureSVG, set_figureSVG } from '../../render2d/figures.js';
import { CH, CHARS } from '../../data/chars.js';
import { $ } from '../../core/dom.js';

// ---------- portraits & figures baked from the 3D models (replace the old 2D drawings everywhere: rewards, dialogs, roster) ----------
const BAKE_V = 'b9', BAKED = {};
const figureSVG2D = figureSVG;
set_figureSVG(function (def, full) {
  const b = def && BAKED[def.id];
  if (!b) return figureSVG2D(def, full);
  return full ? `<svg viewBox="0 -6 60 106" aria-hidden="true"><image href="${b.full}" x="0" y="-6" width="60" height="106" preserveAspectRatio="xMidYMax meet"/></svg>`
    : `<svg viewBox="15 0 30 30" aria-hidden="true"><image href="${b.face}" x="15" y="0" width="30" height="30" preserveAspectRatio="xMidYMid slice"/></svg>`;
});
const bakeSleep = ms => new Promise(r => setTimeout(r, ms));
function bakeDB() { return new Promise((res) => { try { const r = indexedDB.open('dune-bake', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); }
function idbGet(db, k) { return new Promise(res => { if (!db) return res(null); try { const q = db.transaction('img').objectStore('img').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); }
function idbPut(db, k, v) { return new Promise(res => { if (!db) return res(); try { const tx = db.transaction('img', 'readwrite'); tx.objectStore('img').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => res(); } catch (e) { res(); } }); }
class Baker {
  constructor() {
    // phase 3b: no own engine — the scene lives on the shared engine and renders into a RenderTarget (MSAA×4), pixels → 2D canvas → PNG
    const H = this.host = engineHost().adopt(this); this.alive = true; this.cv = document.createElement('canvas');
    const E = this.engine = H.engine;
    const S = this.scene = new B3.Scene(E); S.useRightHandedSystem = true; S.clearColor = new B3.Color4(0, 0, 0, 0); S.ambientColor = col3('#2a2018'); S._maxL = 5;
    this.camera = new B3.UniversalCamera('bc', V3(0, 1, 6), S); this.camera.minZ = .05; this.camera.maxZ = 100; this.camera.inputs.clear();
    const hemi = new B3.HemisphericLight('h', V3(0, 1, .3), S); hemi.intensity = .6; hemi.diffuse = col3('#efe0c8'); hemi.groundColor = col3('#3a2a1c'); hemi.specular = col3('#202020');
    const key = new B3.DirectionalLight('k', V3(.55, -.65, -.8), S); key.intensity = 1.3; key.diffuse = col3('#ffe6c4');
    const rim = new B3.DirectionalLight('r', V3(-.7, -.25, .9), S); rim.intensity = 1.1; rim.diffuse = col3('#9cc4ff');
    const rim2 = new B3.DirectionalLight('r2', V3(.8, -.2, .7), S); rim2.intensity = .7; rim2.diffuse = col3('#ffb070');
  }
  target(w, h) {
    if (this.rt && this.rw === w && this.rh === h) return this.rt;
    if (this.rt) this.rt.dispose();
    const t = this.rt = new B3.RenderTargetTexture('bake', { width: w, height: h }, this.scene, false, true); t.samples = this.engine.webGLVersion >= 2 ? 4 : 1;
    this.rw = w; this.rh = h; return t;
  }
  async shot(w, h, fov, pos, target) {
    if (!this.alive) return null;
    const rt = this.target(w, h); this.camera.outputRenderTarget = rt;
    this.camera.fov = fov; this.camera.position.copyFrom(pos); this.camera.setTarget(target);
    for (let k = 0; k < 30 && !this.scene.isReady(); k++) await bakeSleep(16);
    if (!this.alive) return null;
    this.scene.render(); this.scene.render();
    const px = await rt.readPixels(0, 0, null, true); if (!px || !this.alive) return null;
    const cv = this.cv; cv.width = w; cv.height = h; const g = cv.getContext('2d'), img = g.createImageData(w, h), row = w * 4, src = new Uint8Array(px.buffer, px.byteOffset, w * h * 4);
    for (let y = 0; y < h; y++) img.data.set(src.subarray((h - 1 - y) * row, (h - y) * row), y * row); // GL rows are bottom-up
    g.putImageData(img, 0, 0);
    return await new Promise(res => cv.toBlob(b => res(b), 'image/png'));
  }
  async bake(def) {
    const o = makeHuman3(def, { scene: this.scene, shadows: null, pbr: false });
    o.base = V3(0, 0, 0); o.face = 0; o.side = 'A'; o.phase = 1.2; o.def = def;
    poseHuman(this, o, performance.now(), 1.3, 1); o.root.rotation.y = def.id === 'erasmus' ? -.22 : -.3;
    o.root.computeWorldMatrix(true); for (const m of o.root.getChildMeshes(false)) m.computeWorldMatrix(true);
    const H = o.h, fv = .5, dF = (H * 1.12 / 2) / Math.tan(fv / 2);
    const full = await this.shot(256, 452, fv, V3(0, H * .55, dF), V3(0, H * .5, 0));
    o.head.computeWorldMatrix(true); const hp = o.head.getAbsolutePosition().clone(); hp.y += .07 * (H / 1.95);
    const fh = .64 * (H / 1.95), dH = (fh / 2) / Math.tan(fv / 2);
    const face = await this.shot(192, 192, fv, V3(hp.x + .05, hp.y + .03, hp.z + dH), V3(hp.x, hp.y - .02, hp.z));
    o.root.dispose(false, true);
    return { full, face };
  }
  dispose() { if (!this.alive) return; this.alive = false; try { if (this.rt) this.rt.dispose(); this.scene.dispose(); } catch (e) {} this.host.forget(this); this.cv.width = this.cv.height = 0; }
}
async function bakePortraits() {
  if (typeof indexedDB === 'undefined' || !(await loadB3())) return;   // фаза 4: ждёт чанк Babylon
  const db = await bakeDB(), ids = CHARS.filter(c => !c.boss).map(c => c.id), todo = [];
  for (const id of ids) { const r = await idbGet(db, BAKE_V + ':' + id); if (r && r.full && r.face) BAKED[id] = { full: URL.createObjectURL(r.full), face: URL.createObjectURL(r.face) }; else todo.push(id); }
  if (Object.keys(BAKED).length) bakeRefresh();
  if (!todo.length) return;
  let bk = null;
  try {
    for (const id of todo) {
      while (BT && BT.B) { if (bk) { bk.dispose(); bk = null; } await bakeSleep(1500); }
      if (!bk || !bk.alive) bk = new Baker();
      const r = await bk.bake(CH[id]); if (!r.full || !r.face) continue;
      await idbPut(db, BAKE_V + ':' + id, r);
      BAKED[id] = { full: URL.createObjectURL(r.full), face: URL.createObjectURL(r.face) };
      await bakeSleep(30);
    }
  } catch (e) { console.warn('bake', e); }
  if (bk) bk.dispose();
  bakeRefresh();
}
function bakeRefresh() {
  if (!S || (BT && BT.B) || $('#celeb') || $('#lvlup') || SQ) return;
  try { render(); if ($('#overlay .csheet') && detailCid) openDetail(detailCid); } catch (e) {}
}
setTimeout(() => { bakePortraits(); }, 1200);
setTimeout(() => {
  let m = null; try { m = JSON.parse(localStorage.getItem('dune-inbattle') || 'null'); localStorage.removeItem('dune-inbattle'); } catch (e) {}
  if (!m || Date.now() - m.t > 3 * 3600e3) return;
  errLog('crash', 'reload during battle (' + (m.mode || '?') + ')');
  let n = 0; try { n = (+localStorage.getItem('dune-crashN') || 0) + 1; localStorage.setItem('dune-crashN', n); } catch (e) {}
  if (n >= 2 && typeof SAVE_LOW === 'function' && !SAVE_LOW()) { try { localStorage.setItem('dune-gfx-low', 'true'); localStorage.setItem('dune-crashN', '0'); } catch (e) {} toast('Бой прервался из-за нехватки памяти. Включена упрощённая графика (можно вернуть в настройках боя).'); }
  else toast('Бой прервался: система перезапустила игру из-за нехватки памяти.');
}, 1500);

// Authored 3D models (Blender → compact meshes + baked textures). Sources: blender/duncan3.py, blender/worm.py

export { BAKE_V, BAKED, figureSVG2D, bakeSleep, bakeDB, idbGet, idbPut, Baker, bakePortraits, bakeRefresh };
