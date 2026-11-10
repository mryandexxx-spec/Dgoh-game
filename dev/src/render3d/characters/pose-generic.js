// render3d/characters/pose-generic.js — строки 1666–1738 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { MOCAP_OK, clearQ, layerClip } from './mocap.js';
import { seg } from './pose-duncan.js';
import './procedural.js'; // порядок исполнения
import { V3, addScaled } from '../materials.js';
import { B3 } from '../base.js';
import { poseModelClip } from './authored.js';

const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
const ANIM_SLOW = 1.5;   // ability animations at x1 are 1.5× slower than the original timing
// melee/aoe actions: travel phases are stretched by distance; map real progress to the canonical .34/.6 timeline
const remapK = (k, a) => !a || !a.f1 || k >= 1 ? k : k <= a.f1 ? k / a.f1 * .34 : k <= a.f2 ? .34 + (k - a.f1) / (a.f2 - a.f1) * .26 : .6 + (k - a.f2) / (1 - a.f2) * .4;
const unmapK = (c, a) => !a || !a.f1 ? c : c <= .34 ? c / .34 * a.f1 : c <= .6 ? a.f1 + (c - .34) / .26 * (a.f2 - a.f1) : a.f2 + (c - .6) / .4 * (1 - a.f2);
const lerpN = (a, b, k) => a + (b - a) * k;
const STANCE = { guard: [-.35, -.5, -.25, -.45], gun: [-.28, -.55, -.12, -.35], shield: [-.5, -.8, -.95, -1.15], open: [-.25, -.4, -.25, -.4] };
function poseHuman(A, o, now, t, sp) {
  if (o.anim && o.anim.pose) return o.anim.pose(A, o, now, t, sp);
  if (o._rig) clearQ(o);
  const ph = o.phase, br = Math.sin(t * 2 + ph);
  const pos = o._pp || (o._pp = V3()); pos.copyFrom(o.base); let yaw = o.face, hipY = br * .008, hipX = Math.sin(t * .6 + ph) * .015, lean = .04 + br * .012, twist = 0, headX = 0, headY = Math.sin(t * .37 + ph) * .14;
  const st = STANCE[o.stance] || STANCE.gun;
  let rS = st[0] + Math.sin(t * 1.3 + ph) * .04, rE = st[1], lS = st[2] + Math.sin(t * 1.1 + ph + 1) * .04, lE = st[3], rZ = 0, lZ = 0;
  let lx = 0, rx = 0, lk = .06, rk = .06, gait = 0;
  if (o.active && !o.dead) { hipY += -.03 + Math.abs(Math.sin(t * 5)) * .02; lk = rk = .25; lean += .06; }
  // ---- action ----
  const a = o.act;
  if (a && !o.dead) {
    const k = remapK((now - a.t0) / a.dur, a);
    if (k >= 1) o.act = null;
    else {
      const face = Math.atan2(a.dir.x, a.dir.z);
      if (a.kind === 'melee' || a.kind === 'aoe') {
        if (k < .34) { const e = ease(ease(k / .34) * .35 + k / .34 * .65); B3.Vector3.LerpToRef(o.base, a.to, e, pos); gait = B3.Vector3.Distance(o.base, pos) * 3.2; yaw = face; lean += .25 * Math.sin(Math.min(1, k / .34) * Math.PI) + .1; rS = -.4; rE = -.6; }
        else if (k < .6) {
          const s = (k - .34) / .26; pos.copyFrom(a.to); yaw = face;
          if (a.kind === 'aoe') { yaw = face + ease(s) * Math.PI * 2; rS = -1.5; rE = -.1; rZ = -.6; lean += .15; lk = rk = .35; }
          else if (s < .38) { const e = ease(s / .38); rS = lerpN(-.4, -2.7, e); rE = lerpN(-.6, -.25, e); twist = -.45 * e; lean -= .08 * e; lk = .3; }
          else { const e = ease((s - .38) / .3); rS = lerpN(-2.7, .35, e); rE = lerpN(-.25, -.15, e); twist = lerpN(-.45, .5, e); lean += .3 * e; lk = .45; rk = .15; }
          if (!a.fx && s > .45) { a.fx = 1; A.slashFX(a.to.add(a.dir.scale(.8)), face, a.kind === 'aoe'); }
        } else { const e = ease(ease((k - .6) / .4) * .35 + (k - .6) / .4 * .65); B3.Vector3.LerpToRef(a.to, o.base, e, pos); gait = -B3.Vector3.Distance(a.to, pos) * 3.2; yaw = e < .7 ? face : lerpN(face, o.face, (e - .7) / .3); rS = lerpN(.35, st[0], e); rE = lerpN(-.15, st[1], e); twist = .5 * (1 - e); lean += .1 * (1 - e); }
      } else if (a.kind === 'shoot') {
        yaw = k < .85 ? face : lerpN(face, o.face, (k - .85) / .15);
        const up = k < .25 ? ease(k / .25) : k < .75 ? 1 : 1 - ease((k - .75) / .25);
        const lu = o.root._staff ? 0 : up * .8; rS = lerpN(st[0], -1.55, up); rE = lerpN(st[1], -.05, up); lS = lerpN(st[2], -1.3, lu); lE = lerpN(st[3], -.5, lu); lZ = -.35 * lu; headX = .08 * up;
        const rec = k > .35 && k < .5 ? Math.sin((k - .35) / .15 * Math.PI) : 0; lean -= .12 * rec; rS += .35 * rec; addScaled(pos, a.dir, -.08 * rec);
        if (!a.fx && k > .35) { a.fx = 1; A.muzzleFX(o, a); }
      } else if (a.kind === 'voice') {
        yaw = face; const up = Math.sin(Math.min(1, k / .8) * Math.PI); lean += .22 * up; headX = .15 * up; rS = lerpN(st[0], -1.3, up); lS = lerpN(st[2], -1.3, up); rZ = .5 * up; lZ = -.5 * up; rE = lE = -.15;
        if (!a.fx && k > .3) { a.fx = 1; A.voiceFX(o, a); }
      } else {
        const up = Math.sin(Math.min(1, k) * Math.PI); rS = lerpN(st[0], -2.85, up); lS = lerpN(st[2], -2.85, up); rE = lE = -.2; rZ = .25 * up; lZ = -.25 * up; headX = -.25 * up; hipY += .08 * Math.sin(Math.min(1, k / .5) * Math.PI); lk = rk = .3 * (1 - up);
        if (!a.fx && k > .25) { a.fx = 1; A.castFX(o); }
      }
    }
  }
  // ---- gait ----
  if (gait) { const p = gait; lx = Math.sin(p) * .65; rx = -lx; lk = Math.max(.05, Math.sin(p + 1.3)) * .95; rk = Math.max(.05, Math.sin(p + 1.3 + Math.PI)) * .95; hipY += Math.abs(Math.cos(p)) * .035 - .02; if (o.act && o.act.kind !== 'aoe') { lS += rx * .5; } }
  // ---- hit reaction (delayed to the moment of impact) ----
  if (o.hitT && now >= o.hitT && !o.dead) { const k = (now - o.hitT) / (340 / Math.min(sp, 2)); if (k < 1) { const s = Math.sin(k * Math.PI) * (o.hitCrit ? 1.6 : 1); lean -= .32 * s; headX -= .3 * s; if (o.hitDir) addScaled(pos, o.hitDir, .18 * s); else pos.x += (o.side === 'A' ? -1 : 1) * .18 * s; lk = rk = Math.max(lk, .35 * s); rS += .3 * s; lS += .3 * s; } }
  if (o.healT && now >= o.healT) { const k = (now - o.healT) / 600; if (k < 1) { const s = Math.sin(k * Math.PI); lS -= .5 * s; rZ += .2 * s; lZ -= .2 * s; headX -= .15 * s; } }
  // ---- death ----
  let fall = 0, fallZ = 0;
  if (o.dead && now >= o.deathT) { const k = Math.min(1, (now - o.deathT) / 950); const e1 = ease(k / .4), e2 = ease((k - .35) / .65); lk = rk = 1.25 * e1 * (1 - e2 * .6); hipY -= .33 * e1 - .2 * e2; lean += .35 * e1 - .2 * e2; rS = lerpN(rS, -.3, e1); lS = lerpN(lS, -.3, e1); headX += .3 * e1; fall = -e2 * Math.PI / 2 * .95; fallZ = -e2 * .45; }
  // ---- apply ----
  o.root.position.copyFrom(pos); if (o.float) o.root.position.y += o.float + Math.sin(t * 1.6 + ph) * .03;
  o.root.rotation.y = yaw;
  o.body.rotation.set(fall, 0, 0); o.body.position.set(0, 0, fallZ); o.body.scaling.y = 1;
  o.hips.position.set(hipX, (o.hipY0 || .95) + hipY, 0); o.hips.rotation.y = twist * .25;
  o.spine.rotation.set(lean, twist, 0); o.spine.scaling.y = 1 + br * .006;
  o.head.rotation.set(headX, headY, 0);
  o.LL.hip.rotation.x = -lx - (o.dead ? 0 : lk * .45); o.LL.knee.rotation.x = lk; o.LL.ank.rotation.x = -lk * .5 + lx * .3;
  o.LR.hip.rotation.x = -rx - (o.dead ? 0 : rk * .45); o.LR.knee.rotation.x = rk; o.LR.ank.rotation.x = -rk * .5 + rx * .3;
  o.R.sh.rotation.set(rS, 0, .12 + rZ); o.R.el.rotation.x = rE; o.Lf.sh.rotation.set(lS, 0, -.12 + lZ); o.Lf.el.rotation.x = lE;
  if (o.skirt) o.skirt.rotation.x = (-(lx + rx) * .3 - (lk + rk) * .12) + lean * -.2;
  if (o.root._cape) o.root._cape.rotation.x = .12 + Math.abs(gait ? Math.sin(gait) : 0) * .25 + Math.max(0, -lean) * .5;
  // BH4: three skinned cloth joints from the authored rig (not procedural cape plane).
  // Small delayed sway keeps the long coat from behaving like rigid armor.
  if (o.capeB && o.capeB.length === 3) {
    const sway = Math.sin(t * 1.4 + ph) * .05 + Math.sin(t * .73 + ph) * .025;
    const motion = (gait ? Math.sin(gait) * .12 : 0) + (o.act ? .12 : 0) + sway;
    o.capeB[0].rotation.x = motion * .45;
    o.capeB[1].rotation.x = motion * .7;
    o.capeB[2].rotation.x = motion;
  }
  if (MOCAP_OK && o.anim && o.anim.slash && a && o.act && a.kind === 'melee' && !o.dead) {      // motion-captured sword cut in the strike phase
    const k = remapK((now - a.t0) / a.dur, a), w = seg(k, .22, .3) * (1 - seg(k, .66, .74));
    if (w > 0) layerClip(o, 'slash', .14 + (k - .26) / .44 * .68, w);
  }
  poseModelClip(o, now, t, sp);
}


export { ease, ANIM_SLOW, remapK, unmapK, lerpN, STANCE, poseHuman };
