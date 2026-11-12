// Real authored model through the full combat pose path (not poseModelClip alone).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as B from '@babylonjs/core/index.js';
import {loadGame} from './lib/load.mjs';
const g=loadGame(process.argv[2]||'dist/pwa/index.html');
g.set('B3',B);g.set('tex3',()=>{});
g.ctx.__mocap=JSON.parse(readFileSync('assets/anim/mocap.json','utf8'));
g.ctx.__muad=new Uint8Array(readFileSync('assets/models/muad-dib-legend.dgm'));
g.run('setMocap(__mocap);for(const f of B3_SUBS)f();MODEL_DATA.muaddib=parseDgm(__muad);');
const engine=new B.NullEngine(),scene=new B.Scene(engine);g.ctx.__scene=scene;
try{
 g.run(`const combatMuad=makeHuman3(CH.muaddib,{scene:__scene,shadows:null,pbr:false});
 Object.assign(combatMuad,{def:CH.muaddib,base:V3(),face:0,side:'A',phase:0});
 const combatStage={slashFX(){},castFX(){},voiceFX(){},muzzleFX(){}};`);
 assert.equal(g.run('!!combatMuad.root._clipRest'),true);
 for(const speed of [1,2,4]){
  for(let cycle=0;cycle<4;cycle++){
   const t0=10000+cycle*10000+speed*100000;
   g.ctx.__t=t0;
   g.run(`combatMuad.dead=false;combatMuad.hitT=0;combatMuad.act=null;poseHuman(combatStage,combatMuad,__t,__t/1000,${speed});
    combatMuad.act={key:'basic',ab:combatMuad.def.basic,kind:'melee',t0:__t,dur:1500/${speed},dir:V3(1,0,0),to:V3(2,0,0),fx:1};`);
   for(const k of [.3,.45,.65,1.01]){
    g.ctx.__now=t0+1500/speed*k;
    assert.doesNotThrow(()=>g.run(`poseHuman(combatStage,combatMuad,__now,__now/1000,${speed})`),`basic/idle speed ${speed} progress ${k}`);
   }
   for(const key of ['special','ult','Hit','Death','Idle']){
    g.ctx.__now=t0+3000;
    g.run(`combatMuad.act=null;combatMuad.hitT=0;combatMuad.dead=false;
     if('${key}'==='Hit')combatMuad.hitT=__now-50;
     if('${key}'==='Death'){combatMuad.dead=true;combatMuad.deathT=__now-500;}
     if(['special','ult'].includes('${key}'))combatMuad.act={key:'${key}',ab:combatMuad.def['${key}'],kind:'cast',t0:__now-100,dur:1000,dir:V3(1,0,0),to:V3(),fx:1};`);
    assert.doesNotThrow(()=>g.run(`poseHuman(combatStage,combatMuad,__now,__now/1000,${speed})`),`${key} speed ${speed}`);
   }
  }
 }
 // Defensive transition reset: tolerate a cleared quaternion without losing
 // the source bind pose or stopping the frame.
 g.run(`for(const r of Object.values(combatMuad.root._clipRest))r.node.rotationQuaternion=null;
  combatMuad.root._lastClip=null;combatMuad.dead=false;combatMuad.act=null;combatMuad.hitT=0;
  poseHuman(combatStage,combatMuad,900000,900,4);`);
 let clock=1000000;g.ctx.performance.now=()=>clock;
 const warn=g.ctx.console.warn;g.ctx.console.warn=()=>{};
 g.run(`const guardPeer=makeHuman3(CH.leto,{scene:__scene,shadows:null,pbr:false});
 const guardArena=Object.create(Arena3D.prototype);
 Object.assign(guardArena,{alive:true,cv:{isConnected:true,clientWidth:844,clientHeight:390},w:844,h:390,
  speed:4,scene:__scene,camX:-11.5,camH:3.9,camDist:10,look:V3(0,1.35,0),units:{},summons:[],fxq:[],tr:[],hudFrames:0});
 guardArena.camera=new B3.UniversalCamera('recovery-camera',V3(-11.5,3.9,10),__scene);
 guardArena.glLight=new B3.PointLight('recovery-flash',V3(0,5,0),__scene);
 guardArena.glT=performance.now()-200;
 guardArena.placeHud=()=>guardArena.hudFrames++;
 for(const [o,id,def,x]of [[combatMuad,'muad',CH.muaddib,-3],[guardPeer,'peer',CH.leto,3]]){
  Object.assign(o,{uid:id,def,base:V3(x,0,0),face:0,phase:0,dead:false,act:null,hitT:0,shieldK:0,tierC:col3('#e8913f')});
  o.ring={material:new B3.StandardMaterial('ring-'+id,__scene),scaling:V3(1,1,1)};guardArena.units[id]=o;
 }
 let injectPoseFailure=true,failedPoseCalls=0,peerPoseCalls=0;
 const originalCombatPose=poseHuman;
 poseHuman=(A,o,...args)=>{
  if(o===combatMuad&&injectPoseFailure){failedPoseCalls++;throw Error('injected isolated pose failure');}
  if(o===guardPeer)peerPoseCalls++;
  return originalCombatPose(A,o,...args);
 };`);
 const before=scene.getFrameId(),peerPoses=[];
 try{
  for(let i=0;i<4;i++){
   clock+=500;assert.doesNotThrow(()=>g.run('guardArena._loop()'),'one bad pose must not freeze scene');
   peerPoses.push(g.run('guardPeer.spine.rotation.x'));
  }
  assert.equal(g.run('failedPoseCalls'),1,'broken idle pose must be quarantined');
  assert.equal(g.run('peerPoseCalls'),4,'other heroes must keep animating');
  assert.equal(g.run('guardArena.hudFrames'),4,'HUD projection must continue');
  assert.equal(scene.getFrameId()-before,4,'render loop must continue');
  assert.equal(g.run('guardArena.glLight.intensity'),0,'temporary light must expire');
  assert.ok(new Set(peerPoses).size>1,'peer idle pose must move');
  g.run(`injectPoseFailure=false;combatMuad.act={key:'special',ab:combatMuad.def.special,kind:'cast',t0:performance.now(),dur:1000,dir:V3(1,0,0),to:V3(),fx:1};`);
  clock+=50;g.run('guardArena._loop();combatMuad.act=null;');clock+=50;g.run('guardArena._loop();');
  assert.equal(g.run('combatMuad._poseFault'),null,'next action and idle must recover');
 }finally{g.run('poseHuman=originalCombatPose');g.ctx.console.warn=warn;}
 console.log('PASS full combat x1/x2/x4, transition recovery, pose isolation, frame/HUD continuation and light cleanup');
}finally{scene.dispose();engine.dispose();}
