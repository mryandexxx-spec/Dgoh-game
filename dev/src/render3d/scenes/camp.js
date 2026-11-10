// render3d/scenes/camp.js — строки 2504–2585 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { BT, S } from '../../core/state.js';
import { HERO_STAGE } from './hero.js';
import { Stage3D } from './base-scene.js';
import { gfx } from '../quality.js';
import { poseHuman } from '../characters/pose-generic.js';
import { makeHuman3 } from '../characters/procedural.js';
import { bakeStatic, buildEnv, staticNoCast } from '../env/build-env.js';
import { bBox, bCyl, bPlane, bSph } from '../geometry.js';
import { V3, basic3, col3, mat3, mk } from '../materials.js';
import { CTX, withCtx } from '../ctx.js';
import { B3, HAS3D, HAS_GL, loadB3 } from '../base.js';
import { wormData, wormMesh } from '../worm.js';
import { assetUrl } from '../../assets/models.js';
import { hostKick } from '../engine-host.js';
import { CH } from '../../data/chars.js';

// Small, dependency-free GLB reader for licensed static camp landmarks.
// Uses existing Babylon core primitives; no separate loader chunk or WebGL engine.
// Only glTF 2.0 triangles, float positions/normals/uvs, and JPEG base color
// textures are required by the three verified/optimized v82 assets.
async function importCampGlb(url, scene, parent, scale, style) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('camp glb HTTP ' + res.status);
  // Build artifact stores non-web asset types as base64 text; PWA serves GLB bytes.
  const bytes = url.endsWith('.txt')
    ? Uint8Array.from(atob((await res.text()).trim()), c => c.charCodeAt(0)).buffer
    : await res.arrayBuffer();
  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) throw new Error('not glTF 2.0');
  const jsonSize = view.getUint32(12, true);
  const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonSize)));
  const binAt = 20 + jsonSize + 8;
  if (doc.buffers?.length !== 1) throw new Error('GLB multiple buffers unsupported');
  const src = doc.bufferViews, acc = doc.accessors;
  const data = id => {
    const a = acc[id], v = src[a.bufferView], comps = ({SCALAR:1,VEC2:2,VEC3:3,VEC4:4})[a.type];
    const Type = ({5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array})[a.componentType];
    if (!Type || !comps) throw new Error('unsupported glTF accessor');
    const stride = v.byteStride || comps * Type.BYTES_PER_ELEMENT;
    const start = binAt + (v.byteOffset || 0) + (a.byteOffset || 0);
    if (stride === comps * Type.BYTES_PER_ELEMENT && start % Type.BYTES_PER_ELEMENT === 0)
      return new Type(bytes, start, a.count * comps);
    const out = new Type(a.count * comps), dv = new DataView(bytes);
    const read = a.componentType === 5126 ? 'getFloat32' :
      a.componentType === 5125 ? 'getUint32' : a.componentType === 5123 ? 'getUint16' : 'getUint8';
    for (let i = 0; i < a.count; i++)
      for (let k = 0; k < comps; k++)
        out[i * comps + k] = dv[read](start + i * stride + k * Type.BYTES_PER_ELEMENT, true);
    return out;
  };
  const materials = doc.materials.map((spec, idx) => {
    const material = new B3.PBRMaterial('camp-asset-' + idx, scene);
    const pbr = spec.pbrMetallicRoughness || {};
    material.albedoColor = B3.Color3.FromArray((pbr.baseColorFactor || [1,1,1,1]).slice(0,3));
    material.metallic = pbr.metallicFactor || 0;
    material.roughness = pbr.roughnessFactor ?? .85;
    material.backFaceCulling = !spec.doubleSided;
    // Art direction: warm Arrakis cloth and readable flying surfaces.
    if (style === 'tent') { material.albedoColor = B3.Color3.FromHexString('#ddad78'); material.roughness = .98; material.metallic = 0; }
    if (style === 'craft') { material.emissiveColor = B3.Color3.FromHexString('#24180d'); material.roughness = .72; material.metallic = .08; }
    const importTex = ref => {
      if (!ref) return null;
      const source = doc.images[doc.textures[ref.index].source], bv = src[source.bufferView];
      const raw = new Uint8Array(bytes, binAt + (bv.byteOffset || 0), bv.byteLength);
      const blobUrl = URL.createObjectURL(new Blob([raw], {type:source.mimeType || 'image/jpeg'}));
      return new B3.Texture(blobUrl, scene, false, false, B3.Texture.TRILINEAR_SAMPLINGMODE,
        () => URL.revokeObjectURL(blobUrl), () => URL.revokeObjectURL(blobUrl));
    };
    material.albedoTexture = importTex(pbr.baseColorTexture);
    if (spec.emissiveTexture) {
      material.emissiveTexture = importTex(spec.emissiveTexture);
      material.emissiveColor = B3.Color3.FromArray(spec.emissiveFactor || [1,1,1]);
    }
    return material;
  });
  const root = new B3.TransformNode('camp-authored-landmark', scene);
  root.parent = parent;
  root.scaling.setAll(scale);
  const nodes = doc.nodes.map((n, idx) => {
    const obj = new B3.TransformNode('camp-asset-node-' + idx, scene);
    // Sketchfab glTF nodes commonly use a matrix (centimeter conversion,
    // axis rotation and parent transforms), rather than TRS properties.
    // Applying it is mandatory: otherwise the tent and table are enormous.
    if (n.matrix) {
      obj.rotationQuaternion = new B3.Quaternion();
      B3.Matrix.FromArray(n.matrix).decompose(obj.scaling, obj.rotationQuaternion, obj.position);
    } else {
      if (n.translation) obj.position.set(...n.translation);
      if (n.scale) obj.scaling.set(...n.scale);
      if (n.rotation) obj.rotationQuaternion = new B3.Quaternion(...n.rotation);
    }
    if (n.mesh !== undefined) doc.meshes[n.mesh].primitives.forEach((p, j) => {
      if (p.mode !== undefined && p.mode !== 4) return;
      const mesh = new B3.Mesh('camp-authored-part-' + j, scene);
      const vd = new B3.VertexData();
      vd.positions = data(p.attributes.POSITION);
      if (p.attributes.NORMAL !== undefined) vd.normals = data(p.attributes.NORMAL);
      if (p.attributes.TEXCOORD_0 !== undefined) vd.uvs = data(p.attributes.TEXCOORD_0);
      vd.indices = data(p.indices);
      vd.applyToMesh(mesh, false);
      mesh.material = materials[p.material || 0];
      mesh.isPickable = false;
      mesh.parent = obj;
    });
    return obj;
  });
  doc.nodes.forEach((n, i) => (n.children || []).forEach(id => {nodes[id].parent = nodes[i];}));
  const sceneRoots = doc.scenes?.[doc.scene || 0]?.nodes || [];
  sceneRoots.forEach(i => nodes[i].parent = root);
  return root;
}

