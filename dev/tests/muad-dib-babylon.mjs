// MUAD3D: run the real DGM v5 through Babylon NullEngine and the project's model pipeline.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as B from '@babylonjs/core/index.js';
import { loadGame } from './lib/load.mjs';
const g = loadGame(process.argv[2] || 'dist/pwa/index.html');
g.set('B3',B);
g.run('for(const f of B3_SUBS)f();');
g.set('tex3',()=>{});
g.ctx.__muad = new Uint8Array(readFileSync('assets/models/muad-dib-legend.dgm'));
g.run('MODEL_DATA.muaddib=parseDgm(__muad);');
const engine = new B.NullEngine(), scene = new B.Scene(engine);
g.ctx.__scene = scene;
try {
  g.run(`{
    const d=CH.muaddib;
    if(!d)throw Error('missing existing legendary hero');
    window.muadTest=makeHuman3(d,{scene:__scene,shadows:null,pbr:false});
    muadTest.base=V3();muadTest.face=0;muadTest.side='A';muadTest.phase=0;muadTest.def=d;
  }`);
  const out=g.run(`(()=>{
    const o=muadTest, clips=o.root._clips;
    if(!o.root._authored || !clips || !clips.Idle_11)throw Error('not authored DGM v5');
    const states={};
    const sample=(key, now, t)=>{
      o.dead=false;o.deathT=0;o.hitT=0;o.act=null;
      if(['basic','special','ult'].includes(key)){
        const ab=o.def[key==='basic'?'basic':key];
        o.act={ab,key,kind:'cast',t0:now-500,dur:1000,dir:V3(0,0,1),to:V3(),fx:1};
      }
      if(key==='Hit')o.hitT=now-170;
      if(key==='Death'){o.dead=true;o.deathT=now-650;}
      poseModelClip(o,now,t,1,{});
      o.root.computeWorldMatrix(true);
      let vertices=0,meshes=0,bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
      for(const m of o.root.getChildMeshes()){
        if(!m.skeleton)continue;
        m.computeWorldMatrix(true);m.skeleton.prepare(true);
        const p=m.getPositionData(true,false),world=m.getWorldMatrix(),v=V3();
        for(let i=0;i<p.length;i+=3){
          B3.Vector3.TransformCoordinatesFromFloatsToRef(p[i],p[i+1],p[i+2],world,v);
          for(let k=0;k<3;k++){bounds[k]=Math.min(bounds[k],v.asArray()[k]);bounds[k+3]=Math.max(bounds[k+3],v.asArray()[k]);}
          vertices++;
        }
        meshes++;
      }
      const q=o.R.hand.rotationQuaternion?.asArray();
      return {clip:o.root._lastClip,vertices,meshes,bounds,q,hips:o.hips.position.asArray()};
    };
    for(const key of ['Idle','basic','special','ult','Hit','Death'])states[key]=sample(key,10000,1.3);
    states.returnIdle=sample('Idle',12000,3.2);
    return states;
  })()`);
  const expected={Idle:'Idle_11',basic:'Right_Hand_Sword_Slash',special:'Charged_Spell_Cast',
    ult:'mage_soell_cast_1',Hit:'Stand_Dodge',Death:'Charged_Ground_Slam',returnIdle:'Idle_11'};
  for(const [key,s] of Object.entries(out)){
    assert.equal(s.clip,expected[key],key+' clip mismatch');
    assert.equal(s.vertices,17907,key+' vertices');
    assert.equal(s.meshes,1,key+' number of skinned meshes');
    assert(s.bounds.every(x=>Number.isFinite(x)&&Math.abs(x)<20),key+' invalid bounds: '+s.bounds);
    assert(s.bounds[3]-s.bounds[0]>.1&&s.bounds[4]-s.bounds[1]>.2,key+' collapsed character');
    assert(s.q?.every(Number.isFinite),key+' invalid hand quaternion');
  }
  assert.notDeepEqual(out.basic.q,out.special.q,'attack and ability share same pose');
  assert.notDeepEqual(out.special.q,out.ult.q,'special and ultimate share same pose');
  console.log('PASS MUAD3D DGM v5 Babylon skinning, transitions, 6 states',JSON.stringify(
    Object.fromEntries(Object.entries(out).map(([key,s])=>[key,{clip:s.clip,bounds:s.bounds}]))));
} finally {scene.dispose();engine.dispose();}
