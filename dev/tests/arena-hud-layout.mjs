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
const notchRows = Array.from({length:10}, (_,i) => ({id:String(i),ax:60+i*55,ay:180,w:100,h:35}));
g.set('__labels',notchRows);g.run('packWorldLabels(__labels,667,375,{left:59,right:59})');
check(notchRows,667,375);assert.ok(notchRows.every(r=>r.x>=59&&r.x+r.w<=608),'notch safe area');
// Growing/shrinking selected arrows and intentions can fragment a greedy pack.
let seed=42;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
for(let frame=0;frame<300;frame++){
  const rows=Array.from({length:10},(_,i)=>({id:String(i),ax:120+rnd()*420,ay:100+rnd()*160,w:124,h:i===frame%10?73:15+Math.floor(rnd()*33)}));
  check(pack(rows,667,375),667,375);
}
// Regression: resizing a status block must repack in the observer callback,
// before paint, without waiting for another expensive WebGL frame.
let resize, disconnected=false;
g.set('ResizeObserver',class {
  constructor(fn){resize=fn;} observe(){} unobserve(){} disconnect(){disconnected=true;}
});
const layout=g.run('new WorldHudLayout()');
const label={classList:{contains:s=>s==='world-label'}},vars=new Map();
const el={firstElementChild:label,style:{setProperty:(k,v)=>vars.set(k,v)}};
layout.begin();layout.track('hero',el,300,180,false);layout.place(667,375);
resize([{target:label,borderBoxSize:[{inlineSize:100,blockSize:33}]}]);
assert.equal(layout.rows.get('hero').h,33);assert.equal(layout.dirty,false,'observer must apply the new layout immediately');
assert.equal(vars.get('--hud-y'),'0.0px');layout.dispose();assert.equal(layout.rows.size,0);assert.ok(disconnected);
console.log('PASS world HUD: viewport/notch bounds, crowded 5x5, status/arrow sizes, motion, removal, deterministic idle, resize-before-paint, disposal');
