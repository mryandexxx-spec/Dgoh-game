// render3d/scenes/base-scene.js — строки 2384–2426 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { BT } from '../../core/state.js';
import { engineHost } from '../engine-host.js';
import { V3, inPlaceKeep } from '../materials.js';
import { B3, cvSize } from '../base.js';
import { GameScene } from '../game-scene.js';
import { gfx, SAVE_LOW, dofOn, glowOnly } from '../quality.js';

// perf step 1: after engine.dispose() (loseContextOnDispose) drop the backbuffer and detach the canvas so iOS frees the context right away
function freeCanvas(cv, keep) { try { if (!cv) return; cv.width = 0; cv.height = 0; if (!keep) cv.remove(); } catch (e) {} }
// фаза 6, шаг 2: DepthRenderer (для DoF) создаётся под размер канваса на момент создания, а канвас общий и переезжает между хостами —
// у окна героя глубина считалась в размере лагеря (×8 пикселей), у лагеря — 300×150 (канвас до монтирования). Пока только уменьшаем (вид лагеря v58 держится на грубой глубине; grow — после согласования A/B).
function fitDepth(scene, grow = false) { const D = scene._depthRenderer, E = scene.getEngine(); if (!D) return; const w = E.getRenderWidth(), h = E.getRenderHeight();
  for (const k in D) { const m = D[k] && D[k].getDepthMap && D[k].getDepthMap(); if (!m) continue; const z = m.getSize(); if (z.width * z.height > w * h || (grow && (z.width !== w || z.height !== h))) m.resize({ width: w, height: h }); } }
