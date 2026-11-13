// render3d/characters/authored.js — строки 1454–1511 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { MODEL_DATA, assetUrl, ktx2For } from '../../assets/models.js';
import { ANIM3 } from './pose-duncan.js';
import { HERO3 } from './rig.js';
import { add, bBox, bCyl, bSph, grp } from '../geometry.js';
import { basic3, col3, mat3, mk } from '../materials.js';
import { CTX, withCtx } from '../ctx.js';
import { B3 } from '../base.js';

// ---------- authored models (built in Blender, skinned to the same rig the procedural heroes use) ----------
const MODEL_CACHE = {};
function b64bytes(s) { if (typeof s !== 'string') return s.slice();   // фаза 5: из DGM1 уже байты (копия — свой ArrayBuffer с нуля)
  const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
function modelData(id) {
  if (MODEL_CACHE[id] !== undefined) return MODEL_CACHE[id];
  const R = typeof MODEL_DATA !== 'undefined' && MODEL_DATA[id]; if (!R) return (MODEL_CACHE[id] = null);
  const parts = {};
  const f32 = raw => new Float32Array(b64bytes(raw).buffer);
  for (const [k, P] of Object.entries(R.parts)) {
    const p16 = new Int16Array(b64bytes(P.p).buffer), n8 = new Int8Array(b64bytes(P.nr).buffer), c8 = b64bytes(P.c), j8 = b64bytes(P.j), w8 = b64bytes(P.w), ib = b64bytes(P.i).buffer;
    const pos = new Float32Array(p16.length), nor = new Float32Array(n8.length), col = new Float32Array(P.n * 4), jj = new Float32Array(j8.length), ww = new Float32Array(w8.length);
    for (let i = 0; i < p16.length; i++) { pos[i] = p16[i] / 10000; nor[i] = n8[i] / 127; }
    for (let v = 0; v < P.n; v++) { col[v * 4] = c8[v * 3] / 255; col[v * 4 + 1] = c8[v * 3 + 1] / 255; col[v * 4 + 2] = c8[v * 3 + 2] / 255; col[v * 4 + 3] = 1; }
    for (let i = 0; i < j8.length; i++) { jj[i] = j8[i]; ww[i] = w8[i] / 255; }
    let uv = null; if (P.uv) { const u16 = new Uint16Array(b64bytes(P.uv).buffer); uv = new Float32Array(u16.length); for (let i = 0; i < u16.length; i++) uv[i] = u16[i] / 65535; }
    parts[k] = { pos, nor, col, jj, ww, uv, material: P.material || null, alb: P.alb || null, nrm: P.nrm || null, orm: P.orm || null, idx: P.i32 ? new Uint32Array(ib) : new Uint16Array(ib) };
  }
  return (MODEL_CACHE[id] = { joints: R.joints, parts, grip: R.grip || null, materialMode: R.materialMode || null, clips: R.clips || null, v: R.v || 1, jointFormat: R.jointFormat || null, inverseBindMatrices: R.inverseBindMatrices ? f32(R.inverseBindMatrices) : null });
}
const MODEL_MAT = { skin: { roughness: .5 }, cloth: { roughness: .92 }, plate: { roughness: .42, metalness: .3, noSheen: 1 }, cape: { roughness: .95, side: 'double' }, leather: { roughness: .58 }, metal: { roughness: .28, metalness: .75 }, hair: { roughness: .7, noSheen: 1 }, eye: { roughness: .15, noSheen: 1 } };
// Фаза 5, шаг 5: текстура модели — KTX2 (байты из assets/models.js), фолбэк — JPEG по тому же пути. set(t) кладёт текстуру в материал;
// при ошибке set вызывается повторно с JPEG. Ключ кэша движка — путь JPEG + «#ktx2».
// Сбой транскодера внутри воркера (importScripts, wasm) до текстуры не доходит — текстура просто не готовится. Поэтому сторож:
// пока ни одна KTX2-текстура не загрузилась (KTX2_ST 0), созданные ждут; через KTX2_WAIT мс без единой загрузки (транскодер к этому времени уже скачан — assets/models.js loadKtx2) KTX2 выключается
// (KTX2_ST -1), ожидающие и все следующие — JPEG. Первая загрузка — KTX2_ST 1, сторож снят.
const KTX2_WAIT = 30000;
let KTX2_ST = 0, KTX2_CFG = false, KTX2_T = 0;
const KTX2_PEND = [], KTX2_KEEP = new Map();
function ktx2Cfg() {
  if (KTX2_CFG) return true;
  const K = B3.KhronosTextureContainer2, u = n => assetUrl('ktx2/' + n);
  if (!K || !u('decoder.js') || !u('msc_basis_transcoder.wasm')) { KTX2_ST = -1; return false; }
  Object.assign(K.URLConfig, { jsDecoderModule: u('decoder.js'), jsMSCTranscoder: u('msc_basis_transcoder.js'), wasmMSCTranscoder: u('msc_basis_transcoder.wasm'),
    wasmUASTCToASTC: u('uastc_astc.wasm'), wasmUASTCToBC7: u('uastc_bc7.wasm'), wasmUASTCToRGBA_UNORM: u('uastc_rgba8_unorm_v2.wasm'),
    wasmUASTCToRGBA_SRGB: u('uastc_rgba8_srgb_v2.wasm'), wasmZSTDDecoder: u('zstddec.wasm') });
  K.DefaultNumWorkers = 1;   // 24 текстуры, транскод — десятки мс; второй воркер — лишняя память на телефоне
  return (KTX2_CFG = true);
}
function ktx2Fail(why) {
  if (KTX2_ST !== 0) return; KTX2_ST = -1; clearTimeout(KTX2_T); console.warn('KTX2 выключен, текстуры — JPEG:', why);
  for (const p of KTX2_PEND.splice(0)) p.fallback();
}
function tex3(url, scene, set) {
  const jpg = () => set(new B3.Texture(url, scene, false, true));
  const b = ktx2For(url); if (KTX2_ST < 0 || !b || !ktx2Cfg()) return jpg();
  let t = null, done = false;
  const p = { fallback: () => { if (done) return; done = true; if (t) t.dispose(); if (!scene.isDisposed) jpg(); } };
  t = new B3.Texture(url + '#ktx2', scene, { noMipmap: false, invertY: true, buffer: b, forcedExtension: '.ktx2',
    onLoad: () => { if (KTX2_ST === 0) { KTX2_ST = 1; clearTimeout(KTX2_T); }
      const i = KTX2_PEND.indexOf(p); if (i >= 0) KTX2_PEND.splice(i, 1); },
    onError: (m, e) => { console.warn('KTX2 → JPEG', url, m || e); const i = KTX2_PEND.indexOf(p); if (i >= 0) KTX2_PEND.splice(i, 1);
      const k = KTX2_KEEP.get(url); if (k) { KTX2_KEEP.delete(url); k.dispose(); } p.fallback(); } });
  if (done) return;
  // транскод — в воркере, не мгновенно: внутренняя текстура держится в кэше движка с момента создания — если сцена (бой) закрыта
  // до конца транскода, он не теряется, и следующая сцена берёт текстуру из кэша (готовую или ещё в работе), а не транскодирует заново
  { const it = t.getInternalTexture(); if (it && !KTX2_KEEP.has(url)) { KTX2_KEEP.set(url, it); it.incrementReferences(); } }
  set(t);
  if (KTX2_ST === 0 && !t.isReady()) { KTX2_PEND.push(p); if (!KTX2_T) KTX2_T = setTimeout(() => ktx2Fail('нет загрузок за ' + KTX2_WAIT / 1000 + ' с'), KTX2_WAIT); }
}
// Projected/baked albedo assets without calibrated ORM use the same direct-lit
// material in the portrait, hero stage and battle, on every graphics tier.
function makeModel3(def, D) { return withCtx(D.materialMode === 'standard' ? { pbr: false } : null, () => {
  const SHG0 = CTX.shadows; CTX.shadows = null;
  const X = HERO3[def.id] || {}, root = grp(null), body = grp(root), N = {}, abs = {};
  const localTrs = D.v >= 5 && D.jointFormat === 'local-trs';
  for (const [nm, p, par, rot, scale] of D.joints) {
    const pp = !localTrs && par ? abs[par] : [0, 0, 0];
    abs[nm] = p;
    const n = N[nm] = grp(par ? N[par] : body, p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
    n.name = nm;
    if (localTrs) {
      n.rotationQuaternion = new B3.Quaternion(...(rot || [0, 0, 0, 1]));
      n.scaling.copyFromFloats(...(scale || [1, 1, 1]));
    }
  }
  const skel = new B3.Skeleton('sk_' + def.id, 'sk_' + def.id, CTX.scene), BN = {};
  for (const [nm, p, par] of D.joints) {
    const n = N[nm];
    const bind = localTrs ? B3.Matrix.Compose(n.scaling, n.rotationQuaternion, n.position) : B3.Matrix.Translation(n.position.x, n.position.y, n.position.z);
    BN[nm] = new B3.Bone(nm, skel, par ? BN[par] : null, bind);
    BN[nm].linkTransformNode(n);
  }
  const mats = [];
  for (const [k, P] of Object.entries(D.parts)) {
    const me = new B3.Mesh(def.id + '_' + k, CTX.scene), vd = new B3.VertexData();
    let col = P.col; if (CTX.pbr) { col = col.slice(); for (let i = 0; i < col.length; i++) if (i % 4 !== 3) col[i] = Math.pow(col[i], 2.2); }
    vd.positions = P.pos; vd.normals = P.nor; if (!P.alb) vd.colors = col; if (P.uv) vd.uvs = P.uv; vd.indices = P.idx; vd.applyToMesh(me, false);
    me.setVerticesData(B3.VertexBuffer.MatricesIndicesKind, P.jj, false); me.setVerticesData(B3.VertexBuffer.MatricesWeightsKind, P.ww, false);
    me.numBoneInfluencers = 4; me.skeleton = skel; me.parent = body; me.receiveShadows = true; me.isPickable = false; me.alwaysSelectAsActiveMesh = true;
    // BH8: each material part in the owner's optimized legendary DGM uses a
    // *constant* sRGB vertex color, no albedo texture. In PBR on the phone its
    // vertex-color path washed the dark robe out to pale white. Set the exact
    // part color on the material and prevent a second vertex-color multiply.
    // Scope ONLY baron_legend; young Baron, Duncan and all others unchanged.
    const legendSolid = def.id === 'baron_legend' && !P.alb && P.col.length >= 4;
    const legendColor = legendSolid ? '#' + [0, 1, 2].map(i =>
      Math.round(Math.max(0, Math.min(1, P.col[i])) * 255).toString(16).padStart(2, '0')).join('') : '#ffffff';
    if (legendSolid) me.useVertexColors = false;
    const m = mat3(legendColor, P.material || MODEL_MAT[k] || {}); me.material = m; if (m._lit) mats.push(m);
    if (P.alb) tex3(P.alb, CTX.scene, t => {
      if (m instanceof B3.PBRMaterial) m.albedoTexture = t;
      else {
        m.diffuseTexture = t;
        if (def.id === 'duncan' && D.jointFormat === 'local-trs') {
          // Meshy's baked albedo contains skin, cloth and armor illumination.
          // Reuse that exact texture as a modest light-independent fill on the
          // StandardMaterial. This preserves fine albedo details on MED/LOW
          // without changing the stage lights or affecting other characters.
          // Do not disable direct lights: highlights and form still react to them.
          m.emissiveTexture = t;
          m.emissiveColor = new B3.Color3(.34, .34, .34);
        }
      }
    });
    if (P.nrm) tex3(P.nrm, CTX.scene, t => { m.bumpTexture = t; t.level = k === 'skin' ? .7 : 1; m.invertNormalMapY = true; });
    if (P.orm && m instanceof B3.PBRMaterial) {          // R: ambient occlusion, G: roughness, B: metallic (baked in Blender)
      tex3(P.orm, CTX.scene, t => { m.metallicTexture = t; }); m.useAmbientOcclusionFromMetallicTextureRed = true; m.useRoughnessFromMetallicTextureGreen = true; m.useMetallnessFromMetallicTextureBlue = true;
      m.metallic = 1; m.roughness = 1; m.sheen.isEnabled = false; m.environmentIntensity = .75;
    }
    if (m instanceof B3.PBRMaterial && (k === 'skin' || k === 'cape')) {    // light bleeding through ears / thin cloth when back-lit
      m.subSurface.isTranslucencyEnabled = true; m.subSurface.translucencyIntensity = k === 'skin' ? .12 : .25; m.subSurface.tintColor = col3(k === 'skin' ? '#d0583c' : '#8a6a48');
      m.subSurface.maximumThickness = k === 'skin' ? 1 : .05; m.subSurface.tintColorAtDistance = k === 'skin' ? .08 : .05;
    }
    if (m instanceof B3.PBRMaterial && k === 'eye') { m.clearCoat.isEnabled = true; m.clearCoat.intensity = 1; m.clearCoat.roughness = .04; }
    if (SHG0 && k !== 'eye') SHG0.addShadowCaster(me, false);
  }
  // Muad'Dib: place faint blue accents on the ACTUAL textured iris centres,
  // not at the HeadFront joint origin (which sits at mouth height).
  // Calibrated against the released DGM v5 bind-pose geometry: the albedo's
  // existing blue iris vertices are at world x≈±.03, y≈1.582, z≈.179.
  // Coordinates below are in the HeadFront local basis, offset 3 mm forward
  // from the textured eye surface; parent follows authored head animations.
  if (def.id === 'muaddib' && N.headfront) {
    const MUAD_IRIS_LOCALS = [[-0.0342, 0.1071, -0.0101], [0.0258, 0.1076, -0.0107]];
    const iris = basic3('#478aff');
    MUAD_IRIS_LOCALS.forEach(([x, y, z], i) => {
      const eye = add(N.headfront, mk(bSph(.0055, 10), iris, x, y, z, false));
      eye.name = i === 0 ? 'muad_iris_L' : 'muad_iris_R';
      eye.isPickable = false;
    });
  }
  const R = { sh: N.shR, el: N.elR, hand: N.handR }, Lf = { sh: N.shL, el: N.elL, hand: N.handL }, LL = { hip: N.hipL, knee: N.kneeL, ank: N.ankL }, LR = { hip: N.hipR, knee: N.kneeR, ank: N.ankR };
  // the sword stays procedural (shared look with the rest of the roster)
  const gp = D.grip ? D.grip.p : [0, -.04, .01], w = grp(R.hand, gp[0], gp[1], gp[2]), steel = mat3('#eef2f6', { metalness: .6, roughness: .18, emissive: '#1a1e24' }), gold = mat3('#b08a3a', { metalness: .6, roughness: .3 });
  if (def.basic.dt === 'blade') {
    if (def.id === 'muaddib') {
      // Muad'Dib carries a compact curved crysknife, not the shared 0.9m sword.
      // Keep the existing bone/grip and shadow behavior, with no new textures.
      const ivory = mat3('#e9e0c6', { metalness: .05, roughness: .28, emissive: '#17140e' });
      const grip = mat3('#49372b', { roughness: .75 });
      const guard = mat3('#968269', { metalness: .3, roughness: .46 });
      add(w, mk(bCyl(.024, .02, .14, 8), grip, 0, -.055, 0));
      add(w, mk(bBox(.12, .026, .045), guard, 0, .028, 0));
      const p1 = add(w, mk(bBox(.045, .19, .019), ivory, 0, .13, 0)); p1.rotation.z = -.10;
      const p2 = add(w, mk(bBox(.037, .13, .016), ivory, -.018, .275, 0)); p2.rotation.z = -.28;
      const tip = add(w, mk(bBox(.023, .067, .012), ivory, -.047, .363, 0)); tip.rotation.z = -.45;
      w.rotation.x = 1.6; mats.push(ivory, grip, guard);
      steel.dispose(); gold.dispose();
    } else {
      add(w, mk(bBox(.03, .9, .012), steel, 0, .5, 0));
      add(w, mk(bBox(.18, .028, .045), gold, 0, .04, 0));
      add(w, mk(bCyl(.02, .02, .14, 8), mat3('#3a2a1a'), 0, -.05, 0));
      add(w, mk(bSph(.03, 8), gold, 0, -.13, 0));
      w.rotation.x = 1.6; mats.push(steel, gold);
    }
  } else { steel.dispose(); gold.dispose(); }
  for (const m of w.getChildMeshes()) if (SHG0) SHG0.addShadowCaster(m, false);
  const sc = (def.role === 'tank' ? 1.05 : 1) * (def.legendary ? 1.08 : 1), tl = X.tall || 1; root.scaling.set(sc * (tl > 1 ? 1.03 : 1), sc * tl, sc * (tl > 1 ? 1.03 : 1));
  for (const m of mats) m._baseEm = m.emissiveColor.clone();
  CTX.shadows = SHG0; root._authored = 1;
  // Source GLB rotations are sampled by the existing scene update, on every
  // quality tier. No AnimationGroup observer or extra render loop is needed.
  root._clips = D.clips ? Object.fromEntries(Object.entries(D.clips).map(([key, clip]) => [key, {
    duration: clip.duration, tracks: clip.tracks.map(tr => localTrs ? {
      node: N[tr.joint], path: tr.path, times: new Float32Array(b64bytes(tr.times).buffer),
      values: new Float32Array(b64bytes(tr.values).buffer), componentCount: tr.componentCount,
      qa: tr.path === 'rotation' ? B3.Quaternion.Identity() : null,
      qb: tr.path === 'rotation' ? B3.Quaternion.Identity() : null
    } : { node: N[tr.joint], times: tr.times, rotations: tr.rotations.map(q => new B3.Quaternion(...q)) })
  }])) : null;
  if (localTrs) {
    // Mixamo root motion is handled by the game's actor movement. Preserve only
    // the pelvis height change, not its X/Z travel (which causes sliding).
    root._clipNames = { Idle: 'Idle_11', Attack: 'Right_Hand_Sword_Slash',
      special: 'Charged_Spell_Cast', ult: 'mage_soell_cast_1',
      Hit: 'Stand_Dodge', Death: 'Charged_Ground_Slam' };
    if (def.id === 'duncan') root._clipNames = {
      Idle: 'Combat_Stance', Attack: 'Double_Combo_Attack',
      special: 'Sword_Parry_Backward', ult: 'Triple_Combo_Attack',
      Hit: 'Hit_Reaction', Death: 'Dead', Revive: 'Stand_Up10',
      Showcase: 'Lower_Weapon_Look_Raise'
    };
    root._clipRest = Object.fromEntries(D.joints.map(([nm, p, , q, scale]) =>
      [nm, { node: N[nm], p: p.slice(), q: (q || [0, 0, 0, 1]).slice(), s: (scale || [1, 1, 1]).slice() }]));
  }
  if (N.capeA) root._capeB = [N.capeA, N.capeB, N.capeC];
  return { root, body, hips: N.hips, spine: N.spine, head: N.head, R, Lf, LL, LR, skirt: null, wpn: w, mats, h: 1.95 * sc * tl, melee: def.basic.dt === 'blade', hipY0: N.hips.position.y, anim: ANIM3[def.id] || null, capeB: root._capeB || null, stance: def.role === 'tank' && !X.noShield ? 'shield' : def.basic.dt === 'blade' ? 'guard' : 'open', float: 0 };
}); }

function poseModelClip(o, now, t, sp, stage) {
  const clips = o.root._clips; if (!clips) return;
  const names = o.root._clipNames || {};
  const idle = clips[names.Idle || 'Idle']; if (!idle) return;
  let name = 'Idle', u = ((t + (o.phase || 0)) % idle.duration) / idle.duration;
  if (o.dead && now >= o.deathT) { name = 'Death'; u = Math.min(1, (now - o.deathT) / 950); }
  else if (names.Revive && o.rise && now >= o.rise && now - o.rise < 1300) {
    name = 'Revive'; u = Math.min(1, (now - o.rise) / 1300);
  }
  else if (o.hitT && now >= o.hitT && now - o.hitT < 340 / Math.min(sp, 2)) {
    name = 'Hit'; u = (now - o.hitT) / (340 / Math.min(sp, 2));
  } else if (o.act) {
    const action = o.act;
    // The ability object (ab) is the authoritative battle action descriptor.
    // Existing heroes without a v5 clip map retain their Attack animation.
    name = names.special && action.ab === o.def?.special ? 'special'
      : names.ult && (action.ab === o.def?.ult || action.ab === o.def?.gl) ? 'ult' : 'Attack';
    u = Math.max(0, Math.min(1, (now - action.t0) / action.dur));
  }
  if (name === 'Idle' && names.Showcase && stage?.showcase && clips[names.Showcase]) {
    name = 'Showcase';
    const showcase = clips[names.Showcase];
    u = ((t + (o.phase || 0)) % showcase.duration) / showcase.duration;
  }
  const clipName = names[name] || name, clip = clips[clipName]; if (!clip) return;
  // A GLB's model-level fall offset must never leak into an authored revive
  // or subsequent idle; the source clip owns the skeleton's local pose.
  if (o.root._clipRest && name !== 'Death') {
    o.body.position.y = 0;
    o.body.rotation.x = 0;
  }
  // Reset source bind transforms at transitions: some clips omit channels.
  // Otherwise a previous action can leave an arm / pelvis in the wrong pose.
  const rest = o.root._clipRest;
  if (rest && o.root._lastClip !== clipName) {
    for (const { node, p, q, s } of Object.values(rest)) {
      node.position.copyFromFloats(p[0], p[1], p[2]);
      node.scaling.copyFromFloats(s[0], s[1], s[2]);
      // Recover even if an older/additive pose has cleared a bone quaternion.
      const rotation = node.rotationQuaternion || (node.rotationQuaternion = B3.Quaternion.Identity());
      rotation.copyFromFloats(q[0], q[1], q[2], q[3]);
    }
    o.root._lastClip = clipName;
  }
  const time = u * clip.duration;
  for (const tr of clip.tracks) {
    let i = 0; while (i < tr.times.length - 2 && time > tr.times[i + 1]) i++;
    const j = Math.min(i + 1, tr.times.length - 1), span = tr.times[j] - tr.times[i];
    const n = tr.node; if (!n) continue;

    const f = span ? Math.max(0, Math.min(1, (time - tr.times[i]) / span)) : 0;
    if (tr.values) {
      const k = tr.componentCount, a = i * k, b = j * k, v = tr.values;
      if (tr.path === 'rotation') {
        const qa = tr.qa, qb = tr.qb;
        qa.copyFromFloats(v[a], v[a + 1], v[a + 2], v[a + 3]);
        qb.copyFromFloats(v[b], v[b + 1], v[b + 2], v[b + 3]);
        const q = n.rotationQuaternion || (n.rotationQuaternion = B3.Quaternion.Identity());
        B3.Quaternion.SlerpToRef(qa, qb, f, q); q.normalize();
      } else {
        const dest = tr.path === 'translation' ? n.position : n.scaling;
        const x = v[a] + (v[b] - v[a]) * f, y = v[a + 1] + (v[b + 1] - v[a + 1]) * f,
          z = v[a + 2] + (v[b + 2] - v[a + 2]) * f;
        if (rest && tr.path === 'translation' && n === o.hips) {
          const base = rest.hips.p;
          dest.set(base[0], y, base[2]); // gameplay controls horizontal movement
        } else dest.set(x, y, z);
      }
    } else {
      const q = n.rotationQuaternion || (n.rotationQuaternion = B3.Quaternion.Identity());
      B3.Quaternion.SlerpToRef(tr.rotations[i], tr.rotations[j], f, q); q.normalize();
    }
  }
  if (name === 'Death') {
    // The clip supplies its own leg/pelvis pose: don't add the generic squat.
    // Retain a smaller whole-body fall to bring this standing source clip down.
    if (!rest) o.hips.position.y = o.hipY0;
    o.body.rotation.x *= .6;
    const k = Math.max(0, Math.min(1, (u - .7) / .3));
    o.body.position.y = -.1 * k * k * (3 - 2 * k);
  }
  o.root._clip = name;
  if (o.anim && o.anim.clipPose) o.anim.clipPose(o, now, t, sp, name, u, stage);
}

export { MODEL_CACHE, b64bytes, modelData, MODEL_MAT, makeModel3, tex3, poseModelClip };
