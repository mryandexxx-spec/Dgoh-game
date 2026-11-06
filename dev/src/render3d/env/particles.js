// render3d/env/particles.js — строки 1391–1417 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './props.js'; // порядок исполнения
import { glowTex } from '../geometry.js';
import { V3, col3 } from '../materials.js';
import { CTX } from '../ctx.js';
import { B3 } from '../base.js';

function addParticles3(A, type) {
  const tex = glowTex();
  const cfg = {
    sand:  { n: 650, box: [[-36, 0, -27], [36, 3.5, 15]], dir: [[2.2, -.05, -.4], [4, .25, .4]], life: [5, 9], size: [.06, .14], col: '#f0d0a0', a: .75, add: false },
    storm: { n: 2600, box: [[-40, 0, -31], [-20, 14, 19]], dir: [[12, -.5, -1], [17, 1, 1]], life: [3, 5], size: [.12, .32], col: '#e0b07a', a: .7, add: false },
    rain:  { n: 1600, box: [[-35, 24, -31], [35, 26, 19]], dir: [[-2, -20, 0], [-1.5, -17, 0]], life: [1.2, 1.5], size: [.05, .08], col: '#c8d8e0', a: .7, add: false, stretch: 1 },
    ember: { n: 420, box: [[-40, 0, -31], [40, 2, 19]], dir: [[-.3, .8, -.3], [.3, 1.8, .3]], life: [6, 14], size: [.08, .2], col: '#ff7a3a', a: .9, add: true },
    dust:  { n: 260, box: [[-35, 0, -26], [35, 4, 14]], dir: [[-.15, -.05, -.15], [.15, .08, .15]], life: [8, 16], size: [.06, .14], col: '#ffd9a0', a: .5, add: true },
  }[type];
  if (cfg) {
    const ps = new B3.ParticleSystem(type, cfg.n, CTX.scene); ps.particleTexture = tex; ps.emitter = V3(0, 0, 0);
    ps.minEmitBox = V3(...cfg.box[0]); ps.maxEmitBox = V3(...cfg.box[1]); ps.direction1 = V3(...cfg.dir[0]); ps.direction2 = V3(...cfg.dir[1]);
    ps.minEmitPower = ps.maxEmitPower = 1; ps.minLifeTime = cfg.life[0]; ps.maxLifeTime = cfg.life[1]; ps.minSize = cfg.size[0]; ps.maxSize = cfg.size[1];
    const c = col3(cfg.col); ps.color1 = new B3.Color4(c.r, c.g, c.b, cfg.a); ps.color2 = new B3.Color4(c.r, c.g, c.b, cfg.a * .6); ps.colorDead = new B3.Color4(c.r, c.g, c.b, 0);
    ps.emitRate = cfg.n / ((cfg.life[0] + cfg.life[1]) / 2); ps.blendMode = cfg.add ? B3.ParticleSystem.BLENDMODE_ADD : B3.ParticleSystem.BLENDMODE_STANDARD;
    if (cfg.stretch) ps.billboardMode = B3.ParticleSystem.BILLBOARDMODE_STRETCHED;
    ps.preWarmCycles = 120; ps.preWarmStepOffset = 5; ps.start(); A.parts.push(ps);
  }
  for (const pl of A.plumes || []) {
    const ps = new B3.ParticleSystem('plume', 140, CTX.scene); ps.particleTexture = tex; ps.emitter = V3(pl.x, pl.y, pl.z);
    ps.minEmitBox = V3(-1.5, 0, -1.5); ps.maxEmitBox = V3(1.5, 0, 1.5); ps.direction1 = V3(.1, 2.2, -.2); ps.direction2 = V3(.6, 3, .2);
    ps.minLifeTime = 7; ps.maxLifeTime = 11; ps.emitRate = 14; ps.minSize = 4; ps.maxSize = 8; ps.addSizeGradient(0, 4, 6); ps.addSizeGradient(1, 14, 20);
    ps.color1 = new B3.Color4(.85, .4, .17, .18); ps.color2 = new B3.Color4(.95, .55, .25, .12); ps.colorDead = new B3.Color4(.6, .3, .15, 0);
    ps.blendMode = B3.ParticleSystem.BLENDMODE_STANDARD; ps.preWarmCycles = 200; ps.preWarmStepOffset = 5; ps.start(); A.parts.push(ps);
  }
}


export { addParticles3 };
