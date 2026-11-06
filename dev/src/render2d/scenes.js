// render2d/scenes.js — строки 805–1081 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './figures.js'; // порядок исполнения
import { ghash } from '../data/looks.js';
import { sRng } from '../core/rng.js';

// ---------- scenes ----------
const SCENES = {
  caladan:  { sky: ['#1b2733', '#566b77', '#9cadb0'], parts: 'rain' },
  arrakeen: { sky: ['#2a1626', '#8a3d34', '#e69a52'], parts: 'sand' },
  desert:   { sky: ['#d99a55', '#efc78c', '#f8e6c4'], parts: 'sand' },
  sietch:   { sky: ['#07080f', '#151a33', '#3a2f4a'], parts: 'stars' },
  lobby:    { sky: ['#07080f', '#151a33', '#3a2f4a'], parts: 'stars' },
  giedi:    { sky: ['#0b0708', '#2a0f10', '#6a2016'], parts: 'ember' },
  court:    { sky: ['#2a1c0c', '#7a5520', '#d8b060'], parts: 'dust' },
  storm:    { sky: ['#5a3c22', '#8a6038', '#b48650'], parts: 'storm' },
  canyon:   { sky: ['#6a3a22'], parts: 'dust' },
  cave:     { sky: ['#120b07'], parts: 'dust' },
  spicefield: { sky: ['#9a4a2a'], parts: 'sand' },
  ruins:    { sky: ['#3a2236'], parts: 'sand' },
  saltflat: { sky: ['#c8b8a0'], parts: 'sand' },
  dawn:     { sky: ['#2a2440'], parts: 'sand' },
  harvester: { sky: ['#9a6a40'], parts: 'sand' },
};
function skyFill(c, w, h, stops) { const g = c.createLinearGradient(0, 0, 0, h); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); c.fillStyle = g; c.fillRect(0, 0, w, h); }
function ridge(c, w, h, base, amp, color, seed, crest, jag) {
  const r = sRng(seed), f1 = .6 + r() * 1.4, f2 = 2 + r() * 3, p1 = r() * 6, p2 = r() * 6, pts = [];
  for (let x = 0; x <= w + 4; x += jag ? 10 : 4) {
    let y = base + amp * (Math.sin(x / w * Math.PI * f1 + p1) * .7 + Math.sin(x / w * Math.PI * f2 + p2) * .3);
    if (jag) y += (r() - .5) * amp * .6;
    pts.push([x, y]);
  }
  c.beginPath(); c.moveTo(0, h); pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(w, h); c.closePath(); c.fillStyle = color; c.fill();
  c.save(); c.clip(); const sg = c.createLinearGradient(0, base - amp, 0, Math.min(h, base + h * .22)); sg.addColorStop(0, 'rgba(255,240,210,.10)'); sg.addColorStop(.25, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.38)'); c.fillStyle = sg; c.fillRect(0, base - amp * 2, w, h); c.restore();
  if (crest) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = crest; c.lineWidth = Math.max(1, h / 220); c.stroke(); }
}
function disc(c, x, y, r, col, glow) {
  if (glow) { const g = c.createRadialGradient(x, y, r * .5, x, y, r * 4); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); }
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col; c.fill();
}
function makeNoise(seed) {
  const r = sRng(seed), P = new Uint8Array(512), V = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; V[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = P[i]; P[i] = P[j]; P[j] = t; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const v = (x, y) => V[P[P[x & 255] + (y & 255)]];
  const n2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
  return (x, y, o = 3) => { let s = 0, a = .5, f = 1, n = 0; for (let k = 0; k < o; k++) { s += a * n2(x * f, y * f); n += a; a *= .5; f *= 2.03; } return s / n; };
}
const NZ = makeNoise(1337);
const hexc = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const SCN = {
  desert:   { sky: ['#a8693e', '#dba36b', '#f3d5a4'], fog: '#efcf9e', sun: [.8, .17, .03, '#fffaf0'], light: 1, layers: [
    { b: .57, a: .05, f: 2.4, lit: '#efc58e', sh: '#b07a48', hz: .7 }, { b: .66, a: .08, f: 1.8, lit: '#ebbb7c', sh: '#9a6034', hz: .42 },
    { b: .78, a: .11, f: 1.3, lit: '#e6af6c', sh: '#83492a', hz: .18 }, { b: .93, a: .08, f: 1, lit: '#dea062', sh: '#6e3a1e', hz: 0 }] },
  arrakeen: { sky: ['#241220', '#7a3430', '#e48f4c'], fog: '#b8603c', sun: [.7, .5, .06, '#ffc27a'], light: 1,
    layers: [{ type: 'rock', b: .55, a: .1, f: 1.5, lit: '#7a4434', sh: '#2a1418', hz: .45 }],
    front: [{ b: .89, a: .05, f: 1.4, lit: '#b8743e', sh: '#4a2414', hz: 0 }] },
  sietch:   { sky: ['#05060c', '#11162b', '#2e2644'], fog: '#3a3352', light: -1, stars: 1, moons: 1, layers: [
    { type: 'rock', b: .56, a: .15, f: 1.2, lit: '#5a4a56', sh: '#100b10', hz: .22 }, { b: .77, a: .06, f: 1.6, lit: '#7a6064', sh: '#1c1218', hz: .1 }, { b: .91, a: .05, f: 1.1, lit: '#604842', sh: '#160e10', hz: 0 }] },
  storm:    { sky: ['#5a3a20', '#8a5e36', '#b4844e'], fog: '#b88a56', light: 1, clouds: 1.4, cloudCol: '#d4a474', layers: [
    { b: .66, a: .06, f: 1.8, lit: '#c49464', sh: '#7a5030', hz: .6 }, { b: .83, a: .08, f: 1.3, lit: '#bc8850', sh: '#6a4024', hz: .3 }] },
  caladan:  { sky: ['#26323c', '#56666e', '#93a2a4'], fog: '#8a9a9e', clouds: 1, cloudCol: '#b8c2c4', light: -1, sun: [.62, .3, .025, '#e4ecee'], layers: [
    { type: 'water', b: .62, lit: '#6a8e98', sh: '#0f242c', hz: 0 }, { type: 'rock', b: .42, a: .05, f: 2.2, lit: '#4a5456', sh: '#0c1013', hz: 0, xMax: .3 }] },
  giedi:    { sky: ['#0a0607', '#2a0e0e', '#702418'], fog: '#4a1a12', clouds: .8, cloudCol: '#401a14', light: 1,
    front: [{ type: 'rock', b: .87, a: .03, f: 3, lit: '#3a2620', sh: '#080506', hz: 0 }] },
  court:    { sky: ['#2a1c0c', '#7a5520', '#e6bf70'], fog: '#c9a058', sun: [.5, .3, .05, '#fff0c0'] },
  canyon:   { sky: ['#7a3a20', '#d0804a', '#f0c088'], fog: '#d89a66', sun: [.52, .1, .035, '#fff4dc'], light: 1, layers: [
    { type: 'rock', b: .5, a: .08, f: 1.4, lit: '#b0603a', sh: '#4a1e12', hz: .45 },
    { type: 'rock', b: .2, a: .1, f: 2.6, lit: '#c0683c', sh: '#3a160c', hz: .05, xMax: .27 },
    { type: 'rock', b: .16, a: .1, f: 2.2, lit: '#b45e36', sh: '#2e120a', hz: .05, xMin: .74 },
    { b: .9, a: .05, f: 1.2, lit: '#e0a066', sh: '#7a3e20', hz: 0 }] },
  cave:     { sky: ['#1a110b', '#2a1b12', '#3a2618'], fog: '#3a2618', texture: .9, texCol: '#5a3e28', light: -1, layers: [
    { b: .74, a: .05, f: 1.4, lit: '#7a5638', sh: '#21140c', hz: .15 }, { b: .91, a: .04, f: 1, lit: '#6a4a30', sh: '#1a100a', hz: 0 }] },
  spicefield: { sky: ['#8a3e24', '#d47a44', '#f2b678'], fog: '#e09460', sun: [.25, .2, .03, '#fff2d8'], light: -1, layers: [
    { b: .6, a: .05, f: 2.2, lit: '#eab07a', sh: '#a05e36', hz: .6, spice: '#c4562a' }, { b: .72, a: .09, f: 1.6, lit: '#e6a46a', sh: '#8a4a28', hz: .3, spice: '#b84a20' },
    { b: .9, a: .07, f: 1.1, lit: '#dc9858', sh: '#6e3618', hz: 0, spice: '#a8401a' }] },
  ruins:    { sky: ['#2c1a30', '#94505a', '#eaa070'], fog: '#c87a64', sun: [.82, .58, .045, '#ffd29a'], light: 1, layers: [
    { b: .62, a: .05, f: 2, lit: '#c48a64', sh: '#5a3030', hz: .5 }, { b: .75, a: .08, f: 1.5, lit: '#c88458', sh: '#4e2822', hz: .2 }],
    front: [{ b: .92, a: .06, f: 1.1, lit: '#b8744c', sh: '#3e1e18', hz: 0 }] },
  saltflat: { sky: ['#8aa0b8', '#d4cbb8', '#f4e8d0'], fog: '#efe2c8', sun: [.7, .14, .028, '#ffffff'], light: 1, layers: [
    { type: 'rock', b: .54, a: .05, f: 1.3, lit: '#b89a84', sh: '#6a5a58', hz: .6 }, { type: 'flat', b: .58, lit: '#f6eee0', sh: '#b8a890', hz: 0 }] },
  dawn:     { sky: ['#241e3a', '#a85268', '#f4b07c'], fog: '#e09a8a', sun: [.16, .6, .05, '#ffe4b8'], light: -1, layers: [
    { b: .6, a: .05, f: 2.4, lit: '#f0b49a', sh: '#6a3a50', hz: .55 }, { b: .71, a: .09, f: 1.7, lit: '#eaa47e', sh: '#52283c', hz: .25 },
    { b: .86, a: .1, f: 1.2, lit: '#e09468', sh: '#3e1e2c', hz: 0 }] },
  harvester: { sky: ['#8a5a36', '#c8925c', '#e8bc84'], fog: '#d8a670', sun: [.86, .22, .03, '#fff0d0'], light: 1, clouds: .7, cloudCol: '#e0b080', layers: [
    { b: .6, a: .05, f: 2, lit: '#e0ae76', sh: '#94603a', hz: .55 }, { b: .72, a: .08, f: 1.5, lit: '#dca46a', sh: '#7e4a2a', hz: .25 }],
    front: [{ b: .91, a: .06, f: 1.1, lit: '#d49a5e', sh: '#6a3a1e', hz: 0 }] },
};
function crestArr(W, H, L, li) {
  const arr = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const fx = x / W; let y;
    if (L.type === 'rock') { const n = NZ(fx * L.f * 6 + li * 13.1, li * 3.7 + .5, 5), m = sstep(.42, .6, n) * .75 + n * .45; y = (L.b - L.a * m * 1.3) * H; }
    else if (L.type === 'water' || L.type === 'flat') y = L.b * H;
    else { const n = NZ(fx * L.f * 3 + li * 7.7, li * 5.3 + .2, 4), rr = 1 - Math.abs(2 * n - 1); y = (L.b + L.a * .4 - L.a * Math.pow(rr, 1.7) * 1.6) * H; }
    if (L.xMax !== undefined && fx > L.xMax) y += (fx - L.xMax) * H * 7;
    if (L.xMin !== undefined && fx < L.xMin) y += (L.xMin - fx) * H * 7;
    arr[x] = y;
  }
  return arr;
}
function renderLayers(c, w, h, S, layersIn, noSky) {
  const sc = w * h > 90000 ? 2 : 1, W = Math.ceil(w / sc), H = Math.ceil(h / sc);
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const oc = off.getContext('2d'), img = oc.createImageData(W, H), D = img.data;
  const sky = S.sky.map(hexc), fog = hexc(S.fog || S.sky[2]), dir = S.light || 1;
  const layers = (layersIn || []).map((L, li) => ({ ...L, lit: hexc(L.lit), sh: hexc(L.sh), cr: crestArr(W, H, L, li + (L.b * 10 | 0)) }));
  const sun = S.sun, sx = sun ? sun[0] * W : 0, sy = sun ? sun[1] * H : 0, sr = sun ? sun[2] * Math.min(W, H * 2) : 1, sunC = sun ? hexc(sun[3]) : null, cloudC = hexc(S.cloudCol || '#c8ccd0');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; let col = null, a = 255;
    for (let li = layers.length - 1; li >= 0; li--) {
      const L = layers[li], cy = L.cr[x]; if (y < cy) continue;
      const d = y - cy;
      if (L.type === 'flat') {
        const depth = d / (H - cy + 1), n = NZ(x * .06 / (1 + (1 - depth) * 5), y * .6, 3);
        col = mixc(L.sh, L.lit, Math.min(1, .62 + (n - .5) * .45 + depth * .15));
        if (sun) col = mixc(col, [255, 255, 255], Math.exp(-Math.abs(x - sx) / (W * .08)) * (1 - depth) * .35);
      } else if (L.type === 'water') {
        const depth = d / (H - cy + 1), n = NZ(x * .05 / (1 + (1 - depth) * 3), y * .7, 3);
        let t = .3 + depth * .15 + (n > .58 ? (n - .58) * 2.4 : 0);
        if (sun) t += Math.exp(-Math.abs(x - sx) / (W * .05)) * (1 - depth * .7) * (n > .5 ? .9 : .25);
        col = mixc(L.sh, L.lit, Math.min(1, t));
      } else {
        const xl = Math.max(0, x - 1), xr = Math.min(W - 1, x + 1), slope = (L.cr[xr] - L.cr[xl]) / 2;
        let b;
        const k = Math.exp(-d / (H * .045));
        if (L.type === 'rock') {
          const rx = x * .045 * sc, ry = y * .05 * sc, dn = NZ(rx + .03, ry, 4) - NZ(rx - .03, ry, 4);
          b = .42 + dir * slope * .45 * k + dir * dn * 7 + Math.sin(y * sc * .32 + NZ(x * .07, y * .07, 2) * 7) * .06 + (NZ(x * .25, y * .25, 2) - .5) * .22;
        } else {
          const nx = (x * sc / w) * 7 * L.f + L.b * 40, ny = (y * sc / h) * 7, dn = NZ(nx + .04, ny, 3) - NZ(nx - .04, ny, 3);
          b = .58 + dir * slope * .9 * k + dir * dn * 5.5;
          b += Math.sin(x * sc * .16 + d * sc * .85 + NZ(x * .045, y * .045, 2) * 11) * .045 * (b > .5 ? 1 : .35); b += (NZ(x * .7, y * .7, 1) - .5) * .06;
        }
        if (d < 1.4) b += .16;
        b -= Math.min(.25, d / H * .55);
        b = Math.max(0, b);
        col = mixc(L.sh, L.lit, Math.min(1, b)); if (b > 1) col = mixc(col, [255, 246, 228], Math.min(1, b - 1));
        if (L.spice) { const sn = NZ(x * .035 + 40, y * .11, 3); if (sn > .56) col = mixc(col, L.spiceC || (L.spiceC = hexc(L.spice)), Math.min(.75, (sn - .56) * 3.5) * (.6 + b * .4)); }
      }
      col = mixc(col, fog, L.hz || 0); break;
    }
    if (!col) {
      if (noSky) { a = 0; col = [0, 0, 0]; }
      else {
        const t = y / H; col = t < .5 ? mixc(sky[0], sky[1], t * 2) : mixc(sky[1], sky[2], (t - .5) * 2);
        if (S.texture) { const n = NZ(x * .028, y * .028, 5); col = mixc(col, S.texC || (S.texC = hexc(S.texCol)), n * S.texture); col = mixc(col, [0, 0, 0], Math.max(0, .5 - n) * .6); }
        if (S.clouds) { const n = NZ(x * .01 * S.clouds, y * .045 + 3, 5), k = sstep(.48, .74, n) * (1 - t * .5); col = mixc(col, cloudC, k * .65); }
        if (sun) { const dd = Math.hypot(x - sx, y - sy) / sr; col = mixc(col, sunC, dd < 1 ? 1 : Math.min(1, Math.exp(-(dd - 1) * .28) * .55)); }
      }
    }
    D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = a;
  }
  oc.putImageData(img, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(off, 0, 0, w, h);
  return layers.map(L => xf => L.cr[Math.min(W - 1, Math.max(0, Math.round(xf * W)))] * sc);
}
function drawScene(c, key, w, h) {
  if (key === 'lobby') {
    drawScene(c, 'sietch', w, h);
    const u = Math.min(w, h * 2);
    const glow = (x, y, r, col) => { const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
    glow(w * .1, h * .64, u * .16, 'rgba(255,160,80,.45)');
    c.fillStyle = '#f2a65a'; c.beginPath(); c.ellipse(w * .1, h * .7, u * .03, u * .05, 0, Math.PI, 0); c.fill();
    const pg = c.createRadialGradient(w * .5, h * .93, 0, w * .5, h * .93, w * .36); pg.addColorStop(0, '#3a2a1e'); pg.addColorStop(1, '#1a120c');
    c.fillStyle = pg; c.beginPath(); c.ellipse(w * .5, h * .93, w * .36, h * .11, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(232,145,63,.35)'; c.lineWidth = 2; c.beginPath(); c.ellipse(w * .5, h * .91, w * .31, h * .08, 0, 0, Math.PI * 2); c.stroke();
    for (const x of [.24, .76]) { c.fillStyle = '#2a1e18'; c.fillRect(w * x - 2, h * .7, 4, h * .14); glow(w * x, h * .7, u * .05, 'rgba(255,190,110,.6)'); }
    return;
  }
  const S = SCN[key] || SCN.desert, u = Math.min(w, h * 2), r = sRng(ghash(key));
  renderLayers(c, w, h, S, [], false);
  if (S.stars) for (let i = 0; i < Math.min(400, w * h / 1800); i++) { c.fillStyle = `rgba(255,255,255,${.2 + r() * .7})`; const s = r() < .1 ? 1.8 : 1.1; c.fillRect(r() * w, r() * h * .58, s, s); }
  if (S.moons) { disc(c, w * .22, h * .19, u * .045, '#ece6d4', 'rgba(220,215,200,.16)'); c.fillStyle = 'rgba(120,110,100,.25)'; c.beginPath(); c.arc(w * .21, h * .185, u * .012, 0, 7); c.fill(); c.beginPath(); c.arc(w * .232, h * .2, u * .008, 0, 7); c.fill(); disc(c, w * .32, h * .12, u * .022, '#d2c9b2', null); }
  if (key === 'court') {
    c.fillStyle = '#3a2a14'; c.fillRect(w * .3, h * .38, w * .4, h * .4);
    for (let i = 0; i < 3; i++) c.fillRect(w * (.35 + i * .05), h * (.3 - i * .06), w * (.3 - i * .1), h * .1);
    const colg = c.createLinearGradient(0, h * .45, 0, h * .78); colg.addColorStop(0, '#6a4e22'); colg.addColorStop(1, '#2e2010');
    c.fillStyle = colg; for (let i = 0; i < 9; i++) c.fillRect(w * (.32 + i * .045), h * .45, w * .015, h * .33);
    c.fillStyle = '#8a2a24'; for (const xx of [.2, .8]) { c.fillRect(w * xx - w * .015, h * .3, w * .03, h * .3); c.beginPath(); c.moveTo(w * xx - w * .015, h * .6); c.lineTo(w * xx, h * .63); c.lineTo(w * xx + w * .015, h * .6); c.fill(); }
    const fl = c.createLinearGradient(0, h * .78, 0, h); fl.addColorStop(0, '#6a4c22'); fl.addColorStop(1, '#2a1c0c'); c.fillStyle = fl; c.fillRect(0, h * .78, w, h * .22);
    c.fillStyle = 'rgba(255,225,160,.12)'; c.fillRect(w * .44, h * .78, w * .12, h * .22);
  }
  if (key === 'giedi') {
    let x = 0; while (x < w) {
      const bw = u * (.025 + r() * .04), bh = h * (.15 + r() * .45);
      const tg = c.createLinearGradient(x, 0, x + bw, 0); tg.addColorStop(0, '#1e1414'); tg.addColorStop(1, '#070505'); c.fillStyle = tg; c.fillRect(x, h * .86 - bh, bw, bh + h * .2);
      if (r() < .4) { c.beginPath(); c.moveTo(x, h * .86 - bh); c.lineTo(x + bw / 2, h * .86 - bh - h * .06); c.lineTo(x + bw, h * .86 - bh); c.fill(); }
      c.fillStyle = 'rgba(255,80,40,.65)'; for (let k = 0; k < 5; k++) if (r() < .5) c.fillRect(x + bw * r(), h * .86 - bh * r(), 2, 2);
      x += bw + u * .006;
    }
  }
  const cr = S.layers ? renderLayers(c, w, h, S, S.layers, true) : null;
  if (key === 'caladan' && cr) {
    const by = cr[1](.07), s = u * .018, bx = w * .04;
    c.fillStyle = '#0c1114'; c.fillRect(bx, by - s * 3, s * 6, s * 3.2); c.fillRect(bx + s, by - s * 5, s * 1.4, s * 2.2); c.fillRect(bx + s * 4, by - s * 6.2, s * 1.4, s * 3.4);
    c.fillStyle = 'rgba(255,200,120,.75)'; c.fillRect(bx + s * 2.2, by - s * 2, s * .5, s * .7); c.fillRect(bx + s * 4.4, by - s * 4.6, s * .4, s * .6);
  }
  if (key === 'arrakeen') {
    let x = 0; while (x < w) {
      const bw = u * (.03 + r() * .05), bh = h * (.05 + r() * .12), base = h * .76;
      const bg = c.createLinearGradient(x, 0, x + bw, 0); bg.addColorStop(0, '#3a2016'); bg.addColorStop(1, '#170c08'); c.fillStyle = bg;
      c.fillRect(x, base - bh, bw, bh + h * .14); if (r() < .25) { c.beginPath(); c.arc(x + bw / 2, base - bh, bw / 2, Math.PI, 0); c.fill(); }
      c.fillStyle = 'rgba(255,190,110,.6)'; for (let k = 0; k < 3; k++) if (r() < .6) c.fillRect(x + bw * (.2 + r() * .6), base - bh * r(), 2, 2.5);
      x += bw + u * .004;
    }
  }
  if (S.front) renderLayers(c, w, h, S, S.front, true);
  if (key === 'storm') { c.fillStyle = 'rgba(190,140,90,.32)'; c.fillRect(0, 0, w, h); }
  if (key === 'cave') {
    const og = c.createRadialGradient(w * .5, h * .5, 0, w * .5, h * .5, u * .22); og.addColorStop(0, 'rgba(255,190,120,.55)'); og.addColorStop(.6, 'rgba(200,120,60,.25)'); og.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = og; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(250,200,140,.35)'; c.beginPath(); c.ellipse(w * .5, h * .58, u * .07, u * .12, 0, Math.PI, 0); c.fill();
    for (const [fx, fy] of [[.18, .45], [.82, .42], [.35, .62], [.66, .6]]) { const lg = c.createRadialGradient(w * fx, h * fy, 0, w * fx, h * fy, u * .09); lg.addColorStop(0, 'rgba(255,170,80,.6)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = lg; c.fillRect(w * fx - u * .09, h * fy - u * .09, u * .18, u * .18); c.fillStyle = '#ffd08a'; c.beginPath(); c.arc(w * fx, h * fy, u * .006, 0, 7); c.fill(); }
    const vg = c.createLinearGradient(0, 0, 0, h * .35); vg.addColorStop(0, 'rgba(8,5,3,.85)'); vg.addColorStop(1, 'rgba(8,5,3,0)'); c.fillStyle = vg; c.fillRect(0, 0, w, h * .35);
  }
  if (key === 'spicefield') {
    const pr = sRng(91);
    for (const [fx, sc2] of [[.68, 1], [.42, .6], [.86, .45]]) { const bx = w * fx, by = (cr ? cr[1](fx) : h * .7), hh = h * .5 * sc2, ww = u * .03 * sc2;
      for (let k = 0; k < 22; k++) { const t = k / 21, y = by - hh * t, x = bx + Math.sin(t * 5 + fx * 9) * ww * 1.2 * t + (pr() - .5) * ww * .6, r = ww * (1 + t * 3.2);
        const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${230 - t * 30 | 0},${100 + t * 30 | 0},${45 + t * 20 | 0},${.38 * (1 - t * .75)})`); g.addColorStop(1, 'rgba(220,110,50,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
  }
  if (key === 'ruins' && cr) {
    const stone = (x, top, wd, ht, broken) => { const by = cr[1](x / w) + h * .015; const g = c.createLinearGradient(x, 0, x + wd, 0); g.addColorStop(0, '#8a6a5a'); g.addColorStop(.5, '#6a4a40'); g.addColorStop(1, '#2e1c1a'); c.fillStyle = g;
      c.beginPath(); c.moveTo(x, by); c.lineTo(x, by - ht); if (broken) { c.lineTo(x + wd * .3, by - ht + wd * .4); c.lineTo(x + wd * .6, by - ht - wd * .2); } c.lineTo(x + wd, by - ht + (broken ? wd * .5 : 0)); c.lineTo(x + wd, by); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x, by - ht * k / 5); c.lineTo(x + wd, by - ht * k / 5); c.stroke(); } };
    stone(w * .14, 0, u * .025, h * .2, true); stone(w * .2, 0, u * .025, h * .13, true); stone(w * .58, 0, u * .03, h * .24, false); stone(w * .64, 0, u * .03, h * .24, false);
    const ax = w * .58, ay = cr[1](.6) + h * .015 - h * .24; c.fillStyle = '#5a3c34'; c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo(ax + (w * .06 + u * .03) / 2, ay - h * .07, w * .64 + u * .03, ay); c.lineTo(w * .64 + u * .03, ay + h * .02); c.quadraticCurveTo(ax + (w * .06 + u * .03) / 2, ay - h * .04, ax, ay + h * .02); c.fill();
    stone(w * .86, 0, u * .022, h * .09, true);
  }
  if (key === 'saltflat' && cr) {
    const hy = cr[1](.5), rr = sRng(77); c.strokeStyle = 'rgba(120,100,80,.35)';
    for (let k = 0; k < 160; k++) { const v = rr(), uu = rr(), y = hy + (h - hy) * v * v, x = w * uu, len = (8 + rr() * 30) * (.2 + v * v * 1.5); c.lineWidth = .5 + v * 1.2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + len * (rr() - .5) * 2, y + len * .25 * (rr() - .2)); c.stroke(); }
    const mg = c.createLinearGradient(0, hy - h * .02, 0, hy + h * .03); mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(.5, 'rgba(240,240,235,.45)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = mg; c.fillRect(0, hy - h * .02, w, h * .05);
  }
  if (key === 'harvester' && cr) {
    const mx = w * .6, my = cr[1](.6) + h * .01, s = u * .05;
    const dg = c.createRadialGradient(mx, my - s, 0, mx, my - s, s * 5); dg.addColorStop(0, 'rgba(225,180,120,.55)'); dg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = dg; c.fillRect(mx - s * 5, my - s * 6, s * 10, s * 10);
    const bg = c.createLinearGradient(0, my - s * 2.2, 0, my); bg.addColorStop(0, '#6a5240'); bg.addColorStop(1, '#2a1e16'); c.fillStyle = bg;
    c.fillRect(mx - s * 2.6, my - s * 1.9, s * 5.2, s * 1.4); c.fillRect(mx - s * 1.2, my - s * 2.8, s * 1.8, s * .95);
    c.fillStyle = '#1e1610'; c.fillRect(mx - s * 2.8, my - s * .55, s * 5.6, s * .55);
    for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(mx - s * 2.4 + k * s * .8, my - s * .27, s * .22, 0, 7); c.fill(); }
    c.strokeStyle = '#3a2c20'; c.lineWidth = s * .18; c.beginPath(); c.moveTo(mx + s * 1.6, my - s * 1.9); c.lineTo(mx + s * 3.6, my - s * 3.8); c.lineTo(mx + s * 4.4, my - s * 1.2); c.stroke();
    c.fillStyle = 'rgba(255,200,120,.9)'; for (const [ox, oy] of [[-2, -1.5], [-.6, -2.5], [1.4, -1.5]]) c.fillRect(mx + ox * s, my + oy * s, s * .18, s * .14);
  }
  sceneExtras(c, key, w, h, u);
}
function rays(c, x, y, w, h, col, n) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const a = Math.PI * (.35 + i * .07), a2 = a + .025 + (i % 2) * .02, L = Math.hypot(w, h);
    const g = c.createLinearGradient(x, y, x + Math.cos(a) * L * .7, y + Math.sin(a) * L * .7); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); c.lineTo(x + Math.cos(a2) * L, y + Math.sin(a2) * L); c.closePath(); c.fill(); }
  c.restore();
}
function haze(c, w, h, y, col, a) {
  const g = c.createLinearGradient(0, y - h * .12, 0, y + h * .1); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, col.replace('A', a)); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, y - h * .12, w, h * .22);
}
function rock(c, x, y, s, col, hi) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x - s * .7, y - s * .55); c.lineTo(x - s * .1, y - s * .8); c.lineTo(x + s * .5, y - s * .6); c.lineTo(x + s, y); c.closePath(); c.fill();
  c.strokeStyle = hi; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - s * .7, y - s * .55); c.lineTo(x - s * .1, y - s * .8); c.lineTo(x + s * .5, y - s * .6); c.stroke();
}
function sceneExtras(c, key, w, h, u) {
  if (key === 'desert') { rays(c, w * .8, h * .17, w, h, 'rgba(255,245,220,.045)', 6); }
  if (key === 'arrakeen') { rays(c, w * .7, h * .5, w, h, 'rgba(255,170,90,.07)', 5); haze(c, w, h, h * .7, 'rgba(255,150,90,A)', .2); }
  if (key === 'court') rays(c, w * .5, h * .3, w, h, 'rgba(255,225,150,.08)', 7);
  if (key === 'sietch') { haze(c, w, h, h * .62, 'rgba(120,110,160,A)', .14); }
  if (key === 'caladan') haze(c, w, h, h * .62, 'rgba(180,200,210,A)', .22);
  if (key === 'giedi') haze(c, w, h, h * .8, 'rgba(255,80,40,A)', .15);
}
const THUMB_CACHE = {};
function sceneThumb(cv) {
  const w = cv.width, h = cv.height, k = cv.dataset.scene + ':' + w + 'x' + h;
  if (!THUMB_CACHE[k]) { const o = document.createElement('canvas'); o.width = w; o.height = h; drawScene(o.getContext('2d'), cv.dataset.scene, w, h); THUMB_CACHE[k] = o; }
  cv.getContext('2d').drawImage(THUMB_CACHE[k], 0, 0);
}


export { SCENES, skyFill, ridge, disc, makeNoise, NZ, hexc, mixc, sstep, SCN, crestArr, renderLayers, drawScene, rays, haze, rock, sceneExtras, THUMB_CACHE, sceneThumb };
