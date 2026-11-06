// render2d/scene-bg.js — строки 1082–1137 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { SCENES, drawScene } from './scenes.js';

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
class SceneBG {
  constructor(canvas, key, dim) { this.cv = canvas; this.key = key; this.dim = dim; this.parts = []; this.w = 0; this.h = 0; this.loop = this.loop.bind(this); this.resize(); requestAnimationFrame(this.loop); }
  resize() {
    const w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight;
    this.w = w; this.h = h; this.cv.width = w; this.cv.height = h;
    this.base = document.createElement('canvas'); this.base.width = w; this.base.height = h;
    const c = this.base.getContext('2d'); drawScene(c, this.key, w, h);
    if (this.dim) { c.fillStyle = `rgba(14,11,17,${this.dim})`; c.fillRect(0, 0, w, h); }
    const vg = c.createRadialGradient(w / 2, h * .55, Math.min(w, h) * .35, w / 2, h * .55, Math.hypot(w, h) * .62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
    this.fog = ['lobby', 'caladan', 'sietch', 'storm'].includes(this.key) ? Array.from({ length: 4 }, (_, i) => ({ x: Math.random() * w, y: h * (.55 + i * .1), r: Math.max(w, h) * (.25 + Math.random() * .2), v: .15 + Math.random() * .25 })) : [];
    this.embers = this.key === 'lobby' ? Array.from({ length: 26 }, () => ({ x: 0, y: 0, life: Math.random() })) : [];
    const type = (SCENES[this.key] || SCENES.desert).parts, r = Math.random;
    const n = { sand: w / 9, storm: w / 2.5, rain: w / 7, ember: w / 14, dust: w / 16, stars: 50 }[type] | 0;
    this.type = type;
    this.parts = Array.from({ length: n }, () => ({ x: r() * w, y: type === 'stars' ? r() * h * .55 : type === 'sand' ? h * (.45 + r() * .55) : r() * h, v: .5 + r(), l: 6 + r() * 14, a: .15 + r() * .35, ph: r() * 6 }));
  }
  loop(ts) {
    if (!this.cv.isConnected) return;
    if ((this.cv.clientWidth || innerWidth) !== this.w || (this.cv.clientHeight || innerHeight) !== this.h) this.resize();
    const c = this.cv.getContext('2d'), w = this.w, h = this.h;
    c.drawImage(this.base, 0, 0);
    const t = ts / 1000;
    for (const f of this.fog) {
      f.x += f.v; if (f.x - f.r > w) f.x = -f.r;
      const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r); g.addColorStop(0, this.key === 'storm' ? 'rgba(230,180,120,.10)' : 'rgba(200,205,230,.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    if (this.key === 'lobby') {
      const fx = w * .5, fy = h * .71, s = Math.min(w, h * 1.6) * .019, fl = 1 + .08 * Math.sin(t * 9) + .05 * Math.sin(t * 13.7);
      const gl = c.createRadialGradient(fx, fy - s, 0, fx, fy - s, s * 9 * fl); gl.addColorStop(0, 'rgba(255,170,80,.45)'); gl.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = gl; c.fillRect(fx - s * 10, fy - s * 10, s * 20, s * 20);
      c.fillStyle = '#2a1a12'; c.fillRect(fx - s * 1.4, fy - s * .3, s * 2.8, s * .6);
      const flame = (k, col, hgt, sway) => { c.fillStyle = col; c.beginPath(); c.moveTo(fx - s * k, fy); c.quadraticCurveTo(fx - s * k * .9, fy - s * hgt * .55, fx + Math.sin(t * 6 + sway) * s * .35, fy - s * hgt * fl); c.quadraticCurveTo(fx + s * k * .9, fy - s * hgt * .55, fx + s * k, fy); c.fill(); };
      flame(1.1, 'rgba(230,90,30,.9)', 2.6, 0); flame(.8, 'rgba(255,160,60,.95)', 2.0, 1.3); flame(.45, 'rgba(255,235,170,.95)', 1.3, 2.1);
      for (const e of this.embers) { e.life += .006 + Math.random() * .004; if (e.life > 1) { e.life = 0; e.x = fx + (Math.random() - .5) * s * 1.6; e.y = fy - s; }
        if (!e.x) continue; e.y -= .7; e.x += Math.sin(t * 3 + e.life * 10) * .4; c.fillStyle = `rgba(255,${150 + 80 * (1 - e.life) | 0},70,${(1 - e.life) * .9})`; c.fillRect(e.x, e.y, 2, 2); }
    }
    for (const p of this.parts) {
      if (this.type === 'sand' || this.type === 'storm') {
        const sp = this.type === 'storm' ? 4 + p.v * 4 : .6 + p.v; p.x += sp; if (p.x > w + 20) { p.x = -20; p.y = this.type === 'sand' ? h * (.45 + Math.random() * .55) : Math.random() * h; }
        c.strokeStyle = this.type === 'storm' ? `rgba(225,180,120,${p.a + .1})` : `rgba(240,205,150,${p.a})`; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.l * (this.type === 'storm' ? 2 : 1), p.y + .5); c.stroke();
      } else if (this.type === 'rain') {
        p.x -= 1.5; p.y += 7 + p.v * 3; if (p.y > h) { p.y = -10; p.x = Math.random() * w * 1.2; }
        c.strokeStyle = `rgba(200,220,230,${p.a * .7})`; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 1.5, p.y - 10); c.stroke();
      } else if (this.type === 'ember' || this.type === 'dust') {
        p.y -= this.type === 'ember' ? .4 + p.v * .5 : .15; p.x += Math.sin(t + p.ph) * .3; if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        c.fillStyle = this.type === 'ember' ? `rgba(255,120,60,${p.a + .2 * Math.sin(t * 3 + p.ph)})` : `rgba(255,225,150,${p.a * .6})`;
        c.fillRect(p.x, p.y, this.type === 'ember' ? 2 : 1.5, this.type === 'ember' ? 2 : 1.5);
      } else if (this.type === 'stars') {
        c.fillStyle = `rgba(255,255,255,${.3 + .5 * Math.abs(Math.sin(t * .8 + p.ph))})`; c.fillRect(p.x, p.y, 1.6, 1.6);
      }
    }
    if (!reduceMotion()) requestAnimationFrame(this.loop);
  }
}


export { reduceMotion, SceneBG };
