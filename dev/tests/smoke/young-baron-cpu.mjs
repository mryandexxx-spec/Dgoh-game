// Run the production skin/clip code with Babylon math and NullEngine: no GPU needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as B from '@babylonjs/core/index.js';
import { loadGame } from '../lib/load.mjs';
const g=loadGame(process.argv[2] || 'dist/pwa/index.html');
g.set('B3',B);g.run('for(const f of B3_SUBS)f();');g.set('tex3',()=>{});
g.ctx.__data=new Uint8Array(fs.readFileSync('assets/models/young-baron.dgm'));
g.run('MODEL_DATA.baron=parseDgm(__data);');
const engine=new B.NullEngine();g.ctx.__scene=new B.Scene(engine);
try {
 g.run("window.o=makeHuman3(CH.baron,{scene:__scene,shadows:null,pbr:false});o.base=V3();o.face=0;o.side='A';o.phase=0;");
 const result=g.run(`(()=>{
  const samples={};
  const sample=(name,now=10000,t=1.3,deathK=900/950)=>{
   o.dead=false;o.act=null;o.hitT=0;
   if(name==='Attack')o.act={kind:'shoot',t0:now-320,dur:640,dir:V3(0,0,1),to:V3(),fx:1};
   if(name==='Hit')o.hitT=now-170;
   if(name==='Death'){o.dead=true;o.deathT=now-950*deathK;}
   poseHuman({},o,now,t,1);
   o.root.computeWorldMatrix(true);
   const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(const m of o.root.getChildMeshes()){
    m.computeWorldMatrix(true);m.skeleton.prepare(true);
    const p=m.getPositionData(true,false);
    const tmp=V3(), world=m.getWorldMatrix();
    for(let i=0;i<p.length;i+=3){
      B3.Vector3.TransformCoordinatesFromFloatsToRef(p[i],p[i+1],p[i+2],world,tmp);
      const v=[tmp.x,tmp.y,tmp.z];for(let k=0;k<3;k++){min[k]=Math.min(min[k],v[k]);max[k]=Math.max(max[k],v[k]);}
    }
   }
   return {clip:o.root._clip,q:o.R.sh.rotationQuaternion.asArray(),min,max,hip:o.hips.position.y};
  };
 for(const name of ['Idle','Attack','Hit','Death'])samples[name]=sample(name);
  const death=Array.from({length:11},(_,k)=>sample('Death',10000,1.3,k/10).min[1]);
  samples.revive=sample('Idle',12000,2.3);
  return {samples,death,key:bakeKey('baron'),model:assetUrl('models/young-baron.dgm')};
 })()`);
 console.log('Death floor',result.death);
 for(const name of ['Idle','Attack','Hit','Death']){
  const s=result.samples[name];assert.equal(s.clip,name);
  assert([...s.min,...s.max].every(x=>Number.isFinite(x)&&Math.abs(x)<4),'invalid deformed bounds: '+name);
  for(let k=0;k<3;k++)assert(s.max[k]>s.min[k]);
  assert(s.min[1]>-.08,'model fell through floor: '+name);
 }
 assert(result.death.every(y=>y>-.08),'Death feet sink through floor');
 assert.notDeepEqual(result.samples.Idle.q,result.samples.Attack.q);
 assert.equal(result.samples.revive.clip,'Idle');
 assert(Math.abs(result.samples.Idle.hip-.902571)<.02,'bind hip height was overwritten');
 assert(result.key.includes(result.model));assert.notEqual(result.key,'b9:baron');
 console.log('PASS BH4 real Babylon skin/clip sampling, finite bounds, revive and portrait cache');
 console.log(JSON.stringify(result.samples));
}finally{g.ctx.__scene.dispose();engine.dispose();}
