// render3d/characters/mocap.js — строки 2337–2380 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { MOCAP } from '../../assets/mocap-data.js';
import { ANIM3 } from './pose-duncan.js';
import { b64bytes } from './authored.js';
import { HERO3 } from './rig.js';
import { B3, onB3 } from '../base.js';
import { CHARS } from '../../data/chars.js';

const MOCAP_OK = !!MOCAP;
const CLIPC = {};
function mocap(name) {
  if (!MOCAP || !MOCAP[name]) return null;
  if (CLIPC[name]) return CLIPC[name];
  const R = MOCAP[name], q16 = new Int16Array(b64bytes(R.q).buffer), h16 = new Int16Array(b64bytes(R.h).buffer);
  const q = new Float32Array(q16.length), h = new Float32Array(h16.length);
  for (let i = 0; i < q16.length; i++) q[i] = q16[i] / 32767;
  for (let i = 0; i < h16.length; i++) h[i] = h16[i] / 10000;
  return (CLIPC[name] = { n: R.n, fps: R.fps, dur: (R.n - 1) / R.fps, q, h, strikes: R.strikes || [] });
}
let MQ = null, MHP = null, _mq1 = null, _mq2 = null, _mqx = null;   // фаза 4: создаются при загрузке чанка Babylon
onB3(() => { MQ = Array.from({ length: 15 }, () => new B3.Quaternion()); MHP = new B3.Vector3(); _mq1 = new B3.Quaternion(); _mq2 = new B3.Quaternion(); _mqx = new B3.Quaternion(); });
function clipSample(c, u) {
  u = Math.max(0, Math.min(1, u)); const f = u * (c.n - 1), i0 = Math.floor(f), i1 = Math.min(c.n - 1, i0 + 1), a = f - i0;
  for (let b = 0; b < 15; b++) {
    const o0 = (i0 * 15 + b) * 4, o1 = (i1 * 15 + b) * 4;
    _mq1.set(c.q[o0], c.q[o0 + 1], c.q[o0 + 2], c.q[o0 + 3]); _mq2.set(c.q[o1], c.q[o1 + 1], c.q[o1 + 2], c.q[o1 + 3]);
    B3.Quaternion.SlerpToRef(_mq1, _mq2, a, MQ[b]); MQ[b].normalize();
  }
  const h0 = i0 * 3, h1 = i1 * 3; MHP.set(c.h[h0] + (c.h[h1] - c.h[h0]) * a, c.h[h0 + 1] + (c.h[h1 + 1] - c.h[h0 + 1]) * a, c.h[h0 + 2] + (c.h[h1 + 2] - c.h[h0 + 2]) * a);
}
function rigNodes(o) { return o._rig || (o._rig = [o.hips, o.spine, o.head, o.R.sh, o.R.el, o.R.hand, o.Lf.sh, o.Lf.el, o.Lf.hand, o.LR.hip, o.LR.knee, o.LR.ank, o.LL.hip, o.LL.knee, o.LL.ank]); }
function clearQ(o) { for (const n of rigNodes(o)) if (n) n.rotationQuaternion = null; }
// blend a clip pose over whatever the procedural code has set this frame (w = 0..1, mask[b] = 0..1 keeps the procedural pose)
function layerClip(o, name, u, w, mask) {
  const c = mocap(name); if (!c || w <= 0) return;
  clipSample(c, u); const N = rigNodes(o);
  for (let b = 0; b < 15; b++) {
    const n = N[b]; if (!n) continue; const wb = mask ? w * (1 - (mask[b] || 0)) : w; if (wb <= 0) continue;
    const cur = n.rotationQuaternion || (n.rotationQuaternion = B3.Quaternion.FromEulerAngles(n.rotation.x, n.rotation.y, n.rotation.z));
    B3.Quaternion.SlerpToRef(cur, MQ[b], Math.min(1, wb), cur);
  }
  const H = o.hipY0 || .95, hp = o.hips.position;
  hp.x += (MHP.x * H - hp.x) * w; hp.y += (o.hipY0 + MHP.y * H - hp.y) * w; hp.z += (MHP.z * H - hp.z) * w;
}
function addRotX(n, ang) {
  if (!n || !ang) return;
  if (n.rotationQuaternion) { B3.Quaternion.RotationAxisToRef(B3.Axis.X, ang, _mqx); n.rotationQuaternion.multiplyInPlace(_mqx); }
  else n.rotation.x += ang;
}
// melee heroes of the procedural roster strike with the mocap slash
for (const c of CHARS) if (!c.boss && c.basic && c.basic.dt === 'blade' && c.basic.tgt === 'enemy' && !ANIM3[c.id] && !(HERO3[c.id] || {}).style)
  ANIM3[c.id] = { dur: k => k === 'basic' ? 1500 : null, hit: k => k === 'basic' ? .43 : null, wait: k => k === 'basic' ? 1550 : 0, slash: true };


export { MOCAP_OK, CLIPC, mocap, MQ, MHP, _mq1, _mq2, _mqx, clipSample, rigNodes, clearQ, layerClip, addRotX };
