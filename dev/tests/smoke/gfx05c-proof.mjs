// Isolated GFX-05/C evidence harness. Never shipped in runtime.
// Real production Babylon tick, deterministic frame sampling, synthetic visual-only events.
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
const bench=process.argv.includes('--bench');
try {
 for(const [width,height,gfx] of (bench?[[844,390,'med'],[844,390,'low'],[667,375,'low']]:[[844,390,'med'],[667,375,'med'],[844,390,'low'],[667,375,'low']])){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
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
   for(const id of (bench?[gfx==='med'?'duncan':'muaddib']:['duncan','muaddib'])){
    await page.waitForFunction(id=>!!MODEL_DATA[id],{timeout:45000},id);
    await page.evaluate(id=>openDetail(id),id);
    await page.waitForFunction(id=>HERO_STAGE?.o?.def?.id===id&&HERO_STAGE.o.root._authored&&HERO_STAGE.backdropTexture?.isReady()&&HERO_STAGE.pfIdle(),{timeout:45000},id);
    await page.evaluate(async()=>{const h=HERO_STAGE;await h.scene.whenReadyAsync();h.__qaUpdate=h.update;h.update=()=>{};});
    const steady=await page.evaluate(({id,gfx})=>{
     const h=HERO_STAGE,o=h.o,gl=h.engine._gl,now=performance.now()+1500;
     assertMotion();function assertMotion(){if(h.motionHero!==id)throw Error('Wrong authored motion: '+id);}
     h.intro=0;h.motionLast=null;h.motionElapsed=0;
     const times=[],draws=[];
     for(let i=0;i<210;i++){
      const t=now+i*1000/30,start=performance.now(),d0=window.__motionGL.draws;
      h.tick(t,t/1000);h.scene.render();gl.finish();
      if(i>=30){times.push(performance.now()-start);draws.push(window.__motionGL.draws-d0);}
     }
     times.sort((a,b)=>a-b);
     return {id,gfx,authored:!!o.root._authored,clip:o.root._lastClip,p95:times[Math.ceil(times.length*.95)-1],draws:draws.reduce((a,b)=>a+b,0)/draws.length,meshes:h.scene.meshes.length,textures:h.scene.textures.length,materials:h.scene.materials.length,contexts:B3.EngineStore.Instances.filter(e=>!e.isDisposed).length};
    },{id,gfx});
    assert.equal(steady.contexts,1);
    const prefix=[id,width,gfx].join('-');
    for(const kind of (bench?[]:['entry','up','star','relic'])){
     const folder=path.join(out,prefix,kind);fs.mkdirSync(folder,{recursive:true});
     const started=await page.evaluate(({id,kind,baseline})=>{
      const h=HERO_STAGE;
      h.motionLast=null;h.motionElapsed=0;h.intro=0;h.flashT=0;
      if(!baseline)h.cancelCinematic();
      const now=performance.now()+1500;h.__qaTime=now;
      if(kind==='entry'){h.intro=now;return true;}
      if(baseline){if(kind!=='relic'){h.celebrate(kind);h.flashT=now;}return true;}
      const ok=heroFeedback(id,kind);if(ok)h.cinematic.last=now;return ok;
     },{id,kind,baseline});
     if(!baseline&&kind!=='entry')assert.equal(started,gfx!=='low',prefix+' '+kind);
     const frames=width===844&&gfx==='med'?Array.from({length:35},(_,i)=>i*1000/30):[0,110,220,420,600,1133];
     for(const [i,ms] of frames.entries()){
      await page.evaluate(ms=>{
       const h=HERO_STAGE,t=h.__qaTime+ms;
       h.tick(t,t/1000);h.scene.render();h.engine._gl.finish();
      },ms);
      await page.screenshot({path:path.join(folder,String(i).padStart(3,'0')+'.png')});
     }
    }
    // Actual existing result overlay, using a presentation fixture only;
    // no changes to roster, resources or the persistent writer.
    for(const kind of (bench?[]:['star','relic'])){
     await page.evaluate(({id,kind})=>{
      const p=prog(id);const s0=heroSnap(id);
      const c=kind==='star'?{type:'star',id,from:Math.max(1,p.stars-1),to:p.stars,pw0:s0.pw}:{type:'hup',kind:'relic',id,from:'ДП1',to:'ДП2',s0};
      celebQueue(c);
     },{id,kind});
     await page.waitForSelector('#celeb');
     // Wait for CSS/WAAPI animations to be instantiated. Sample the actual
     // animation timeline at known times rather than capturing opacity zero.
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     for(const ms of [150,350,650,900]){
      await page.evaluate(ms=>{for(const anim of document.querySelector('#celeb').getAnimations({subtree:true})){anim.pause();anim.currentTime=ms;}},ms);
      await page.screenshot({path:path.join(out,prefix,'dialog-'+kind+'-'+ms+'.png')});
     }
     await page.evaluate(()=>document.querySelector('#celeb')?.remove());
    }
    await page.evaluate(()=>{const h=HERO_STAGE;h.update=h.__qaUpdate;delete h.__qaUpdate;closeInfo(true);closeOverlay();});
    rows.push({width,height,...steady});
    fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(rows,null,2));
   }
   assert.deepEqual(errors,[],'Uncaught browser errors');
  }finally{await page.close();}
 }
}finally{await browser.close();await server.close();}
console.log('GFX05C evidence',rows.length,baseline?'baseline':'candidate');
