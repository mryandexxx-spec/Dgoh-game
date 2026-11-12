import assert from 'node:assert/strict';
import { loadGame } from './lib/load.mjs';
const g = loadGame(process.argv[2] || 'dist/pwa/index.html');
const pack = (rows, w, h) => { g.set('__labels', rows); g.run(`packWorldLabels(__labels,${w},${h})`); return rows; };
const check = (rows, w, h) => {
  for (const r of rows) {
    assert.ok(r.x >= 12 && r.x + r.w <= w - 12, 'label inside horizontal bounds');
    assert.ok(r.y >= 60 && r.y + r.h <= h - 100, 'label outside fixed controls');
    for (const p of rows) if (p !== r) assert.ok(
      r.x + r.w + 4.9 <= p.x || p.x + p.w + 4.9 <= r.x ||
      r.y + r.h + 4.9 <= p.y || p.y + p.h + 4.9 <= r.y,
      `labels ${r.id}/${p.id} collide`);
  }
};
for (const [w,h] of [[844,390],[667,375],[960,600]]) {
  for (const size of [0,1,2]) {
    const rows = Array.from({length:10}, (_,i) => ({id:String(i),
      ax: w * (.22 + (i % 5) * .12), ay: (i < 5 ? 195 : 145) + (i % 2)*8,
      w: size === 2 ? 124 : w < 700 ? 86 : 120, h: size === 0 ? 15 : size === 1 ? 32 : 60}));
    check(pack(rows,w,h),w,h);
    const first = JSON.stringify(rows); pack(rows,w,h); assert.equal(JSON.stringify(rows),first,'idle must stay stable');
    rows[2].ax = w*.5; rows[2].ay = 180; check(pack(rows,w,h),w,h);
    rows.splice(3,1); check(pack(rows,w,h),w,h); // death/wave removal
  }
  const clustered = Array.from({length:10}, (_,i) => ({id:String(i),ax:w/2,ay:170,w:100,h:35}));
  check(pack(clustered,w,h),w,h);
}
console.log('PASS world HUD: viewport bounds, crowded 5x5, status/arrow sizes, motion, removal, deterministic idle');
