// render3d/scenes/arena.js — строки 1800–2195 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { CINE_OFF } from '../../logic/account.js';
import { DLG } from '../../ui/battle/battle-ui.js';
import { errLog } from '../../core/errlog.js';
import { BT } from '../../core/state.js';
import { TIER_COL } from '../../logic/gear.js';
import { RELIC_COL } from '../../logic/relics.js';
import { gfx, dofOn, glowOnly } from '../quality.js';
import { engineHost } from '../engine-host.js';
import { MOCAP_OK } from '../characters/mocap.js';
import { makeWorm3, wormData, wormMats, wormMesh } from '../worm.js';
import { ANIM_SLOW, poseHuman, unmapK } from '../characters/pose-generic.js';
import { makeHuman3 } from '../characters/procedural.js';
import { bakeStatic, buildEnv } from '../env/build-env.js';
import { MB, add, bBox, bCone, bCyl, bDisc, bRock, bSph, bTorus, glowTex, grp } from '../geometry.js';
import { C3_CHARM, C3_SPICE, C3_TGT, V3, basic3, col3, inPlaceKeep, mat3, mk, runDue } from '../materials.js';
import { CTX, withCtx } from '../ctx.js';
import { B3, SLOT3, cvSize } from '../base.js';
import { FX } from '../../data/fx.js';
import { GameScene } from '../game-scene.js';

