// MUAD3D: actual in-game Babylon hero card screenshots and pose checks.
// Capture exact target landscape viewports without changing live gameplay.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const out=path.resolve('dist/muad-dib-shots');fs.mkdirSync(out,{recursive:true});
const save=fs.readFileSync('tests/fixtures/saves/03-late.json','utf8');
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,
 args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const srv=await serve(path.dirname(html));
 try{
  for(const [width,height,quality] of [[844,390,'med'],[667,375,'low']]){
   const p=await browser.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await p.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
   await p.evaluateOnNewDocument((save,quality)=>{
     localStorage.setItem('dune-goh-v1',save);
     localStorage.setItem('dune-gfx',JSON.stringify({p:quality,auto:0}));
     localStorage.setItem('dune-cine-off','true');
     try{Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch{}
   },save,quality);
   try{
    await p.goto(srv.url(path.basename(html)),{waitUntil:'load'});
    const info=await p.evaluate(async()=>{
      window.bakePortraits=()=>{};
      await loadB3();closeInfo(true);closeOverlay();
      // Login calendar lives in overlay2, not the main overlay. A successful
      // Babylon model assertion does NOT imply the card is visible.
      document.querySelector('#overlay2').innerHTML='';
      openDetail('muaddib');
      await new Promise(resolve=>setTimeout(resolve,1500));
      // Boot may schedule the login calendar after openDetail, so close
      // the test-unrelated layer AFTER startup has settled.
      const extra=document.querySelector('#overlay2');
      if(extra)extra.replaceChildren();
      const o=HERO_STAGE?.o;
      if(!o||!o.root._authored)throw Error('Muad Dib authored model failed to load');
      if(!o.root._clips?.Idle_11)throw Error('Muad Dib source clips absent');
      HERO_STAGE.auto=false;HERO_STAGE.yaw=-.3;
      heroHold(true);
      await HERO_STAGE.scene.whenReadyAsync();
      for(let i=0;i<3;i++)HERO_STAGE.scene.render();
      const card=document.querySelector('#overlay .hc');
      const rect=card?.getBoundingClientRect();
      const cover=document.querySelector('#overlay2');
      const coverVisible=!!cover?.querySelector('.calsheet, .sheet');
      if(!card || card.dataset.cid!=='muaddib' || !rect || rect.width<300 || rect.height<180 ||
          rect.right<=0 || rect.left>=innerWidth || coverVisible)
        throw Error('Muad Dib card is hidden or covered: '+JSON.stringify({
          card:card?.dataset.cid,rect:rect?.toJSON(),coverVisible}));
      return {id:o.def?.id,cardVisible:true,model:assetUrl('models/muad-dib-legend.dgm'),
        textured:o.root.getChildMeshes().filter(m=>m.skeleton&&m.material?.diffuseTexture).length,
        meshes:o.root.getChildMeshes().filter(m=>m.skeleton).length,
        weaponParts:o.wpn.getChildMeshes().length,
        clips:Object.keys(o.root._clips)};
    });
    assert.equal(info.id,'muaddib');
    assert.equal(info.cardVisible,true);
    assert.ok(info.model);
    assert.equal(info.meshes,1);
    assert.equal(info.weaponParts,5,'Muad Dib must hold the five-part short crysknife, not the generic long sword');
    assert(info.clips.length>=8);
    await p.screenshot({path:path.join(out,`muaddib-${width}x${height}-${quality}-card.png`)});
    for(const state of ['Idle','Attack','special','ult']){
      const data=await p.evaluate(state=>{
        const o=HERO_STAGE.o,now=10000;
        o.dead=false;o.hitT=0;o.act=null;
        if(state!=='Idle'){
          const key=state==='Attack'?'basic':state,ab=o.def[key];
          o.act={ab,key,kind:'cast',t0:now-500,dur:1000,dir:V3(0,0,1),to:V3(),fx:1};
        }
        poseModelClip(o,now,1.3,1,{});
        o.root.computeWorldMatrix(true);
        for(const m of o.root.getChildMeshes())if(m.skeleton){m.computeWorldMatrix(true);m.skeleton.prepare(true);}
        HERO_STAGE.scene.render();
        return {clip:o.root._lastClip,authored:o.root._authored};
      },state);
      assert.ok(data.authored);
      await p.screenshot({path:path.join(out,`muaddib-${width}x${height}-${quality}-${state}.png`)});
    }
    assert.deepEqual(errors,[],errors.join('; '));
    console.log('PASS Muad Dib mobile hero card',width,height,quality,JSON.stringify(info));
   }finally{await p.close();}
  }
 }finally{await srv.close();}
}finally{await browser.close();}
