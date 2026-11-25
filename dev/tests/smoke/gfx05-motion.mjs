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
    for(const variant of ['baseline','grounded','character']){
     await page.evaluate(({variant,id})=>{
      const h=HERO_STAGE,o=h.o;
      if(h.__labOriginalTick)h.tick=h.__labOriginalTick;
      const original=h.__labOriginalTick=h.tick;
      const start=performance.now();
      const yaw=id==='duncan'?0:-.35;
      h.yaw=yaw;h.yawV=0;h.auto=variant==='baseline';h.intro=0;
      let raw=null;
      h.tick=function(now,t){
       if(raw&&o.head?.rotationQuaternion)o.head.rotationQuaternion.copyFrom(raw);
       const elapsed=Math.max(0,(now-start)/1000);
       if(variant!=='baseline'){this.yaw=yaw;this.yawV=0;}
       original.call(this,now,variant==='baseline'?t:start/1000+elapsed*(id==='duncan'?.85:.68));
       if(variant==='character'&&o.head?.rotationQuaternion&&o.root._clips){
        raw=o.head.rotationQuaternion.clone();
        // Gentle head turn with a full rest interval; candidate only.
        const u=elapsed%8,k=Math.max(0,Math.min(1,(u-2)/3));
        const turn=u>=2&&u<=5?Math.sin(Math.PI*k)**2:0;
        o.head.rotationQuaternion.multiplyInPlace(B3.Quaternion.RotationAxis(B3.Axis.Y,(id==='duncan'?.09:.14)*turn));
       }else raw=null;
      };
      h.__labRestore=()=>{if(raw&&o.head?.rotationQuaternion)o.head.rotationQuaternion.copyFrom(raw);h.tick=original;h.auto=true;h.yawV=0;delete h.__labOriginalTick;delete h.__labRestore;};
     },{id,variant});
     const started=Date.now();
     for(const ms of [0,1000,2500,3500,5000,7500]){
      await sleep(Math.max(0,ms-(Date.now()-started)));
      const name=[id,width,gfx,variant,ms].join('-')+'.png';
      await page.screenshot({path:path.join(out,name)});
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