class Stage3D extends GameScene {
  constructor(opts = {}) {
    // phase 3b: one shared engine/canvas (EngineHost); the stage owns only its scene. Lifecycle — GameScene (wake/sleep/dispose)
    super(engineHost()); this.cls = opts.cls || 'stage3d'; this.kind = opts.kind || 'hero'; // kind — ключ dpr/probe в профиле графики
    this.small = Math.min(innerWidth, innerHeight) < 600;
    const E = this.engine;
    const S = this.scene = new B3.Scene(E); S.useRightHandedSystem = true; S.skipPointerMovePicking = true;
    this.camera = new B3.UniversalCamera('cam', V3(0, 1.4, 6), S); this.camera.minZ = .05; this.camera.maxZ = 1200; this.camera.inputs.clear();
    this.parts = []; this.tr = []; this.running = false;
  }
  look(pipeOpts = {}) {
    this._look = { ...pipeOpts, dof: pipeOpts.dof && { ...pipeOpts.dof } }; // for re-creation after a light sleep
    const Q = gfx(this.small), S = this.scene, P = this.pipe = new B3.DefaultRenderingPipeline('dp', true, S, [this.camera]);
    P.fxaaEnabled = true; P.samples = this.engine.webGLVersion >= 2 ? Q.msaa : 1;
    P.bloomEnabled = Q.bloom; P.bloomThreshold = pipeOpts.bloomT ?? .78; P.bloomWeight = pipeOpts.bloomW ?? .38; P.bloomKernel = 48; P.bloomScale = .5;
    P.imageProcessingEnabled = true; const ip = P.imageProcessing; ip.toneMappingEnabled = true; ip.toneMappingType = B3.ImageProcessingConfiguration.TONEMAPPING_ACES; ip.exposure = pipeOpts.exposure ?? 1.15; ip.contrast = 1.15;
    ip.vignetteEnabled = true; ip.vignetteWeight = pipeOpts.vig ?? 2.2; ip.vignetteColor = new B3.Color4(.06, .03, .015, 0);
    P.grainEnabled = Q.grain; P.grain.intensity = 4; P.grain.animated = true;
    if (!dofOn(Q, this.kind)) pipeOpts.dof = null; if (!Q.ssao) pipeOpts.ssao = 0;
    if (pipeOpts.dof) { P.depthOfFieldEnabled = true; P.depthOfFieldBlurLevel = Q.dofBlur === 'low' ? B3.DepthOfFieldEffectBlurLevel.Low : B3.DepthOfFieldEffectBlurLevel.Medium; P.depthOfField.focalLength = pipeOpts.dof.f || 90; P.depthOfField.fStop = pipeOpts.dof.stop || 1.8; P.depthOfField.focusDistance = pipeOpts.dof.d || 4000; }
    if (Q.glow) {
      this.glow = new B3.GlowLayer('glow', S, { mainTextureRatio: Q.glowRatio, blurKernelSize: Q.glowKernel });
      this.glow.intensity = pipeOpts.glow ?? .6;
      if (Q.glowSel) glowOnly(this.glow, [this.sky, this.bg, this.ground]);
      // A light-sleep recreates the layer after authored meshes already exist.
      // Keep Duncan's baked-albedo fill out of GlowLayer even after wake,
      // including HIGH where glowOnly's selective path is not enabled.
      for (const mesh of S.meshes) if (mesh.metadata?.duncanNoGlow) this.glow.addExcludedMesh(mesh);
    }
    try { if (pipeOpts.ssao && this.engine.webGLVersion >= 2 && B3.SSAO2RenderingPipeline.IsSupported) { const ao = this.ssao = new B3.SSAO2RenderingPipeline('ssao', S, { ssaoRatio: Q.ssaoRatio, blurRatio: .5 }, [this.camera], true); ao.radius = pipeOpts.ssao; ao.totalStrength = 1.2; ao.base = .1; ao.samples = Q.ssaoSamples; ao.maxZ = 60; } } catch (e) {}
  }
  // phase 3b, step 4: light sleep on phones (before a battle, sleepStages) — screen-size targets (post pipeline MSAA, SSAO, glow) are freed while the stage
  // sleeps (iOS reloads the page when GPU memory runs out); scene, meshes, materials and textures stay. Re-created on wake.
  onSleep(o) {
    if (!o.light || !this.pipe) return;   // фаза 6, шаг 2: и на desktop (в бою три сцены держали ≈ 310 МБ RT)
    const cams = [this.camera];
    try { if (this.ssao) { this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline('ssao', cams); this.ssao.dispose(true); this.scene.disableGeometryBufferRenderer && this.scene.disableGeometryBufferRenderer(); } } catch (e) {}
    try { this.pipe.dispose(); } catch (e) {} try { this.glow && this.glow.dispose(); } catch (e) {}
    this.pipe = this.glow = this.ssao = null; this._light = true;
  }
  onWake() { cvSize(this.cv, true); if (this._light) { this._light = false; this.look(this._look || {}); } fitDepth(this.scene); }
  attach(host, first) { if (host) this.wake(host, { cls: this.cls, dpr: gfx(this.small).dpr[this.kind], first }); }
  isCur() { return this.host.isCur(this); }
  update() {
    if (this.paused()) return;
    const z = cvSize(this.cv);
    if (z.w !== this.w || z.h !== this.h) { this.w = z.w; this.h = z.h; this.engine.resize(); fitDepth(this.scene); this.onResize && this.onResize(); }
    const now = performance.now(); this.tick(now, now / 1000);
    if (this.tr.length) inPlaceKeep(this.tr, T => { const k = (now - T.t0) / T.life; if (k >= 1) { T.mesh.dispose(false, true); return false; } T.upd(T.mesh, k); return true; });
    this.scene.render(); this.post && this.post(now);
  }
  paused() { return !!(BT && BT.B); }
  // шаг 6: перекрыта/бой → paused; ресайз и 0,8 с после wake → active; дальше idleMode() подкласса (по умолчанию active — окно героя на 60)
  mode(now) {
    if (this.paused()) return 'paused';
    const z = cvSize(this.cv);
    if (z.w !== this.w || z.h !== this.h || now - (this.wakeT || 0) < 800) return 'active';
    return this.idleMode ? this.idleMode(now) : 'active';
  }
  fade(mesh, life, upd) { this.tr.push({ mesh, t0: performance.now(), life, upd }); }
}


export { fitDepth, freeCanvas, SAVE_LOW, Stage3D };