// ---------- 3D camp lobby ----------
class CampStage extends Stage3D {
  constructor() {
    super({ cls: 'stage3d camp3d', kind: 'camp' });
    this.raid = false; this.units = {}; this.campTwinSuns = true;
    withCtx({ scene: this.scene, shadows: null }, () => { buildEnv(this, 'desert'); CTX.shadows = this.shadows;
    const S = this.scene; S.fogStart = 65; S.fogEnd = 190;
    // A single 16x128 emissive sky gradient is stable on mobile Safari.
    // The previous vertex-color-only sky rendered near-black in real phone
    // screenshots; do not use the overexposed white emissive dome from v81.
    const oldSkyMat = this.sky.material;
    const skyMat = new B3.StandardMaterial('camp-sky-warm', S);
    skyMat.disableLighting = true; skyMat.diffuseColor = B3.Color3.Black();
    skyMat.emissiveColor = B3.Color3.White(); skyMat.specularColor = B3.Color3.Black();
    skyMat.fogEnabled = false; skyMat.disableDepthWrite = true;
    skyMat.backFaceCulling = false;
    const grad = new B3.DynamicTexture('camp-sky-gradient', { width: 16, height: 128 }, S, false);
    const cx = grad.getContext(), gr = cx.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#99633f'); gr.addColorStop(.45, '#b97d4c');
    gr.addColorStop(1, '#c99c65'); cx.fillStyle = gr; cx.fillRect(0, 0, 16, 128);
    grad.update(false); skyMat.emissiveTexture = grad;
    this.sky.material = skyMat; oldSkyMat.dispose();
    // Arrakis daylight: two distant emissive sun discs; only the existing sun casts shadows.
    // Distant spheres are never shadow casters, and do not introduce new render targets.
    const sunA = mk(bSph(3.5, 12), basic3('#ffc370', { fog: false }), -16, 13, -90, false);
    const sunB = mk(bSph(2.3, 10), basic3('#ffe2a2', { fog: false }), 22, 17, -103, false);
    sunA.isPickable = sunB.isPickable = false;
    const rp = new B3.ReflectionProbe('rp', gfx(this.small).probe.camp, S); rp.renderList.push(this.sky, this.ground); rp.position = V3(0, 2, 0); rp.refreshRate = B3.RenderTargetTexture.REFRESHRATE_RENDER_ONCE; S.environmentTexture = rp.cubeTexture;
    // Daylight headquarters: five heroes on open sand. No campfire, flame,
    // logs, smoke, sparks, or pulsing point light; this also saves phone GPU work.
    this.fire = V3(0, this.heightAt(0, 1.2), 1.2);
    this.fireL = null; this.fireShadow = null;
    const plaza = mat3('#c59259', { roughness: .95 });
    const ring = mk(bCyl(2.7, 2.9, .085, 16), plaza, 0, this.heightAt(0, 0) + .045, 0, false);
    ring.isPickable = false;
    // tents & crates & banners
    const tentM = mat3('#8a6a4a', { roughness: .95, side: 'double' }), darkM = mat3('#3a2a1c');
    // v81: background tents previously stood directly in front of the 7 landmarks,
    // obscuring the ornithopter and worm. The shop has its own dedicated tent.
    // Keep the foreground and both side-zone sightlines clear.
    const crateM = mat3('#6a4a2a', { roughness: .8 });
    for (const [x, z] of [[4.6, -1.5], [5.2, -1.1], [-4.4, -2.2]]) mk(bBox(.6, .5, .6), crateM, x, this.heightAt(x, z) + .25, z).rotation.y = x;
    const pole = mat3('#4a3420'), flag = mat3(S_FLAG(), { side: 'double', roughness: .9 });
    for (const x of [-3.6, 3.6]) { const z = -2.8, y = this.heightAt(x, z); mk(bCyl(.04, .05, 3.6, 8), pole, x, y + 1.8, z); this.flag = this.flag || []; const f = mk(bPlane(.9, 1.3), flag, x + .48, y + 3, z); this.flag.push(f); }
    // B2: seven distinct mode landmarks. Each uses a few static meshes and shared
    // materials; the clickable DOM anchors remain independent of these decorations.
    // The central fire and five heroes are intentionally unobstructed.
    const q = gfx(this.small), rich = q.campTotems === 'full', low = q.campTotems === 'low';
    const rock = mat3('#ad825a', { roughness: 1 }), bronze = mat3('#705442', { roughness: .85 });
    const canvas = mat3('#cfaa73', { roughness: .95 }), ink = mat3('#4b3428', { roughness: 1 });
    const ember = q.campAccents ? basic3('#ec8133') : mat3('#a15e32', { roughness: 1 });
    const glow = q.campAccents ? basic3('#ffc16d') : mat3('#a17c46', { roughness: 1 });
    const place = (shape, material, x, z, up = 0, casts = false) =>
      mk(shape, material, x, this.heightAt(x, z) + up, z, casts);
    // v81: visible, deliberately front-facing silhouettes. Anchors stay put and
    // static props live at +z (closer to camera), clear of the marker buttons.
    // Earlier B2.1 meshes had been behind large B1 tents and under the UI labels.
    const landmarkZ = .65, bright = q.campAccents ? basic3('#e5ba7b') : mat3('#c8a174', { roughness: .78 });
    const bone = mat3('#ddc28c', { roughness: .86 });
    // Legends: tall House archive stele + unmistakable luminous crest.
    place(bBox(1.0, 2.55, .7), rock, -10.4, landmarkZ, 1.28);
    place(bBox(1.25, .24, .86), bronze, -10.4, landmarkZ, 2.66);
    place(bBox(.66, .55, .13), bright, -10.4, landmarkZ + .42, 2.20);
    if (rich) place(bBox(.25, .25, .18), ember, -10.4, landmarkZ + .53, 2.20);

    const fallbackOrnithopterAt = S.meshes.length;
    // Trials: parked ornithopter viewed head-on, with an unmistakably wide
    // pair of long wings and cockpit. Raised high enough to sit above the labels.
    const craftX = -7.5, craftZ = landmarkZ + 1.15;
    place(bBox(2.8, .16, 1.05), rock, craftX, craftZ, .13); // landing pad
    const hull = place(bBox(.56, .56, 2.35), bronze, craftX, craftZ, 1.47);
    hull.rotation.x = -.10;
    const wingLeft = place(bBox(1.62, .12, .44), bright, craftX - 1.05, craftZ + .02, 1.78);
    wingLeft.rotation.z = -.20;
    const wingRight = place(bBox(1.62, .12, .44), bright, craftX + 1.05, craftZ + .02, 1.78);
    wingRight.rotation.z = .20;
    place(bBox(.48, .3, .85), ink, craftX, craftZ + .55, 1.75); // glass cockpit
    place(bBox(.22, .82, .34), canvas, craftX, craftZ - .85, 1.91); // tail fin
    if (!low) {
      const finL = place(bBox(.62, .09, 1.05), bronze, craftX - .54, craftZ - .62, 1.66);
      finL.rotation.z = -.23;
      const finR = place(bBox(.62, .09, 1.05), bronze, craftX + .54, craftZ - .62, 1.66);
      finR.rotation.z = .23;
      if (rich) {
        place(bBox(.14, .18, 1.32), ink, craftX - .43, craftZ, .62);
        place(bBox(.14, .18, 1.32), ink, craftX + .43, craftZ, .62);
      }
    }

    const fallbackOrnithopter = S.meshes.slice(fallbackOrnithopterAt + 1); // preserve the landing pad
    // Raid: Shai-Hulud emerging from sand. The front-facing dark circular maw
    // with pale radial teeth is the dominant feature, not a thin slanted post.
    const wormX = -4.8, wormZ = landmarkZ;
    place(bCyl(1.12, 1.5, .56, low ? 8 : 12), rock, wormX, wormZ, .28);
    const body = place(bCyl(.78, 1.00, 1.72, low ? 9 : 14), bronze, wormX, wormZ, 1.13);
    body.rotation.z = -.12;
    // The raid already ships an authored, textured worm model. Reuse its mouth
    // in the camp instead of approximating a famous silhouette with four cones.
    // LOW and missing-asset browsers retain a compact procedural fallback.
    const wormAsset = !low && wormData();
    if (wormAsset) {
      const mouth = wormMesh(wormAsset.mouth);
      mouth.material = mat3('#dfb184', { roughness: .76, side: 'double' });
      mouth.position.set(wormX - .1, this.heightAt(wormX, wormZ) + 2.15, wormZ + .76);
      mouth.rotation.x = Math.PI / 2;
      mouth.scaling.setAll(.72);
    } else {
      const neck = place(bCyl(.85, .71, .64, low ? 9 : 14), canvas, wormX - .12, wormZ + .14, 2.04);
      neck.rotation.x = Math.PI / 2;
      const maw = place(bSph(.79, low ? 10 : 14), ink, wormX - .12, wormZ + .53, 2.14);
      maw.scaling.set(1, 1, .26);
      for (const side of [-1, 1]) {
        const fang = place(bCyl(.01, .16, .56, 5), bone,
          wormX - .12 + side * .54, wormZ + .73, 2.16);
        fang.rotation.z = side * .55;
      }
    }
    const fallbackTableAt = S.meshes.length;
    // Centre: open headquarters formation; Arrakis tactical table stays off to the right.
    // No separate squad totem: the five heroes ARE the landmark.
    place(bBox(1.8, .16, 1.2), bronze, 2.8, -2.7, .94);
    place(bPlane(1.35, .8), glow, 2.8, -2.7, 1.035).rotation.x = Math.PI / 2;
    if (rich) {
      place(bCyl(.08, .09, .87, 6), ink, 2.1, -2.7, .46);
      place(bCyl(.08, .09, .87, 6), ink, 3.5, -2.7, .46);
    }
    const fallbackTable = S.meshes.slice(fallbackTableAt);
    // Jihad: dedicated operations station (not another aircraft cross).
    const warX = 7.3, warZ = -1.9;
    place(bBox(2.15, .24, 1.2), rock, warX, warZ, .9);
    place(bPlane(1.65, .81), glow, warX, warZ, 1.04).rotation.x = Math.PI / 2;
    place(bCyl(.09, .1, 1.68, 6), bronze, warX + .9, warZ - .55, 1.05);
    const insignia = place(bPlane(.82, .98), canvas, warX + .9, warZ - .53, 2.35);
    insignia.rotation.y = .08;
    if (!low) place(bBox(.12, .56, .09), ember, warX + .9, warZ - .47, 2.27);
    const fallbackTentAt = S.meshes.length;
    // Shops: an actual fabric market awning with open front, ridge, posts, stock
    // and counter. Replace the old giant 4-sided solid pyramid.
    const shopX = 10.5, shopZ = -2.2;
    for (const sx of [-1, 1]) {
      const roof = place(bBox(1.66, .095, 2.35), canvas,
        shopX + sx * .73, shopZ, 2.14);
      roof.rotation.z = -sx * .32;
      place(bCyl(.065, .065, 2.1, 6), bronze, shopX + sx * 1.34, shopZ + .97, 1.05);
    }
    place(bBox(2.5, 1.68, .11), ink, shopX, shopZ - 1.12, .94);
    place(bBox(2.4, .74, .6), bronze, shopX, shopZ + .78, .42);
    for (const [dx, dz, h] of [[-1.45,.45,.44],[1.46,.32,.66],[.86,1.12,.25]]) {
      place(bBox(.48, h, .46), rock, shopX + dx, shopZ + dz, h / 2);
    }
    if (rich) {
      place(bBox(.31, .33, .31), glow, shopX - .63, shopZ + .79, .97);
      place(bBox(.32, .24, .32), ember, shopX + .5, shopZ + .79, .9);
    }
    // Keep the shop's stall counter and spice crates as foreground detail when the tent loads.
    const fallbackTent = []; // retain raised awning and trade stalls around imported fabric tent
    const authored = [
      { file: 'ornithopter.glb', x: -7.5, z: landmarkZ + 1.15, y: .62, scale: .98, yaw: .3, style: 'craft', fallback: fallbackOrnithopter },
      { file: 'hologram_table.glb', x: 2.8, z: -2.7, y: 0, scale: .82, fallback: fallbackTable },
      { file: 'market_tent.glb', x: 10.5, z: -2.2, y: 0, scale: .76, style: 'tent', fallback: fallbackTent },
    ];
    // Optional until verified binary files are committed to dev/assets/models.
    // When the model loads it atomically replaces its procedural placeholder.
    for (const item of authored) {
      const url = assetUrl('models/' + item.file);
      if (!url) continue;
      const origin = new B3.TransformNode('camp-model-anchor-' + item.file, S);
      origin.position.set(item.x, this.heightAt(item.x, item.z) + (item.y || 0), item.z);
      origin.rotation.y = item.yaw || 0;
      importCampGlb(url, S, origin, item.scale, item.style).then(root => {
        if (!this.alive) { root.dispose(false, true); origin.dispose(); return; }
        item.fallback.forEach(mesh => mesh.dispose(false, false));
      }).catch(e => { origin.dispose(); console.warn('camp asset fallback', item.file, e); });
    }
    staticNoCast(this); bakeStatic(this);
    });
    this.look({ dof: { f: 50, stop: 2.4, d: 9000 }, exposure: 1.2, ssao: .55, bloomT: .9, bloomW: .25, vig: 1.25 });
    this.slots = [[0, -.7], [-1.45, -.3], [1.45, -.3], [-2.55, .6], [2.55, .6]];
  }
  setSquad(ids) {
    const key = ids.join(','); if (key === this.key0) return; this.key0 = key;
    for (const o of Object.values(this.units)) o.root.dispose(false, true); this.units = {};
    withCtx({ scene: this.scene, shadows: this.shadows }, () => {
    ids.forEach((id, k) => { const o = makeHuman3(CH[id], { pbr: true }); const [x, z] = this.slots[k] || [0, 0], y = this.heightAt(x, z);
      o.base = V3(x, y, z); o.face = -x * .16; o.side = 'A'; o.phase = k * 1.7; o.def = CH[id]; o.id = id; this.units[id] = o; if (this.fireShadow) for (const m of o.root.getChildMeshes()) this.fireShadow.addShadowCaster(m, false); });
    });
  }
  tick(now, t) {
    // Daylight has no flickering campfire.
    for (const o of Object.values(this.units)) poseHuman(this, o, now, t, 1);
    // B1: camera translation on a rail. No autonomous rotation while idle.
    const lobby = this._lv && this._lv.isConnected ? this._lv : document.querySelector('.lobby');
    const rail = lobby && lobby.dataset.lrail !== undefined ? +lobby.dataset.lrail : (lobby ? +lobby.dataset.lzone : 1);
    const desired = (rail - 1) * 7.5;
    if (!Number.isFinite(this.railX)) this.railX = 0;
    this.railX += (desired - this.railX) * Math.min(1, Math.max(0, (now - (this._railNow || now)) / 180));
    this._railNow = now;
    this.camera.position.set(this.railX, 2.6, this.fire.z + 7);
    if (!this._tg) this._tg = V3(0, 1.1, .3);
    this._tg.set(this.railX, 1.1, .3); this.camera.setTarget(this._tg); this.camera.fov = .82;
    if (this.flag) this.flag.forEach((fl, i) => { fl.rotation.y = Math.sin(t * 1.3 + i) * .25; });
  }
  post() {
    // keep the HTML squad labels over the 3D heroes (perf step 9: rects measured on rebuild / every 0.5 s, transform instead of left/top, height only on >1 px change)
    const now = performance.now(); let view = this._lv;
    if (!view || !view.isConnected) { view = this._lv = document.querySelector('.lobby'); this._lm = 0; this._lf = null; if (!view) return; }
    if (this._lf && this._lf.length && !this._lf[0].isConnected) this._lm = 0;
    if (now - (this._lm || 0) > 500) { const vr = view.getBoundingClientRect(), cr = this.cv.getBoundingClientRect(); this._ldx = cr.left - vr.left; this._ldy = cr.top - vr.top; this._lm = now; this._lf = view.querySelectorAll('.lfig[data-hid]'); this._spots = view.querySelectorAll('.spot[data-wx]'); }
    const M = this.scene.getTransformMatrix(), vp = this._vp || (this._vp = new B3.Viewport(0, 0, 1, 1)), T = this._pt || (this._pt = V3()), pa = this._pa || (this._pa = V3()), pb = this._pb || (this._pb = V3());
    vp.width = this.w; vp.height = this.h;
    // Project menu buttons from world-space bases, like the A2 world HUD.
    // Cache offsets on resize/rebuild; transforms are the only per-frame layout writes.
    const markers = this._spots || [];
    for (const el of markers) {
      const xw = Number(el.dataset.wx), zw = Number(el.dataset.wz);
      T.set(xw, this.heightAt(xw, zw) + .23, zw);
      B3.Vector3.ProjectToRef(T, B3.Matrix.IdentityReadOnly, M, vp, pa);
      const x = this._ldx + pa.x, y = this._ldy + pa.y;
      if (!el._world) { el._world = true; el.style.left = '0px'; el.style.top = '0px'; }
      if (!(Math.abs(x - el._wx) < .25 && Math.abs(y - el._wy) < .25)) {
        el._wx = x; el._wy = y;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    }
    for (const el of this._lf) { const o = this.units[el.dataset.hid]; if (!o) continue; const p = o.root.position;
      B3.Vector3.ProjectToRef(p, B3.Matrix.IdentityReadOnly, M, vp, pa); T.set(p.x, p.y + o.h, p.z); B3.Vector3.ProjectToRef(T, B3.Matrix.IdentityReadOnly, M, vp, pb);
      const x = this._ldx + pa.x, y = this._ldy + pa.y, h = Math.max(20, pa.y - pb.y);
      if (!el._hp) { el._hp = 1; el.style.left = '0px'; el.style.top = '0px'; el._hx = el._hy = el._hh = NaN; }
      if (!(Math.abs(x - el._hx) < .25 && Math.abs(y - el._hy) < .25)) { el._hx = x; el._hy = y; el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`; }
      if (!(Math.abs(h - el._hh) <= 1)) { el._hh = h; el.style.height = h + 'px'; } }
  }
  paused() { return !!(BT && BT.B) || !!document.querySelector('#overlay .detail, #overlay .sqsel'); }
  // шаг 6: лагерь — фоновая сцена, 30 fps (20 в упрощённой графике); флаг перечитывается раз в секунду
  idleMode(now) { if (Math.abs((this.railX || 0) - ((this._lv ? +this._lv.dataset.lzone : 1) - 1) * 7.5) > .05 || (this._lv && this._lv.dataset.lrail !== undefined)) return 'active'; if (!(now - this._lowAt < 1000)) { this._low = gfx(this.small).campIdle; this._lowAt = now; } return this._low; }
  slashFX() {} muzzleFX() {} voiceFX() {} castFX() {}
}
const S_FLAG = () => '#4c6b4e';
const cols4 = (arr, c) => arr.push(c.r, c.g, c.b, 1);
let CAMP_STAGE = null;
// Фаза 4: чанк Babylon ещё не загружен → лобби уже интерактивно; если загрузка длится дольше B3_WAIT, запускается
// 2D-лагерь (fallback) с плашкой «Загрузка 3D-лагеря»; по готовности 3D проявляется поверх 2D, 2D-канвас удаляется.
// Хост лобби пересоздаётся при каждой отрисовке — монтируется только тот, что ещё в DOM (без гонок).
const B3_WAIT = 250, B3_FADE = 320;
function mountCampStage(fallback) {
  const host = document.querySelector('.lobby'); if (!host) return false;
  if (!HAS3D) {
    if (!HAS_GL) return false;
    let shown = false;
    const t = setTimeout(() => { if (!host.isConnected || HAS3D) return; shown = true; if (fallback) fallback(); host.classList.add('b3wait'); }, B3_WAIT);
    loadB3().then(ok => {
      clearTimeout(t); host.classList.remove('b3wait');
      if (!host.isConnected) return;
      if (!ok || !campMount(host)) { if (!shown && fallback) fallback(); return; }
      if (!shown) return;
      host.classList.add('b3fade');
      setTimeout(() => { host.classList.remove('b3fade'); const bg = host.querySelector('#lobbybg'); if (bg) bg.remove(); }, B3_FADE);
    });
    return true;
  }
  return campMount(host);
}
function campMount(host) {
  try { if (!CAMP_STAGE || !CAMP_STAGE.alive) CAMP_STAGE = new CampStage(); CAMP_STAGE.setSquad(S.squad.slice(0, 5)); host.classList.add('has3d'); CAMP_STAGE.attach(host, true); return true; } // asleep → wake
  catch (e) { console.warn('camp stage', e); return false; }
}
// phase 3b, step 4: before a battle the lobby and hero stages go to sleep (were disposed on phones by freeStages) —
// scenes, meshes and textures stay; the next mountCampStage / mountHeroStage wakes them
function sleepStages() { try { if (HERO_STAGE) HERO_STAGE.sleep({ light: true }); if (CAMP_STAGE) CAMP_STAGE.sleep({ light: true }); } catch (e) { console.warn('sleep stages', e); } }
// resume paused stages when overlays close
setInterval(() => hostKick(), 400); // phase 3b: one render loop in EngineHost


function set_CAMP_STAGE(v) { return CAMP_STAGE = v; }
export { CampStage, S_FLAG, cols4, CAMP_STAGE, mountCampStage, set_CAMP_STAGE, sleepStages };