// ---------- arena ----------
// GameScene: create = конструктор (канвас ставится в хост заранее — раскладка рейда меряет его), wake в конце конструктора;
// после боя и при отпадении хоста — dispose (не sleep).
class Arena3D extends GameScene {
  constructor(canvas, key, B) {
    super(engineHost()); this.isArena = true; this.host.perfBegin(this); this.key = key; this.units = {}; this.parts = []; this.speed = 1;
    const small = Math.min(innerWidth, innerHeight) < 600; this.small = small; const Q = gfx(small);
    const E = this.engine; // phase 3b: shared engine; the placeholder canvas is replaced by the host canvas
    this.place(canvas.parentNode, { replace: canvas, cls: canvas.className || 'bgc', id: canvas.id || 'bgc', dpr: Q.dpr.arena });
    const S = this.scene = new B3.Scene(E); S.useRightHandedSystem = true; S.skipPointerMovePicking = true; S.autoClear = true;
    this.camera = new B3.UniversalCamera('cam', V3(0, 11, 18), S); this.camera.minZ = .1; this.camera.maxZ = 1200; this.camera.inputs.clear();
    this.raid = !!B.raid; this.summons = []; this.nA = B.units.filter(x => x.side === 'A').length;
    withCtx({ scene: S, shadows: null }, () => { buildEnv(this, key, true); CTX.shadows = this.shadows; bakeStatic(this);
    const rp = this.probe = new B3.ReflectionProbe('rp', Q.probe.arena, S); rp.renderList.push(this.sky, this.ground); rp.position = V3(0, 2, 0); rp.refreshRate = B3.RenderTargetTexture.REFRESHRATE_RENDER_ONCE; S.environmentTexture = rp.cubeTexture;
    for (const u of B.units) this.addUnit(u);
    this.setupFX();
    if (B.units.some(u => u.def && u.def.gl)) { this.glLight = new B3.PointLight('gll', V3(0, 6, 2), S); this.glLight.diffuse = col3('#ffc860'); this.glLight.range = 40; this.glLight.intensity = 0; } // perf step 6: no idle extra light in every shader
    });
    if (B.units.some(u => u.def && (u.def.gl || (u.def.ult && u.def.ult.wormSmall)))) try { this.wormKit(true); } catch (e) { errLog('wormkit', e); }
    this.resize(); this.wake(); this.warmFX();
  }
  update() { this.loop(); }
  onDetach() { if (this._hro) { this._hro.disconnect(); this._hro = null; } this.dispose(); }
  contextLost() { if (!this.alive) return; this.lost = true; if (this.onLost) setTimeout(() => this.onLost && this.onLost(), 0); }
  setupFX() {
    const S = this.scene, Q = gfx(this.small);
    // emissive bloom for windows, eyes, rings, worm glow
    if (Q.glow) { this.glow = new B3.GlowLayer('glow', S, { mainTextureRatio: Q.glowRatio, blurKernelSize: Q.glowKernel }); this.glow.intensity = .55;
    this.glow.addExcludedMesh(this.sky); if (this.ground) this.glow.addExcludedMesh(this.ground); for (const o of Object.values(this.units)) if (o.bubble) this.glow.addExcludedMesh(o.bubble); if (Q.glowSel) glowOnly(this.glow); }   // небо и земля исключены выше, как в HIGH
    const tx = glowTex({ scene: S });
    const sp = this.sparks = new B3.ParticleSystem('sparks', 600, S); sp.particleTexture = tx; sp.emitter = V3(0, -50, 0); sp.minEmitBox = V3(-.15, -.2, -.15); sp.maxEmitBox = V3(.15, .2, .15);
    sp.direction1 = V3(-2.5, 1, -2.5); sp.direction2 = V3(2.5, 4, 2.5); sp.gravity = V3(0, -9, 0); sp.minLifeTime = .2; sp.maxLifeTime = .45; sp.minSize = .04; sp.maxSize = .1; sp.minEmitPower = 1; sp.maxEmitPower = 2.2;
    sp.colorDead = new B3.Color4(1, .4, .1, 0); sp.blendMode = B3.ParticleSystem.BLENDMODE_ADD; sp.emitRate = 0; sp.manualEmitCount = 0; sp.start();
    const hp = this.healP = new B3.ParticleSystem('heal', 300, S); hp.particleTexture = tx; hp.emitter = V3(0, -50, 0); hp.minEmitBox = V3(-.35, 0, -.35); hp.maxEmitBox = V3(.35, 1.6, .35);
    hp.direction1 = V3(-.1, .8, -.1); hp.direction2 = V3(.1, 1.6, .1); hp.minLifeTime = .6; hp.maxLifeTime = 1; hp.minSize = .06; hp.maxSize = .14; hp.color1 = new B3.Color4(.5, 1, .55, 1); hp.color2 = new B3.Color4(.8, 1, .6, 1); hp.colorDead = new B3.Color4(.3, 1, .4, 0);
    hp.blendMode = B3.ParticleSystem.BLENDMODE_ADD; hp.emitRate = 0; hp.manualEmitCount = 0; hp.start();
    // cinematic post-processing
    const P = this.pipe = new B3.DefaultRenderingPipeline('dp', true, S, [this.camera]);
    P.fxaaEnabled = true; P.samples = this.engine.webGLVersion >= 2 ? Q.msaa : 1;
    P.bloomEnabled = Q.bloom; P.bloomThreshold = .82; P.bloomWeight = .3; P.bloomKernel = 48; P.bloomScale = .5;
    P.imageProcessingEnabled = true; const ip = P.imageProcessing;
    ip.toneMappingEnabled = true; ip.toneMappingType = B3.ImageProcessingConfiguration.TONEMAPPING_ACES; ip.exposure = 1.12; ip.contrast = 1.12;
    ip.vignetteEnabled = true; ip.vignetteWeight = 1.6; ip.vignetteColor = new B3.Color4(.08, .04, .02, 0); ip.vignetteStretch = .3;
    P.chromaticAberrationEnabled = Q.chromatic; if (P.chromaticAberration) P.chromaticAberration.aberrationAmount = 6;
    P.grainEnabled = Q.grain; P.grain.intensity = 5; P.grain.animated = true;
    P.sharpenEnabled = Q.sharpen; if (P.sharpen) P.sharpen.edgeAmount = .2;
    P.depthOfFieldEnabled = dofOn(Q, 'arena'); P.depthOfFieldBlurLevel = Q.dofBlur === 'low' ? B3.DepthOfFieldEffectBlurLevel.Low : B3.DepthOfFieldEffectBlurLevel.Medium;
    P.depthOfField.focalLength = 60; P.depthOfField.fStop = 3.2; P.depthOfField.focusDistance = 20000; P.depthOfField.lensSize = 50;
    try { if (Q.ssao && this.engine.webGLVersion >= 2 && B3.SSAO2RenderingPipeline.IsSupported) { const ao = this.ssao = new B3.SSAO2RenderingPipeline('ssao', S, { ssaoRatio: Q.ssaoRatio, blurRatio: .5 }, [this.camera], true); ao.radius = 1.4; ao.totalStrength = 1.15; ao.base = .12; ao.samples = Q.ssaoSamples; ao.maxZ = 70; ao.minZAspect = .3; ao.expensiveBlur = Q.ssaoExpBlur; } } catch (e) {}
  }
  addUnit(u) {
    withCtx({ scene: this.scene, shadows: this.shadows }, () => {
    const o = u.def.boss ? makeWorm3({ pbr: false }) : makeHuman3(u.def, { pbr: true }); o.def = u.def;
    o.slot = u.def.boss ? [7.4, -7, true] : (() => { const s = SLOT3[u.idx] || SLOT3[0]; return [u.side === 'A' ? s[0] : -s[0], s[1], false, u.idx]; })();
    const [x, y, z] = this.slotPos(o.slot);
    o.base = V3(x, y, z); o.root.position.copyFrom(o.base);
    o.face = this.raid ? (u.def.boss ? Math.PI / 2 : Math.PI) : u.def.boss ? 0 : (u.side === 'A' ? Math.PI / 2 : -Math.PI / 2); o.root.rotation.y = o.face;
    if (this.raid && u.def.boss) { o.root.scaling.setAll(1.6); o.h *= 1.7; }
    o.legend = !!u.def.legendary && !u.def.boss; if (o.legend) { o.root.scaling.scaleInPlace(1.5 / 1.08); o.h *= 1.5 / 1.08; }
    o.tierC = col3(u.relic ? RELIC_COL : TIER_COL[u.gear || 1] || '#e8913f');
    o.side = u.side; o.uid = u.uid; o.phase = Math.random() * 6;
    if (!o.boss) { o.bubble = add(o.root, mk(bSph(1, 24), basic3('#3f8ee0', { add: true, alpha: 0 }), 0, .98, 0, false)); o.bubble.scaling.set(.55, 1.08, .55); o.bubble.material.disableDepthWrite = true; }
    const r0 = o.boss ? 2.8 : o.legend ? .78 : .52, th = o.boss ? .4 : o.legend ? .2 : .15;
    o.ring = mk(MB().CreateTorus('ring', { diameter: 2 * r0, thickness: th, tessellation: 48 }, CTX.scene), basic3('#e8913f', { alpha: 0 }), x, y + .05, z, false); o.ring.scaling.y = .08; o.ring.material.disableDepthWrite = true;
    if (this.raid && u.def.boss) o.ring.scaling.set(1.9, .08, 1.9);
    if (!o.boss) { o.pool = mk(bDisc(o.legend ? 1.15 : .72, 40), basic3('#ffffff', { add: true, alpha: 0 }), x, y + .04, z, false); o.pool.rotation.x = Math.PI / 2; o.pool.material.disableDepthWrite = true; const gtx = glowTex(); o.pool.material.emissiveTexture = gtx; o.pool.material.opacityTexture = gtx; }
    this.units[u.uid] = o;
    });
  }
  slotPos([sx, sz, boss, idx]) {
    if (this.raid) {
      const asp = (this.cv.clientWidth || innerWidth) / (this.cv.clientHeight || innerHeight);
      if (boss) return [0, this.heightAt(0, -11), -11];
      const W = this.cv.clientWidth || innerWidth, H = this.cv.clientHeight || innerHeight, z0 = H < 520 ? -4.4 : -2.2;
      const D = (this.camDist || 23) - z0, visW = 2 * D * Math.tan((this.fovDeg || 38) * Math.PI / 360) * asp, ppu = W / visW;
      const needPx = Math.max(96, Math.min(150, H * .24)), n = Math.max(1, this.nA), order = [2, 1, 3, 0, 4], k = n === 5 ? order[idx] : idx;
      let gap = needPx / ppu;
      if ((n - 1) * gap <= visW * .86) {
        let off = 0; const half = (n - 1) / 2 * gap * ppu, hud = needPx / 2;
        if (H < 520) { const want = (.4 * W + 16 + hud - (W / 2 - half)) / ppu, room = (W - 8 - hud - (W / 2 + half)) / ppu; off = Math.max(0, Math.min(want, room)); }
        const x = (k - (n - 1) / 2) * gap + off, z = z0 + Math.abs(k - (n - 1) / 2) * .2; return [x, this.heightAt(x, z), z]; }
      gap = Math.min(gap, visW * .86 / 2); const row = k === 1 || k === 3 ? 1 : 0;
      const col = row ? (k === 1 ? -.5 : .5) : (k === 0 ? -1 : k === 2 ? 0 : 1), x = col * gap, z = row ? z0 - 3 : z0 + .8;
      return [x, this.heightAt(x, z), z];
    }
    return [sx, this.heightAt(sx, sz), sz];
  }
  relayout() { for (const uid in this.units) { const o = this.units[uid]; if (!o.slot) continue; const [x, y, z] = this.slotPos(o.slot); o.base.set(x, y, z); o.ring.position.set(x, y + .05, z); if (o.pool) o.pool.position.set(x, y + .04, z); } }
  resize() {
    const z = cvSize(this.cv), w = z.w || innerWidth, h = z.h || innerHeight;
    const relay = this.w && this.raid && (w !== this.w || h !== this.h);
    this.w = w; this.h = h; this.engine.resize(); this._hm = 0;
    const a = w / h; let fov = a > 1.9 ? 30 : 33;
    this.camDist = 18.5; this.camH = 11.5; this.look = V3(0, .55, -.6);
    if (this.raid) { fov = a < .8 ? 58 : a < 1.2 ? 46 : 38; this.camDist = a < .8 ? 27 : 23; this.camH = 7.5; this.look = V3(0, a < .8 ? 5.5 : 5, -3); }
    this.fovDeg = fov; this.camera.fov = fov * Math.PI / 180;
    if (relay || (this.raid && !this.laidOut)) { this.laidOut = true; this.relayout(); }
  }
  sync(B, targets) {
    const now = performance.now(), sp = Math.max(1, this.speed); this.hitDelay = {};
    const key = B.actor ? B.actor + ':' + B.log.length : null;
    if (key && key !== this._actKey && this.units[B.actor]) {
      this._actKey = key;
      const o = this.units[B.actor], shots = (B.shots || []).filter(s => s.a === B.actor), tg = [...new Set(shots.map(s => s.t))].map(id => this.units[id]).filter(Boolean);
      o.atkT = now; o.lastAct = B.round;
      if (o.boss) { const t0 = tg[0]; const d = t0 ? t0.base.subtract(o.base) : V3(-1, 0, 0); d.y = 0; o.atkDir = d.normalize(); for (const t of tg) this.hitDelay[t.uid] = 300 / sp; }
      else {
        const dt = shots[0] && shots[0].dt;
        let kind = !shots.length ? 'cast' : dt === 'voice' ? 'voice' : dt === 'blade' ? 'melee' : 'shoot';
        if (kind === 'melee' && tg.length > 1) kind = 'aoe';
        const base = ((o.anim && o.anim.dur && o.anim.dur(B.lastKey)) || { melee: 820, aoe: 920, shoot: 640, voice: 760, cast: 760 }[kind]) * ANIM_SLOW;
        const center = tg.length ? tg.reduce((acc, t) => acc.add(t.base), V3()).scale(1 / tg.length) : null;
        const dir = center ? center.subtract(o.base) : V3(o.side === 'A' ? 1 : -1, 0, 0); dir.y = 0; const dl = dir.length(), nd = dl > .001 ? dir.scale(1 / dl) : V3(1, 0, 0);
        const reach = MOCAP_OK && o.anim && (o.anim.slash || o.anim.pose) ? 1.55 : .95;     // motion-captured cuts lunge forward on their own
        const to = kind === 'melee' ? tg[0].base.subtract(nd.scale(reach)) : kind === 'aoe' ? center.subtract(nd.scale(1.4)) : o.base.clone();
        to.y = this.heightAt(to.x, to.z);
        let total = base, f1 = 0, f2 = 0;
        if ((kind === 'melee' || kind === 'aoe') && !(o.anim && o.anim.pose)) {     // run to the target at a steady pace instead of a jump
          const D = B3.Vector3.Distance(o.base, to), tr = Math.min(950, Math.max(350, D / 7.5 * 1000));
          const aIn = Math.max(.34 * base, tr), st = .26 * base, aOut = Math.max(.4 * base, tr * .9);
          total = aIn + st + aOut; f1 = aIn / total; f2 = (aIn + st) / total;
        }
        const dur = total / sp; this.actMs = total;
        const ab = B.lastKey && B.lastKey !== 'gl' && o.def ? o.def[B.lastKey] : null;
        o.act = { kind, t0: now, dur, dir: nd, to, tg, dt, ab, f1, f2 };
        if (['special', 'ult'].includes(B.lastKey) && !this.raid && !(typeof CINE_OFF === 'function' && CINE_OFF())) { const pts = [kind === 'melee' || kind === 'aoe' ? to : o.base, ...tg.map(t => t.base)], c = V3(); for (const q of pts) c.addInPlace(q); c.scaleInPlace(1 / pts.length); this.cine = { t0: now, dur: dur + 700 / sp, p: c, side: o.side, ult: B.lastKey === 'ult' }; }
        if (ab && (ab.fx || ab.heal || ab.tm || ab.shieldSelf || ab.cleanse)) this.at(now + (kind === 'cast' ? .3 : .55) * dur, () => this.buffFX(B, o, ab));
        const hitAt = unmapK((o.anim && o.anim.hit && o.anim.hit(B.lastKey)) || { melee: .52, aoe: .56, shoot: .4, voice: .5, cast: .3 }[kind], o.act) * dur;
        for (const t of tg) { this.hitDelay[t.uid] = hitAt; t.hitDir = nd.clone(); }
      }
    }
    for (const u of B.units) {
      const o = this.units[u.uid]; if (!o) continue;
      const dl = this.hitDelay[u.uid] || 0;
      if (u.revivedNow) { u.revivedNow = false; o.dead = true; o.deathT = now + dl; o.rise = now + dl + 1500; }
      if (!u.alive && !o.dead) { o.dead = true; o.deathT = now + dl; }
      for (const e of B.events) if (e.uid === u.uid) {
        if (/dmg|crit|raw|shield|poison/.test(e.kind)) { o.hitT = now + dl; o.hitCrit = e.kind === 'crit'; if (!o.boss) this.at(now + dl, () => this.sparkFX(o, e.kind === 'crit' ? 2 : e.kind === 'shield' ? 0 : 1)); }
        if (e.kind === 'heal') { o.healT = now + dl; this.at(now + dl, () => this.healFX(o)); }
        if (e.kind === 'crit') this.at(now + dl, () => { this.shakeT = performance.now(); });
      }
      o.active = B.active === u; o.tgt = targets.has(u.uid); o.charm = !!u.charmed;
      o.shieldK = u.maxShield ? u.shield / u.maxShield : 0; o.stealth = !!u.fx.stealth; o.phaseN = u.phase || 1;
    }
    if (B.flash === 'worm' || B.flash === 'wormSmall' || B.flash === 'holtz' || B.flash === 'gl') this.shakeT = now;
    if (B.flash === 'wormSmall') this.wormSmall(B, now);
    if (B.flash === 'gl') {
      const delay = 1500, foes = B.units.filter(x => x.side !== (B.units.find(y => y.uid === B.glCast) || {}).side && !x.def.boss);
      if (B.glKind === 'mirror') { for (const x of B.units) { const v = this.units[x.uid]; if (v && !v.boss && x.side !== (B.units.find(y => y.uid === B.glCast) || {}).side || (v && x.charmed)) { this.at(now + 500, () => this.ringFX(v, '#9fe8ff', 1.3)); this.at(now + 900, () => this.sparkFX(v, 2)); } } }
      else if ((B.glKind === 'devour' || B.glKind === 'prophecy') && B.glTarget && this.units[B.glTarget]) { const v = this.units[B.glTarget], tu = B.units.find(x => x.uid === B.glTarget); this.summon(v.base.x, v.base.z, v.boss ? 1.5 : 1, now + delay, v.boss || (tu && tu.alive) ? null : v); }
      else { let c = V3(this.raid ? 0 : 5, 0, this.raid ? -6 : 0); const os = foes.map(x => this.units[x.uid]).filter(Boolean); if (os.length) { c = V3(); for (const o of os) c.addInPlace(o.base); c.scaleInPlace(1 / os.length); } this.summon(c.x, c.z, 1.45, now + delay, null); }
      this.glT = (typeof CINE_OFF === 'function' && CINE_OFF()) ? 0 : now; if (!this.glLight) { this.glLight = new B3.PointLight('gll', V3(0, 6, 2), this.scene); this.glLight.diffuse = col3('#ffc860'); this.glLight.range = 40; this.glLight.intensity = 0; }
    }
  }
  at(t, fn) { (this.fxq ||= []).push({ t, fn }); }
  fade(mesh, life, upd) { (this.tr ||= []).push({ mesh, t0: performance.now(), life, upd }); }
  // фаза 3b, шаг 7: пул FX. Слот — меш со своим материалом (alpha у каждого слота своя); ключ — геометрия места вызова.
  // После fade слот выключается и ждёт следующего fx(), вместо dispose меша, материала и его UBO. Освобождается вместе со сценой.
  fx(key, make, c, alpha, x, y, z) {
    const L = (this.fxp ||= {})[key] ||= []; let m = L.pop();
    if (m) { m.setEnabled(true); m.rotationQuaternion = null; m.rotation.setAll(0); m.scaling.setAll(1); m.material.emissiveColor.copyFrom(col3(c)); }
    else { m = mk(make(), basic3(c, { add: true }), 0, 0, 0, false); m._fxk = key; }
    m.material.alpha = alpha; m.position.set(x, y, z); return m;
  }
  // шаг 7: прогрев вариантов шейдера FX до первого хода — два невидимых (alpha .001, аддитивно) слота в точке взгляда камеры,
  // с равномерным и неравномерным масштабом (define NONUNIFORMSCALING); через 0,2 с уходят в пул. Дымовые частицы — сразу (раньше создавались при первом stealth)
  warmFX() {
    try { withCtx({ scene: this.scene }, () => { const L = this.look;
      for (const sc of [1, 1.3]) { const m = this.fx('flash', () => bSph(.09, 10), '#ffffff', .001, L.x, L.y, L.z); m.scaling.y = sc; this.fade(m, 200, () => {}); } });
      this.smokeFX(null); } catch (e) { errLog('warm-fx', e); }
  }
  fxFree(m) { if (m.isDisposed()) return; m.setEnabled(false); (this.fxp[m._fxk] ||= []).push(m); }
  wpos(node, local) { node.computeWorldMatrix(true); return B3.Vector3.TransformCoordinates(local || V3(), node.getWorldMatrix()); }
  muzzleFX(o, a) {
    withCtx({ scene: this.scene }, () => { const from = this.wpos(o.wpn, o.root._muzzle), c = a.dt === 'laser' ? '#7fe0ff' : a.dt === 'poison' ? '#9ae06a' : '#ffd890';
    const fl = this.fx('flash', () => bSph(.09, 10), c, 1, from.x, from.y, from.z); this.fade(fl, 110, (m, k) => { m.scaling.setAll(1 + k * 1.5); m.material.alpha = 1 - k; });
    for (const t of a.tg) {
      const b = t.base.add(V3(0, t.boss ? 3 : 1.1, 0)), ln = MB().CreateTube('tr', { path: [from, b], radius: a.dt === 'laser' ? .045 : .022, tessellation: 6 }, CTX.scene);
      ln.material = basic3(c, { add: true, alpha: .95 }); ln.isPickable = false; this.fade(ln, a.dt === 'laser' ? 320 : 200, (m, k) => { m.material.alpha = .95 * (1 - k); });
    }
    });
  }
  slashFX(p, yaw, aoe) {
    withCtx({ scene: this.scene }, () => { const arc = aoe ? 1 : .42, r = aoe ? 1.6 : .9;
    const pts = []; for (let i = 0; i <= 24; i++) { const a = -arc * Math.PI + i / 24 * arc * Math.PI * 2; pts.push(V3(Math.sin(a) * r, 1.1 + (aoe ? 0 : (i / 24 - .5) * .9), Math.cos(a) * r)); }
    const m = MB().CreateTube('sl', { path: pts, radiusFunction: i => .05 * Math.sin(i / 24 * Math.PI) + .005, tessellation: 6 }, CTX.scene); m.material = basic3('#e8f4ff', { add: true, alpha: .9 }); m.position.copyFrom(aoe ? p.subtract(V3(0, 0, 0)) : p.subtract(V3(Math.sin(yaw) * .8, 0, Math.cos(yaw) * .8))); m.rotation.y = yaw; m.isPickable = false;
    this.fade(m, 230, (mm, k) => { mm.material.alpha = .9 * (1 - k); mm.scaling.setAll(1 + k * .25); });
    });
  }
  voiceFX(o, a) {
    withCtx({ scene: this.scene }, () => { const from = o.base.add(V3(0, 1.62, 0));
    for (const t of a.tg) for (let n = 0; n < 3; n++) {
      const ring = this.fx('voice', () => bTorus(.22, .02, 24), '#c8a0ff', 0, from.x, from.y, from.z), to = t.base.add(V3(0, 1.3, 0)), dir = to.subtract(from);
      const q = new B3.Quaternion(); B3.Quaternion.FromUnitVectorsToRef(V3(0, 0, 1), dir.normalizeToNew(), q); ring.rotationQuaternion = q;
      const d0 = n * 90; this.fade(ring, 420 + d0, (m, k) => { const kk = Math.max(0, (k * (420 + d0) - d0) / 420); m.position.copyFrom(B3.Vector3.Lerp(from, to, kk)); m.scaling.setAll(1 + kk * 3); m.material.alpha = kk > 0 ? .8 * (1 - kk) : 0; });
    }
    });
  }
  castFX(o) {
    withCtx({ scene: this.scene }, () => { const c = o.side === 'A' ? '#ffd27a' : '#ff7a6a', p = o.base;
    const ring = this.fx('castR', () => bTorus(.5, .04, 32), c, .9, p.x, p.y + .06, p.z); ring.rotation.x = Math.PI / 2; this.fade(ring, 650, (m, k) => { m.scaling.set(1 + k * 2.2, 1 + k * 2.2, 1); m.material.alpha = .9 * (1 - k); });
    const col = this.fx('castC', () => bCyl(.5, .6, 3, 24, true), c, .4, p.x, p.y + 1.5, p.z); this.fade(col, 650, (m, k) => { m.material.alpha = .4 * Math.sin(k * Math.PI); m.scaling.set(1 - k * .4, 1 + k * .3, 1 - k * .4); });
    });
  }
  sparkFX(o, power) {
    if (!this.sparks) return; const p = o.root.position;
    this.sparks.emitter = V3(p.x, p.y + 1.1, p.z); this.sparks.manualEmitCount = power === 2 ? 70 : power === 1 ? 32 : 18;
    const c = power === 0 ? [.5, .8, 1] : [1, .85, .55]; this.sparks.color1 = new B3.Color4(c[0], c[1], c[2], 1); this.sparks.color2 = new B3.Color4(c[0], c[1] * .8, c[2] * .6, 1);
  }
  healFX(o) { if (!this.healP) return; const p = o.root.position; this.healP.emitter = V3(p.x, p.y + .2, p.z); this.healP.manualEmitCount = 40; }
  // non-damage ability effects: buffs, taunt, stealth, heals, debuffs
  buffFX(B, o, ab) {
    const all = Object.values(this.units).filter(x => !x.dead), allies = all.filter(x => x.side === o.side), foes = all.filter(x => x.side !== o.side);
    const fx = ab.fx || [], want = (k, who) => fx.some(f => f[0] === k && (who ? f[2] === who : true));
    const on = (list, fn, stagger = 70) => list.forEach((x, i) => this.at(performance.now() + i * stagger, () => fn(x)));
    const tgSelf = [o], tgAll = allies;
    if (ab.heal) on(ab.tgt === 'self' ? tgSelf : tgAll, x => this.healFX(x));
    if (want('defUp')) on(fx.some(f => f[0] === 'defUp' && f[2] === 'allies') ? tgAll : tgSelf, x => this.domeFX(x, '#5aa8ff'));
    if (ab.shieldSelf) this.domeFX(o, '#8fd8ff', 1.4);
    if (want('evaUp')) on(fx.some(f => f[0] === 'evaUp' && f[2] === 'allies') ? tgAll : tgSelf, x => this.swirlFX(x, '#c8f0ff'));
    if (want('counter')) on(tgSelf, x => this.swirlFX(x, '#ffb060'));
    if (want('taunt')) this.tauntFX(o);
    if (want('stealth')) this.smokeFX(o);
    if (ab.tm && (ab.tm.allies > 0 || ab.tm.self > 0)) on(ab.tm.allies ? tgAll : tgSelf, x => this.speedFX(x));
    if (ab.cleanse) on(tgAll, x => this.ringFX(x, '#e8fff0', .6));
    const deb = fx.filter(f => f[2] === 't' && FX[f[0]] && FX[f[0]].bad).map(f => f[0]);
    if (deb.length && !ab.dt) on(ab.tgt === 'enemies' ? foes : foes.slice(0, 1), x => this.miasmaFX(x, deb.includes('poison') ? '#7ad36a' : deb.includes('fear') ? '#b07aff' : '#ff7a5a'));
    if (ab.tm && ab.tm.enemies < 0) on(foes, x => this.ringFX(x, '#8a7aff', .5));
  }
  domeFX(x, c, k = 1) {
    withCtx({ scene: this.scene }, () => { const p = x.root.position, d = this.fx('dome' + k, () => bSph(.95 * k, 24, 1, .5), c, 0, p.x, p.y, p.z); d.scaling.y = 1.3; d.material.backFaceCulling = false;
    this.fade(d, 1300, (m, kk) => { m.position.copyFrom(x.root.position); m.material.alpha = .75 * Math.sin(Math.min(1, kk * 1.6) * Math.PI * .5) * (1 - kk); m.scaling.set(.6 + kk * .5, (.6 + kk * .5) * 1.3, .6 + kk * .5); });
    this.ringFX(x, c, .9);
    });
  }
  ringFX(x, c, r = .7) {
    withCtx({ scene: this.scene }, () => { const p = x.root.position, m0 = this.fx('ring' + r, () => bTorus(r, .06, 32), c, 1, p.x, p.y + .05, p.z);
    this.fade(m0, 1000, (m, k) => { m.scaling.set(1 + k * 1.2, 1, 1 + k * 1.2); m.position.y = p.y + .05 + k * 1.6; m.material.alpha = 1 - k; });
    });
  }
  swirlFX(x, c) {
    withCtx({ scene: this.scene }, () => { const p = x.root.position;
    for (let n = 0; n < 3; n++) { const m0 = this.fx('swirl', () => bTorus(.55, .022, 28, .6), c, .8, p.x, p.y + .3, p.z);
      this.fade(m0, 800, (m, k) => { m.position.copyFrom(x.root.position); m.position.y += .3 + k * 1.5 + n * .25; m.rotation.y = k * 9 + n * 2; m.material.alpha = .8 * Math.sin(k * Math.PI); m.scaling.setAll(1 - k * .4); }); }
    });
  }
  speedFX(x) {
    withCtx({ scene: this.scene }, () => { const p = x.root.position;
    for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2, m0 = this.fx('speed', () => bBox(.025, .7, .025), '#ffe08a', .9, p.x + Math.cos(a) * .55, p.y, p.z + Math.sin(a) * .55);
      this.fade(m0, 520, (m, k) => { m.position.y = x.root.position.y + k * 2.4; m.material.alpha = .9 * (1 - k); }); }
    });
  }
  tauntFX(x) {
    withCtx({ scene: this.scene }, () => { const p = x.root.position;
    for (let n = 0; n < 3; n++) { const m0 = this.fx('tauntR', () => bTorus(.4, .05, 32), '#ff5a3a', 0, p.x, p.y + 1.2, p.z); m0.rotation.x = Math.PI / 2;
      const yaw = x.root.rotation.y; m0.rotation.y = yaw; const d0 = n * 140;
      this.fade(m0, 700 + d0, (m, k) => { const kk = Math.max(0, (k * (700 + d0) - d0) / 700); m.scaling.setAll(1 + kk * 3.2); m.material.alpha = kk > 0 ? .85 * (1 - kk) : 0; }); }
    const col = this.fx('tauntC', () => bCyl(.45, .55, 2.4, 24, true), '#ff4a2a', 0, p.x, p.y + 1.2, p.z);
    this.fade(col, 900, (m, k) => { m.material.alpha = .35 * Math.sin(k * Math.PI); m.scaling.set(1 + k * .3, 1, 1 + k * .3); });
    this.shakeT = performance.now();
    });
  }
  smokeFX(x) {
    if (!this.smoke) { const S = this.scene; const t = glowTex({ scene: S }); const ps = this.smoke = new B3.ParticleSystem('smoke', 300, S); ps.particleTexture = t; ps.emitter = V3(0, -50, 0); ps.minEmitBox = V3(-.4, 0, -.4); ps.maxEmitBox = V3(.4, 1.6, .4); ps.direction1 = V3(-.4, .3, -.4); ps.direction2 = V3(.4, .9, .4); ps.minLifeTime = .7; ps.maxLifeTime = 1.3; ps.minSize = .4; ps.maxSize = .9; ps.color1 = new B3.Color4(.75, .65, .5, .5); ps.color2 = new B3.Color4(.55, .45, .35, .4); ps.colorDead = new B3.Color4(.4, .3, .2, 0); ps.blendMode = B3.ParticleSystem.BLENDMODE_STANDARD; ps.emitRate = 0; ps.manualEmitCount = 0; ps.start(); }
    if (!x) return; const p = x.root.position; this.smoke.emitter = V3(p.x, p.y, p.z); this.smoke.manualEmitCount = 90;
  }
  miasmaFX(x, c) {
    withCtx({ scene: this.scene }, () => { const p = x.root.position, m0 = this.fx('miasma', () => bSph(.7, 18), c, 0, p.x, p.y + 1, p.z);
    this.fade(m0, 800, (m, k) => { m.material.alpha = .4 * Math.sin(k * Math.PI); m.scaling.set(1 + k * .6, 1.4 + k * .4, 1 + k * .6); m.position.y = p.y + 1 + k * .3; });
    this.ringFX(x, c, .5);
    });
  }
  project(v) { const p = B3.Vector3.Project(v, B3.Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), new B3.Viewport(0, 0, this.w, this.h)); return [p.x, p.y]; }
  // perf step 9: no per-frame layout reads — rects are measured after a DOM rebuild / resize / every 0.5 s; units move via transform; --fh/--w only on >1 px change
  placeHud() {
    const field = document.getElementById('field'); if (!field) return;
    // фаза 7, шаг 5: смещение канвас↔поле меряет ResizeObserver (колбэк — после layout кадра), а не вызов после правки DOM;
    // синхронный замер — только для нового поля до первого колбэка и после resize движка (_hm = 0)
    const meas = () => { const fr = field.getBoundingClientRect(), cr = this.cv.getBoundingClientRect(); this._hdx = cr.left - fr.left; this._hdy = cr.top - fr.top; this._hm = 1; };
    if (field !== this._hf) {
      this._hf = field; this._he = {}; for (const el of field.querySelectorAll('.unit[data-uid]')) this._he[el.dataset.uid] = el;
      if (this._hro) this._hro.disconnect();
      if (typeof ResizeObserver !== 'undefined') { this._hro = new ResizeObserver(() => { if (this._hf && this._hf.isConnected) meas.call(this); }); this._hro.observe(field); this._hro.observe(this.cv); }
      this._hm = 0;
    }
    if (!this._hm) meas();
    const M = this.scene.getTransformMatrix(), vp = this._vp || (this._vp = new B3.Viewport(0, 0, 1, 1)), F = this._pf || (this._pf = V3()), Hd = this._ph || (this._ph = V3()), pa = this._pa || (this._pa = V3()), pb = this._pb || (this._pb = V3());
    vp.width = this.w; vp.height = this.h;
    for (const uid in this.units) {
      let el = this._he[uid]; if (!el || !el.isConnected) { el = field.querySelector(`.unit[data-uid="${uid}"]`); if (!el) continue; this._he[uid] = el; }
      const o = this.units[uid], rp = o.root.position, rb = o.boss && this.raid;
      F.set(rp.x, rp.y + (rb ? o.h * .42 : 0), rp.z); Hd.set(F.x, F.y + o.h * (rb ? .58 : 1), F.z);
      B3.Vector3.ProjectToRef(F, B3.Matrix.IdentityReadOnly, M, vp, pa); B3.Vector3.ProjectToRef(Hd, B3.Matrix.IdentityReadOnly, M, vp, pb);
      const fx = pa.x, fy = pa.y, hpx = Math.max(20, fy - pb.y), x = this._hdx + fx, y = this._hdy + fy;
      if (!el._hp) { el._hp = 1; el.style.left = '0px'; el.style.top = '0px'; el._hx = el._hy = NaN; }
      if (!(Math.abs(x - el._hx) < .25 && Math.abs(y - el._hy) < .25)) { el._hx = x; el._hy = y; el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`; }
      if (!(Math.abs(hpx - el._fh) <= 1)) { el._fh = hpx; el.style.setProperty('--fh', hpx + 'px'); el.style.setProperty('--w', Math.max(44, hpx * (o.boss ? .9 : .5)) + 'px'); }
    }
  }
  loop() {
    if (this.lost || !this.alive) return;
    try { this._loop(); } catch (e) { errLog('arena-loop', e); }
  }
  // шаг 6 (было perf step 3, skipFrame): active, пока что-то движется; idle (30 fps) — ждём ввода / диалог / оверлей; static через 1,2 с после результата
  mode(now) {
    if (this.lost || !this.alive) return 'static';
    const bt = typeof BT !== 'undefined' && BT, cv = this.cv;
    const z = cvSize(cv);
    if (!bt || !cv.isConnected || (z.w || innerWidth) !== this.w || (z.h || innerHeight) !== this.h) return 'active';
    const busy = !!(this.cine || this.summons.length || (this.fxq && this.fxq.length) || (this.tr && this.tr.length) || (this.glT && now - this.glT < 1600) || (this.shakeT && now - this.shakeT < 300));
    if (bt.done && !busy) { if (!this.doneT) this.doneT = now; if (now - this.doneT > 1200) return 'static'; } else this.doneT = 0;
    if (!busy) { const ov = document.getElementById('overlay'); if (bt.waiting || bt.done || (typeof DLG !== 'undefined' && DLG && DLG.inBattle) || (ov && ov.childElementCount)) return 'idle'; }
    return 'active';
  }
  _loop() {
    const now = performance.now();
    if (!this.cv.isConnected) { this.dispose(); return; }
    const z = cvSize(this.cv);
    if ((z.w || innerWidth) !== this.w || (z.h || innerHeight) !== this.h) this.resize();
    const t = now / 1000, dt = Math.min(.05, (now - (this.last || now)) / 1000); this.last = now;
    const sp = Math.max(1, this.speed);
    // camera
    const cam = this.camera, sway = Math.sin(t * .13) * 1.1, LK = this.look;
    const pos = this._cp || (this._cp = V3()), look = this._cl || (this._cl = V3()), T1 = this._ct || (this._ct = V3()); pos.set(sway, this.camH + Math.sin(t * .09) * .2, this.camDist); look.copyFrom(LK);
    if (this.shakeT && now - this.shakeT < 300) { const k = 1 - (now - this.shakeT) / 300; pos.x += (Math.random() - .5) * .25 * k; pos.y += (Math.random() - .5) * .25 * k; }
    if (this.glT && now - this.glT < 1600) { const k = Math.sin(Math.min(1, (now - this.glT) / 1600) * Math.PI); T1.set(0, this.camH * .7, this.camDist * .72); B3.Vector3.LerpToRef(pos, T1, k * .5, pos); look.set(LK.x, LK.y + .35, LK.z); if (this.glLight) this.glLight.intensity = 4 * k; }
    else if (this.glLight) this.glLight.intensity = 0;
    let fd = 0;
    if (this.cine) { const C = this.cine, k = (now - C.t0) / C.dur; if (k >= 1) this.cine = null; else { const w = Math.sin(Math.min(1, k) * Math.PI) ** .7 * (C.ult ? .62 : .45), sideX = C.side === 'A' ? -3.5 : 3.5;
      T1.set(C.p.x * .55 + sideX, this.camH * .55 + 1.2, C.p.z + this.camDist * .55); B3.Vector3.LerpToRef(pos, T1, w, pos); T1.set(C.p.x, 1.1, C.p.z); B3.Vector3.LerpToRef(look, T1, w * 1.1, look); fd = w; } }
    cam.position.copyFrom(pos); cam.setTarget(look);
    if (this.pipe && this.pipe.depthOfFieldEnabled) this.pipe.depthOfField.focusDistance = B3.Vector3.Distance(pos, look) * 1000 * (1 + fd * .05);
    // units
    for (const uid in this.units) {
      const o = this.units[uid], r = o.root;
      r.position.copyFrom(o.base);
      if (o.boss) {
        o.body.rotation.z = Math.sin(t * .7) * .05; o.body.rotation.y = Math.sin(t * .45) * .08; o.body.position.y = Math.sin(t * 1.1) * .15;
        if (o.atkT && now - o.atkT < 700 / sp) { const k = (now - o.atkT) / (700 / sp); o.body.rotation.z += Math.sin(k * Math.PI) * .25; o.body.position.x = -Math.sin(k * Math.PI) * 1.4; } else o.body.position.x = 0;
        if (o.dead) { const k = Math.min(1, (now - o.deathT) / 1400); o.body.position.y = -k * 9; }
        for (const m of o.mats) m.emissiveColor.set(o.phaseN >= 4 ? .25 : 0, 0, 0);
      } else {
        if (o.rise && o.dead && now >= o.rise) { o.dead = false; o.rise = now; this.ringFX(o, '#ffd27a', 1.4); this.healFX(o); this.shakeT = now; }
        poseHuman(this, o, now, t, sp);
        const hk = o.hitT && now >= o.hitT ? Math.max(0, 1 - (now - o.hitT) / 260) : 0, hl = o.healT && now >= o.healT ? Math.max(0, 1 - (now - o.healT) / 500) : 0;
        for (const m of o.mats) { const b0 = m._baseEm; m.emissiveColor.set(b0.r + hk * .9 + hl * .05, b0.g + hk * .35 + hl * .5, b0.b + hk * .2 + hl * .1); m.alpha = o.stealth ? .38 : 1; }
        if (o.bubble) o.bubble.material.alpha = o.dead ? 0 : o.shieldK * (.05 + Math.sin(t * 3 + o.phase) * .015) + (hk && o.shieldK ? .18 * hk : 0);
      }
      const rm = o.ring.material, pul = Math.sin(t * 6);
      if (!rm._emOwn) { rm.emissiveColor = rm.emissiveColor.clone(); rm._emOwn = 1; }
      if (o.active && !o.dead) { const c = o.charm ? C3_CHARM : o.tierC || C3_SPICE, k = o.legend ? 3.2 + pul * .8 : 1.9 + pul * .4; c.scaleToRef(k, rm.emissiveColor); rm.alpha = 1; o.ring.scaling.x = o.ring.scaling.z = (o.boss && this.raid ? 1.9 : 1) * (1 + (o.legend ? .08 : .04) * pul); }
      else { rm.emissiveColor.copyFrom(o.tgt ? C3_TGT : o.charm ? C3_CHARM : C3_SPICE); rm.alpha = o.dead ? 0 : o.tgt ? .55 + Math.sin(t * 5) * .2 : o.charm ? .45 : 0; if (!o.boss || !this.raid) o.ring.scaling.x = o.ring.scaling.z = 1; }
      if (o.pool) { const pm = o.pool.material; if (o.active && !o.dead) { if (!pm._emOwn) { pm.emissiveColor = pm.emissiveColor.clone(); pm._emOwn = 1; } (o.charm ? C3_CHARM : o.tierC).scaleToRef(o.legend ? 1.6 : 1, pm.emissiveColor); pm.alpha = o.legend ? .85 + pul * .15 : .55 + pul * .1; } else pm.alpha = 0; }
    }
    // summoned worms (legend ultimates)
    for (const W of this.summons) {
      const k = (now - W.t0) / W.dur;
      if (k < 0) { W.g.setEnabled(false); continue; }
      W.g.setEnabled(true);
      const A = W.arc, rise = A ? Math.max(0, Math.sin(k * Math.PI * 3)) : k < .32 ? 1 - Math.pow(1 - k / .32, 3) : k < .62 ? 1 : Math.max(0, 1 - (k - .62) / .38);
      if (A) { W.g.position.x = A.x0 + (A.x1 - A.x0) * k; W.g.position.z = A.z0 + (A.z1 - A.z0) * k; const e = (k * 3) % 2; if (e < 1 && A.n !== Math.floor(k * 3) && W.burst && A.pc) { A.n = Math.floor(k * 3); W.burst.emitter = V3(W.g.position.x, W.g.position.y + .3, W.g.position.z); W.burst.manualEmitCount = A.pc; W.burst.start(); } }
      W.col.position.y = (-3 + rise * 7) * W.s; W.col.rotation.x = A ? Math.cos(k * Math.PI * 3) * .9 : .42 * rise; W.col.rotation.z = Math.sin(t * 1.7) * .07 * rise; W.mouth.rotation.y = t * .8;
      const open = k < .25 ? .6 + k * 2 : k < .45 ? 1.1 - (k - .25) * 3 : .5; W.mouth.scaling.set(open, 1, open);
      for (const [m, a] of W.rocks) { const e = k < .1 ? k / .1 : k < .7 ? 1 : Math.max(0, 1 - (k - .7) / .3); m.position.set(Math.cos(a) * (2.2 + e * 1.4) * W.s, -.2 + Math.sin(e * Math.PI) * 1.4 * W.s, Math.sin(a) * (2.2 + e * 1.4) * W.s); m.rotation.x += dt * 3; m.setEnabled(e > 0); }
      W.dust.material.alpha = Math.sin(Math.min(1, k * 1.4) * Math.PI) * .55; W.dust.scaling.setAll((1 + k * 2.4) * W.s);
      if (W.victim && k > .2 && !W.hid) { W.hid = true; W.victim.root.setEnabled(false); }
      if (!W.shook && k > .05) { W.shook = true; this.shakeT = now; if (W.burst && !W.arc) W.burst.start(); }
      if (k > 1) { if (this.glow) this.glow.removeExcludedMesh(W.dust); W.g.dispose(false, false); W.done = true; }
    }
    if (this.summons.length) inPlaceKeep(this.summons, W => !W.done);
    if (this.fxq && this.fxq.length) runDue(this.fxq, now);
    if (this.tr && this.tr.length) inPlaceKeep(this.tr, T => { const k = (now - T.t0) / T.life; if (k >= 1) { if (T.mesh._fxk) this.fxFree(T.mesh); else T.mesh.dispose(false, true); return false; } T.upd(T.mesh, k); return true; });
    this.scene.render();
    this.placeHud();
  }
  wormKit(warm) {
    if (this._wk) return this._wk;
    return withCtx({ scene: this.scene, shadows: this.shadows }, () => {
    const WD = wormData(), K = { WD };
    K.skin = mat3('#a88058', { roughness: .9 }); K.band = mat3('#6a4a2e', { roughness: 1 }); K.sand = mat3('#c89058', { flatShading: true });
    if (WD) {
      K.WM = wormMats(WD);
      K.colT = wormMesh(WD.col); K.colT.material = K.WM.skin; K.colT.setEnabled(false);
      K.mouthT = wormMesh(WD.mouth); K.mouthT.material = K.WM.mouth; K.mouthT.setEnabled(false);
    }
    K.tx = glowTex();
    K.dm = basic3('#d8a868', { alpha: 0 }); K.dm.emissiveTexture = K.tx; K.dm.opacityTexture = K.tx; K.dm.disableDepthWrite = true;
    const b = K.burst = new B3.ParticleSystem('burst', 400, CTX.scene); b.particleTexture = K.tx; b.emitter = V3(0, -50, 0);
    b.direction1 = V3(-3, 6, -3); b.direction2 = V3(3, 10, 3); b.gravity = V3(0, -9, 0); b.minLifeTime = .8; b.maxLifeTime = 1.8; b.minSize = .15; b.maxSize = .5;
    b.color1 = new B3.Color4(.9, .7, .45, .9); b.color2 = new B3.Color4(.75, .55, .35, .8); b.colorDead = new B3.Color4(.6, .45, .3, 0); b.blendMode = B3.ParticleSystem.BLENDMODE_STANDARD;
    if (warm && K.WM) { try { K.WM.skin.forceCompilation(K.colT); K.WM.mouth.forceCompilation(K.mouthT); } catch (e) {} }
    return (this._wk = K);
    });
  }
  // «Наездник червя» (пакет 3): малый червь дугой под рядом врагов — нырок, выход, нырок. Профиль: gfx().wormSmall — 0 (LOW) песчаные всплески без меша, иначе доля частиц
  wormSmall(B, now) {
    const cast = B.units.find(x => x.uid === B.actor); if (!cast) return;
    const os = B.units.filter(x => x.side !== cast.side && !x.def.boss).map(x => this.units[x.uid]).filter(Boolean).sort((a, b) => a.base.x - b.base.x);
    if (!os.length) return;
    const q = gfx(this.small).wormSmall;
    if (!q) { os.forEach((o, i) => this.at(now + 250 + i * 160, () => { this.ringFX(o, '#d8a868', 1.1); this.sparkFX(o, 1); })); return; }
    const a = os[0].base, b = os[os.length - 1].base, dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
    const arc = { x0: a.x - ux * 2.5, z0: a.z - uz * 2.5, x1: b.x + ux * 2.5, z1: b.z + uz * 2.5, pc: Math.round(260 * q), n: -1 };
    this.summon(arc.x0, arc.z0, .55, now + 150, null, arc);
  }
  summon(x, z, s, t0, victim, arc) {
    const K = this.wormKit();
    withCtx({ scene: this.scene, shadows: this.shadows }, () => {
    const y = this.heightAt(x, z), g = grp(null, x, y, z); g.setEnabled(false);
    const col = grp(g), WD = K.WD;
    if (WD) { const m = K.colT.clone('wc', col); m.setEnabled(true); m.receiveShadows = true; if (CTX.shadows && K.WM.skin._lit) CTX.shadows.addShadowCaster(m, false); }
    else for (let i = 0; i < 7; i++) { const r = 1.25 - i * .03; add(col, mk(bCyl(r, r + .05, 1.5, 24, true), i % 2 ? K.skin : K.band, 0, -i * 1.5, 0)); }
    const mouth = grp(col, 0, .8, 0);
    if (WD) { const m = K.mouthT.clone('wm', mouth); m.setEnabled(true); }
    else {
    add(mouth, mk(bTorus(1.25, .3, 28), K.skin)).rotation.x = Math.PI / 2;
    add(mouth, mk(bDisc(1.15, 28), K.mdark ||= basic3('#1a0a06', { double: true }), 0, -.3, 0, false)).rotation.x = -Math.PI / 2;
    add(mouth, mk(bSph(.4, 12), K.mglow ||= basic3('#ff8a40'), 0, -.9, 0, false));
    const tm = K.tooth ||= mat3('#efe3c8', { roughness: .45 });
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, tt = add(mouth, mk(bCone(.1, .55, 6), tm, Math.cos(a) * 1.05, .1, Math.sin(a) * 1.05)); tt.rotation.z = Math.cos(a) * .9; tt.rotation.x = -Math.sin(a) * .9; }
    }
    col.scaling.setAll(s);
    const rocks = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, m = add(g, mk(bRock(i + 60, 0), K.sand)); m.scaling.setAll((.45 + (i % 3) * .15) * (arc ? .6 : 1)); rocks.push([m, a]); }
    const dust = add(g, mk(bDisc(3, 32), K.dm, 0, .1, 0, false)); dust.rotation.x = -Math.PI / 2; if (this.glow) this.glow.addExcludedMesh(dust);
    const burst = K.burst; burst.emitter = V3(x, y + .3, z); burst.minEmitBox = V3(-1.2 * s, 0, -1.2 * s); burst.maxEmitBox = V3(1.2 * s, .5, 1.2 * s); burst.manualEmitCount = 380;
    if (arc) g.rotation.y = Math.atan2(arc.x1 - arc.x0, arc.z1 - arc.z0);
    this.summons.push({ g, col, mouth, rocks, dust, s, t0, dur: arc ? 1900 : 2600, victim, burst, arc });
    });
  }
  // dispose — GameScene: scene.dispose + host.forget (канвас уходит предыдущему хосту или паркуется)
}


export { Arena3D };
