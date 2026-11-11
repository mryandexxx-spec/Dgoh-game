// BH6: run the uploaded legendary-Baron DGM through the *real* Babylon skinning
// code (NullEngine). No public CHARS entry, no published UI or WebGL dependency.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as B from '@babylonjs/core/index.js';
import { loadGame } from './lib/load.mjs';

const g=loadGame(process.argv[2] || 'dist/pwa/index.html');
g.set('B3',B);g.run('for(const f of B3_SUBS)f();');g.set('tex3',()=>{});
g.ctx.__data=new Uint8Array(readFileSync('assets/models/baron-legend-mobile.dgm'));
g.run('MODEL_DATA.baron_legend=parseDgm(__data);');
const engine=new B.NullEngine();
g.ctx.__scene=new B.Scene(engine);
try {
  g.run(`{
    // Preview-only standalone definition. CH.baron / CHARS untouched.
    const d={id:'baron_legend',role:'sup',legendary:true,f:['hark'],
      basic:{n:'Приказ Барона',tgt:'enemy'},special:{n:'Власть через страх'},
      ult:{n:'Глаза императора'},gl:{n:'Падение Атрейдесов'}};
    window.legend=makeHuman3(d,{scene:__scene,shadows:null,pbr:false});
    legend.base=V3();legend.face=0;legend.side='A';legend.phase=0;legend.def=d;
  }`);
  const result=g.run(`(()=>{
    const sample=(key,now=10000,t=1.2)=>{
      legend.dead=false;legend.deathT=0;legend.act=null;legend.hitT=0;
      if(['basic','special','ult','gl'].includes(key))
        legend.act={key,kind:'cast',t0:now-460,dur:1000,dir:V3(0,0,1),to:V3(),fx:1};
      if(key==='Hit')legend.hitT=now-170;
      if(key==='Death'){legend.dead=true;legend.deathT=now-900;}
      poseHuman({showcase:key==='Showcase'},legend,now,t,1);
      legend.root.computeWorldMatrix(true);
      const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
      let vertices=0,meshes=0;
      for(const m of legend.root.getChildMeshes()){
        m.computeWorldMatrix(true);if(!m.skeleton)continue;
        m.skeleton.prepare(true);const p=m.getPositionData(true,false);
        const tmp=V3(),world=m.getWorldMatrix();
        for(let i=0;i<p.length;i+=3){
          B3.Vector3.TransformCoordinatesFromFloatsToRef(p[i],p[i+1],p[i+2],world,tmp);
          const v=[tmp.x,tmp.y,tmp.z];
          for(let k=0;k<3;k++){bounds[k]=Math.min(bounds[k],v[k]);bounds[k+3]=Math.max(bounds[k+3],v[k]);}
          vertices++;
        }
        meshes++;
      }
      return {key,motion:legend.root._motion,bounds,vertices,meshes,
        left:legend.Lf.sh.rotation.asArray(),right:legend.R.sh.rotation.asArray(),
        head:legend.head.rotation.asArray()};
    };
    const out={};
    for(const key of ['Idle','Showcase','basic','special','ult','gl','Hit','Death'])out[key]=sample(key);
    out.idleLater=sample('Idle',12000,3.6);
    return out;
  })()`);
  assert.equal(result.Idle.vertices,20171,'must skin the real approved mobile DGM');
  assert.equal(result.Idle.meshes,11);
  // The source's robe is charcoal (#2f2b2f), not PBR white.
  // Check that ONLY the new legend explicitly owns its approved part colors.
  const colors=g.run(`(()=>{
    const meshes=legend.root.getChildMeshes();
    const pick=name=>{
      const m=meshes.find(x=>x.name.includes(name));
      return m&&{rgba:m.material.diffuseColor.asArray(),vertexColors:m.useVertexColors};
    };
    return {robe:pick('obsidian_woven_robe'),skin:pick('pallid_skin'),
      metal:pick('aged_gunmetal')};
  })()`);
  assert.ok(colors.robe&&colors.skin&&colors.metal);
  assert.deepEqual(colors.robe.vertexColors,false);
  assert(Math.abs(colors.robe.rgba[0]-47/255)<.015,'robe must be charcoal not white');
  assert(Math.abs(colors.skin.rgba[0]-168/255)<.015,'pale skin must retain source tone');

  for(const key of ['Idle','Showcase','basic','special','ult','gl','Hit','Death']){
    const s=result[key];
    assert.equal(s.motion,key,'animation state mismatch: '+key);
    assert(s.bounds.every(v=>Number.isFinite(v)&&Math.abs(v)<20),'nonfinite bounds: '+key+' '+s.bounds);
    for(let k=0;k<3;k++)assert(s.bounds[k+3]>s.bounds[k],key+' collapsed dimension '+k);
    assert([...s.left,...s.right,...s.head].every(Number.isFinite),key+' nonfinite bone pose');
  }
  assert.notDeepEqual(result.basic.right,result.special.right,'basic and special have identical arm pose');
  assert.notDeepEqual(result.special.left,result.ult.left,'special and ult have identical pose');
  assert.notDeepEqual(result.ult.left,result.gl.left,'ult and GL have identical pose');
  assert.notDeepEqual(result.Idle.head,result.idleLater.head,'idle should have live breathing');
  assert.equal(g.run('CH.baron_legend'),undefined,'preview must never register live hero');
  console.log('BH6 real legendary Baron DGM Babylon skinning (11 meshes, 20171 verts, 8 states): PASS');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(result).filter(([k])=>k!=='idleLater').map(([k,v])=>[k,{motion:v.motion,bounds:v.bounds}]))));
} finally { g.ctx.__scene.dispose();engine.dispose(); }
