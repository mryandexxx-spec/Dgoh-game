// render2d/fx-layer.js — строки 1138–1182 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './scene-bg.js'; // порядок исполнения

// ---------- attack FX ----------
class FXLayer {
  constructor(canvas) { this.cv = canvas; this.fx = []; this.loop = this.loop.bind(this); this.running = false; }
  add(f) { f.t0 = performance.now() + (f.delay || 0); this.fx.push(f); if (!this.running) { this.running = true; requestAnimationFrame(this.loop); } }
  loop(now) {
    if (!this.cv.isConnected) { this.running = false; return; }
    const cv = this.cv; if (cv.width !== innerWidth || cv.height !== innerHeight) { cv.width = innerWidth; cv.height = innerHeight; }
    const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
    this.fx = this.fx.filter(f => now < f.t0 + f.dur);
    for (const f of this.fx) {
      const k = (now - f.t0) / f.dur; if (k < 0) continue;
      const { x1, y1, x2, y2 } = f;
      c.save();
      if (f.type === 'fast') {
        const px = x1 + (x2 - x1) * k, py = y1 + (y2 - y1) * k, bx = x1 + (x2 - x1) * Math.max(0, k - .15), by = y1 + (y2 - y1) * Math.max(0, k - .15);
        c.strokeStyle = '#ffe2a0'; c.lineWidth = 2.5; c.shadowColor = '#ffb050'; c.shadowBlur = 8; c.beginPath(); c.moveTo(bx, by); c.lineTo(px, py); c.stroke();
      } else if (f.type === 'blade') {
        const a0 = -2.4 + k * 2.6; c.strokeStyle = `rgba(245,240,230,${1 - k})`; c.lineWidth = 4 * (1 - k) + 1; c.shadowColor = '#fff'; c.shadowBlur = 10;
        c.beginPath(); c.arc(x2, y2, 26, a0, a0 + 1.4); c.stroke();
      } else if (f.type === 'laser') {
        c.globalAlpha = 1 - k; c.strokeStyle = '#ff4d6d'; c.lineWidth = 6; c.shadowColor = '#ff4d6d'; c.shadowBlur = 18; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
      } else if (f.type === 'voice') {
        c.strokeStyle = `rgba(190,168,230,${1 - k})`; c.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const kk = (k + i * .25) % 1; c.beginPath(); c.arc(x1 + (x2 - x1) * kk, y1 + (y2 - y1) * kk, 6 + kk * 18, 0, Math.PI * 2); c.stroke(); }
      } else if (f.type === 'poison') {
        const px = x1 + (x2 - x1) * Math.min(1, k * 1.4), py = y1 + (y2 - y1) * Math.min(1, k * 1.4);
        c.fillStyle = '#7ad36a'; c.shadowColor = '#7ad36a'; c.shadowBlur = 10; c.beginPath(); c.arc(px, py, 4, 0, Math.PI * 2); c.fill();
        if (k > .7) { c.globalAlpha = (1 - k) * 3; for (let i = 0; i < 6; i++) { const a = i; c.beginPath(); c.arc(x2 + Math.cos(a) * 14 * k, y2 + Math.sin(a) * 14 * k, 2, 0, Math.PI * 2); c.fill(); } }
      } else if (f.type === 'heal') {
        c.strokeStyle = `rgba(127,187,108,${1 - k})`; c.lineWidth = 2.5; c.beginPath(); c.arc(x2, y2, 10 + k * 26, 0, Math.PI * 2); c.stroke();
      } else if (f.type === 'impact') {
        c.strokeStyle = f.col; c.lineWidth = 2; c.globalAlpha = 1 - k; c.shadowColor = f.col; c.shadowBlur = 12;
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + (f.seed || 0), r1 = 6 + k * 16, r2 = r1 + 7 * (1 - k); c.beginPath(); c.moveTo(x2 + Math.cos(a) * r1, y2 + Math.sin(a) * r1); c.lineTo(x2 + Math.cos(a) * r2, y2 + Math.sin(a) * r2); c.stroke(); }
        c.globalAlpha = (1 - k) * .5; c.fillStyle = f.col; c.beginPath(); c.arc(x2, y2, 14 * (1 - k * .5), 0, Math.PI * 2); c.fill();
      } else if (f.type === 'maw') {
        c.fillStyle = `rgba(30,15,10,${.6 * (1 - k)})`; c.beginPath(); c.arc(x2, y2, 40 * (1 - Math.abs(k - .5)), 0, Math.PI * 2); c.fill();
        c.strokeStyle = `rgba(232,220,192,${1 - k})`; c.lineWidth = 3; c.stroke();
      }
      c.restore();
    }
    if (this.fx.length) requestAnimationFrame(this.loop); else { c.clearRect(0, 0, cv.width, cv.height); this.running = false; }
  }
}


export { FXLayer };
