// render3d/env/build-env.js — строки 1295–1351 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { MB, dynTex, glowSprite, groundCanvas } from '../geometry.js';
import { addParticles3 } from './particles.js';
import { PROPS3 } from './props.js';
import { V3, basic3, col3, lerpC, mat3 } from '../materials.js';
import { CTX, withCtx } from '../ctx.js';
import { B3, ENV3 } from '../base.js';
import { gfx } from '../quality.js';
import { NZ, SCN, sstep } from '../../render2d/scenes.js';
import { sRng } from '../../core/rng.js';

// ---------- environment ----------
// perf step 5 (agreed compromise): scenery keeps casting, the sun shadow map is refreshed every 2nd frame
function staticNoCast(A) { try { const sm = A.shadows && A.shadows.getShadowMap(); if (sm) sm.refreshRate = gfx(A.small).shadowRefresh; } catch (e) {} }
function buildEnv(A, key, day, ctx) { return withCtx(ctx, () => {
  let E = ENV3[key] || ENV3.desert, S = SCN[key] || SCN.desert;
  if (day && E.night) { E = { ...E, night: 0, sand: '#b88a5e', sand2: '#6a4632' }; S = SCN.canyon; }
  A.env = E; if ((E.props || []).includes('cave')) CTX.scene._maxL = 8; // perf step 6: cave keeps its 4 torch lights (+hemi, sun, aura)
  const fogC = col3(S.fog || S.sky[2]);
  CTX.scene.fogMode = B3.Scene.FOGMODE_LINEAR; CTX.scene.fogColor = fogC; CTX.scene.fogStart = E.fogNear || 34; CTX.scene.fogEnd = E.fogFar || 150;
  CTX.scene.clearColor = new B3.Color4(fogC.r, fogC.g, fogC.b, 1); CTX.scene.ambientColor = B3.Color3.Black();
  // sky dome with vertex-colour gradient
  const sky = MB().CreateSphere('sky', { diameter: 840, segments: 24, sideOrientation: B3.Mesh.BACKSIDE }, CTX.scene), sp = sky.getVerticesData(B3.VertexBuffer.PositionKind), cols = [];
  const s0 = col3(S.sky[0]), s1 = col3(S.sky[1]), s2 = col3(S.sky[2]);
  for (let i = 0; i < sp.length; i += 3) { const t = Math.min(1, 1 - Math.max(0, sp[i + 1] / 420)) ** 1.6; const c = t < .55 ? lerpC(s0, s1, t / .55) : lerpC(s1, s2, (t - .55) / .45); cols.push(c.r, c.g, c.b, 1); }
  sky.setVerticesData(B3.VertexBuffer.ColorKind, cols); const skm = basic3('#ffffff', { fog: false }); skm.disableDepthWrite = true; sky.material = skm; sky.infiniteDistance = true; sky.isPickable = false; A.sky = sky;
  // lights
  const sunDir = S.sun ? V3((S.sun[0] - .5) * 2.2, Math.max(.18, (.75 - S.sun[1]) * 1.9), -1).normalize() : V3(-.6, .7, -.4).normalize();
  const hemi = new B3.HemisphericLight('hemi', V3(0, 1, 0), CTX.scene); hemi.diffuse = E.night || E.dark ? col3('#6a6a9a') : s2.clone(); hemi.groundColor = col3(E.sand2); hemi.intensity = E.night ? .5 : E.dark ? .4 : .8; hemi.specular = B3.Color3.Black();
  const sun = new B3.DirectionalLight('sun', sunDir.scale(-1), CTX.scene); sun.position = sunDir.scale(40);
  sun.diffuse = S.sun ? lerpC(col3(S.sun[3]), col3('#ffd8a0'), .35) : col3('#9aa6d8'); sun.intensity = E.night ? .6 : E.dark ? .3 : 1.35;
  sun.autoUpdateExtends = false; sun.autoCalcShadowZBounds = false; sun.orthoLeft = -17; sun.orthoRight = 17; sun.orthoTop = 13; sun.orthoBottom = -13; sun.shadowMinZ = 1; sun.shadowMaxZ = 120;
  CTX.shadows = new B3.ShadowGenerator(gfx(A.small).shadowSize, sun, undefined, undefined, true);
  if (A.engine.webGLVersion >= 2) { CTX.shadows.usePercentageCloserFiltering = true; CTX.shadows.filteringQuality = gfx(A.small).shadowQ === 'low' ? B3.ShadowGenerator.QUALITY_LOW : B3.ShadowGenerator.QUALITY_MEDIUM; } else CTX.shadows.usePoissonSampling = true;
  CTX.shadows.bias = .0008; CTX.shadows.normalBias = .02; CTX.shadows.darkness = .25; A.sun = sun; A.shadows = CTX.shadows;
  if (S.sun) glowSprite(S.sun[3], 90, sunDir.x * 380, sunDir.y * 380, sunDir.z * 380);
  if (E.night) {
    const n = 900, pos = [], r = sRng(3); for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, ph = Math.acos(r() * .95); pos.push(Math.sin(ph) * Math.cos(th) * 400, Math.cos(ph) * 400, Math.sin(ph) * Math.sin(th) * 400); }
    const stars = new B3.Mesh('stars', CTX.scene), vd = new B3.VertexData(); vd.positions = pos; vd.indices = Array.from({ length: n }, (_, i) => i); vd.applyToMesh(stars);
    const sm = basic3('#ffffff', { fog: false }); sm.pointsCloud = true; sm.pointSize = 2; stars.material = sm; stars.infiniteDistance = true;
    for (const [x, y, s] of [[-140, 170, 46], [-80, 210, 22]]) glowSprite('#f2ecd8', s, x, y, -330, false);
  }
  // ground (displaced, vertex-coloured, textured)
  const gk = E.ground, size = 160, seg = gfx(A.small).groundSeg;
  const ground = MB().CreateGround('ground', { width: size, height: size, subdivisions: seg, updatable: true }, CTX.scene);
  const p = ground.getVerticesData(B3.VertexBuffer.PositionKind), vc = [], c1 = col3(E.sand), c2 = col3(E.sand2), spice = E.spice ? col3(E.spice) : null;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], z = p[i + 2], y = heightAt(gk, x, z); p[i + 1] = y;
    const n = NZ(x * .06 + 9, z * .06 + 4, 3); let c = lerpC(c1, c2, Math.min(1, Math.max(0, (n - .35) * 1.4 - y * .04)));
    if (spice) { const sn = NZ(x * .05 + 31, z * .05 + 7, 3); if (sn > .55) c = lerpC(c, spice, Math.min(.8, (sn - .55) * 3)); }
    vc.push(c.r, c.g, c.b, 1);
  }
  ground.updateVerticesData(B3.VertexBuffer.PositionKind, p); ground.setVerticesData(B3.VertexBuffer.ColorKind, vc);
  const nr = []; B3.VertexData.ComputeNormals(p, ground.getIndices(), nr); ground.updateVerticesData(B3.VertexBuffer.NormalKind, nr);
  const gm = mat3('#ffffff', { roughness: gk === 'floor' ? .35 : .95, metalness: gk === 'floor' ? .15 : 0 }); gm.diffuseTexture = dynTex(groundCanvas(E.tex || 'sand'), (E.tex || 'sand') === 'tile' ? 10 : 22);
  ground.material = gm; ground.receiveShadows = true; ground.isPickable = false; A.ground = ground;
  A.heightAt = (x, z) => heightAt(gk, x, z);
  for (const pr of E.props || []) PROPS3[pr] && PROPS3[pr](A, E, S);
  staticNoCast(A); // perf step 5: shadow map every 2nd frame
  if (E.parts) addParticles3(A, E.parts, E);
}); }
// фаза 6, шаг 4 (MED): тени и контактный AO статичных пропсов запекаются в карту освещения земли (UV2, квадрат ±R м вокруг центра),
// пропсы уходят из карты теней — в ней остаются только персонажи. Множитель на текстуру: (hemi + darkness·sun) / (hemi + sun) по нормали земли.
const BAKE_R = 22, BAKE_N = 256;
function bakeStatic(A) { try { bakeImpl(A); } catch (e) { console.warn('bake', e); } }
function bakeImpl(A) {
  const Q = gfx(A.small), sm = A.shadows && A.shadows.getShadowMap(), G = A.ground; if (!Q.bake || !sm || !G || !A.sun) return;
  const t0 = performance.now(), casters = (sm.renderList || []).filter(m => m && m !== G && !m.isDisposed()); if (!casters.length) return;
  const N = BAKE_N, R = BAKE_R, cs = 2 * R / N, L = A.sun.direction.scale(-1).normalize(), dark = A.shadows.darkness;
  const hemi = A.scene.lights.find(l => l instanceof B3.HemisphericLight), hI = hemi ? hemi.intensity : 0, sI = A.sun.intensity;
  const sh = new Float32Array(N * N).fill(1), ao = new Float32Array(N * N).fill(1), ray = new B3.Ray(V3(), L, 400), v = V3();
  const H = (x, z) => A.heightAt(x, z), ix = x => Math.floor((x + R) / cs);
  for (const m of casters) {
    m.computeWorldMatrix(true); const bb = m.getBoundingInfo().boundingBox, lo = bb.minimumWorld, hi = bb.maximumWorld;
    // след тени: углы AABB, сдвинутые вдоль -L до уровня земли под объектом
    const gy = H((lo.x + hi.x) / 2, (lo.z + hi.z) / 2) - .3, k = (hi.y - gy) / Math.max(.05, L.y);
    let x0 = Math.min(lo.x, lo.x - L.x * k), x1 = Math.max(hi.x, hi.x - L.x * k), z0 = Math.min(lo.z, lo.z - L.z * k), z1 = Math.max(hi.z, hi.z - L.z * k);
    const i0 = Math.max(0, ix(x0)), i1 = Math.min(N - 1, ix(x1)), j0 = Math.max(0, ix(z0)), j1 = Math.min(N - 1, ix(z1));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const q = j * N + i; if (!sh[q]) continue;
      const x = -R + (i + .5) * cs, z = -R + (j + .5) * cs; ray.origin.set(x, H(x, z) + .03, z);
      if (ray.intersectsBoxMinMax(lo, hi) && m.intersects(ray, true).hit) sh[q] = 0; }
    // контактный AO: затемнение у основания по расстоянию до габарита в плане, радиус от высоты объекта
    const ht = hi.y - lo.y; if (lo.y - H((lo.x + hi.x) / 2, (lo.z + hi.z) / 2) > .6 || ht < .08) continue;
    const r = Math.min(1.4, .35 + ht * .45), a0 = Math.max(0, ix(lo.x - r)), a1 = Math.min(N - 1, ix(hi.x + r)), b0 = Math.max(0, ix(lo.z - r)), b1 = Math.min(N - 1, ix(hi.z + r));
    for (let j = b0; j <= b1; j++) for (let i = a0; i <= a1; i++) { const x = -R + (i + .5) * cs, z = -R + (j + .5) * cs;
      const d = Math.hypot(Math.max(lo.x - x, 0, x - hi.x), Math.max(lo.z - z, 0, z - hi.z)), o = Math.max(0, 1 - d / r);
      if (o > 0) ao[j * N + i] *= 1 - .3 * o * o; }
  }
  // мягкий край (2 прохода 3×3) — как PCF у карты теней
  const blur = a => { const b = new Float32Array(a.length); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0, n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const y = j + dj, x = i + di; if (x >= 0 && y >= 0 && x < N && y < N) { s += a[y * N + x]; n++; } } b[j * N + i] = s / n; } return b; };
  const S1 = blur(blur(sh)), px = new Uint8Array(N * N * 4), sc = A.sun.diffuse, hc = hemi ? hemi.diffuse : sc, hg = hemi ? hemi.groundColor : sc;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const q = j * N + i, x = -R + (i + .5) * cs, z = -R + (j + .5) * cs;
    const edge = i === 0 || j === 0 || i === N - 1 || j === N - 1, e = .4, nx = H(x - e, z) - H(x + e, z), nz = H(x, z - e) - H(x, z + e), nl = Math.hypot(nx, 2 * e, nz);
    v.set(nx / nl, 2 * e / nl, nz / nl); const nd = Math.max(0, B3.Vector3.Dot(v, L)) * sI, w = .5 + .5 * v.y, s = edge ? 1 : S1[q], a = edge ? 1 : Math.max(.75, ao[q]);   // AO не глубже 0,75 (кольцо камней у костра сливалось в пятно)
    for (let c = 0; c < 3; c++) { const k = c ? c === 1 ? 'g' : 'b' : 'r', lh = (hc[k] * w + hg[k] * (1 - w)) * hI, ls = sc[k] * nd;
      px[q * 4 + c] = Math.round(255 * Math.min(1, a * (lh + ls * (dark + (1 - dark) * s)) / Math.max(1e-4, lh + ls))); }
    px[q * 4 + 3] = 255; }
  // текстура через канвас (RawTexture в чанк Babylon не входит): строка j (z растёт) → v = j/N; DynamicTexture с invertY кладёт верх канваса в v = 1
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) img.data.set(px.subarray(j * N * 4, (j + 1) * N * 4), (N - 1 - j) * N * 4);
  g.putImageData(img, 0, 0);
  const T = new B3.DynamicTexture('bake', cv, A.scene, false, B3.Texture.BILINEAR_SAMPLINGMODE); T.update(true);
  T.wrapU = T.wrapV = B3.Texture.CLAMP_ADDRESSMODE; T.coordinatesIndex = 1; T.gammaSpace = false;
  const p = G.getVerticesData(B3.VertexBuffer.PositionKind), uv = new Float32Array(p.length / 3 * 2);
  for (let i = 0, k = 0; i < p.length; i += 3, k += 2) { uv[k] = (p[i] + R) / (2 * R); uv[k + 1] = (p[i + 2] + R) / (2 * R); }
  G.setVerticesData(B3.VertexBuffer.UV2Kind, uv); G.material.lightmapTexture = T; G.material.useLightmapAsShadowmap = true;
  for (const m of casters) A.shadows.removeShadowCaster(m, false);
  A.bakeMs = Math.round(performance.now() - t0);
}
function heightAt(kind, x, z) {
  const r = Math.hypot(x, z * 1.25), far = sstep(13, 44, r);
  if (kind === 'dunes') { const n = NZ(x * .03 + 50, z * .03 + 20, 4), rr = 1 - Math.abs(2 * n - 1); return Math.pow(rr, 1.6) * 4.6 * far + (NZ(x * .1, z * .1, 2) - .5) * .35 * (.3 + far); }
  if (kind === 'flat') return (NZ(x * .05, z * .05, 2) - .5) * .25 * far;
  if (kind === 'rocky') return (NZ(x * .08, z * .08, 3) - .5) * .9 - sstep(20, 27, Math.hypot(x * .8, z + 6)) * 9;
  return 0;
}

export { staticNoCast, buildEnv, bakeStatic, heightAt };
