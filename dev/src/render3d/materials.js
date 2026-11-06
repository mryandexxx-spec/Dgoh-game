// render3d/materials.js — строки 1205–1247 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './game-scene.js'; // порядок исполнения
import { errLog } from '../core/errlog.js';
import { CTX } from './ctx.js';
import { B3 } from './base.js';

// ---------- thin helpers over Babylon ----------
const V3 = (x = 0, y = 0, z = 0) => new B3.Vector3(x, y, z);
// perf step 8: per-frame helpers without allocations
function addScaled(v, d, k) { v.x += d.x * k; v.y += d.y * k; v.z += d.z * k; return v; }
function inPlaceKeep(a, keep) { let j = 0; for (let i = 0; i < a.length; i++) { const x = a[i]; if (keep(x)) a[j++] = x; } a.length = j; return a; }
// due callbacks run in insertion order (same as filter-based version); callbacks may push new entries, those wait for the next frame
function runDue(q, now) { const n = q.length; let due = null, j = 0; for (let i = 0; i < n; i++) { const x = q[i]; if (now >= x.t) (due || (due = [])).push(x); else q[j++] = x; } if (!due) return; for (let i = n; i < q.length; i++) q[j++] = q[i]; q.length = j; for (const x of due) { try { x.fn(); } catch (e) { errLog('fxq', e); } } }
const col3 = c => c == null ? B3.Color3.White() : typeof c === 'number' ? B3.Color3.FromHexString('#' + c.toString(16).padStart(6, '0')) : c instanceof B3.Color3 ? c.clone() : B3.Color3.FromHexString(c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c);
const C3_CHARM = B3 && col3('#9fe8ff'), C3_SPICE = B3 && col3('#e8913f'), C3_TGT = B3 && col3('#d9604f'); // never mutated
const lerpC = (a, b, t) => B3.Color3.Lerp(a, b, t);
function mat3(c, o = {}) {
  if (CTX.pbr) {
    const p = new B3.PBRMaterial('p', CTX.scene), r = o.roughness ?? .85, me = o.metalness || 0;
    p.albedoColor = col3(c).toLinearSpace(); p.metallic = me; p.roughness = Math.max(.08, r); p.environmentIntensity = .55; p.directIntensity = 1.15;
    if (o.emissive) p.emissiveColor = col3(o.emissive);
    if (r >= .78 && !me && !o.noSheen) { p.sheen.isEnabled = true; p.sheen.intensity = .35; p.sheen.color = col3(c).scale(1.4); p.sheen.roughness = .6; }
    if (r <= .62 && !me) { p.clearCoat.isEnabled = false; }
    if (o.side === 'double') p.backFaceCulling = false, p.twoSidedLighting = true;
    p.maxSimultaneousLights = (CTX.scene && CTX.scene._maxL) || 4; p._flat = !!o.flatShading; p._lit = true; p.usePhysicalLightFalloff = false;
    return p;
  }
  const m = new B3.StandardMaterial('m', CTX.scene), r = o.roughness ?? .85, me = o.metalness || 0;
  m.diffuseColor = col3(c);
  m.specularColor = B3.Color3.White().scale(Math.min(.9, Math.max(.03, (1 - r) * .45 + me * .5)));
  m.specularPower = 6 + (1 - r) * 90;
  if (o.emissive) m.emissiveColor = col3(o.emissive);
  if (o.side === 'double') m.backFaceCulling = false;
  m.maxSimultaneousLights = (CTX.scene && CTX.scene._maxL) || 4; m._flat = !!o.flatShading; m._lit = true;
  return m;
}
function basic3(c, o = {}) {
  const m = new B3.StandardMaterial('b', CTX.scene); m.disableLighting = true; m.emissiveColor = col3(c); m.diffuseColor = B3.Color3.Black(); m.specularColor = B3.Color3.Black();
  if (o.fog === false) m.fogEnabled = false; if (o.alpha !== undefined) m.alpha = o.alpha; if (o.add) m.alphaMode = B3.Constants.ALPHA_ADD; if (o.double) m.backFaceCulling = false;
  return m;
}
function mk(mesh, mat, x = 0, y = 0, z = 0, cast = true) {
  if (mat) { mesh.material = mat; if (mat._flat) mesh.convertToFlatShadedMesh(); }
  mesh.position.set(x, y, z); mesh.receiveShadows = true; mesh.isPickable = false;
  if (cast && CTX.shadows && mat && mat._lit) CTX.shadows.addShadowCaster(mesh, false);
  return mesh;
}

export { V3, addScaled, inPlaceKeep, runDue, col3, C3_CHARM, C3_SPICE, C3_TGT, lerpC, mat3, basic3, mk };
