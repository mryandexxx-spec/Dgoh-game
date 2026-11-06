// render3d/worm.js — строки 1739–1799 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { MODEL_DATA } from '../assets/models.js';
import './characters/pose-generic.js'; // порядок исполнения
import { b64bytes } from './characters/authored.js';
import { MB, add, bCone, bDisc, bRock, bSph, bTorus, grp } from './geometry.js';
import { V3, basic3, col3, lerpC, mat3, mk } from './materials.js';
import { CTX, withCtx } from './ctx.js';
import { B3 } from './base.js';

// ---------- Shai-Hulud built in Blender (raid boss body, summon column, shared mouth) ----------
let WORM_CACHE = null;
function wormData() {
  if (WORM_CACHE !== null) return WORM_CACHE;
  const R = typeof MODEL_DATA !== 'undefined' && MODEL_DATA.worm; if (!R) return (WORM_CACHE = false);
  const dec = P => {
    const p16 = new Int16Array(b64bytes(P.p).buffer), n8 = new Int8Array(b64bytes(P.nr).buffer), pos = new Float32Array(p16.length), nor = new Float32Array(n8.length);
    for (let i = 0; i < p16.length; i++) { pos[i] = p16[i] / (P.ps || 2000); nor[i] = n8[i] / 127; }
    let col = null; if (P.c) { const c8 = b64bytes(P.c); col = new Float32Array(P.n * 4); for (let v = 0; v < P.n; v++) { col[v * 4] = c8[v * 3] / 255; col[v * 4 + 1] = c8[v * 3 + 1] / 255; col[v * 4 + 2] = c8[v * 3 + 2] / 255; col[v * 4 + 3] = 1; } }
    const ib = b64bytes(P.i).buffer;
    return { pos, nor, col, uv: P.uv ? new Float32Array(b64bytes(P.uv).buffer) : null, idx: P.i32 ? new Uint32Array(ib) : new Uint16Array(ib) };
  };
  return (WORM_CACHE = { raid: dec(R.raid), col: dec(R.col), mouth: dec(R.mouth), head: R.head, alb: R.alb, nrm: R.nrm });
}
function wormMesh(P) {
  const me = new B3.Mesh('worm', CTX.scene), vd = new B3.VertexData(); vd.positions = P.pos; vd.normals = P.nor; if (P.uv) vd.uvs = P.uv; vd.indices = P.idx;
  if (P.col) { let c = P.col; if (CTX.pbr) { c = c.slice(); for (let i = 0; i < c.length; i++) if (i % 4 !== 3) c[i] = Math.pow(c[i], 2.2); } vd.colors = c; }
  vd.applyToMesh(me, false); me.isPickable = false; return me;
}
function wormMats(WD) {
  const skin = mat3('#ffffff', { roughness: .82, noSheen: 1 }), mouth = mat3('#ffffff', { roughness: .45, side: 'double', noSheen: 1 });
  const ta = new B3.Texture(WD.alb, CTX.scene, false, true), tn = new B3.Texture(WD.nrm, CTX.scene, false, true);
  if (skin instanceof B3.PBRMaterial) skin.albedoTexture = ta; else skin.diffuseTexture = ta; skin.bumpTexture = tn; tn.level = 1.2; skin.invertNormalMapY = true;
  return { skin, mouth };
}
function makeWorm3(ctx) { return withCtx(ctx, () => {
  const WD = wormData();
  if (WD) {
    const root = grp(null), body = grp(root), M = wormMats(WD);
    add(body, mk(wormMesh(WD.raid), M.skin));
    const h = WD.head, mouth = grp(body, h.p[0], h.p[1], h.p[2]); mouth.rotationQuaternion = new B3.Quaternion(); B3.Quaternion.FromUnitVectorsToRef(V3(0, 1, 0), V3(h.t[0], h.t[1], h.t[2]).normalize(), mouth.rotationQuaternion); mouth.scaling.setAll(h.r / 1.25);
    add(mouth, mk(wormMesh(WD.mouth), M.mouth, 0, 0, 0, false));
    const sand = mat3('#c89058', { flatShading: true });
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = add(body, mk(bRock(i + 40, 0), sand, .2 + Math.cos(a) * 3.2, -.25, 1.4 + Math.sin(a) * 2.4)); r.scaling.set(.8, .4, .8); }
    root.scaling.setAll(.95);
    for (const m of [M.skin, M.mouth]) m._baseEm = m.emissiveColor.clone();
    return { root, body, mats: [M.skin, M.mouth], h: 7.4, boss: true };
  }
  const root = grp(null), body = grp(root);
  const pts = [V3(1.5, -3, 3), V3(1.4, 2.5, 1.5), V3(.4, 6.4, -.5), V3(-1.8, 7.6, -1), V3(-3.6, 6.4, -.8)];
  const path = B3.Curve3.CreateCatmullRomSpline(pts, 18, false).getPoints(), n = path.length, tess = 20;
  const tube = MB().CreateTube('worm', { path, tessellation: tess, radiusFunction: i => 1.25 * (.75 + i / (n - 1) * .4), cap: B3.Mesh.CAP_START, updatable: false }, CTX.scene);
  const cnt = tube.getTotalVertices(), cols = [], ca = col3('#a88058'), cb = col3('#5a3e26');
  for (let v = 0; v < cnt; v++) { const i = Math.min(n - 1, Math.floor(v / (tess + 1))), k = i / (n - 1), ring = i % 5 < 1 ? .55 : 1, c = lerpC(ca, cb, k * .3).scale(ring); cols.push(c.r, c.g, c.b, 1); }
  tube.setVerticesData(B3.VertexBuffer.ColorKind, cols);
  const skin = mat3('#ffffff', { roughness: .9 }); add(body, mk(tube, skin));
  const end = path[n - 1], tan = end.subtract(path[n - 2]).normalize();
  const mouth = grp(body, end.x, end.y, end.z); mouth.rotationQuaternion = new B3.Quaternion(); B3.Quaternion.FromUnitVectorsToRef(V3(0, 0, 1), tan, mouth.rotationQuaternion);
  const lipM = mat3('#a88058', { roughness: .9 });
  add(mouth, mk(bTorus(1.45, .32, 28), lipM));
  add(mouth, mk(bDisc(1.3, 28), basic3('#1a0c08', { double: true }), 0, 0, -.25, false));
  const tm = mat3('#efe3c8', { roughness: .45 });
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, t = add(mouth, mk(bCone(.12, .5, 6), tm, Math.cos(a) * 1.1, Math.sin(a) * 1.1, .05)); t.rotation.z = a + Math.PI / 2; t.rotation.x = .5; }
  add(mouth, mk(bSph(.35, 10), basic3('#ff7a30'), 0, 0, -.6, false));
  const sand = mat3('#c89058', { flatShading: true });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = add(body, mk(bRock(i + 40, 0), sand, 1.5 + Math.cos(a) * 2, -.3, 3 + Math.sin(a) * 1.6)); r.scaling.set(.7, .45, .7); }
  root.scaling.setAll(.95);
  for (const m of [skin, lipM]) m._baseEm = m.emissiveColor.clone();
  return { root, body, mats: [skin, lipM], h: 5.6, boss: true };
}); }


export { WORM_CACHE, wormData, wormMesh, wormMats, makeWorm3 };
