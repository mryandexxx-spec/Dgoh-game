// render3d/geometry.js — строки 1248–1294 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { V3, basic3, mk } from './materials.js';
import { CTX } from './ctx.js';
import { B3 } from './base.js';
import { NZ } from '../render2d/scenes.js';
import { sRng } from '../core/rng.js';

const grp = (parent, x = 0, y = 0, z = 0) => { const g = new B3.TransformNode('g', CTX.scene); if (parent) g.parent = parent; g.position.set(x, y, z); return g; };
const add = (p, c) => { c.parent = p; return c; };
const MB = () => B3.MeshBuilder;
const bBox = (w, h, d) => MB().CreateBox('bx', { width: w, height: h, depth: d }, CTX.scene);
const bCyl = (rt, rb, h, seg = 16, open = false, arc = 1) => MB().CreateCylinder('cy', { diameterTop: 2 * rt, diameterBottom: 2 * rb, height: h, tessellation: seg, cap: open ? B3.Mesh.NO_CAP : B3.Mesh.CAP_ALL, arc, enclose: arc < 1, sideOrientation: open ? B3.Mesh.DOUBLESIDE : B3.Mesh.DEFAULTSIDE }, CTX.scene);
const bSph = (r, seg = 16, arc = 1, slice = 1) => MB().CreateSphere('sp', { diameter: 2 * r, segments: Math.max(4, seg >> 1), arc, slice, sideOrientation: arc < 1 || slice < 1 ? B3.Mesh.DOUBLESIDE : B3.Mesh.DEFAULTSIDE }, CTX.scene);
const bCone = (r, h, seg = 8) => MB().CreateCylinder('co', { diameterTop: 0, diameterBottom: 2 * r, height: h, tessellation: seg }, CTX.scene);
function bTorus(r, tube, seg = 24, arc = 1) {
  if (arc >= 1) { const t = MB().CreateTorus('to', { diameter: 2 * r, thickness: 2 * tube, tessellation: seg }, CTX.scene); t.bakeTransformIntoVertices(B3.Matrix.RotationX(Math.PI / 2)); return t; }
  const path = []; for (let i = 0; i <= seg; i++) { const a = i / seg * arc * Math.PI * 2; path.push(V3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
  return MB().CreateTube('tt', { path, radius: tube, tessellation: 10, cap: B3.Mesh.CAP_ALL }, CTX.scene);
}
const bDisc = (r, seg = 24, arc = 1) => MB().CreateDisc('di', { radius: r, tessellation: seg, arc, sideOrientation: B3.Mesh.DOUBLESIDE }, CTX.scene);
const bPlane = (w, h) => MB().CreatePlane('pl', { width: w, height: h, sideOrientation: B3.Mesh.DOUBLESIDE }, CTX.scene);
const bOcta = r => MB().CreatePolyhedron('oc', { type: 1, size: r }, CTX.scene);
function bRock(seed, detail = 2) {
  const m = MB().CreateIcoSphere('rk', { radius: 1, subdivisions: [1, 2, 3, 4][detail] || 2, updatable: true }, CTX.scene);
  const p = m.getVerticesData(B3.VertexBuffer.PositionKind);
  for (let i = 0; i < p.length; i += 3) { const x = p[i], y = p[i + 1], z = p[i + 2], n = .75 + NZ(x * 1.7 + seed, y * 1.7 + z * 1.3, 3) * .55; p[i] = x * n; p[i + 1] = y * n; p[i + 2] = z * n; }
  m.updateVerticesData(B3.VertexBuffer.PositionKind, p);
  const nr = []; B3.VertexData.ComputeNormals(p, m.getIndices(), nr); m.updateVerticesData(B3.VertexBuffer.NormalKind, nr);
  return m;
}
function canvasEl(size, fn) { const c = document.createElement('canvas'); c.width = c.height = size; fn(c.getContext('2d'), size); return c; }
function dynTex(canvas, rep, alpha, ctx) { const t = new B3.DynamicTexture('dt', canvas, ctx && ctx.scene !== undefined ? ctx.scene : CTX.scene, true, B3.Texture.TRILINEAR_SAMPLINGMODE); t.update(true); if (rep) { t.uScale = t.vScale = rep; } t.wrapU = t.wrapV = B3.Texture.WRAP_ADDRESSMODE; t.anisotropicFilteringLevel = 4; if (alpha) t.hasAlpha = true; return t; }
function groundCanvas(kind) {
  return canvasEl(256, (g, S) => {
    const img = g.createImageData(S, S), D = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let v;
      if (kind === 'rock') v = .72 + (NZ(x * .05, y * .05, 4) - .5) * .6 + (NZ(x * .3, y * .3, 2) - .5) * .2;
      else if (kind === 'salt') v = .9 + (NZ(x * .08, y * .08, 3) - .5) * .12;
      else if (kind === 'tile') v = (x % 64 < 2 || y % 64 < 2) ? .55 : .86 + (NZ(x * .1, y * .1, 2) - .5) * .12;
      else v = .86 + .055 * Math.sin(x * .32 + NZ(x * .025, y * .025, 3) * 16) + (NZ(x * .45, y * .45, 1) - .5) * .08;
      const i = (y * S + x) * 4; D[i] = D[i + 1] = D[i + 2] = Math.max(0, Math.min(255, v * 255)); D[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    if (kind === 'salt') { const r = sRng(5); g.strokeStyle = 'rgba(90,70,50,.45)'; for (let k = 0; k < 60; k++) { g.lineWidth = .6 + r(); g.beginPath(); let x = r() * S, y = r() * S; g.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (r() - .5) * 60; y += (r() - .5) * 60; g.lineTo(x, y); } g.stroke(); } }
  });
}
let GLOW_CANVAS = null;
const glowCanvas = () => GLOW_CANVAS || (GLOW_CANVAS = canvasEl(128, (g, S) => { const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.18, 'rgba(255,255,255,.85)'); r.addColorStop(.4, 'rgba(255,255,255,.25)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S, S); }));
function glowSprite(color, size, x, y, z, add = true) {
  const p = mk(bPlane(1, 1), null, x, y, z, false); const m = basic3(color, { fog: false, add }); const t = dynTex(glowCanvas(), 0, true);
  m.emissiveTexture = t; m.opacityTexture = t; m.disableDepthWrite = true; p.material = m; p.scaling.set(size, size, 1); p.billboardMode = B3.Mesh.BILLBOARDMODE_ALL; p.receiveShadows = false; return p;
}


export { grp, add, MB, bBox, bCyl, bSph, bCone, bTorus, bDisc, bPlane, bOcta, bRock, canvasEl, dynTex, groundCanvas, GLOW_CANVAS, glowCanvas, glowSprite };
