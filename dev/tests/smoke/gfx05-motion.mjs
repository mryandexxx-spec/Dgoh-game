// GFX-05/A: isolated visual laboratory, no runtime or save changes.
// cd dev && node tests/smoke/gfx05-motion.mjs dist/pwa/index.html
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {serve} from '../lib/serve.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const out=path.resolve(process.argv[3]||'gfx05-motion-out');
const save=fs.readFileSync(path.join(here,'../fixtures/saves/03-late.json'),'utf8');
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(x=>fs.existsSync(x));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync(out,{recursive:true});
const server=await serve(path.dirname(html));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report=[];
try {
 for(const [width,height] of [[844,390],[667,375]]) for(const gfx of ['med','low']){
  const page=await browser.newPage();
  try{
   await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
   await page.evaluateOnNewDocument((save,gfx)=>{
    localStorage.clear();localStorage.setItem('dune-goh-v1',save);localStorage.setItem('dune-gfx',JSON.stringify({p:gfx,auto:0}));localStorage.setItem('dune-cine-off','true');
    try{Object.defineProperty(navigator,'serviceWorker',{value:undefined})}catch{}
   },save,gfx);
   await page.goto(server.url(path.basename(html)),{waitUntil:'load'});
   await page.evaluate(async()=>typeof loadB3==='function'&&await loadB3());
   await sleep(2500);
   await page.evaluate(()=>{window.bakePortraits=()=>{};closeInfo(true);closeOverlay();view='lobby';render();});
   for(const id of ['duncan','muaddib']){
    await page.waitForFunction(id=>!!MODEL_DATA[id],{timeout:45000},id);
    await page.evaluate(id=>openDetail(id),id);
    await page.waitForFunction(id=>HERO_STAGE?.o?.def?.id===id&&HERO_STAGE.o.root._authored&&HERO_STAGE.backdropTexture?.isReady()&&HERO_STAGE.pfIdle(),{timeout:45000},id);
    await sleep(1200);
    const inventory=await page.evaluate(()=>{
     const h=HERO_STAGE,o=h.o,gl=h.engine._gl;
     return {id:o.def.id,authored:!!o.root._authored,clipNames:o.root._clipNames||{},clips:Object.entries(o.root._clips||{}).map(([name,c])=>({name,duration:c.duration,tracks:c.tracks.map(t=>({node:t.node?.name,path:t.path||'rotation',keys:t.times.length}))})),head:o.head?.name,rest:Object.keys(o.root._clipRest||{}),renderer:gl?.getParameter(gl.RENDERER),meshes:h.scene.meshes.length};
    });
    if(!inventory.clips.length)throw new Error(id+' has no authored clips; cannot approve motion');
    const variants=id==='duncan'?['baseline','long-look','weapon-rest']:['baseline','composed','watchful'];
    for(const variant of variants){
     const duration=await page.evaluate(({variant,id})=>{
      const h=HERO_STAGE,o=h.o,root=o.root,names=root._clipNames;
      const original=h.tick, oldAuto=h.auto, oldYaw=h.yaw, oldPhase=o.phase, oldShow=names.Showcase;
      const clip=id==='duncan'&&variant==='long-look'?'Long_Breathe_and_Look_Around':id==='duncan'&&variant==='weapon-rest'?'Lower_Weapon_Look_Raise':names.Showcase||names.Idle||'Idle';
      if(!root._clips[clip])throw Error('Missing '+clip);
      if(id==='duncan')names.Showcase=clip;
      const seconds=root._clips[clip].duration;
      const yaw=id==='duncan'?0:variant==='baseline'?-.35:.22;
      h.yaw=yaw;h.yawV=0;h.auto=false;h.intro=0;o.phase=0;
      let raw=null, requested=0, rendered=-1;
      const q=B3.Quaternion.Identity();
      const setOffset=(axis,angle)=>{q.copyFrom(B3.Quaternion.RotationAxis(axis,angle));o.head.rotationQuaternion.multiplyInPlace(q);};
      h.tick=function(now,t){
       if(raw&&o.head?.rotationQuaternion)o.head.rotationQuaternion.copyFrom(raw);
       this.yaw=yaw;this.yawV=0;
       const sample=variant==='watchful'?requested*.68:variant==='composed'?requested*.8:requested;
       original.call(this,now,sample);
       if(id==='muaddib'&&variant!=='baseline'&&o.head?.rotationQuaternion){
        raw=o.head.rotationQuaternion.clone();
        setOffset(B3.Axis.X,-.17);
        if(variant==='watchful')setOffset(B3.Axis.Y,.23*Math.sin(Math.PI*Math.min(1,requested/seconds))**2);
       }else raw=null;
       rendered=requested;
      };
      h.__labSample=t=>{requested=t;rendered=-1;};
      h.__labRendered=t=>rendered===t;
      h.__labRestore=()=>{if(raw&&o.head?.rotationQuaternion)o.head.rotationQuaternion.copyFrom(raw);h.tick=original;h.auto=oldAuto;h.yaw=oldYaw;h.yawV=0;o.phase=oldPhase;if(oldShow===undefined)delete names.Showcase;else names.Showcase=oldShow;delete h.__labRestore;delete h.__labSample;delete h.__labRendered;};
      return seconds;
     },{id,variant});
     // Sample exact normalized clip phases, not wall-clock guesses. For
     // slowed Muad'Dib clips use a full rescaled period.
     const period=duration/(variant==='watchful'?.68:variant==='composed'?.8:1);
     for(const [index,frac] of [0,.16,.33,.5,.66,.83,.99].entries()){
      const sec=period*frac;
      await page.evaluate(t=>HERO_STAGE.__labSample(t),sec);
      await page.waitForFunction(t=>HERO_STAGE.__labRendered(t),{timeout:15000},sec);
      await page.screenshot({path:path.join(out,[id,width,gfx,variant,index].join('-')+'.png')});
     }
     await page.evaluate(()=>HERO_STAGE.__labRestore?.());
    }
    report.push({width,height,gfx,...inventory});
    fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify(report,null,2));
    await page.evaluate(()=>{closeInfo(true);closeOverlay();});
   }
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
console.log('GFX05 evidence captured; artistic review still required',report.length);
