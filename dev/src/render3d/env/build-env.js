// render3d/env/build-env.js — строки 1295–1351 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { MB, dynTex, glowSprite, groundCanvas } from '../geometry.js';
import { addParticles3 } from './particles.js';
import { PROPS3 } from './props.js';
import { SC, SHG, V3, basic3, col3, lerpC, mat3, set_SHG } from '../materials.js';
import { B3, ENV3 } from '../base.js';
import { NZ, SCN, sstep } from '../../render2d/scenes.js';
import { sRng } from '../../core/rng.js';

// ---------- environment ----------
// perf step 5 (agreed compromise): scenery keeps casting, the sun shadow map is refreshed every 2nd frame
function staticNoCast(A) { try { const sm = A.shadows && A.shadows.getShadowMap(); if (sm) sm.refreshRate = 2; } catch (e) {} }
function buildEnv(A, key, day) {
  let E = ENV3[key] || ENV3.desert, S = SCN[key] || SCN.desert;
  if (day && E.night) { E = { ...E, night: 0, sand: '#b88a5e', sand2: '#6a4632' }; S = SCN.canyon; }
  A.env = E; if ((E.props || []).includes('cave')) SC._maxL = 8; // perf step 6: cave keeps its 4 torch lights (+hemi, sun, aura)
  const fogC = col3(S.fog || S.sky[2]);
  SC.fogMode = B3.Scene.FOGMODE_LINEAR; SC.fogColor = fogC; SC.fogStart = E.fogNear || 34; SC.fogEnd = E.fogFar || 150;
  SC.clearColor = new B3.Color4(fogC.r, fogC.g, fogC.b, 1); SC.ambientColor = B3.Color3.Black();
  // sky dome with vertex-colour gradient
  const sky = MB().CreateSphere('sky', { diameter: 840, segments: 24, sideOrientation: B3.Mesh.BACKSIDE }, SC), sp = sky.getVerticesData(B3.VertexBuffer.PositionKind), cols = [];
  const s0 = col3(S.sky[0]), s1 = col3(S.sky[1]), s2 = col3(S.sky[2]);
  for (let i = 0; i < sp.length; i += 3) { const t = Math.min(1, 1 - Math.max(0, sp[i + 1] / 420)) ** 1.6; const c = t < .55 ? lerpC(s0, s1, t / .55) : lerpC(s1, s2, (t - .55) / .45); cols.push(c.r, c.g, c.b, 1); }
  sky.setVerticesData(B3.VertexBuffer.ColorKind, cols); const skm = basic3('#ffffff', { fog: false }); skm.disableDepthWrite = true; sky.material = skm; sky.infiniteDistance = true; sky.isPickable = false; A.sky = sky;
  // lights
  const sunDir = S.sun ? V3((S.sun[0] - .5) * 2.2, Math.max(.18, (.75 - S.sun[1]) * 1.9), -1).normalize() : V3(-.6, .7, -.4).normalize();
  const hemi = new B3.HemisphericLight('hemi', V3(0, 1, 0), SC); hemi.diffuse = E.night || E.dark ? col3('#6a6a9a') : s2.clone(); hemi.groundColor = col3(E.sand2); hemi.intensity = E.night ? .5 : E.dark ? .4 : .8; hemi.specular = B3.Color3.Black();
  const sun = new B3.DirectionalLight('sun', sunDir.scale(-1), SC); sun.position = sunDir.scale(40);
  sun.diffuse = S.sun ? lerpC(col3(S.sun[3]), col3('#ffd8a0'), .35) : col3('#9aa6d8'); sun.intensity = E.night ? .6 : E.dark ? .3 : 1.35;
  sun.autoUpdateExtends = false; sun.autoCalcShadowZBounds = false; sun.orthoLeft = -17; sun.orthoRight = 17; sun.orthoTop = 13; sun.orthoBottom = -13; sun.shadowMinZ = 1; sun.shadowMaxZ = 120;
  set_SHG(new B3.ShadowGenerator(A.small ? 1024 : 2048, sun));
  if (A.engine.webGLVersion >= 2) { SHG.usePercentageCloserFiltering = true; SHG.filteringQuality = B3.ShadowGenerator.QUALITY_MEDIUM; } else SHG.usePoissonSampling = true;
  SHG.bias = .0008; SHG.normalBias = .02; SHG.darkness = .25; A.sun = sun; A.shadows = SHG;
  if (S.sun) glowSprite(S.sun[3], 90, sunDir.x * 380, sunDir.y * 380, sunDir.z * 380);
  if (E.night) {
    const n = 900, pos = [], r = sRng(3); for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, ph = Math.acos(r() * .95); pos.push(Math.sin(ph) * Math.cos(th) * 400, Math.cos(ph) * 400, Math.sin(ph) * Math.sin(th) * 400); }
    const stars = new B3.Mesh('stars', SC), vd = new B3.VertexData(); vd.positions = pos; vd.indices = Array.from({ length: n }, (_, i) => i); vd.applyToMesh(stars);
    const sm = basic3('#ffffff', { fog: false }); sm.pointsCloud = true; sm.pointSize = 2; stars.material = sm; stars.infiniteDistance = true;
    for (const [x, y, s] of [[-140, 170, 46], [-80, 210, 22]]) glowSprite('#f2ecd8', s, x, y, -330, false);
  }
  // ground (displaced, vertex-coloured, textured)
  const gk = E.ground, size = 160, seg = A.small ? 120 : 170;
  const ground = MB().CreateGround('ground', { width: size, height: size, subdivisions: seg, updatable: true }, SC);
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
}
function heightAt(kind, x, z) {
  const r = Math.hypot(x, z * 1.25), far = sstep(13, 44, r);
  if (kind === 'dunes') { const n = NZ(x * .03 + 50, z * .03 + 20, 4), rr = 1 - Math.abs(2 * n - 1); return Math.pow(rr, 1.6) * 4.6 * far + (NZ(x * .1, z * .1, 2) - .5) * .35 * (.3 + far); }
  if (kind === 'flat') return (NZ(x * .05, z * .05, 2) - .5) * .25 * far;
  if (kind === 'rocky') return (NZ(x * .08, z * .08, 3) - .5) * .9 - sstep(20, 27, Math.hypot(x * .8, z + 6)) * 9;
  return 0;
}

export { staticNoCast, buildEnv, heightAt };
