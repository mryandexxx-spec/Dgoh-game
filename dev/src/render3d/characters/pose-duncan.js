// render3d/characters/pose-duncan.js — строки 2196–2332 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { MOCAP_OK, addRotX, clearQ, layerClip, mocap } from './mocap.js';
import '../scenes/arena.js'; // порядок исполнения
import { ease, lerpN } from './pose-generic.js';
import { V3, addScaled } from '../materials.js';
import { B3 } from '../base.js';

// ===================== hand-authored animation sets for Blender heroes =====================
// A pose function replaces the generic poseHuman for that hero: idle, every ability, hits, death, revive, showcase.
const ANIM3 = {};
const smooth01 = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
const seg = (k, a, b) => smooth01((k - a) / (b - a));
// keyframe helper: kf(k, [[t0, v0], [t1, v1], ...]) with smooth interpolation
function kf(k, keys) {
  if (k <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (k <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i], e = smooth01((k - t0) / (t1 - t0)); return v0 + (v1 - v0) * e; }
  return keys[keys.length - 1][1];
}
// Normalized right-hand speed peaks in the source GLB. Play 3 + 2 + 3
// contacts, retaining time for the approach and the final recovery.
const DUNCAN_COMBO = [
  { start: 0, end: .36, clip: 'Triple_Combo_Attack', contacts: [.17, .34, .51] },
  { start: .36, end: .64, clip: 'Double_Combo_Attack', contacts: [.22, .41] },
  { start: .64, end: 1, clip: 'Triple_Combo_Attack', contacts: [.17, .34, .51] }
];
const DUNCAN_CONTACTS = DUNCAN_COMBO.flatMap(part =>
  part.contacts.map(u => part.start + u * (part.end - part.start)));
