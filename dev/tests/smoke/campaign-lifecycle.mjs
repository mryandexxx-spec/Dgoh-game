// Targeted map lifecycle: real mount/render/dispose on MED/LOW phone + HIGH
// desktop. The gallery smoke separately covers every chapter and real gestures.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
import { resourceGrowth } from '../lib/resource-growth.mjs';
const puppeteer=createRequire(import.meta.url)('puppeteer-core');
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
const save=fs.readFileSync(new URL('../fixtures/saves/03-late.json',import.meta.url),'utf8');
const server=await serve(path.dirname(html));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--js-flags=--expose-gc']});
try {
  for(const [width,height,gfx] of [[844,390,'med'],[667,375,'low'],[960,600,'high']]){
    const page=await browser.newPage(),errors=[];
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:height<600,hasTouch:height<600,isLandscape:true});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&!/manifest/.test(m.text()))errors.push(m.text());});
    await page.setRequestInterception(true);page.on('request',r=>/^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url())?r.continue():r.abort());
    await page.evaluateOnNewDocument((save,gfx)=>{
      localStorage.setItem('dune-goh-v1',save);localStorage.setItem('dune-cine-off','true');localStorage.setItem('dune-gfx',JSON.stringify({p:gfx,auto:0}));
      Object.defineProperty(navigator,'serviceWorker',{value:undefined});
      window.__mapContexts=[];
      const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,options){const c=get.call(this,type,options);if(c&&/webgl/.test(type)&&!window.__mapContexts.some(ref=>ref.deref()===c))window.__mapContexts.push(new WeakRef(c));return c;};
    },save,gfx);
    await page.goto(server.url(path.basename(html)),{waitUntil:'load'});
    await page.evaluate(async()=>{await loadB3();closeInfo(true);closeOverlay();view='squad';render();});
    await page.waitForNetworkIdle({idleTime:200,timeout:30000});
    const samples=[];
    for(let cycle=0;cycle<3;cycle++){
      const result=await page.evaluate(async()=>{
        const tick=()=>new Promise(r=>setTimeout(r,25));
        const snapshot=()=>{
          window.gc?.();
          window.__mapContexts=window.__mapContexts.filter(ref=>ref.deref());
          const engines=__B3.EngineStore.Instances.filter(e=>!e.isDisposed);
          const scenes=engines.flatMap(e=>e.scenes).filter(s=>!s.cameras.some(c=>c.name==='bc'));
          return {engines:engines.length,contexts:window.__mapContexts.map(ref=>ref.deref()).filter(c=>c&&!c.isContextLost()).length,scenes:scenes.length,meshes:scenes.reduce((n,s)=>n+s.meshes.length,0),textures:scenes.reduce((n,s)=>n+s.textures.length,0)};
        };
        const mounted=[];
        for(const [side,chapter] of [['L',0],['C',CAMP_DEF.C.chapters.length-1]]){
          const map=chapterMap(side,chapter,S.cleared);if(!map)throw Error('Missing campaign map');
          const el=document.createElement('div');el.style.cssText='position:fixed;inset:0;width:100vw;height:100vh';
          el.innerHTML=map.nodes.map(n=>`<button data-c20node="${n.id}"></button>`).join('');document.body.append(el);
          mountCampaignMap(el,map,()=>{},()=>{throw Error('Unexpected 2D fallback');});
          let scene;
          for(let i=0;i<400;i++){scene=__B3.EngineStore.Instances.flatMap(e=>e.scenes).find(s=>s.activeCamera?.name==='campaign-camera');if(scene?.getFrameId()>=2)break;await tick();}
          if(!scene||scene.getFrameId()<2)throw Error('Map did not render');
          const active=snapshot();if(active.engines!==1||active.contexts!==1)throw Error('Map created extra Engine/context: '+JSON.stringify(active));
          mounted.push({chapter:side+':'+chapter,meshes:scene.meshes.length,vertices:scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0)});
          closeCampaignMap();el.remove();
          if(__B3.EngineStore.Instances.some(e=>e.scenes.some(s=>s.activeCamera?.name==='campaign-camera')))throw Error('Campaign scene survived dispose');
        }
        await tick();return {after:snapshot(),mounted};
      });
      assert.equal(result.after.engines,1);assert.equal(result.after.contexts,1);samples.push(result);
    }
    assert.equal(resourceGrowth(samples).ok,true,'campaign meshes/textures grow after warm-up: '+JSON.stringify(samples));
    assert.equal(samples[2].after.scenes,samples[1].after.scenes,'scene leak');
    assert.deepEqual(errors,[]);console.log('PASS campaign lifecycle',width,height,gfx,JSON.stringify(samples));
    await page.close();
  }
} finally {await browser.close();await server.close();}
