// render3d/characters/rig.js — строки 1418–1453 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../env/particles.js'; // порядок исполнения
import { MB } from '../geometry.js';
import { V3 } from '../materials.js';
import { CTX } from '../ctx.js';
import { B3 } from '../base.js';

// ---------- characters (rigged: hips → spine → head/arms, hips → legs) ----------
const HERO3 = {
  baron: { fat: 2.05, hairC: '#c4502a', float: .18, noStaff: 1, cane: 1, wide: 1.1 }, rabban: { wide: 1.22, bald: 1 }, feyd: { bald: 1, slim: .9 }, piter: { hair: 'long' },
  shaddam: { style: 'emperor', hairC: '#b8562e' }, fenring: { style: 'emperor', nohelm: 1 }, mohiam: { old: 1 }, jessica: { hairC: '#8a4a26', skin: '#f2d4b8', dagger: 1, look: { cloak: '#d8bf94', dark: '#b8986a', acc: '#6a4a2a', pants: '#8a6a44' } },
  thufir: { hairC: '#c8c0b0', old: 1, noStaff: 1, scars: 1, fat: 1.28 }, gurney: { scar: 1, baliset: 1, bald: 1 }, duncan: { hairC: '#151110', curly: 1, skin: '#8a5a3a', tall: 1.12, muscle: 1, noShield: 1 }, leto: { hairC: '#2a1c14', beard: 1, mus: 1, skin: '#f4dcc6' }, paul: { skin: '#f0d0b0', hairC: '#2a1c14' },
  stilgar: { beard: 1, tube: 1 }, chani: { tube: 1, hairC: '#3a1a10' }, fedaykin: { mask: 1, tube: 1 }, kynes: { tube: 1 }, liet: { tube: 1 },
  robot: { style: 'robot' }, cymek: { style: 'robot', cymek: 1 },
  erasmus: { style: 'robe', erasmus: 1, dagger: 1, noStaff: 1, tall: 1.06, skin: '#c9ced8', look: { cloak: '#7a1626', dark: '#2a0c12', acc: '#d8b050', pants: '#24242c' } },
};
function lathe(profile, seg = 18, zs = .74) { const m = MB().CreateLathe('la', { shape: profile.map(([r, y]) => V3(r, y, 0)), tessellation: seg, cap: B3.Mesh.CAP_ALL }, CTX.scene); m.scaling.z = zs; return m; }
function tube3(pts, r, seg = 8) { return MB().CreateTube('tb', { path: pts.map(p => V3(...p)), radius: r, tessellation: seg, cap: B3.Mesh.CAP_ALL }, CTX.scene); }
function foldify(mesh, amp, n) {
  const p = mesh.getVerticesData(B3.VertexBuffer.PositionKind); if (!p) return mesh;
  let ymin = Infinity, ymax = -Infinity; for (let i = 1; i < p.length; i += 3) { ymin = Math.min(ymin, p[i]); ymax = Math.max(ymax, p[i]); }
  for (let i = 0; i < p.length; i += 3) { const x = p[i], z = p[i + 2], rr = Math.hypot(x, z); if (rr < 1e-4) continue; const a = Math.atan2(z, x), k = (ymax - p[i + 1]) / (ymax - ymin || 1), f = 1 + amp * k * (Math.sin(a * n) * .7 + Math.sin(a * n * 2.3 + 1) * .3); p[i] = x * f; p[i + 2] = z * f; }
  mesh.updateVerticesData(B3.VertexBuffer.PositionKind, p, false, true); const nr = []; B3.VertexData.ComputeNormals(p, mesh.getIndices(), nr); mesh.updateVerticesData(B3.VertexBuffer.NormalKind, nr, false, true);
  return mesh;
}
// merge static meshes of each rig node into one mesh (one draw call per bone) — big win on phones
function mergeRig(root, shg) {
  const nodes = [root, ...root.getChildTransformNodes(false)], out = [];
  for (const nd of nodes) {
    const ms = nd.getChildMeshes(true).filter(m => !m.getChildren().length && m.material && m.isEnabled() && !m._noMerge);
    const byMat = new Map(); for (const m of ms) { const k = m.material.uniqueId + (m.material.backFaceCulling ? '' : 'd'); if (!byMat.has(k)) byMat.set(k, []); byMat.get(k).push(m); }
    nd.computeWorldMatrix(true); const inv = nd.getWorldMatrix().clone().invert();
    for (const grpM of byMat.values()) {
      if (grpM.length < 2) { out.push(...grpM); continue; }
      for (const m of grpM) m.computeWorldMatrix(true);
      const merged = B3.Mesh.MergeMeshes(grpM, true, true);
      if (!merged) { out.push(...grpM); continue; }
      merged.bakeTransformIntoVertices(inv); merged.parent = nd; merged.position.set(0, 0, 0); merged.rotation.set(0, 0, 0); merged.scaling.set(1, 1, 1); merged.refreshBoundingInfo();
      merged.receiveShadows = true; merged.isPickable = false; out.push(merged);
    }
  }
  if (shg) for (const m of out) shg.addShadowCaster(m, false);
}

export { HERO3, lathe, tube3, foldify, mergeRig };