ANIM3.duncan = {
  dur: key => (MOCAP_OK ? { basic: 1900, special: 1200, ult: 3200 } : { basic: 1150, special: 1200, ult: 2000 })[key] || null,
  hit: key => (MOCAP_OK ? { basic: .42, ult: .82 } : { basic: .58, ult: .82 })[key] || null,
  wait: key => (MOCAP_OK ? { basic: 2000, special: 1250, ult: 3350 } : { basic: 1250, special: 1150, ult: 2150 })[key] || 0,
  pose: poseDuncan,
};
function poseDuncan(A, o, now, t, sp) {
  clearQ(o);
  let actK = -1, actKey = null, patW = 0, hitS = 0;
  const ph = o.phase || 0, br = Math.sin(t * 1.7 + ph), sway = Math.sin(t * .5 + ph), show = !!A.showcase;
  const pos = o._pp || (o._pp = V3()); pos.copyFrom(o.base); let yaw = o.face, hipY = br * .006 - .02, hipX = sway * .018, lean = .07 + br * .01, twist = sway * .05, headX = -.03 + br * .01, headY = Math.sin(t * .37 + ph) * .1;
  // battle idle: two-handed guard, blade raised at 45° — calm breathing and a slow weight shift
  let rS = -.6 + br * .03, rE = -1.0 + br * .02, rZ = .06, lS = -.66 + br * .03, lE = -1.12, lZ = .56, hx = .75, hy = 0, hz = 0, lk = .16, rk = .1, lx = -.14, rx = .12, gait = 0, capeKick = 0;
  if (show) {   // showcase: relaxed, blade low in the right hand
    rS = -.12 + br * .02; rE = -.32; rZ = .1; lS = .05 + br * .02; lE = -.25; lZ = -.05; hx = 1.25; lk = .05; rk = .12; lx = -.05; rx = .08; lean = .03;
    // every ~8 s: pats the dust off the chest and shoulder, then shakes the cape
    const cyc = 8.5, c0 = ((t + ph) % cyc), k = c0 / 2.6;
    if (k < 1) {
      const pat = Math.sin(k * Math.PI * 9) * .5 + .5, inA = seg(k, 0, .12) * (1 - seg(k, .62, .75)); patW = seg(k, 0, .1) * (1 - seg(k, .7, .8));
      lS = kf(k, [[0, lS], [.12, -.42], [.38, -.42], [.44, -.75], [.62, -.75], [.75, lS]]); lE = kf(k, [[0, lE], [.12, -2.15], [.38, -2.1], [.44, -1.95], [.62, -1.95], [.75, lE]]) + pat * .25 * inA; lZ = kf(k, [[0, lZ], [.12, .72], [.38, .72], [.44, 1.08], [.62, 1.05], [.75, lZ]]);
      headX = kf(k, [[0, headX], [.1, .32], [.4, .3], [.46, .2], [.62, .22], [.75, -.03]]); headY = kf(k, [[0, headY], [.4, -.1], [.46, .45], [.62, .4], [.75, headY]]);
      twist += Math.sin(k * Math.PI * 14) * .12 * seg(k, .75, .8) * (1 - seg(k, .95, 1)); capeKick = Math.sin(k * Math.PI * 7) * .5 * seg(k, .74, .8) * (1 - seg(k, .96, 1));
      if (inA > .5 && A.dustFX) { const slot = Math.floor(k * 9 * 2); if (slot !== o._dustSlot && pat > .9) { o._dustSlot = slot; A.dustFX(o, k < .42 ? 'chest' : 'shoulder'); } }
      if (k > .76 && k < .8 && A.dustFX && o._dustShake !== Math.floor((t + ph) / cyc)) { o._dustShake = Math.floor((t + ph) / cyc); A.dustFX(o, 'cape'); }
    }
  } else {
    // in battle: every few seconds a short sword twirl
    const cyc = 6.5, k = (((t + ph * 3) % cyc) - 4.8) / 1.1;
    if (k > 0 && k < 1 && !o.act) { hy = Math.sin(k * Math.PI) * 1.2; hz = Math.sin(k * Math.PI * 2) * .9; rE += Math.sin(k * Math.PI) * .35; }
  }
  if (o.active && !o.dead) { hipY -= .02 + Math.abs(Math.sin(t * 4)) * .012; lk = rk = .3; lean += .06; hx = .6; }
  // ---- abilities ----
  const a = o.act;
  if (a && !o.dead) {
    const k = (now - a.t0) / a.dur, face = Math.atan2(a.dir.x, a.dir.z), D = o.def, key = a.ab === D.special ? 'special' : a.ab === D.ult ? 'ult' : 'basic';
    if (k < 1) { actK = k; actKey = key; }
    if (k >= 1) o.act = null;
    else if (key === 'basic') {
      // «Клинок гинацца»: dash, diagonal cut, backhand rising cut, back to guard
      const go = seg(k, 0, .26), back = seg(k, .72, 1);
      B3.Vector3.LerpToRef(o.base, a.to, go * (1 - back), pos); gait = (go < 1 ? go : 1 - back) * 7; yaw = back > .6 ? face + (o.face - face) * (back - .6) / .4 : face;
      rS = kf(k, [[0, rS], [.26, -2.5], [.44, .25], [.6, -2.0], [.74, -2.0], [1, -.6]]); rE = kf(k, [[0, rE], [.26, -.55], [.44, -.15], [.6, -.35], [1, -1]]);
      rZ = kf(k, [[0, rZ], [.26, .35], [.44, -.65], [.6, .55], [.8, .2], [1, .06]]); hx = kf(k, [[0, hx], [.26, .3], [.44, 1.35], [.6, .3], [1, .75]]);
      twist = kf(k, [[0, twist], [.26, -.45], [.44, .55], [.6, -.5], [.85, 0], [1, twist]]); lean += kf(k, [[0, 0], [.26, .1], [.44, .32], [.6, .12], [1, 0]]);
      lS = kf(k, [[0, lS], [.26, -1.0], [.44, -.2], [.6, -.9], [1, -.66]]); lZ = kf(k, [[0, lZ], [.3, .2], [.6, .25], [1, .56]]); lE = kf(k, [[0, lE], [.3, -.6], [1, -1.12]]);
      lk = kf(k, [[0, lk], [.3, .35], [.44, .5], [.6, .35], [1, .16]]); rk = kf(k, [[0, rk], [.44, .15], [1, .1]]); capeKick = go * (1 - back) * .6;
      if (!a.f1 && k > .38) { a.f1 = 1; A.slashFX(a.to.add(a.dir.scale(.8)), face, false); }
      if (!a.f2 && k > .55) { a.f2 = 1; A.slashFX(a.to.add(a.dir.scale(.8)), face + Math.PI, false); }
    } else if (key === 'special') {
      // «Стойка мастера меча»: salute with the blade before the face, spin the hilt, drop into a wide low stance
      yaw = face * .3 + o.face * .7;
      rS = kf(k, [[0, rS], [.25, -1.35], [.55, -1.35], [.72, -.9], [1, -.6]]); rE = kf(k, [[0, rE], [.25, -1.45], [.55, -1.45], [.72, -.7], [1, -1]]);
      rZ = kf(k, [[0, rZ], [.25, -.25], [.55, -.25], [.72, .2], [1, .06]]); hx = kf(k, [[0, hx], [.25, -.05], [.55, -.05], [.72, 1.4], [1, .75]]);
      hy = kf(k, [[0, 0], [.3, 0], [.5, Math.PI * 2], [1, Math.PI * 2]]) % (Math.PI * 2);
      lS = kf(k, [[0, lS], [.25, -1.2], [.55, -1.2], [.72, -.35], [1, -.66]]); lE = kf(k, [[0, lE], [.25, -1.4], [.72, -.5], [1, -1.12]]); lZ = kf(k, [[0, lZ], [.25, .45], [.72, -.3], [1, .56]]);
      headX = kf(k, [[0, headX], [.25, .12], [.55, .12], [.72, -.08], [1, -.03]]);
      const low = seg(k, .58, .72) * (1 - seg(k, .9, 1)); lk = rk = .16 + low * .45; lx = -.14 - low * .32; rx = .12 + low * .32; hipY -= low * .1; lean += low * .15; capeKick = low * .8;
      if (!a.fx && k > .3) { a.fx = 1; A.castFX(o); }
    } else {
      // «Восемь против одного»: leap in, eight spinning cuts, overhead finisher, back to the line
      const go = seg(k, 0, .14), back = seg(k, .86, 1), fl = (k - .14) / .6;
      B3.Vector3.LerpToRef(o.base, a.to, go * (1 - back), pos); pos.y += Math.sin(go * Math.PI) * .45 * (1 - back) + (k > .74 && k < .86 ? Math.sin((k - .74) / .12 * Math.PI) * .6 : 0);
      gait = go < 1 ? go * 6 : (1 - back) * 6; yaw = face; capeKick = .9 * go * (1 - back);
      if (fl >= 0 && fl < 1) {
        const n = Math.min(7, Math.floor(fl * 8)), s = fl * 8 - n, dir = n % 2 ? -1 : 1, e = smooth01(s);
        yaw = face + Math.PI * 2 * (n + e) / 8 * .5 * (n % 4 < 2 ? 1 : -1);
        rS = dir > 0 ? -2.3 + 2.5 * e : .2 - 2.5 * e; rZ = dir > 0 ? .5 - 1.1 * e : -.6 + 1.1 * e; rE = -.3; hx = 1.1; twist = dir * (-.5 + e); lean += .22; lk = .45; rk = .3;
        lS = -.4 + dir * .3; lZ = .2; lE = -.5;
        if (!MOCAP_OK && o._ultStrike !== a.t0 + n && s > .45) { o._ultStrike = a.t0 + n; A.slashFX(a.to.add(a.dir.scale(.8)), face + n * .8, n === 7); for (const tg of a.tg || []) if (A.sparkFX) A.sparkFX(tg, 1); }
      } else if (k >= .74 && k < .86) {
        const e = seg(k, .74, .82); rS = -3.0 + 3.4 * e; rE = -.2; rZ = 0; hx = .4 + 1.1 * e; lS = -2.9 + 3.2 * e; lZ = .45; lE = -.3; lean += .45 * e; headX = .2 * e; lk = rk = .5 * e;
        if (!MOCAP_OK && !a.fin && k > .8) { a.fin = 1; A.slashFX(a.to.add(a.dir.scale(.6)), face, true); if (A.shakeT !== undefined) A.shakeT = performance.now(); }
      } else if (k < .14) { rS = -1.6; rE = -.8; rZ = .4; hx = .6; lS = -1.2; lZ = .4; }
      else { const e = back; rS = .4 + (-.6 - .4) * e; rE = -.3 + (-1 + .3) * e; hx = 1.5 - .75 * e; lS = .2 - .86 * e; lE = -1.12 * e; }
    }
  }
  if (gait) { const p = gait; lx = Math.sin(p) * .6; rx = -lx; lk = Math.max(.08, Math.sin(p + 1.3)) * .9; rk = Math.max(.08, Math.sin(p + 1.3 + Math.PI)) * .9; hipY += Math.abs(Math.cos(p)) * .03 - .02; }
  // ---- hit, heal ----
  if (o.hitT && now >= o.hitT && !o.dead) { const k = (now - o.hitT) / (360 / Math.min(sp, 2)); if (k < 1) { const s = Math.sin(k * Math.PI) * (o.hitCrit ? 1.5 : 1); hitS = s; lean -= .3 * s; headX -= .28 * s; if (o.hitDir) addScaled(pos, o.hitDir, .16 * s); else pos.x += (o.side === 'A' ? -1 : 1) * .16 * s; lk = rk = Math.max(lk, .35 * s); rS += .25 * s; lS += .25 * s; capeKick += .5 * s; } }
  if (o.healT && now >= o.healT) { const k = (now - o.healT) / 600; if (k < 1) { const s = Math.sin(k * Math.PI); headX -= .15 * s; } }
  // ---- death & revive (the ghola rises again) ----
  let fall = 0, fallZ = 0;
  const rv = !o.dead && o.rise ? 1 - (now - o.rise) / 1300 : -1;
  if ((o.dead && now >= o.deathT) || rv > 0) {
    const k = rv > 0 ? smooth01(rv) : Math.min(1, (now - o.deathT) / 950), e1 = ease(k / .4), e2 = ease((k - .35) / .65);
    lk = rk = 1.25 * e1 * (1 - e2 * .6); hipY -= .33 * e1 - .2 * e2; lean += .35 * e1 - .2 * e2; rS = lerpN(rS, -.3, e1); lS = lerpN(lS, -.3, e1); headX += .3 * e1; fall = -e2 * Math.PI / 2 * .95; fallZ = -e2 * .45;
  }
  // ---- apply ----
  o.root.position.copyFrom(pos); o.root.rotation.y = yaw;
  o.body.rotation.set(fall, 0, 0); o.body.position.set(0, 0, fallZ); o.body.scaling.y = 1;
  o.hips.position.set(hipX, (o.hipY0 || .95) + hipY, 0); o.hips.rotation.y = twist * .25;
  o.spine.rotation.set(lean, twist, 0); o.spine.scaling.y = 1 + br * .006;
  o.head.rotation.set(headX, headY, 0);
  o.LL.hip.rotation.x = -lx - (o.dead ? 0 : lk * .45); o.LL.knee.rotation.x = lk; o.LL.ank.rotation.x = -lk * .5 + lx * .3;
  o.LR.hip.rotation.x = -rx - (o.dead ? 0 : rk * .45); o.LR.knee.rotation.x = rk; o.LR.ank.rotation.x = -rk * .5 + rx * .3;
  o.LL.hip.rotation.z = Math.min(0, lx) * 0; o.R.sh.rotation.set(rS, 0, .12 + rZ); o.R.el.rotation.x = rE; o.Lf.sh.rotation.set(lS, 0, -.12 + lZ); o.Lf.el.rotation.x = lE;
  o.R.hand.rotation.set(hx - .75, hy, hz);
  // ---- motion-capture layer (Mixamo): idle, sword cut, eight-strike combo ----
  if (MOCAP_OK) {
    const dead = o.dead && now >= o.deathT;
    let wI = dead ? 0 : rv > 0 ? 1 - rv : 1, wS = 0, uS = 0, wC = 0, uC = 0;
    if (actKey === 'basic') { wI *= Math.max(1 - seg(actK, 0, .08), seg(actK, .9, 1)); wS = seg(actK, .16, .24) * (1 - seg(actK, .76, .84)); uS = .05 + (actK - .18) / .62 * .9; }
    else if (actKey === 'special') wI *= Math.max(1 - seg(actK, 0, .1), seg(actK, .88, 1));
    else if (actKey === 'ult') {
      wI *= Math.max(1 - seg(actK, 0, .08), seg(actK, .9, 1)); wC = seg(actK, .06, .12) * (1 - seg(actK, .88, .94)); uC = .22 + (actK - .08) / .84 * .56;
      const c = mocap('combo'), face = Math.atan2(a.dir.x, a.dir.z);
      if (c) { const st = c.strikes.filter(x => x >= .22 && x <= .78);
        st.forEach((su, i) => { const ks = .08 + (su - .22) / .56 * .84; if (actK >= ks && !((a.sk || 0) & (1 << i))) { a.sk = (a.sk || 0) | (1 << i); const last = i === st.length - 1;
          A.slashFX(a.to.add(a.dir.scale(.8)), face + i * .8, last); for (const tg of a.tg || []) if (A.sparkFX) A.sparkFX(tg, last ? 2 : 1); if (last && A.shakeT !== undefined) A.shakeT = performance.now(); } }); }
      if (wC > .5) o.root.rotation.y = face;
    }
    if (wI > 0) { const c = mocap('idle'); if (c) layerClip(o, 'idle', ((t + ph * 2.3) % c.dur) / c.dur, wI, [0, 0, show ? patW : 0, 1, 1, 1, show ? patW : 0, show ? patW : 0, show ? patW : 0]); }   // the sword arm keeps its own grip pose
    if (wS > 0) layerClip(o, 'slash', uS, wS);
    if (wC > 0) layerClip(o, 'combo', uC, wC);
    if (o.active && !dead && actK < 0) o.hips.position.y -= .025;
    if (hitS) { addRotX(o.spine, -.3 * hitS); addRotX(o.head, -.28 * hitS); }
  }
  // cape: wind + motion; three bones, each swings a bit later and more
  if (o.capeB) {
    const w = show ? 1.4 : 1, m = capeKick + Math.max(0, -lean + .07) * .6;
    o.capeB[0].rotation.set(.06 + (.035 * Math.sin(t * 1.6 + ph) + .02) * w + m * .35, 0, .04 * Math.sin(t * 1.1 + ph) * w);
    o.capeB[1].rotation.set(.05 + (.06 * Math.sin(t * 2.0 + ph + 1) + .03) * w + m * .45, 0, .06 * Math.sin(t * 1.4 + ph + 1) * w);
    o.capeB[2].rotation.set(.04 + (.09 * Math.sin(t * 2.6 + ph + 2) + .04) * w + m * .6, 0, .08 * Math.sin(t * 1.8 + ph + 2) * w);
  }
}


export { ANIM3, smooth01, seg, kf, poseDuncan };

export { DUNCAN_COMBO, DUNCAN_CONTACTS };
