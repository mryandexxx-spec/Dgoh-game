// BH6: verify the actual clipless pose logic on deterministic fake 18-bone nodes,
// without WebGL, a browser or modifying the published character registry.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../src/render3d/characters/pose-legend-baron.js',import.meta.url),'utf8')
  .replace(/^import [^\n]*;[^\n]*$/gm,'').replace(/^export [^\n]*;[^\n]*$/gm,'');
const ANIM3={};
const seg=(v,a,b)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);};
const ctx=vm.createContext({ANIM3,seg,Math});
vm.runInContext(src,ctx,{filename:'pose-legend-baron.js'});
const profile=ANIM3.baron_legend;
assert.ok(profile && typeof profile.cliplessPose==='function');
assert.equal(profile.dur('basic'),1000);
assert.equal(profile.dur('special'),1350);
assert.equal(profile.dur('ult'),1550);
assert.equal(profile.dur('gl'),2500);
assert.equal(profile.dur('unknown'),null);
assert.equal(ANIM3.baron,undefined,'must not install a replacement for young Baron');
const joint=()=>({rotation:{x:0,y:0,z:0}});
const make=(id='baron_legend')=>({
  def:{id}, root:{}, phase:0, dead:false, act:null, hitT:0,
  spine:joint(),head:joint(),R:{sh:joint(),el:joint(),hand:joint()},
  Lf:{sh:joint(),el:joint(),hand:joint()},capeB:[joint(),joint(),joint()]
});
const bones=o=>[o.spine,o.head,o.R.sh,o.R.el,o.R.hand,o.Lf.sh,o.Lf.el,o.Lf.hand,...o.capeB]
  .flatMap(j=>Object.values(j.rotation));
for(const key of ['basic','special','ult','gl']){
  const o=make();o.act={key,t0:0,dur:1000};
  profile.cliplessPose(o,460,.46,1,{});
  assert.equal(o.root._motion,key,key+' named action');
  assert.ok(bones(o).some(x=>Math.abs(x)>0.15),key+' has visible bone movement');
  assert.ok(bones(o).every(Number.isFinite),key+' finite rotations');
  const old=bones(o);
  // Simulates generic pose reset each frame, expected by the shared animation engine.
  for(const j of [o.spine,o.head,o.R.sh,o.R.el,o.R.hand,o.Lf.sh,o.Lf.el,o.Lf.hand,...o.capeB])Object.assign(j.rotation,{x:0,y:0,z:0});
  profile.cliplessPose(o,460,.46,1,{});
  assert.deepEqual(bones(o),old,key+' deterministic motion');
}
const idle=make();profile.cliplessPose(idle,0,1,1,{});assert.equal(idle.root._motion,'Idle');
const showcase=make();profile.cliplessPose(showcase,0,.9,1,{showcase:true});assert.equal(showcase.root._motion,'Showcase');
const hit=make();hit.hitT=100;profile.cliplessPose(hit,270,.27,1,{});assert.equal(hit.root._motion,'Hit');
const death=make();death.dead=true;death.deathT=0;profile.cliplessPose(death,1000,1,1,{});assert.equal(death.root._motion,'Death');
const young=make('baron');profile.cliplessPose(young,200,.2,1,{});assert.equal(young.root._motion,undefined);
const scene=readFileSync(new URL('../src/render3d/scenes/arena.js',import.meta.url),'utf8');
assert.match(scene,/B\.glKind === 'fall-of-atreides'/);
assert.match(scene,/this\.startBaronGL\(caster,/);
assert.match(scene,/B\.glKind === 'fall-of-atreides'/);
assert.match(readFileSync(new URL('../src/render3d/characters/pose-generic.js',import.meta.url),'utf8'),/!o\.root\._clips && o\.anim\?\.cliplessPose/);
console.log('BH6 separate legendary Baron clipless pose: Idle/Showcase/basic/special/ult/gl/Hit/Death and no worm: PASS');
