// render3d/scenes/camp.js — строки 2504–2585 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { BT, S } from '../../core/state.js';
import { HERO_STAGE } from './hero.js';
import { Stage3D } from './base-scene.js';
import { poseHuman } from '../characters/pose-generic.js';
import { makeHuman3 } from '../characters/procedural.js';
import { buildEnv, staticNoCast } from '../env/build-env.js';
import { bBox, bCyl, bPlane, bRock, bSph, dynTex, glowCanvas } from '../geometry.js';
import { V3, basic3, col3, mat3, mk } from '../materials.js';
import { CTX, withCtx } from '../ctx.js';
import { B3, HAS3D } from '../base.js';
import { hostKick } from '../engine-host.js';
import { CH } from '../../data/chars.js';

// ---------- 3D camp lobby ----------
class CampStage extends Stage3D {
  constructor() {
    super({ cls: 'stage3d camp3d', maxDpr: 1.75 });
    this.raid = false; this.units = {};
    withCtx({ scene: this.scene, shadows: null }, () => { buildEnv(this, 'sietch'); CTX.shadows = this.shadows;
    const S = this.scene; S.fogStart = 30; S.fogEnd = 120;
    const rp = new B3.ReflectionProbe('rp', 64, S); rp.renderList.push(this.sky, this.ground); rp.position = V3(0, 2, 0); rp.refreshRate = B3.RenderTargetTexture.REFRESHRATE_RENDER_ONCE; S.environmentTexture = rp.cubeTexture;
    // campfire: stones ring, logs, flickering light, flame + sparks particles
    const fx = 0, fz = 1.2, fy = this.heightAt(fx, fz); this.fire = V3(fx, fy, fz);
    const stoneM = mat3('#4a3a30', { roughness: .9, flatShading: true });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, st = mk(bRock(i + 90, 0), stoneM, fx + Math.cos(a) * .55, fy + .05, fz + Math.sin(a) * .55); st.scaling.setAll(.16 + (i % 3) * .03); }
    const logM = mat3('#3a2414', { roughness: .9 });
    for (let i = 0; i < 4; i++) { const lg = mk(bCyl(.06, .07, .9, 8), logM, fx, fy + .12, fz); lg.rotation.z = Math.PI / 2 - .35; lg.rotation.y = i * Math.PI / 4; }
    mk(bSph(.22, 12), basic3('#ff7a2a'), fx, fy + .12, fz, false).scaling.set(1, .4, 1);
    const L = this.fireL = new B3.PointLight('fire', V3(fx, fy + .8, fz), S); L.diffuse = col3('#ff9a4a'); L.specular = col3('#ff8a3a'); L.intensity = 2.4; L.range = 14;
    this.fireShadow = null; // perf step 5: campfire point light no longer renders a 6-face cube shadow map
    const tx = dynTex(glowCanvas(), 0, true);
    const fl = new B3.ParticleSystem('flame', 400, S); fl.particleTexture = tx; fl.emitter = V3(fx, fy + .1, fz); fl.minEmitBox = V3(-.18, 0, -.18); fl.maxEmitBox = V3(.18, .05, .18);
    fl.direction1 = V3(-.15, 1.4, -.15); fl.direction2 = V3(.15, 2.2, .15); fl.minLifeTime = .35; fl.maxLifeTime = .8; fl.minSize = .18; fl.maxSize = .42; fl.addSizeGradient(0, .3); fl.addSizeGradient(1, .05);
    fl.addColorGradient(0, new B3.Color4(1, .9, .5, 1)); fl.addColorGradient(.4, new B3.Color4(1, .5, .15, .9)); fl.addColorGradient(1, new B3.Color4(.5, .1, .02, 0)); fl.emitRate = 260; fl.blendMode = B3.ParticleSystem.BLENDMODE_ADD; fl.start();
    const sp = new B3.ParticleSystem('sparks', 120, S); sp.particleTexture = tx; sp.emitter = V3(fx, fy + .3, fz); sp.minEmitBox = V3(-.15, 0, -.15); sp.maxEmitBox = V3(.15, .2, .15); sp.direction1 = V3(-.5, 2, -.5); sp.direction2 = V3(.5, 4, .5);
    sp.minLifeTime = 1; sp.maxLifeTime = 2.4; sp.minSize = .02; sp.maxSize = .05; sp.color1 = new B3.Color4(1, .7, .3, 1); sp.color2 = new B3.Color4(1, .5, .15, 1); sp.colorDead = new B3.Color4(1, .3, 0, 0); sp.emitRate = 18; sp.blendMode = B3.ParticleSystem.BLENDMODE_ADD; sp.start();
    const smk = new B3.ParticleSystem('smoke', 120, S); smk.particleTexture = tx; smk.emitter = V3(fx, fy + 1.2, fz); smk.minEmitBox = V3(-.1, 0, -.1); smk.maxEmitBox = V3(.1, .2, .1); smk.direction1 = V3(.1, .8, -.1); smk.direction2 = V3(.4, 1.3, .1);
    smk.minLifeTime = 3; smk.maxLifeTime = 5; smk.minSize = .4; smk.maxSize = .9; smk.addSizeGradient(0, .3); smk.addSizeGradient(1, 1.6); smk.color1 = new B3.Color4(.25, .2, .18, .25); smk.color2 = new B3.Color4(.2, .17, .15, .2); smk.colorDead = new B3.Color4(.1, .1, .1, 0); smk.emitRate = 14; smk.blendMode = B3.ParticleSystem.BLENDMODE_STANDARD; smk.start();
    // tents & crates & banners
    const tentM = mat3('#8a6a4a', { roughness: .95, side: 'double' }), darkM = mat3('#3a2a1c');
    for (const [x, z, r, s] of [[-6.5, -3.5, .6, 1.3], [6.8, -4.2, -.5, 1.5], [-9, 1, 1.2, 1.1]]) { const t = mk(bCyl(0, 1.6, 2, 4), tentM, x, this.heightAt(x, z) + 1, z); t.rotation.y = r; t.scaling.set(s, s, s * .8); mk(bBox(.5, 1, .05), darkM, x + Math.sin(r) * 1.05 * s, this.heightAt(x, z) + .5, z + Math.cos(r) * 1.05 * s).rotation.y = r; }
    const crateM = mat3('#6a4a2a', { roughness: .8 });
    for (const [x, z] of [[4.6, -1.5], [5.2, -1.1], [-4.4, -2.2]]) mk(bBox(.6, .5, .6), crateM, x, this.heightAt(x, z) + .25, z).rotation.y = x;
    const pole = mat3('#4a3420'), flag = mat3(S_FLAG(), { side: 'double', roughness: .9 });
    for (const x of [-3.6, 3.6]) { const z = -2.8, y = this.heightAt(x, z); mk(bCyl(.04, .05, 3.6, 8), pole, x, y + 1.8, z); this.flag = this.flag || []; const f = mk(bPlane(.9, 1.3), flag, x + .48, y + 3, z); this.flag.push(f); }
    staticNoCast(this);
    });
    this.look({ dof: { f: 50, stop: 2.4, d: 9000 }, exposure: 1.25, ssao: .9, bloomT: .7, bloomW: .45, vig: 2.6 });
    this.slots = [[0, -.7], [-1.45, -.3], [1.45, -.3], [-2.55, .6], [2.55, .6]];
  }
  setSquad(ids) {
    const key = ids.join(','); if (key === this.key0) return; this.key0 = key;
    for (const o of Object.values(this.units)) o.root.dispose(false, true); this.units = {};
    withCtx({ scene: this.scene, shadows: this.shadows }, () => {
    ids.forEach((id, k) => { const o = makeHuman3(CH[id], { pbr: true }); const [x, z] = this.slots[k] || [0, 0], y = this.heightAt(x, z);
      o.base = V3(x, y, z); o.face = -x * .16; o.side = 'A'; o.phase = k * 1.7; o.def = CH[id]; o.id = id; this.units[id] = o; if (this.fireShadow) for (const m of o.root.getChildMeshes()) this.fireShadow.addShadowCaster(m, false); });
    });
  }
  tick(now, t) {
    const f = .85 + Math.sin(t * 9) * .08 + Math.sin(t * 23) * .06 + Math.sin(t * 3.1) * .05; this.fireL.intensity = 2.6 * f; this.fireL.position.x = this.fire.x + Math.sin(t * 7) * .04;
    for (const o of Object.values(this.units)) poseHuman(this, o, now, t, 1);
    const a = Math.sin(t * .05) * .28, R = 7, asp = (this.cv.clientWidth || 1) / (this.cv.clientHeight || 1), rr = R;
    this.camera.position.set(Math.sin(a) * rr, 2.6 + Math.sin(t * .11) * .15, this.fire.z + Math.cos(a) * rr); this.camera.setTarget(this._tg || (this._tg = V3(0, 1.1, .3))); this.camera.fov = .82;
    if (this.flag) this.flag.forEach((fl, i) => { fl.rotation.y = Math.sin(t * 1.3 + i) * .25; });
  }
  post() {
    // keep the HTML squad labels over the 3D heroes (perf step 9: rects measured on rebuild / every 0.5 s, transform instead of left/top, height only on >1 px change)
    const now = performance.now(); let view = this._lv;
    if (!view || !view.isConnected) { view = this._lv = document.querySelector('.lobby'); this._lm = 0; this._lf = null; if (!view) return; }
    if (this._lf && this._lf.length && !this._lf[0].isConnected) this._lm = 0;
    if (now - (this._lm || 0) > 500) { const vr = view.getBoundingClientRect(), cr = this.cv.getBoundingClientRect(); this._ldx = cr.left - vr.left; this._ldy = cr.top - vr.top; this._lm = now; this._lf = view.querySelectorAll('.lfig[data-hid]'); }
    const M = this.scene.getTransformMatrix(), vp = this._vp || (this._vp = new B3.Viewport(0, 0, 1, 1)), T = this._pt || (this._pt = V3()), pa = this._pa || (this._pa = V3()), pb = this._pb || (this._pb = V3());
    vp.width = this.cv.clientWidth; vp.height = this.cv.clientHeight;
    for (const el of this._lf) { const o = this.units[el.dataset.hid]; if (!o) continue; const p = o.root.position;
      B3.Vector3.ProjectToRef(p, B3.Matrix.IdentityReadOnly, M, vp, pa); T.set(p.x, p.y + o.h, p.z); B3.Vector3.ProjectToRef(T, B3.Matrix.IdentityReadOnly, M, vp, pb);
      const x = this._ldx + pa.x, y = this._ldy + pa.y, h = Math.max(20, pa.y - pb.y);
      if (!el._hp) { el._hp = 1; el.style.left = '0px'; el.style.top = '0px'; el._hx = el._hy = el._hh = NaN; }
      if (!(Math.abs(x - el._hx) < .25 && Math.abs(y - el._hy) < .25)) { el._hx = x; el._hy = y; el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`; }
      if (!(Math.abs(h - el._hh) <= 1)) { el._hh = h; el.style.height = h + 'px'; } }
  }
  paused() { return !!(BT && BT.B) || !!document.querySelector('#overlay .detail, #overlay .sqsel'); }
  slashFX() {} muzzleFX() {} voiceFX() {} castFX() {}
}
const S_FLAG = () => '#4c6b4e';
const cols4 = (arr, c) => arr.push(c.r, c.g, c.b, 1);
let CAMP_STAGE = null;
function mountCampStage() {
  if (!HAS3D) return false;
  const host = document.querySelector('.lobby'); if (!host) return false;
  try { if (!CAMP_STAGE || !CAMP_STAGE.alive) CAMP_STAGE = new CampStage(); CAMP_STAGE.setSquad(S.squad.slice(0, 5)); host.classList.add('has3d'); CAMP_STAGE.attach(host, true); return true; } // asleep → wake
  catch (e) { console.warn('camp stage', e); return false; }
}
// phase 3b, step 4: before a battle the lobby and hero stages go to sleep (were disposed on phones by freeStages) —
// scenes, meshes and textures stay; the next mountCampStage / mountHeroStage wakes them
function sleepStages() { try { if (HERO_STAGE) HERO_STAGE.sleep({ light: true }); if (CAMP_STAGE) CAMP_STAGE.sleep({ light: true }); } catch (e) { console.warn('sleep stages', e); } }
// resume paused stages when overlays close
setInterval(() => hostKick(), 400); // phase 3b: one render loop in EngineHost


function set_CAMP_STAGE(v) { return CAMP_STAGE = v; }
export { CampStage, S_FLAG, cols4, CAMP_STAGE, mountCampStage, set_CAMP_STAGE, sleepStages };
