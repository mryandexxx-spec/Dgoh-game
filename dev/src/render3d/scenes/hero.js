// render3d/scenes/hero.js — строки 2427–2503 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { prog } from '../../logic/progress.js';
import { TIER_COL } from '../../logic/gear.js';
import { Stage3D } from './base-scene.js';
import { gfx } from '../quality.js';
import { ENV_HDR } from '../../assets/env-hdr.js';
import { poseHuman } from '../characters/pose-generic.js';
import { makeHuman3 } from '../characters/procedural.js';
import { MB, bCyl, bPlane, glowTex } from '../geometry.js';
import { V3, basic3, col3, mat3, mk } from '../materials.js';
import { CTX, withCtx } from '../ctx.js';
import { B3, HAS3D, HAS_GL, loadB3 } from '../base.js';
import { CH } from '../../data/chars.js';

// ---------- hero showcase (character window) ----------
class HeroStage extends Stage3D {
  look(options = {}) {
    super.look(options);
    // The background sphere and radial backdrop are already self-lit/soft.
    // Rendering them into GlowLayer adds
    // its light over the opaque hero on MED/LOW, where glowOnly deliberately
    // omits non-emissive character meshes (and thus their depth occlusion).
    // Keep the backdrop in the normal scene, out of the extra glow pass.
    // Apply on every look(), including pipeline recreation after light sleep.
    if (this.glow) {
      if (this.bg) this.glow.addExcludedMesh(this.bg);
      if (this.halo) this.glow.addExcludedMesh(this.halo);
    }
  }
  constructor() {
    super({ cls: 'stage3d hero3d', alpha: false, kind: 'hero' });
    const S = this.scene; let tx; withCtx({ scene: S, shadows: null }, () => { S._maxL = 5; // hemi + key + 2 rims + aura
    S.clearColor = new B3.Color4(.39, .33, .27, 1); S.ambientColor = B3.Color3.Black();
    // Shared sandstone-atmosphere backdrop for ALL hero cards. Keep the glow
    // exclusion in look(): it fixes the young Baron's former ghosting without
    // requiring a near-black background. Reuse existing bg/halo meshes.
    // backdrop: soft radial gradient sphere + floor podium
    const bg = MB().CreateSphere('bg', { diameter: 60, segments: 16, sideOrientation: B3.Mesh.BACKSIDE }, S); bg.material = basic3('#796958', { fog: false }); bg.isPickable = false; this.bg = bg;
    // StandardMaterial adds emissiveTexture RGB to the emissive tint, turning
    // the white radial sprite into a glaring white backdrop. Diffuse texture
    // modulates the existing warm emissive tint instead.
    const halo = mk(bPlane(7, 7), null, 0, 1.4, -3, false); const hm = basic3('#c9a477', { fog: false, add: true }); const htx = glowTex(); hm.diffuseTexture = htx; hm.opacityTexture = htx; hm.alpha = .20; hm.disableDepthWrite = true; halo.material = hm; this.halo = halo;
    const hemi = new B3.HemisphericLight('h', V3(0, 1, 0), S); hemi.intensity = .35; hemi.diffuse = col3('#c8b090'); hemi.groundColor = col3('#2a1a10'); hemi.specular = B3.Color3.Black();
    const key = this.key = new B3.DirectionalLight('key', V3(-.5, -.8, -.6), S); key.position = V3(4, 7, 6); key.intensity = 1.7; key.diffuse = col3('#ffe2b8');
    key.autoUpdateExtends = false; key.orthoLeft = -2; key.orthoRight = 2; key.orthoTop = 3; key.orthoBottom = -1; key.shadowMinZ = .5; key.shadowMaxZ = 20;
    const rim = this.rim = new B3.SpotLight('rim', V3(-2.5, 3.2, -2.5), V3(.6, -.5, .6), Math.PI / 3, 2, S); rim.intensity = 1.6; rim.diffuse = col3('#8fc0ff');
    const rim2 = this.rim2 = new B3.SpotLight('rim2', V3(2.6, 2.6, -2.2), V3(-.6, -.4, .6), Math.PI / 3, 2, S); rim2.intensity = 1.1; rim2.diffuse = col3('#ffa860');
    CTX.shadows = this.shadows = new B3.ShadowGenerator(gfx(this.small).heroShadow, key, undefined, undefined, true); CTX.shadows.bias = .0006; CTX.shadows.normalBias = .01; CTX.shadows.darkness = .2;
    CTX.shadows.usePercentageCloserFiltering = this.engine.webGLVersion >= 2; // perf step 5: PCF instead of PCSS (contact hardening)
    CTX.shadows.filteringQuality = gfx(this.small).shadowQ === 'low' ? B3.ShadowGenerator.QUALITY_LOW : B3.ShadowGenerator.QUALITY_MEDIUM;
    // podium: sand-stone disc with glowing tier ring
    const stone = mat3('#79604b', { roughness: .8 }), top = mat3('#a08261', { roughness: .65 });
    mk(bCyl(1.05, 1.15, .22, 48), stone, 0, -.11, 0, false); mk(bCyl(.98, .98, .02, 48), top, 0, .005, 0, false);
    this.ring = mk(MB().CreateTorus('ring', { diameter: 2.04, thickness: .03, tessellation: 64 }, S), basic3('#e8913f'), 0, .01, 0, false);
    tx = glowTex();
    const dust = new B3.ParticleSystem('motes', 160, S); dust.particleTexture = tx; dust.emitter = V3(0, 0, 0); dust.minEmitBox = V3(-1.6, 0, -1.2); dust.maxEmitBox = V3(1.6, 2.6, 1); dust.direction1 = V3(-.05, .05, -.05); dust.direction2 = V3(.05, .15, .05);
    dust.minLifeTime = 4; dust.maxLifeTime = 8; dust.minSize = .01; dust.maxSize = .03; dust.color1 = new B3.Color4(1, .85, .6, .7); dust.color2 = new B3.Color4(1, .7, .4, .5); dust.colorDead = new B3.Color4(1, .6, .3, 0); dust.emitRate = 20; dust.blendMode = B3.ParticleSystem.BLENDMODE_ADD; dust.preWarmCycles = 100; dust.start();
    const burst = this.burst = new B3.ParticleSystem('burst', 500, S); burst.particleTexture = tx; burst.emitter = V3(0, .1, 0); burst.minEmitBox = V3(-.6, 0, -.6); burst.maxEmitBox = V3(.6, .1, .6); burst.direction1 = V3(-.4, 2, -.4); burst.direction2 = V3(.4, 4, .4); burst.gravity = V3(0, -1.5, 0);
    burst.minLifeTime = .8; burst.maxLifeTime = 1.8; burst.minSize = .02; burst.maxSize = .06; burst.color1 = new B3.Color4(1, .85, .45, 1); burst.color2 = new B3.Color4(1, .65, .25, 1); burst.colorDead = new B3.Color4(1, .4, .1, 0); burst.blendMode = B3.ParticleSystem.BLENDMODE_ADD; burst.emitRate = 0; burst.manualEmitCount = 0; burst.start();
    const rp = new B3.ReflectionProbe('rp', gfx(this.small).probe.hero, S); rp.renderList.push(bg); rp.refreshRate = B3.RenderTargetTexture.REFRESHRATE_RENDER_ONCE; S.environmentTexture = rp.cubeTexture;
    if (ENV_HDR) try { const env = new B3.CubeTexture(ENV_HDR, S, null, false, null, () => { S.environmentTexture = env; S.environmentIntensity = .85; }, () => {}, undefined, true, '.env'); } catch (e) {}   // фаза 5, шаг 6: prefiltered .env (мипы + SH готовы, без префильтрации на устройстве); при ошибке — пробник rp, как раньше
    });
    this.look({ dof: { f: 85, stop: 2, d: 4200 }, exposure: 1.05, ssao: .35, bloomW: .35, bloomT: .85 });
    this.yaw = 0; this.yawV = 0; this.drag = null; this.auto = true; this.showcase = true;
    const dp = this.dustP = new B3.ParticleSystem('dust', 260, S); dp.particleTexture = tx; dp.emitter = V3(0, 1.2, 0); dp.minEmitBox = V3(-.08, -.05, -.05); dp.maxEmitBox = V3(.08, .05, .05);
    dp.direction1 = V3(-.4, .2, -.3); dp.direction2 = V3(.4, .7, .5); dp.gravity = V3(0, -.6, 0); dp.minLifeTime = .7; dp.maxLifeTime = 1.6; dp.minSize = .02; dp.maxSize = .07; dp.minEmitPower = .2; dp.maxEmitPower = .6;
    dp.color1 = new B3.Color4(.78, .64, .46, .7); dp.color2 = new B3.Color4(.6, .48, .34, .55); dp.colorDead = new B3.Color4(.5, .4, .3, 0); dp.blendMode = B3.ParticleSystem.BLENDMODE_STANDARD; dp.emitRate = 0; dp.manualEmitCount = 0; dp.start();
    const cv = this.cv;
    cv.addEventListener('pointerdown', e => { if (!this.isCur()) return; this.drag = { x: e.clientX, y0: this.yaw }; this.auto = false; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!this.drag || !this.isCur()) return; const nx = this.yaw; this.yaw = this.drag.y0 + (e.clientX - this.drag.x) * .012; this.yawV = (this.yaw - nx) * 60; });
    const up = () => { if (this.drag) { this.drag = null; this.resumeT = performance.now() + 3000; } }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  // пакет 5: модели героев — пул (текущая + соседи ‹ ›). Смена — включение готовой модели; соседи строятся и прогреваются
  // в покое (шейдеры, тени, глубина компилируются заранее); остальное освобождается целиком.
  buildHero(def) {
    const S = this.scene, m0 = new Set(S.materials), k0 = new Set(S.skeletons), t0 = new Set(S.textures);
    const o = makeHuman3(def, { scene: S, shadows: this.shadows, pbr: true });
    o.own = { mats: S.materials.filter(m => !m0.has(m)), sks: S.skeletons.filter(x => !k0.has(x)), tex: S.textures.filter(x => !t0.has(x) && x !== S.environmentBRDFTexture && x !== S.environmentTexture) };
    o.base = V3(0, 0, 0); o.face = 0; o.side = 'A'; o.phase = 0; o.def = def; return o;
  }
  dropHero(o) {
    const S = this.scene; try { o.root.dispose(false, true); } catch (e) {}
    for (const m of o.own.mats) if (S.materials.includes(m)) m.dispose(false, true);
    for (const x of o.own.sks) if (S.skeletons.includes(x)) x.dispose();
    for (const x of o.own.tex) if (S.textures.includes(x)) x.dispose();
  }
  setHero(def, prog0, near) {
    this.pool = this.pool || new Map(); this.want = (near || []).filter(d => d && d !== def);
    if (this.def !== def || !this.o) {
      if (this.o) this.o.root.setEnabled(false);
      let o = this.pool.get(def.id); if (!o) { o = this.buildHero(def); this.pool.set(def.id, o); }
      this.warmEnd(o); o.root.setEnabled(true); this.o = o; this.def = def; this.yaw = def.id === 'duncan' && o.root._clipRest ? 0 : -.35; this.auto = true; this.intro = performance.now();
    }
    const keep = new Set([def.id, ...this.want.map(d => d.id)]);
    for (const [id, o] of this.pool) if (!keep.has(id)) { this.dropHero(o); this.pool.delete(id); }
    const tc = col3(TIER_COL[(prog0 || {}).gear || 1] || '#e8913f'); this.ring.material.emissiveColor = tc; this.rim.diffuse = def.side === 'dark' ? col3('#ff6a5a') : col3('#8fc0ff');
    // Meshy's textured armor is dark on its +Z (front) side. Reuse the
    // existing amber rim as a portrait fill for this one authored hero,
    // rather than raising the global key/hemi or adding a fifth GPU light.
    // Restore the original rim when navigating to any other hero in the pool.
    // Reduce additive backdrop haze only for Duncan. The single dark
    // textured armor mesh otherwise blends into the warm radial halo and
    // loses material contrast even with correctly oriented UVs.
    if (this.halo?.material) this.halo.material.alpha =
      def.id === 'duncan' && this.o?.root._clipRest ? .045 : .20;
    if (def.id === 'duncan' && this.o?.root._clipRest) {
      this.rim2.position.set(2.5, 3.0, 3.0);
      this.rim2.direction.set(-.55, -.46, -.70);
      this.rim2.diffuse.set(1, .94, .88);
      this.rim2.intensity = 3.4;
    } else {
      this.rim2.position.set(2.6, 2.6, -2.2);
      this.rim2.direction.set(-.6, -.4, .6);
      this.rim2.diffuse.copyFrom(col3('#ffa860'));
      this.rim2.intensity = 1.1;
    }
  }
  quiet(now) { return !(this.drag || Math.abs(this.yawV) > .02 || now - (this.intro || 0) < 1400 || (this.flashT && now - this.flashT < 1900)); }
  // прогрев соседа: два кадра на месте героя в масштабе 0,001 (тот же свет и тени → те же шейдеры, на экране не видно), затем выключить
  prefetch(now) {
    if (this.warm) { if (--this.warm.n <= 0) this.warmEnd(this.warm.o); return; }
    if (!this.want || !this.quiet(now) || now - (this.pfT || 0) < 300) return;
    const d = this.want.find(x => !this.pool.has(x.id)); if (!d) return;
    this.pfT = now; const o = this.buildHero(d); this.pool.set(d.id, o);
    o.sc0 = o.root.scaling.clone(); o.root.scaling.scaleInPlace(.001); o.root.getChildMeshes().forEach(m => { m.alwaysSelectAsActiveMesh = true; }); o.root.setEnabled(true); this.warm = { o, n: 2 };
  }
  warmEnd(o) { if (!this.warm || this.warm.o !== o) return; o.root.setEnabled(false); o.root.scaling.copyFrom(o.sc0); o.root.getChildMeshes().forEach(m => { m.alwaysSelectAsActiveMesh = false; }); this.warm = null; }
  pfIdle() { return !this.warm && !(this.want || []).some(x => !this.pool.has(x.id)); }
  // пакет 6: под полноэкранной «Другой памятью» фигура не видна — кадр не рисуем (режим paused)
  paused() { return HERO_HOLD || super.paused(); }
  // пакет 5: в покое — профильная частота (MED idle 30, LOW idle 20); active — интро, вспышка, вращение пальцем и его инерция
  idleMode(now) { return this.quiet(now) && !this.warm ? gfx(this.small).heroIdle : 'active'; }
  celebrate(kind) { const b = this.burst; b.manualEmitCount = kind === 'star' ? 420 : 220; this.flashT = performance.now(); this.flashKind = kind; }
  tick(now, t) {
    const o = this.o; if (!o) return; this.prefetch(now);
    if (this.auto && !this.drag && (!this.resumeT || now > this.resumeT)) this.yaw += Math.sin(t * .35) * .0025;
    if (!this.drag) { this.yaw += this.yawV / 60; this.yawV *= .92; }
    poseHuman(this, o, now, t, 1);
    // Meshy's relaxed Idle_11 nods the head toward the floor. A small
    // additive head lift makes the original face texture visible at 667px
    // without modifying the source clip, combat poses or other heroes.
    // poseModelClip restores the source quaternion each tick, so this does
    // not accumulate across frames.
    if (o.def?.id === 'duncan' && o.root._clipRest && o.head?.rotationQuaternion) {
      const lift = this._duncanHeadLift ||
        (this._duncanHeadLift = B3.Quaternion.RotationAxis(B3.Axis.X, -.24));
      o.head.rotationQuaternion.multiplyInPlace(lift);
    }
    // The Meshy Idle_11 face is in the stage's native forward orientation.
    // Do not apply the COMBAT-specific yaw correction here; the shader's
    // fixed UV orientation now shows the actual face/armor in this view.
    o.root.rotation.y = this.yaw;
    const H = o.h, ik = this.intro ? Math.min(1, (now - this.intro) / 1100) : 1, e = 1 - (1 - ik) ** 3;
    const asp = (this.w || 1) / (this.h || 1),
      // The single-piece Meshy skin is visibly slimmer in the portrait than
      // the other authored heroes. Only Duncan gets a small camera push-in.
      portraitScale = o.def?.id === 'duncan' && o.root._clipRest ? .77 : 1,
      dist = (H * 1.35 + .6) / Math.min(1, asp * 1.9) * 1.14 * portraitScale;   // пакет 5: холст шире — запас под подиум
    this.camera.position.set(Math.sin(.25) * dist * (1.25 - .25 * e), H * .62 + .25 * (1 - e), Math.cos(.25) * dist * (1.25 - .25 * e)); this.camera.setTarget((this._tg || (this._tg = V3())).set(0, H * (portraitScale < 1 ? .44 : .52), 0)); this.camera.fov = .75;
    if (this.pipe.depthOfFieldEnabled) this.pipe.depthOfField.focusDistance = dist * 1000;
    const fk = this.flashT ? Math.max(0, 1 - (now - this.flashT) / 900) : 0;
    this.key.intensity = 1.7 + fk * 2; this.ring.scaling.setAll(1 + fk * .15); if (this.glow) this.glow.intensity = .6 + fk;
  }
  slashFX() {} muzzleFX() {} voiceFX() {} castFX() {}
  dustFX(o, where) { const H = o.h, r = o.root.rotation.y, off = where === 'shoulder' ? V3(.28, H * .74, .05) : where === 'cape' ? V3(-.1, H * .5, -.3) : V3(-.05, H * .66, .14); const c = Math.cos(r), s = Math.sin(r); this.dustP.emitter = V3(off.x * c + off.z * s, off.y, -off.x * s + off.z * c); this.dustP.manualEmitCount = where === 'cape' ? 140 : 40; }
}
let HERO_STAGE = null, HERO_SNAP = null, HERO_HOLD = false;
function heroHold(on) { HERO_HOLD = !!on; }
function mountHeroStage(id, near, staged = null) {
  const host = document.querySelector('#overlay .hcfig'); if (!host) return;
  if (!HAS3D) { if (HAS_GL) loadB3().then(ok => { if (ok && host.isConnected) mountHeroStage(id, near, staged); }); return; }   // фаза 4: пока грузится чанк — 2D-фигура
  try {
    if (!HERO_STAGE || !HERO_STAGE.alive) HERO_STAGE = new HeroStage();
    const p = staged?.progress || prog(id), d = staged?.def || CH[id];
    host.classList.add('has3d'); HERO_STAGE.setHero(d, p, (near || []).map(x => CH[x])); HERO_STAGE.attach(host);
    const snap = { id, stars: p.stars, gear: p.gear, eq: p.eq.filter(Boolean).length, lvl: p.lvl, sk: JSON.stringify(p.sk) };
    if (HERO_SNAP && HERO_SNAP.id === id) { if (snap.stars > HERO_SNAP.stars || snap.gear > HERO_SNAP.gear) HERO_STAGE.celebrate('star'); else if (snap.eq > HERO_SNAP.eq || snap.lvl > HERO_SNAP.lvl || snap.sk !== HERO_SNAP.sk) HERO_STAGE.celebrate('up'); }
    HERO_SNAP = snap;
  } catch (e) { console.warn('hero stage', e); }
}


function set_HERO_STAGE(v) { return HERO_STAGE = v; }
function set_HERO_SNAP(v) { return HERO_SNAP = v; }
export { HeroStage, HERO_STAGE, HERO_SNAP, mountHeroStage, heroHold, set_HERO_STAGE, set_HERO_SNAP };
