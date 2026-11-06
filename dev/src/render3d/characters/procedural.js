// render3d/characters/procedural.js — строки 1512–1665 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { ANIM3 } from './pose-duncan.js';
import { makeModel3, modelData } from './authored.js';
import { HERO3, foldify, lathe, mergeRig, tube3 } from './rig.js';
import { add, bBox, bCone, bCyl, bOcta, bPlane, bSph, bTorus, grp } from '../geometry.js';
import { V3, basic3, col3, mat3, mk } from '../materials.js';
import { CTX, withCtx } from '../ctx.js';
import { B3 } from '../base.js';
import { FEM, LOOK, SKINS, ghash } from '../../data/looks.js';

function makeHuman3(def, ctx) { return withCtx(ctx, () => {
  { const D = modelData(def.id); if (D) { try { return makeModel3(def, D); } catch (e) { console.warn('model', def.id, e); } } }
  const SHG0 = CTX.shadows; CTX.shadows = null;
  const fac = def.f[0], X = HERO3[def.id] || {}, L = { ...(LOOK[fac] || LOOK.atr), ...(X.look || {}) }, h = ghash(def.id), fem = FEM.has(def.id);
  let style = X.style || (def.legendary || fac === 'frem' ? 'robe' : def.f.includes('bg') ? 'bgrobe' : fac === 'hark' ? 'armor' : fac === 'cor' ? 'cor' : 'tunic');
  if (fac === 'mach' && !X.erasmus) style = 'robot';
  const long = style === 'robe' || style === 'bgrobe', armored = style === 'armor' || style === 'cor' || style === 'robot', robot = style === 'robot';
  const helm = (style === 'armor' && (def.id === 'trooper' || def.role === 'tank')) || (style === 'cor' && !X.nohelm);
  const skinC = X.skin || SKINS[h % SKINS.length][0], hairC = X.old ? '#9a9488' : X.hairC || ['#2a1c14', '#5a3a22', '#151110', '#7a5232', '#3a2a20', '#6a4a2a'][(h >> 3) % 6];
  const ibad = fac === 'frem' || def.legendary;
  const M = {
    cloth: mat3(L.cloak, { roughness: .9 }), dark: mat3(L.dark, { roughness: .85 }), acc: mat3(L.acc, { roughness: .5, metalness: .2 }), pants: mat3(L.pants, { roughness: .9 }),
    skin: mat3(skinC, { roughness: .55 }), hair: mat3(hairC, { roughness: .8 }), boot: mat3('#2a1d14', { roughness: .6 }), belt: mat3('#4a3420', { roughness: .6 }),
    metal: mat3(robot ? '#9aa0ac' : style === 'cor' || style === 'emperor' ? '#c8a656' : '#5a6684', { metalness: .55, roughness: .32 }),
    steel: mat3('#eef2f6', { metalness: .6, roughness: .18, emissive: '#1a1e24' }), suit: mat3(fac === 'frem' ? '#4a4038' : L.pants, { roughness: .7 }),
    eye: basic3(ibad ? '#2a6aff' : '#140c08'), white: ibad ? basic3('#7aa8ff') : mat3('#f2ece0', { roughness: .3 }), lip: mat3(fem ? '#a04a44' : '#7a4434'), brow: mat3(X.old ? '#cfc8bc' : hairC),
  };
  if (def.legendary) M.cloth.emissiveColor = col3('#5a3a08').scale(.4);
  if (X.erasmus) { M.skin = mat3('#d4d9e2', { metalness: .9, roughness: .1, emissive: '#1a2028' }); M.cloth.emissiveColor = col3('#3a0810').scale(.5); }
  const wide = (X.wide || 1) * (def.role === 'tank' ? 1.12 : 1) * (X.slim || 1), fat = X.fat || 1;
  const root = grp(null), body = grp(root), hips = grp(body, 0, .95, 0);
  const A = (parent, mesh, mat, x = 0, y = 0, z = 0) => add(parent, mk(mesh, mat, x, y, z));
  // pelvis + legs
  if (X.muscle) root._muscle = 1;
  A(hips, bSph(.17 * wide * Math.min(fat, 1.3) * (X.muscle ? .9 : 1), 14), long ? M.suit : robot ? M.metal : M.pants, 0, -.02, 0).scaling.set(1, .62, .78);
  const leg = s => {
    const hip = grp(hips, s * .1 * wide, -.04, 0);
    A(hip, bCyl(.078 * Math.min(fat, 1.25), .06, .44, 10), long ? M.suit : robot || style === 'armor' ? M.metal : M.pants, 0, -.22, 0);
    const knee = grp(hip, 0, -.44, 0);
    if (armored && !long) A(knee, bSph(.07, 10), M.metal, 0, 0, .03); else A(knee, bSph(.06, 12), long ? M.suit : M.pants, 0, 0, 0);
    A(knee, bCyl(.058, .046, .42, 10), long ? M.suit : robot ? M.metal : M.pants, 0, -.21, 0);
    const ank = grp(knee, 0, -.42, 0);
    A(ank, bBox(.12, .1, .27), robot ? M.metal : M.boot, 0, -.035, .045); A(ank, bSph(.062, 10), robot ? M.metal : M.boot, 0, -.03, .16).scaling.set(1, .7, .9);
    A(ank, bCyl(.064, .07, .16, 10), robot ? M.metal : M.boot, 0, .05, 0);
    return { hip, knee, ank };
  };
  const LL = leg(-1), LR = leg(1);
  // robe skirt (sways with legs)
  let skirt = null;
  if (long) { skirt = grp(hips, 0, .06, 0); A(skirt, foldify(lathe([[0, 0], [.2 * wide * fat, 0], [.26 * wide, -.3], [.36, -.62], [.44, -.86], [.43, -.9], [0, -.9]], 44, .8), .07, 9), style === 'bgrobe' ? M.dark : M.cloth); }
  else if (style === 'tunic' || style === 'emperor') { skirt = grp(hips, 0, .04, 0); A(skirt, lathe([[0, 0], [.19 * wide, 0], [.22 * wide, -.2], [.24 * wide, -.32], [0, -.32]], 18, .78), style === 'emperor' ? M.dark : M.cloth); }
  // spine + torso
  const spine = grp(hips, 0, .04, 0);
  const torsoM = robot ? M.metal : style === 'armor' ? M.metal : style === 'bgrobe' ? M.dark : M.cloth;
  const ch = X.muscle ? 1.22 : 1, wa = X.muscle ? .86 : 1; const tor = A(spine, lathe([[0, 0], [.17 * wide * fat * wa, 0], [.16 * wide * fat * wa, .1], [.2 * wide * fat * (X.muscle ? 1.02 : 1), .26], [.23 * wide * Math.min(fat, 1.25) * ch, .42], [.21 * wide * ch, .52], [.09, .6], [0, .6]], 20, .7 * Math.max(1, fat * .9)), torsoM);
  if (fat > 1) A(spine, bSph(.24 * fat * .8, 16), torsoM, 0, .2, .07).scaling.set(1, .9, .9);
  A(spine, bCyl(.178 * wide * fat, .178 * wide * fat, .06, 20), robot ? M.dark : M.belt, 0, .02, 0).scaling.z = .74;
  A(spine, bBox(.07, .055, .03), M.acc, 0, .02, .135 * fat);
  if (X.muscle) for (const s of [-1, 1]) A(spine, bSph(.1, 12), torsoM, s * .08, .42, .1).scaling.set(1.1, .8, .6);
  if (style === 'tunic') { A(spine, bBox(.02, .42, .02), M.acc, 0, .3, .155); for (const y of [.16, .26, .36]) A(spine, bSph(.012, 6), M.acc, 0, y, .165); A(spine, bSph(.03, 8), M.acc, -.1, .42, .16); }
  if (style === 'armor' || style === 'cor' || robot) { A(spine, bBox(.3 * wide, .2, .05), M.metal, 0, .35, .12); A(spine, bBox(.26 * wide, .1, .05), M.dark, 0, .18, .12); }
  if (style === 'emperor') { A(spine, bBox(.32, .32, .04), M.acc, 0, .32, .12).scaling.x = .9; A(spine, bBox(.22, .05, .05), M.metal, 0, .46, .13); }
  if (long) { A(spine, bCyl(.24 * wide, .18 * wide, .2, 18), style === 'bgrobe' ? M.dark : M.cloth, 0, .42, 0).scaling.z = .78; A(spine, bBox(.08, .45, .02), style === 'bgrobe' ? M.acc : M.dark, 0, .28, .14); }
  // shoulders
  for (const s of [-1, 1]) {
    if (armored) { const pad = A(spine, bSph(.12, 12), M.metal, s * .25 * wide, .52, 0); pad.scaling.set(1.05, .7, 1); if (style === 'armor' && !robot) A(spine, bCone(.035, .12, 6), M.dark, s * .3 * wide, .6, 0).rotation.z = -s * .5; }
    else A(spine, bSph(.085, 10), style === 'tunic' ? M.acc : torsoM, s * .24 * wide, .52, 0);
  }
  if (def.leader || style === 'emperor') { const cm = style === 'emperor' || fac === 'cor' ? mat3('#7a1f1a', { side: 'double', roughness: .7 }) : mat3(L.dark, { side: 'double' }); const cape = grp(spine, 0, .56, -.13); A(cape, bPlane(.6 * wide, 1.3), cm, 0, -.62, 0); cape.rotation.x = .12; A(spine, bTorus(.12, .025, 16), M.acc, 0, .56, .02).rotation.x = Math.PI / 2; root._cape = cape; }
  // neck + head
  A(spine, bCyl(.05, .06, .12, 10), robot ? M.dark : M.skin, 0, .64, 0);
  const head = grp(spine, 0, .68, 0), H = (mesh, mat, x, y, z) => add(head, mk(mesh, mat, x, y, z));
  if (X.erasmus) {
    const face = H(bSph(.118, 28), mat3('#e8ecf4', { metalness: 1, roughness: .04, emissive: '#2a3440' }), 0, .1, .01); face.scaling.set(.86, 1.16, .92);
    for (const s of [-1, 1]) H(bSph(.012, 8), basic3('#9fe8ff'), s * .036, .12, .1);
    H(bTorus(.13, .008, 24), mat3('#d8b050', { metalness: .8, roughness: .2, emissive: '#5a3a00' }), 0, .02, 0).rotation.x = Math.PI / 2;
  } else if (robot) {
    H(bBox(.22, .2, .22), M.metal, 0, .1, 0); H(bBox(.19, .04, .02), basic3('#ff3a2a'), 0, .12, .115); H(bCyl(.008, .008, .14, 4), M.dark, .07, .25, 0);
    if (X.cymek) { H(bSph(.14, 16), basic3('#ffb0c8', { alpha: .55 }), 0, .26, 0); H(bSph(.09, 12), mat3('#d06a8a', { roughness: .4 }), 0, .25, 0); }
  } else {
    const skull = H(bSph(.112, 20), M.skin, 0, .1, 0); skull.scaling.set(fem ? .9 : .97, 1.1, 1);
    H(bSph(.085, 18), M.skin, 0, .045, .03).scaling.set(fem ? .82 : .95, .8, .85);
    for (const s of [-1, 1]) H(bSph(.028, 10), M.skin, s * .055, .075, .07).scaling.set(1, .75, .55);
    H(bSph(.045, 12), M.skin, 0, .135, .085).scaling.set(1.6, .45, .5);
    for (const s of [-1, 1]) {
      H(bSph(.025, 8), M.skin, s * .105, .1, 0).scaling.set(.5, 1, .8);
      H(bSph(.017, 8), M.white, s * .04, .115, .092); H(bSph(.0105, 8), M.eye, s * .04, .115, .106);
      if (!helm) { const br = H(bBox(.045, .011, .012), M.brow, s * .042, .142, .1); br.rotation.z = s * -.12; }
    }
    const nose = H(bCone(.016, .055, 6), M.skin, 0, .085, .115); nose.rotation.x = Math.PI / 2 - .3;
    H(bBox(.046, .009, .012), M.lip, 0, .035, .1);
    if (X.scar) H(bBox(.008, .07, .006), mat3('#8a4a3a'), .05, .07, .095).rotation.z = .3;
    if (X.beard) { const bd = H(bSph(.085, 14, 1, .5), M.hair, 0, .04, .045); bd.rotation.x = Math.PI; bd.scaling.set(1, 1.15, 1); }
    if (X.mus) { for (const s of [-1, 1]) { const mu = H(bBox(.045, .016, .02), M.hair, s * .022, .052, .108); mu.rotation.z = s * -.35; } }
    if (X.scars) { const sm = mat3('#9a5a4a', { roughness: .5 }); H(bBox(.007, .085, .006), sm, -.055, .1, .098).rotation.z = -.35; H(bBox(.006, .06, .006), sm, .045, .07, .1).rotation.z = .5; H(bBox(.05, .006, .006), sm, .03, .02, .103); }
    if (X.tube) H(tube3([[-.02, .07, .11], [-.07, .06, .09], [-.11, .08, .02]], .006), M.dark);
    if (X.mask) H(bBox(.15, .06, .05), M.dark, 0, .04, .08);
    if (!long && !helm && !X.bald && style !== 'cor') {
      if (fem || X.hair === 'long') { H(bSph(.123, 16, 1, .55), M.hair, 0, .12, -.008); H(bCyl(.1, .07, .3, 12), M.hair, 0, .01, -.07); }
      else if (X.curly || (h >> 12) % 3 === 2) { for (const [x, y, z] of [[-.07, .19, .02], [0, .22, .02], [.07, .19, .02], [-.05, .2, -.06], [.05, .2, -.06], [0, .18, -.1], [-.1, .14, -.04], [.1, .14, -.04]]) H(bSph(.046, 8), M.hair, x, y, z); }
      else { const cap = H(bSph(.118, 16, 1, .5), M.hair, 0, .12, -.01); cap.scaling.set(1.03, 1.1, 1.06); cap.rotation.x = -.25; }
    }
    if (X.bald) H(bSph(.114, 18, 1, .4), mat3(skinC, { roughness: .3, metalness: .1 }), 0, .11, 0);
    if (long) {
      const hoodM = style === 'bgrobe' && !def.legendary ? M.dark : M.cloth;
      const hood = H(bSph(.16, 18, .7, .7), hoodM, 0, .11, -.01); hood.scaling.set(1, 1.12, 1.06); hood.rotation.y = Math.PI * 1.75; root._hood = hood;
      if (style === 'robe' && !X.mask) H(bBox(.2, .07, .09), M.dark, 0, .0, .07);
      if (def.legendary) H(bTorus(.14, .008, 24, .55), mat3('#e0b44a', { metalness: .8, roughness: .25, emissive: '#6a4400' }), 0, .12, .07).rotation.z = -.1 * Math.PI;
    }
    if (helm) {
      const hm = H(bSph(.142, 18), M.metal, 0, .12, 0); hm.scaling.set(1, 1.08, 1.06);
      if (style === 'cor') { H(bBox(.03, .14, .26), mat3('#a3322a'), 0, .27, -.02); for (const s of [-1, 1]) H(bBox(.03, .1, .07), M.metal, s * .12, .05, .05); }
      else H(bBox(.18, .034, .05), basic3('#8fd8ff'), 0, .12, .125);
    }
  }
  // arms
  const arm = s => {
    const sh = grp(spine, s * .28 * wide, .5, 0);
    const sleeve = robot || style === 'armor' ? M.metal : long ? (style === 'bgrobe' ? M.dark : M.cloth) : M.cloth;
    A(sh, bCyl(.06 * Math.min(fat, 1.3) * (X.muscle ? 1.35 : 1), .052 * (X.muscle ? 1.25 : 1), .3, 10), sleeve, 0, -.15, 0); if (X.muscle) A(sh, bSph(.075, 10), sleeve, 0, -.1, .01).scaling.set(1, 1.3, 1);
    const el = grp(sh, 0, -.3, 0);
    A(el, bSph(.052, 8), sleeve);
    A(el, bCyl(.05, .042, .27, 10), long ? sleeve : robot ? M.metal : style === 'armor' ? M.dark : M.cloth, 0, -.135, 0);
    if (armored) A(el, bCyl(.056, .056, .08, 10), M.metal, 0, -.22, 0);
    const hand = grp(el, 0, -.29, 0);
    A(hand, bBox(.06, .08, .045), robot || style === 'armor' ? mat3('#232838') : M.skin, 0, -.02, 0);
    A(hand, bSph(.022, 6), robot || style === 'armor' ? mat3('#232838') : M.skin, s * -.03, -.01, .02);
    sh.rotation.z = s * .12; return { sh, el, hand };
  };
  const R = arm(1), Lf = arm(-1);
  // weapons
  const dt = def.basic.dt, w = grp(R.hand, 0, -.04, 0), W = (mesh, mat, x, y, z) => add(w, mk(mesh, mat, x, y, z));
  if (dt === 'blade') {
    if (fac === 'frem') { W(tube3([[0, 0, 0], [0, .16, .015], [0, .32, .05], [0, .44, .1]], .018, 6), mat3('#f2ead6', { roughness: .3, emissive: '#2a2418' })); W(bCyl(.022, .022, .12, 8), mat3('#6a4a2a'), 0, -.04, 0); }
    else if (robot) { W(bBox(.02, .55, .08), basic3('#ff5a3a'), 0, .3, 0); }
    else if (X.dagger) { W(bBox(.026, .3, .01), M.steel, 0, .2, 0); W(bCone(.013, .05, 4), M.steel, 0, .375, 0); W(bBox(.09, .02, .03), mat3('#b08a3a', { metalness: .6 }), 0, .04, 0); W(bCyl(.016, .016, .1, 8), mat3('#3a2a1a'), 0, -.03, 0); }
    else { W(bBox(.03, .9, .012), M.steel, 0, .5, 0); W(bBox(.18, .028, .045), mat3('#b08a3a', { metalness: .6, roughness: .3 }), 0, .04, 0); W(bCyl(.02, .02, .14, 8), mat3('#3a2a1a'), 0, -.05, 0); }
    w.rotation.x = 1.6;
  } else if (dt === 'fast') { W(bBox(.05, .075, .26), mat3('#3a3a44', { metalness: .4, roughness: .35 }), 0, 0, .1); W(bBox(.045, .12, .05), mat3('#2a2a32'), 0, -.06, 0); W(bSph(.015, 6), basic3('#ffd27a'), 0, .01, .235); w.rotation.x = 1.25; }
  else if (dt === 'laser') { W(bBox(.06, .085, .86), mat3('#3a3d48', { metalness: .4, roughness: .3 }), 0, 0, .26); W(bSph(.04, 8), basic3('#7fe0ff'), 0, 0, .7); W(bBox(.04, .14, .06), mat3('#2a2a32'), 0, -.08, 0); w.rotation.x = 1.3; }
  else if (dt === 'poison') { W(bCyl(.006, .006, .3, 4), M.steel, 0, .15, 0); W(bSph(.026, 8), basic3('#7ad36a'), 0, .3, 0); w.rotation.x = 1.5; }
  else if (dt === 'voice') { W(bSph(.03, 8), basic3('#c8a0ff', { alpha: .7 }), 0, 0, .05); }
  root._muzzle = V3(0, .01, dt === 'laser' ? .7 : .24);
  if (def.role === 'tank' && !robot && !X.noShield) { const shd = grp(Lf.el, 0, -.16, .06); add(shd, mk(bCyl(.27, .27, .035, 24), M.cloth)); add(shd, mk(bCyl(.22, .22, .045, 24), M.acc)); add(shd, mk(bSph(.05, 8), M.metal, 0, .03, 0)); }
  if (def.role === 'sup' && !robot && !X.noStaff) { const st = grp(Lf.hand, 0, -.02, .02); add(st, mk(bCyl(.022, .022, 1.85, 6), mat3('#6e5034'), 0, .22, 0)); add(st, mk(bOcta(.075), M.acc, 0, 1.17, 0)); add(st, mk(bSph(.04, 8), basic3(L.acc), 0, 1.17, 0)); }
  if (def.role === 'heal') add(Lf.hand, mk(bCyl(.045, .045, .14, 10), mat3('#3a8ec6', { roughness: .2, metalness: .2, emissive: '#0a2030' }), 0, -.06, .02));
  if (X.cane) { const cn = grp(Lf.hand, 0, -.02, .02); add(cn, mk(bCyl(.018, .014, .95, 8), mat3('#2a1a10', { roughness: .3, metalness: .2 }), 0, -.46, 0)); add(cn, mk(bSph(.04, 10), mat3('#d4aa50', { metalness: .7, roughness: .25 }), 0, .02, 0)); root._cane = 1; }
  if (X.baliset) { const wd = mat3('#9a6430', { roughness: .45, metalness: .1 }), dk = mat3('#4a2c14', { roughness: .5 }), bl = grp(spine, 0, .28, -.2);
    add(bl, mk(bSph(.16, 16), wd)).scaling.set(1, 1.25, .38); add(bl, mk(bCyl(.05, .05, .012, 16), basic3('#1a0e06'), 0, .02, .062)).rotation.x = Math.PI / 2;
    add(bl, mk(bBox(.05, .58, .035), dk, 0, .44, 0)); add(bl, mk(bBox(.08, .12, .04), dk, 0, .78, -.01));
    for (const x of [-.014, 0, .014]) add(bl, mk(bBox(.003, .7, .003), basic3('#e8dcc0'), x, .32, .064, false));
    add(bl, mk(bBox(.03, .7, .01), mat3('#3a2a1a'), .02, .1, .07)).rotation.z = -.9; bl.rotation.z = .55; }
  if (X.float) { root._float = X.float; for (const s of [-1, 1]) { const g = add(root, mk(bTorus(.09, .015, 16), basic3('#8fd8ff', { add: true, alpha: .7 }), s * .1, .02, .03, false)); g.rotation.x = Math.PI / 2; } }
  let legL = null; if (def.legendary) { const lt = legL = new B3.PointLight('lg', V3(0, 1.3, 0), CTX.scene); lt.parent = root; lt.diffuse = col3(X.erasmus ? '#9fe8ff' : '#ffc860'); lt.intensity = .9; lt.range = 3.5; }
  const sc = (def.role === 'tank' ? 1.05 : 1) * (def.legendary ? 1.08 : 1) * (X.cymek ? 1.15 : 1), tl = X.tall || 1; root.scaling.set(sc * (tl > 1 ? 1.03 : 1), sc * tl, sc * (tl > 1 ? 1.03 : 1));
  const mats = []; for (const m of root.getChildMeshes(false)) if (m.material && m.material._lit && !mats.includes(m.material)) mats.push(m.material);
  mergeRig(root, SHG0); CTX.shadows = SHG0;
  if (legL) legL.includedOnlyMeshes = root.getChildMeshes(false); // perf step 6: aura light is evaluated only in the hero's own shaders
  for (const m of mats) m._baseEm = m.emissiveColor.clone();
  const melee = dt === 'blade' || robot && dt !== 'fast';
  root._staff = def.role === 'sup' && !robot;
  return { root, body, hips, spine, head, R, Lf, LL, LR, skirt, wpn: w, mats, h: 1.95 * sc * (X.tall || 1), melee, hipY0: .95, anim: ANIM3[def.id] || null, stance: def.role === 'tank' && !X.noShield ? 'shield' : dt === 'blade' ? 'guard' : dt === 'voice' ? 'open' : 'gun', float: X.float || 0 };
}); }


export { makeHuman3 };
