// render3d/scenes/base-scene.js — строки 2384–2426 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { BT } from '../../core/state.js';
import { engineHost } from '../engine-host.js';
import { V3, inPlaceKeep } from '../materials.js';
import { B3 } from '../base.js';
import { GameScene } from '../game-scene.js';

// perf step 1: after engine.dispose() (loseContextOnDispose) drop the backbuffer and detach the canvas so iOS frees the context right away
function freeCanvas(cv, keep) { try { if (!cv) return; cv.width = 0; cv.height = 0; if (!keep) cv.remove(); } catch (e) {} }
const LIGHT_SLEEP = () => Math.min(innerWidth, innerHeight) < 600 || matchMedia('(pointer: coarse)').matches; // same test as the former freeStages
const SAVE_LOW = () => { try { return !!JSON.parse(localStorage.getItem('dune-gfx-low') || 'false'); } catch (e) { return false; } };
class Stage3D extends GameScene {
  constructor(opts = {}) {
    // phase 3b: one shared engine/canvas (EngineHost); the stage owns only its scene. Lifecycle — GameScene (wake/sleep/dispose)
    super(engineHost()); this.cls = opts.cls || 'stage3d'; this.maxDpr = opts.maxDpr || 2;
    this.small = Math.min(innerWidth, innerHeight) < 600;
    const E = this.engine;
    const S = this.scene = new B3.Scene(E); S.useRightHandedSystem = true; S.skipPointerMovePicking = true;
    this.camera = new B3.UniversalCamera('cam', V3(0, 1.4, 6), S); this.camera.minZ = .05; this.camera.maxZ = 1200; this.camera.inputs.clear();
    this.parts = []; this.tr = []; this.running = false;
  }
  look(pipeOpts = {}) {
    this._look = { ...pipeOpts, dof: pipeOpts.dof && { ...pipeOpts.dof } }; // for re-creation after a light sleep
    const S = this.scene, P = this.pipe = new B3.DefaultRenderingPipeline('dp', true, S, [this.camera]);
    P.fxaaEnabled = true; P.samples = this.engine.webGLVersion >= 2 && !this.small ? 4 : 1;
    P.bloomEnabled = true; P.bloomThreshold = pipeOpts.bloomT ?? .78; P.bloomWeight = pipeOpts.bloomW ?? .38; P.bloomKernel = 48; P.bloomScale = .5;
    P.imageProcessingEnabled = true; const ip = P.imageProcessing; ip.toneMappingEnabled = true; ip.toneMappingType = B3.ImageProcessingConfiguration.TONEMAPPING_ACES; ip.exposure = pipeOpts.exposure ?? 1.15; ip.contrast = 1.15;
    ip.vignetteEnabled = true; ip.vignetteWeight = pipeOpts.vig ?? 2.2; ip.vignetteColor = new B3.Color4(.06, .03, .015, 0);
    P.grainEnabled = true; P.grain.intensity = 4; P.grain.animated = true;
    const LOW = !!(SAVE_LOW()); if (LOW) { pipeOpts.dof = null; pipeOpts.ssao = 0; }
    if (pipeOpts.dof) { P.depthOfFieldEnabled = true; P.depthOfFieldBlurLevel = this.small ? B3.DepthOfFieldEffectBlurLevel.Low : B3.DepthOfFieldEffectBlurLevel.Medium; P.depthOfField.focalLength = pipeOpts.dof.f || 90; P.depthOfField.fStop = pipeOpts.dof.stop || 1.8; P.depthOfField.focusDistance = pipeOpts.dof.d || 4000; }
    this.glow = new B3.GlowLayer('glow', S, { mainTextureRatio: this.small ? .35 : .5, blurKernelSize: 32 }); this.glow.intensity = pipeOpts.glow ?? .6;
    try { if (pipeOpts.ssao && this.engine.webGLVersion >= 2 && B3.SSAO2RenderingPipeline.IsSupported) { const ao = this.ssao = new B3.SSAO2RenderingPipeline('ssao', S, { ssaoRatio: this.small ? .5 : .75, blurRatio: .5 }, [this.camera], true); ao.radius = pipeOpts.ssao; ao.totalStrength = 1.2; ao.base = .1; ao.samples = this.small ? 8 : 16; ao.maxZ = 60; } } catch (e) {}
  }
  // phase 3b, step 4: light sleep on phones (before a battle, sleepStages) — screen-size targets (post pipeline MSAA, SSAO, glow) are freed while the stage
  // sleeps (iOS reloads the page when GPU memory runs out); scene, meshes, materials and textures stay. Re-created on wake.
  onSleep(o) {
    if (!o.light || !LIGHT_SLEEP() || !this.pipe) return;
    const cams = [this.camera];
    try { if (this.ssao) { this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline('ssao', cams); this.ssao.dispose(true); this.scene.disableGeometryBufferRenderer && this.scene.disableGeometryBufferRenderer(); } } catch (e) {}
    try { this.pipe.dispose(); } catch (e) {} try { this.glow.dispose(); } catch (e) {}
    this.pipe = this.glow = this.ssao = null; this._light = true;
  }
  onWake() { if (this._light) { this._light = false; this.look(this._look || {}); } }
  attach(host, first) { if (host) this.wake(host, { cls: this.cls, dpr: this.maxDpr, first }); }
  isCur() { return this.host.isCur(this); }
  update() {
    if (this.paused()) return;
    if (this.cv.clientWidth !== this.w || this.cv.clientHeight !== this.h) { this.w = this.cv.clientWidth; this.h = this.cv.clientHeight; this.engine.resize(); this.onResize && this.onResize(); }
    const now = performance.now(); this.tick(now, now / 1000);
    if (this.tr.length) inPlaceKeep(this.tr, T => { const k = (now - T.t0) / T.life; if (k >= 1) { T.mesh.dispose(false, true); return false; } T.upd(T.mesh, k); return true; });
    this.scene.render(); this.post && this.post(now);
  }
  paused() { return !!(BT && BT.B); }
  // шаг 6: перекрыта/бой → paused; ресайз и 0,8 с после wake → active; дальше idleMode() подкласса (по умолчанию active — окно героя на 60)
  mode(now) {
    if (this.paused()) return 'paused';
    if (this.cv.clientWidth !== this.w || this.cv.clientHeight !== this.h || now - (this.wakeT || 0) < 800) return 'active';
    return this.idleMode ? this.idleMode(now) : 'active';
  }
  fade(mesh, life, upd) { this.tr.push({ mesh, t0: performance.now(), life, upd }); }
}


export { freeCanvas, SAVE_LOW, Stage3D };
