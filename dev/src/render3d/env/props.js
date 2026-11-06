// render3d/env/props.js — строки 1352–1390 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { heightAt } from './build-env.js';
import { MB, add, bBox, bCyl, bDisc, bPlane, bRock, bSph, bTorus, grp } from '../geometry.js';
import { SC, V3, basic3, col3, mat3, mk } from '../materials.js';
import { B3 } from '../base.js';
import { sRng } from '../../core/rng.js';

const PROPS3 = {
  farrocks(A, E) { const m = mat3(E.sand2, { flatShading: true }); const r = sRng(11); for (let i = 0; i < 9; i++) { const a = Math.PI * (1.08 + r() * .84), d = 95 + r() * 40, rk = mk(bRock(i, 1), m, Math.cos(a) * d, -2, Math.sin(a) * d, false); rk.scaling.set(10 + r() * 16, 5 + r() * 9, 8 + r() * 12); } },
  mesas(A, E) { const m = mat3(E.night ? '#3a2c34' : '#7a4434', { flatShading: true, roughness: 1 }); const r = sRng(13); for (let i = 0; i < 14; i++) { const a = Math.PI * (1.05 + r() * .9), d = 48 + r() * 50, rk = mk(bRock(i + 20, 1), m, Math.cos(a) * d, -1, Math.sin(a) * d, false); rk.scaling.set(7 + r() * 12, 7 + r() * 12, 7 + r() * 10); } },
  canyon(A) { const m = mat3('#a85a34', { flatShading: true, roughness: 1 }); for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) { const rk = mk(bRock(k * 7 + (sx > 0 ? 3 : 0), 2), m, sx * (22 + k % 2 * 3), 6, -60 + k * 18); rk.scaling.set(7, 16 + (k * 5) % 7, 11); } },
  cave(A) {
    const m = mat3('#7a5638', { roughness: 1, flatShading: true }); m.backFaceCulling = false;
    m.twoSidedLighting = true; const dome = mk(bRock(4, 3), m, 0, 4, -8, false); dome.scaling.set(46, 22, 38);
    const op = mk(bDisc(3.2, 24, .5), basic3('#e8b878', { fog: false }), 0, -.5, -52, false);
    for (const [x, y, z] of [[-12, 4, -10], [12, 4.5, -12], [-7, 3, 6], [8, 3, 5]]) { const L = new B3.PointLight('pl', V3(x, y, z), SC); L.diffuse = col3('#ffa860'); L.intensity = 1.4; L.range = 26; mk(bSph(.22, 10), basic3('#ffd08a'), x, y, z, false); }
  },
  city(A) { const m = mat3('#3a2016', { roughness: 1 }), w = basic3('#ffb060'), r = sRng(17); for (let i = 0; i < 46; i++) { const x = -60 + r() * 120, z = -38 - r() * 26, hh = 2 + r() * 9, b = mk(bBox(2 + r() * 4, hh, 2 + r() * 4), m, x, hh / 2 + heightAt('dunes', x, z) - 1, z, false); if (r() < .6) mk(bBox(.3, .3, .05), w, x + (r() - .5), b.position.y + (r() - .5) * hh * .6, z + 2.1, false); } },
  sea(A) { const sea = mk(MB().CreateGround('sea', { width: 600, height: 600 }, SC), mat3('#2a4c58', { roughness: .2, metalness: .5 }), 0, -4.5, 0, false); A.sea = sea; },
  castle(A) { const rk = mk(bRock(9, 2), mat3('#3a443e', { flatShading: true }), -34, -4, -52, false); rk.scaling.set(14, 9, 12); const m = mat3('#4a4e4c'); for (const [x, z, w, h, d] of [[-34, -52, 9, 7, 6], [-38, -50, 2.6, 13, 2.6], [-29, -54, 2.6, 15, 2.6]]) mk(bBox(w, h, d), m, x, 4 + h / 2, z, false); mk(bBox(.6, .8, .1), basic3('#ffc070'), -33, 9, -48.9, false); },
  towers(A) { const m = mat3('#1a1212', { roughness: .6, metalness: .4 }), w = basic3('#ff4a28'), r = sRng(23); for (let i = 0; i < 34; i++) { const x = -70 + r() * 140, z = -30 - r() * 50, hh = 10 + r() * 34; mk(bBox(3 + r() * 5, hh, 3 + r() * 5), m, x, hh / 2 - 1, z, false); for (let k = 0; k < 4; k++) mk(bBox(.5, .25, .1), w, x + (r() - .5) * 2, r() * hh, z + 2.6, false); } },
  palace(A) {
    const st = mat3('#8a6a3a', { roughness: .7 }), gold = mat3('#d4aa50', { metalness: .6, roughness: .35 }), red = mat3('#8a2a24', { side: 'double' });
    for (let i = -3; i <= 3; i++) { if (Math.abs(i) < 1) continue; const x = i * 4.6; mk(bCyl(.55, .65, 10, 14), st, x, 5, -10); mk(bBox(1.6, .5, 1.6), gold, x, 10.2, -10); }
    mk(bBox(34, .8, 2.2), st, 0, 10.8, -10);
    for (let k = 0; k < 4; k++) mk(bBox(60 - k * 12, 5, 26 - k * 5), st, 0, 2.5 + k * 5, -55, false);
    for (const x of [-9, 9]) mk(bPlane(2.2, 6.5), red, x, 6.5, -9.3);
  },
  ruins(A) {
    const st = mat3('#8a6656', { roughness: .95, flatShading: true }), r = sRng(29);
    for (let i = 0; i < 7; i++) { const a = Math.PI * (1.1 + i * .12), d = 15 + r() * 8, x = Math.cos(a) * d, z = Math.sin(a) * d, hh = 1.5 + r() * 5; const c = mk(bCyl(.55, .7, hh, 10), st, x, hh / 2 + heightAt('dunes', x, z) - .4, z); c.rotation.z = (r() - .5) * .3; }
    const ax = 8, az = -16, ay = heightAt('dunes', ax, az);
    for (const dx of [-3, 3]) mk(bCyl(.6, .7, 7, 10), st, ax + dx, ay + 3.5, az);
    mk(bTorus(3, .5, 16, .5), st, ax, ay + 7, az);
  },
  harvester(A) {
    const x = 16, z = -28, y = heightAt('dunes', x, z), g = grp(null, x, y, z); g.rotation.y = -.5;
    const body = mat3('#6a5442', { metalness: .4, roughness: .55 }), dark = mat3('#241a12');
    add(g, mk(bBox(10, 3.4, 6), body, 0, 3, 0)); add(g, mk(bBox(3.4, 2.2, 3.6), body, -2, 5.8, 0));
    for (const sz of [-3.2, 3.2]) add(g, mk(bBox(11, 1.6, 1.4), dark, 0, .8, sz));
    const arm = add(g, mk(bBox(.6, 9, .6), body, 5.5, 7, 0)); arm.rotation.z = -.6;
    for (const [lx, ly] of [[-2, 6.2], [3, 3.6]]) add(g, mk(bBox(.5, .35, .1), basic3('#ffc070'), lx, ly, 3.05, false));
  },
  plumes(A) { A.plumes = [[-14, -40], [12, -55], [30, -38]].map(([x, z]) => ({ x, z, y: heightAt('dunes', x, z) })); },
};
// GPU-friendly particle systems instead of hand-moved point clouds

export { PROPS3 };
