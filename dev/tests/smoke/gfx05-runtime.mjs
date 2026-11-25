// GFX-05/B: real authored card playback, controls and comparative frame cost.
// node tests/smoke/gfx05-runtime.mjs <html> <out> [--baseline]
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {serve} from '../lib/serve.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),html=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),baseline=process.argv.includes('--baseline');
const save=fs.readFileSync(path.join(here,'../fixtures/saves/03-late.json'),'utf8');
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync(out,{recursive:true});
const server=await serve(path.dirname(html));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const rows=[];
try{
 for(const [width,height,gfx] of [[844,390,'med'],[667,375,'med'],[844,390,'low'],[667,375,'low']]){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
   await page.evaluateOnNewDocument((save,gfx)=>{
    window.__DGOH_PERF_NO_BAKE__=true;
    localStorage.clear();localStorage.setItem('dune-goh-v1',save);localStorage.setItem('dune-gfx',JSON.stringify({p:gfx,auto:0}));localStorage.setItem('dune-cine-off','true');
    try{Object.defineProperty(navigator,'serviceWorker',{value:undefined})}catch{}
    const stats=window.__motionGL={draws:0};
    for(const P of [window.WebGLRenderingContext,window.WebGL2RenderingContext])if(P)for(const n of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
     const f=P.prototype[n];if(f)P.prototype[n]=function(...a){stats.draws++;return f.apply(this,a);};
    }
   },save,gfx);
   await page.goto(server.url(path.basename(html)),{waitUntil:'load'});
   await page.evaluate(async()=>await loadB3());
   await sleep(2500);
   await page.evaluate(()=>{closeInfo(true);closeOverlay();view='lobby';render();});
   for(const id of ['duncan','muaddib']){
    await page.waitForFunction(id=>!!MODEL_DATA[id],{timeout:45000},id);
    await page.evaluate(id=>openDetail(id),id);
    await page.waitForFunction(id=>HERO_STAGE?.o?.def?.id===id&&HERO_STAGE.o.root._authored&&HERO_STAGE.backdropTexture?.isReady()&&HERO_STAGE.pfIdle(),{timeout:45000},id);
    await page.evaluate(async()=>{await HERO_STAGE.scene.whenReadyAsync();heroHold(true);});
    const result=await page.evaluate(({id,gfx,baseline})=>{
     const h=HERO_STAGE,o=h.o,gl=h.engine._gl;
     if(!baseline&&h.motionHero!==id)throw Error('Motion profile not selected: '+id);
     const now=performance.now()+1500;h.intro=0;h.motionLast=null;
     if(!baseline)h.motionElapsed=0;
     const step=t=>{h.tick(now+t*1000,(now+t*1000)/1000);h.scene.render();gl.finish();};
     const q=()=>o.head.rotationQuaternion.asArray();
     const dot=(a,b)=>Math.abs(a.reduce((n,x,i)=>n+x*b[i],0));
     const elapsed=()=>h.motionElapsed;
     step(0);const before=elapsed(),pose0=q(),yaw0=h.yaw;
     step(.2);const after=elapsed();
     if(!baseline){
      if(h.auto||Math.abs(h.yaw-yaw0)>1e-7)throw Error('Unexpected auto spin');
      if(id==='duncan'&&(o.root._lastClip!=='Long_Breathe_and_Look_Around'||o.root._clipNames.Showcase!=='Idle_11'))throw Error('Showcase mapping leaked');
      if(id==='muaddib'&&o.root._lastClip!=='Idle_11')throw Error('Wrong Muad clip');
      if(gfx==='low'?(after!==before||dot(pose0,q())<.99999):after-before<.19)throw Error('Clock/profile mismatch');
      h.drag={x:0,y0:h.yaw};step(.4);if(elapsed()!==after)throw Error('Drag advanced clock');h.drag=null;
      h.yaw=.4;step(.5);if(Math.abs(h.yaw-.4)>1e-5)throw Error('Manual yaw lost');h.yaw=yaw0;
      const frozen=elapsed();step(4);if(elapsed()!==frozen)throw Error('Suspension catchup');
      const still=q();step(4);step(4);if(dot(still,q())<.99999)throw Error('Head correction accumulated');
      heroHold(false);heroHold(true);step(8);if(elapsed()!==frozen)throw Error('Hold catchup');
      // Force a known reduced-motion preference through the browser in a separate test below.
     }
     h.motionLast=null;if(!baseline)h.motionElapsed=0;h.yaw=yaw0;
     const durations=[],draws=[];
     for(let i=0;i<25;i++){
      const t=9+i/15,start=performance.now(),d0=window.__motionGL.draws;
      step(t);if(i>=5){durations.push(performance.now()-start);draws.push(window.__motionGL.draws-d0);}
     }
     durations.sort((a,b)=>a-b);const p95=durations[Math.ceil(durations.length*.95)-1];
     return {id,authored:!!o.root._authored,clip:o.root._lastClip,renderer:gl.getParameter(gl.RENDERER),p95,draws:draws.reduce((a,b)=>a+b,0)/draws.length,meshes:h.scene.meshes.length,textures:h.scene.textures.length,materials:h.scene.materials.length,contexts:B3.EngineStore.Instances.filter(e=>!e.isDisposed).length};
    },{id,gfx,baseline});
    assert.equal(result.contexts,1,'Engine count');
    // Capture exact ordered phases of the actual production tick; no clip-map or
    // quaternion override in the harness. Only time and settled camera controlled.
    for(const [i,t] of [0,.5,1,1.5,2.5,5,8,11.2,11.4].entries()){
     await page.evaluate(t=>{
      const h=HERO_STAGE,now=performance.now()+1500;
      if(h.motionHero){h.motionElapsed=t;h.motionLast=now;}
      h.tick(now,t);h.scene.render();h.engine._gl.finish();
     },t);
     await page.screenshot({path:path.join(out,[id,width,gfx,i].join('-')+'.png')});
    }
    if(!baseline){
     await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
     await page.waitForFunction(()=>HERO_STAGE.motionPreference?.matches);
     const reduced=await page.evaluate(()=>{
      const h=HERO_STAGE,now=performance.now()+1500;h.motionLast=null;
      h.tick(now,now/1000);const e=h.motionElapsed,a=h.o.head.rotationQuaternion.asArray();
      h.tick(now+200,(now+200)/1000);const b=h.o.head.rotationQuaternion.asArray();
      return e===h.motionElapsed&&Math.abs(a.reduce((n,x,i)=>n+x*b[i],0))>.99999;
     });
     assert(reduced,'Reduced motion pose drift');
     await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
    }
    rows.push({width,height,gfx,...result});fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(rows,null,2));
    await page.evaluate(()=>{heroHold(false);closeInfo(true);closeOverlay();});
   }
   if(!baseline){
    await page.evaluate(()=>openDetail('leto'));
    await page.waitForFunction(()=>HERO_STAGE?.o?.def?.id==='leto');
    assert(await page.evaluate(()=>!HERO_STAGE.motionHero&&HERO_STAGE.auto),'Nonpilot changed');
    await page.evaluate(()=>{closeInfo(true);closeOverlay();openDetail('duncan');});
    await page.waitForFunction(()=>HERO_STAGE?.motionHero==='duncan'&&HERO_STAGE.o?.root?._authored);
    assert(await page.evaluate(()=>HERO_STAGE.motionElapsed<5),'Reentry clock not reset');
   }
   assert.deepEqual(errors,[],'Uncaught browser errors');
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
console.log('GFX05 runtime evidence',rows.length,baseline?'baseline':'candidate');
