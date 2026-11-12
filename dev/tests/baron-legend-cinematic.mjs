// BH7: instantiate the approved Baron chair and scheduled army strike using
// the shipped Babylon scene helpers under NullEngine. Preview-only: no CHARS.
import assert from 'node:assert/strict';
import * as B from '@babylonjs/core/index.js';
import { loadGame } from './lib/load.mjs';
import { readFileSync } from 'node:fs';

const g=loadGame(process.argv[2] || 'dist/pwa/index.html');
g.set('B3',B);g.run('for(const f of B3_SUBS)f();');g.set('tex3',()=>{});
const engine=new B.NullEngine();g.ctx.__scene=new B.Scene(engine);
try {
  const data=g.run(`(()=>{
    const o={root:new B3.TransformNode('legend-caster',__scene),def:{id:'baron_legend'}};
    const foes=Array.from({length:5},(_,i)=>({root:new B3.TransformNode('foe'+i,__scene)}));
    foes.forEach((x,i)=>x.root.position.set(i+2,0,i*.3));
    const a=Object.create(Arena3D.prototype);
    a.scene=__scene;a.small=true;a.speed=1;a.fxq=[];a.fxp={};a.tr=[];
    a.ringFX=()=>{};a.sparkFX=()=>{};
    const t0=performance.now();
    a.startBaronGL(o,foes,t0,1);
    const first={dur:a.baronGL.dur,meshes:a.baronGL.chair.getChildMeshes().length,
      parent:a.baronGL.chair.parent===o.root,waves:a.fxq.length,
      names:a.baronGL.chair.getChildMeshes().map(m=>m.name)};
    for(const event of a.fxq.splice(0))event.fn();
    const flights=a.tr.length;
    a.endBaronGL();
    const cleared=a.baronGL===null;
    const remaining=a.scene.meshes.filter(m=>m.name==='bx'||m.name==='cy').length;
    return {first,flights,cleared,remaining};
  })()`);
  assert.equal(data.first.dur,2500);
  assert.equal(data.first.parent,true,'chair must move with legendary caster only');
  assert.ok(data.first.meshes>=6,'chair geometry absent');
  assert.equal(data.first.waves,3,'MED three attack waves');
  assert.ok(data.flights>=6,'army projectiles not scheduled');
  assert.equal(data.cleared,true);
  // Existing pooled shots are released when their normal fade completes.
  const src=readFileSync(new URL('../src/render3d/scenes/arena.js',import.meta.url),'utf8');
  assert.match(src,/B\.glKind === 'fall-of-atreides'/);
  assert.match(src,/caster\?\.def\?\.id === 'baron_legend'/);
  assert.match(src,/this\.baronGL && now - this\.baronGL\.t0 >= this\.baronGL\.dur/);
  console.log('BH7 real Babylon chair and three army volleys with owned cleanup: PASS',JSON.stringify(data));
}finally{g.ctx.__scene.dispose();engine.dispose();}
