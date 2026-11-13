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
  // The authored mesh can be present before its external JPEG has decoded.
  // A green rig test is not sufficient if the portrait draws an untextured silhouette.
  await page.waitForFunction(() => {
    const stage = typeof HERO_STAGE !== 'undefined' && HERO_STAGE;
    const mesh = stage?.o?.root?.getChildMeshes().find(m => m.skeleton);
    const mat = mesh?.material;
    const tex = mat && (mat.albedoTexture || mat.diffuseTexture);
    return !!tex && tex.isReady();
  }, {timeout:30000});
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
  // Background-reference and foreground captures use the *same real WebGL scene*.
  // Diffing them measures the character instead of relying on the existence of meshes.
  const [withoutHero, withHero] = await page.evaluate(async () => {
    const stage = HERO_STAGE, hero = stage.o.root;
    // Capture only the Babylon canvas: UI glyphs are not evidence of a visible model.
    const canvas = stage.cv;
    const take = () => canvas.toDataURL('image/png');
    hero.setEnabled(false); stage.scene.render(); const bg = take();
    hero.setEnabled(true); stage.scene.render(); const fg = take();
    return [bg, fg];
  });
  const visibility = await page.evaluate(async ([bg,fg]) => {
    const decode = src => new Promise((resolve,reject) => {
      const img = new Image(); img.onload = () => {
        const c = document.createElement('canvas'); c.width=img.width; c.height=img.height;
        const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(img,0,0);
        resolve({w:c.width,h:c.height,p:x.getImageData(0,0,c.width,c.height).data});
      }; img.onerror=reject; img.src=src;
    });
    const a=await decode(bg), b=await decode(fg);
    if(a.w!==b.w || a.h!==b.h) throw Error('Duncan capture size changed');
    let count=0, bright=0, sum=0, minX=a.w, maxX=-1, minY=a.h, maxY=-1;
    // Ignore narrow outer canvas borders and antialiasing noise.
    for(let y=3;y<a.h-3;y++)for(let x=3;x<a.w-3;x++){
      const i=(y*a.w+x)*4, dr=Math.abs(a.p[i]-b.p[i]),dg=Math.abs(a.p[i+1]-b.p[i+1]),db=Math.abs(a.p[i+2]-b.p[i+2]);
      if(dr+dg+db < 48) continue;
      const l=.2126*b.p[i]+.7152*b.p[i+1]+.0722*b.p[i+2];
      count++; sum+=l; if(l>70) bright++;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    return {pixels:count,meanLuma:count?sum/count:0,brightFraction:count?bright/count:0,
      bounds:count?[minX,minY,maxX,maxY]:null,canvas:[a.w,a.h]};
  },[withoutHero,withHero]);
  const area = visibility.canvas[0]*visibility.canvas[1];
  assert(visibility.pixels > Math.max(250,area*.004),
    'Duncan not visibly rendered: '+JSON.stringify(visibility));
  assert(visibility.meanLuma >= 32 && visibility.brightFraction >= .065,
    'Duncan is an excessively dark silhouette: '+JSON.stringify(visibility));
  assert(visibility.bounds[2]-visibility.bounds[0] >= visibility.canvas[0]*.055 &&
         visibility.bounds[3]-visibility.bounds[1] >= visibility.canvas[1]*.20,
    'Duncan is out of frame or too small: '+JSON.stringify(visibility));
  await page.screenshot({path:path.join(out,`duncan-${width}-${quality}.png`)});
  fs.writeFileSync(path.join(out,`duncan-${width}-${quality}.json`),JSON.stringify(visibility,null,2));
  console.log('Duncan visible pixel metrics',quality,JSON.stringify(visibility));
  console.log('PASS Duncan Meshy WebGL',width,height,JSON.stringify(snapshot));
  await page.evaluate(()=>heroHold(false));await page.close();
 }
}finally{await browser.close();await srv.close?.();}
