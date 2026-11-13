// Duncan Meshy: actual Babylon/WebGL hero-stage clip and rig smoke at MED/LOW.
// Fails if the fallback procedural model loads or an action gets stuck.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
const require=createRequire(import.meta.url), puppeteer=require('puppeteer-core');
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
if(!chrome) throw Error('Chromium required');
const save=fs.readFileSync(new URL('../fixtures/saves/03-late.json',import.meta.url),'utf8');
const out=path.resolve('dist/duncan-meshy-shots');fs.mkdirSync(out,{recursive:true});
const srv=await serve(path.dirname(html));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try {
 for(const [width,height,quality] of [[844,390,'med'],[667,375,'low']]){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
  await page.evaluateOnNewDocument((s,q)=>{
   localStorage.setItem('dune-goh-v1',s);localStorage.setItem('dune-gfx',JSON.stringify({p:q,auto:0}));
   localStorage.setItem('dune-cine-off','true');
   try{Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch{}
  },save,quality);
  await page.goto(srv.url(path.basename(html)),{waitUntil:'load'});
  await page.evaluate(async()=>{
   window.openCalendar=()=>{};window.toast=()=>{};window.renderNotes=()=>{};
   await loadB3();closeInfo(true);closeOverlay();openDetail('duncan');
  });
  await page.waitForFunction(()=>typeof HERO_STAGE!=='undefined' && !!HERO_STAGE?.o?.root?._clips && !!HERO_STAGE?.o?.root?._authored,{timeout:25000});
  await page.evaluate(async()=>{await HERO_STAGE.scene.whenReadyAsync();heroHold(true);});
  const snapshot=await page.evaluate(()=>{
   const o=HERO_STAGE.o,clips=o.root._clips,names=o.root._clipNames;
   const keys=['Idle','Attack','special','ult','Hit','Death','Revive','Showcase'];
   for(const key of keys)if(!clips[names[key]])throw Error('Missing Duncan clip '+key+': '+names[key]);
   if(o.root._clipRest && Object.keys(o.root._clipRest).length!==66)throw Error('Unexpected Duncan joint count');
   const states=['idle','basic','special','ult','hit','death','revive','recover'],result=[];
   const now=20000;
   for(const state of states){
     o.act=null;o.dead=false;o.hitT=0;o.rise=0;
     if(['basic','special','ult'].includes(state)){
       const ab=o.def[state==='basic'?'basic':state];
       o.act={key:state,ab,kind:state==='special'?'cast':'melee',t0:now-650,dur:1800,
              dir:V3(1,0,0),to:V3(1,0,0),fx:1};
     } else if(state==='hit')o.hitT=now-150;
     else if(state==='death'){o.dead=true;o.deathT=now-550;}
     else if(state==='revive')o.rise=now-500;
     else if(state==='recover')o.act={key:'basic',ab:o.def.basic,kind:'melee',t0:now-2200,dur:1800,dir:V3(1,0,0),to:V3(1,0,0),fx:1};
     poseHuman(HERO_STAGE,o,now,1.3,1);
     o.root.computeWorldMatrix(true);
     for(const m of o.root.getChildMeshes()){m.computeWorldMatrix(true);if(m.skeleton)m.skeleton.prepare(true);}
     HERO_STAGE.scene.render();
     const expected={idle:'Showcase',basic:'Attack',special:'special',ult:'ult',hit:'Hit',death:'Death',revive:'Revive',recover:'Showcase'}[state];
     const got=o.root._clip;
     if(got!==expected)throw Error(state+' expected '+expected+' got '+got);
     if(state==='recover'&&o.act!==null)throw Error('Duncan action did not finish');
     if(state==='revive'&&Math.abs(o.body.position.y)>1e-5)throw Error('Death fall offset leaked into Ghola revive');
     const rot=o.R.hand.rotationQuaternion?.asArray();
     if(!rot||!rot.every(Number.isFinite))throw Error('Invalid hand quaternion: '+state);
     result.push({state,clip:got,motion:o.root._motion,hand:rot});
   }
   // Restore regular portrait pose before releasing the stage.
   poseHuman(HERO_STAGE,o,now,1.3,1);
   return {result,parts:o.root.getChildMeshes().filter(m=>m.skeleton).map(m=>({name:m.name,vertices:m.getTotalVertices()})),swordMeshes:o.wpn.getChildMeshes().length};
  });
  assert.equal(snapshot.parts.length,1,'Expected a single optimized skinned Meshy part');
  assert(snapshot.parts[0].vertices>10000,'Duncan Meshy geometry did not load');
  assert(snapshot.swordMeshes>0,'Game sword is not attached');
  assert.deepEqual(errors,[],'WebGL/page errors');
  await page.screenshot({path:path.join(out,`duncan-${width}-${quality}.png`)});
  console.log('PASS Duncan Meshy WebGL',width,height,JSON.stringify(snapshot));
  await page.evaluate(()=>heroHold(false));await page.close();
 }
}finally{await browser.close();await srv.close?.();}
