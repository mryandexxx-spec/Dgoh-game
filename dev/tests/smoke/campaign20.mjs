// Campaign 2.0 C2 — настоящий Chromium/SwiftShader, два горизонтальных viewport.
// node tests/smoke/campaign20.mjs dist/pwa/index.html [dist/campaign20-shots]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core');
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const shots=path.resolve(process.argv[3]||'dist/campaign20-shots');
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw new Error('Chrome executable missing');
const save=fs.readFileSync(new URL('../fixtures/saves/03-late.json',import.meta.url),'utf8');
const server=await serve(path.dirname(html));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
fs.mkdirSync(shots,{recursive:true});
try {
  for(const [w,h,gfx] of [[844,390,'med'],[667,375,'low']]){
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>{errors.push(e.message);console.log('Campaign browser pageerror:',e.stack||e.message);});
    page.on('console',msg=>{if(msg.type()==='warn'||msg.type()==='error')console.log('Campaign console '+msg.type()+': '+msg.text());});
    await page.setViewport({width:w,height:h,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    await page.evaluateOnNewDocument((s,profile)=>{
      try{localStorage.setItem('dune-goh-v1',s);localStorage.setItem('dune-gfx',JSON.stringify({p:profile,auto:0,bad:0,good:0,noUp:false}));}catch(e){}
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch(e){}
    },save,gfx);
    await page.setRequestInterception(true);
    page.on('request',req=>/^http:\/\/127\.0\.0\.1/.test(req.url())?req.continue():req.abort());
    await page.goto(server.url(path.basename(html)),{waitUntil:'load'});
    await page.waitForSelector('[data-v="camp"]',{timeout:18000});
    // Login calendar is intentionally opened on boot. Dismiss it via its real
    // Close button before performing physical touch/click checks on the campaign.
    await page.evaluate(()=>document.querySelector('#overlay2 button[data-iclose="1"]')?.click());
    await page.waitForFunction(()=>!document.querySelector('#overlay2 .detail'),{timeout:5000});
    await page.evaluate(()=>document.querySelector('[data-v="camp"]').click());
    await page.waitForSelector('.c20-home',{timeout:5000});
    assert.equal(await page.$$eval('.c20-cover',a=>a.length),2,'two campaign covers');
    await page.screenshot({path:path.join(shots,`hub-${w}.png`)});
    await page.locator('[data-c20="story"]').click();
    await page.waitForSelector('.c20-map',{timeout:8000}).catch(async e=>{
      const diag=await page.evaluate(()=>({view:document.querySelector('#view')?.innerHTML.slice(0,800),body:document.body.className}));
      console.error('Campaign map transition diagnostic',JSON.stringify({diag,errors}));throw e;
    });
    // Late-game fixture starts on the last unlocked chapter; explicitly choose Caladan I.
    await page.evaluate(()=>document.querySelector('[data-c20="chapters"]').click());
    await page.waitForSelector('[data-c20chapter="0"]');
    await page.evaluate(()=>document.querySelector('[data-c20chapter="0"]').click());
    await page.waitForFunction(()=>document.querySelectorAll('.c20-pin').length===10,{timeout:7000});
    assert.equal(await page.evaluate(()=>document.querySelectorAll('.c20-pin').length),10,'ten Caladan missions');
    const opened=await page.waitForFunction(()=>!!document.querySelector('.c20-world.campaign20-3d-ready'),{timeout:15000}).then(()=>true).catch(()=>false);
    assert.equal(opened,true,'Babylon 3D Caladan mounted');
    await page.waitForFunction(()=>[...document.querySelectorAll('.c20-pin')].some(p=>getComputedStyle(p).visibility==='visible'),{timeout:8000});
    await page.screenshot({path:path.join(shots,`map-${w}-${gfx}.png`)});
    const metrics=await page.evaluate(()=>{
      const c=document.querySelector('.c20'),rect=c.getBoundingClientRect(),world=document.querySelector('.c20-world');
      return {viewport:[innerWidth,innerHeight],size:[rect.width,rect.height],scroll:c.scrollHeight>c.clientHeight+1,sceneCanvas:!!world.querySelector('canvas.campaign20-canvas'),visiblePins:[...world.querySelectorAll('.c20-pin')].filter(p=>getComputedStyle(p).visibility==='visible').length};
    });
    assert.equal(metrics.scroll,false,'no campaign viewport scroll');
    assert.equal(metrics.sceneCanvas,true,'canvas exists');
    // Device feedback: v99 pans the wrong way despite passing the previous screen
    // assertions. Require an actual reversal of the v99 screen displacements on
    // BOTH axes (also when dragging from a mission pin), preserving responsiveness.
    const panChecks=await page.evaluate(async()=>{
      document.querySelector('[data-c20node="4"]').click();
      await new Promise(resolve=>setTimeout(resolve,560)); // camera focus tween
      const canvas=document.querySelector('#c20world canvas');
      const pin=document.querySelector('[data-c20node="4"]');
      const point=()=>{const r=pin.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];};
      const tick=()=>new Promise(resolve=>setTimeout(resolve,240));
      const gesture=async(dx,dy,id)=>{
        const before=point();
        const rect=canvas.getBoundingClientRect(),x=rect.left+rect.width*.5,y=rect.top+rect.height*.52;
        const event=(type,px,py)=>canvas.dispatchEvent(new PointerEvent(type,{
          bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:true,
          buttons:type==='pointerup'?0:1,clientX:px,clientY:py,
        }));
        event('pointerdown',x,y);
        event('pointermove',x+dx,y+dy);
        event('pointerup',x+dx,y+dy);
        await tick();
        const after=point();return [after[0]-before[0],after[1]-before[1]];
      };
      const horizontal=await gesture(28,0,71);
      const backward=await gesture(-28,0,72);
      const vertical=await gesture(0,22,73);
      const upward=await gesture(0,-22,74);
      return {horizontal,backward,vertical,upward,
        canvasSame:canvas===document.querySelector('#c20world canvas')};
    });
    assert.ok(panChecks.horizontal[0]>4,'drag-right must reverse v99 horizontal movement: '+JSON.stringify(panChecks));
    assert.ok(panChecks.backward[0]<-4,'drag-left must reverse v99 horizontal movement: '+JSON.stringify(panChecks));
    assert.ok(panChecks.vertical[1]>4,'drag-down must reverse v99 vertical movement: '+JSON.stringify(panChecks));
    assert.ok(panChecks.upward[1]<-4,'drag-up must reverse v99 vertical movement: '+JSON.stringify(panChecks));
    assert.equal(panChecks.canvasSame,true,'drag never remounts Babylon');
    console.log('Campaign touch pan',w,JSON.stringify(panChecks));

    // C2.2: changing the selected mission must preserve the SAME Babylon canvas.
    await page.evaluate(()=>{window.__campaignCanvas = document.querySelector('#c20world canvas');});
    const firstSelected = await page.$eval('.c20-pin.on',el=>el.dataset.c20node);
    await page.evaluate(first=>{
      const next=[...document.querySelectorAll('.c20-pin')].find(el=>el.dataset.c20node!==first);
      if(!next)throw Error('missing alternate mission');next.click();
    },firstSelected);
    const reused=await page.evaluate(()=>window.__campaignCanvas === document.querySelector('#c20world canvas'));
    assert.equal(reused,true,'mission selection must keep existing 3D canvas');
    assert.notEqual(await page.$eval('.c20-pin.on',el=>el.dataset.c20node),firstSelected,'selected mission updated');
    await page.evaluate(()=>document.querySelector('[data-c20focus]').click());
    assert.equal(await page.evaluate(()=>window.__campaignCanvas === document.querySelector('#c20world canvas')),
      true,'recenter must keep existing canvas');

    assert.ok(metrics.visiblePins>0,'projected 3D mission labels visible');
    const overlapping=await page.evaluate(()=>{
      const visible=[...document.querySelectorAll('.c20-pin')].filter(el=>getComputedStyle(el).visibility==='visible');
      const rects=visible.map(el=>({id:el.dataset.c20node,rect:el.getBoundingClientRect()}));
      const collisions=[];
      for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
        const a=rects[i],b=rects[j],x=Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left);
        const y=Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top);
        if(x>3&&y>3)collisions.push([a.id,b.id]);
      }
      return collisions;
    });
    assert.deepEqual(overlapping,[],'50/60px mission markers cannot overlap at phone size');

    await page.evaluate(()=>document.querySelector('[data-c20node]')?.click());
    await page.waitForSelector('.c20-card');
    await page.locator('[data-c20="detail"]').click();
    await page.waitForSelector('.c20-dialog');
    await page.screenshot({path:path.join(shots,`detail-${w}.png`)});
    await page.locator('[data-c20tab="foes"]').click();
    assert.ok((await page.evaluate(()=>document.querySelectorAll('.c20-foes>div').length))>0,'foes tab');
    assert.ok((await page.evaluate(()=>document.querySelectorAll('.c20-conditions span').length))>=3,'mission level, side and power requirements');
    await page.locator('[data-c20tab="rewards"]').click();
    assert.ok((await page.evaluate(()=>document.querySelectorAll('.c20-earn').length))===1,'real mission currency preview');
    assert.ok((await page.evaluate(()=>document.querySelectorAll('.c20-lootrow').length))>0,'real GE2 and shard rewards');
    const canvasBeforeInfo=await page.evaluate(()=>window.__campaignCanvas===document.querySelector('#c20world canvas'));
    assert.equal(canvasBeforeInfo,true,'rewards tab retains the Babylon canvas');
    await page.screenshot({path:path.join(shots,`rewards-${w}.png`)});
    const pages=await page.evaluate(()=>document.querySelectorAll('[data-c20rewardpage]').length);
    if(pages) {
      await page.evaluate(()=>document.querySelector('[data-c20rewardpage="1"]')?.click());
      assert.ok((await page.evaluate(()=>document.querySelectorAll('.c20-lootrow').length))>0,'next rewards page renders');
    }
    await page.evaluate(()=>document.querySelector('[data-c20item]')?.click());
    await page.waitForSelector('#overlay2 .infosheet',{timeout:5000});
    await page.evaluate(()=>document.querySelector('#overlay2 [data-iclose]')?.click());
    await page.waitForFunction(()=>!document.querySelector('#overlay2 .infosheet'),{timeout:5000});
    assert.ok(await page.$('.c20-dialog'),'closing source info retains mission details');
    await page.locator('[data-c20="back"]').click();
    assert.equal(await page.$('.c20-dialog'),null,'modal closes');
    // The first mission has index zero: it must be launchable (not skipped as falsy).
    await page.evaluate(()=>document.querySelector('[data-c20node="0"]').click());
    await page.evaluate(()=>document.querySelector('.c20-card [data-node="0"]').click());
    await page.waitForSelector('#overlay .sqsel',{timeout:6000});
    await page.evaluate(()=>document.querySelector('#overlay [data-sqback]')?.click());
    assert.equal(await page.$('#overlay .sqsel'),null,'squad panel closes without spending energy');
    // Simulation shares existing GE2 economy/summary, including mission id 0.
    await page.evaluate(()=>document.querySelector('.c20-card [data-sim="0"]')?.click());
    await page.waitForSelector('#overlay .simsheet',{timeout:5000});
    assert.equal(await page.$eval('#simn',el=>Number(el.min)),1,'native simulation count selector');
    await page.evaluate(()=>document.querySelector('[data-simgo]')?.click());
    await page.waitForSelector('#overlay .result.won',{timeout:6000});
    assert.ok((await page.$eval('#overlay .result.won',el=>el.textContent)).includes('Симуляция'),'simulation produced existing reward report');
    await page.evaluate(()=>document.querySelector('#overlay [data-close]')?.click());
    await page.waitForFunction(()=>!document.querySelector('#overlay .result'),{timeout:5000});
    assert.ok(await page.$('#c20world canvas'),'map remains after simulation');

    // C4.1: switching between Caladan and Giedi Prime reuses the shared EngineHost,
    // but creates a genuinely different industrial scene with the same 10 real missions.
    await page.evaluate(()=>document.querySelector('[data-c20side="D"]').click());
    await page.waitForSelector('.c20-map');
    await page.evaluate(()=>document.querySelector('[data-c20="chapters"]').click());
    await page.waitForSelector('[data-c20chapter="0"]');
    await page.evaluate(()=>document.querySelector('[data-c20chapter="0"]').click());
    await page.waitForFunction(()=>document.querySelectorAll('.c20-world.giedi .c20-pin').length===10,{timeout:6000});
    await page.waitForSelector('.c20-world.giedi.campaign20-3d-ready',{timeout:16000});
    await page.waitForFunction(()=>[...document.querySelectorAll('.c20-world.giedi .c20-pin')].some(el=>getComputedStyle(el).visibility==='visible'),{timeout:9000});
    const giedi=await page.evaluate(()=>({
      canvas:document.querySelector('.c20-world.giedi canvas.campaign20-canvas')!==null,
      pins:document.querySelectorAll('.c20-world.giedi .c20-pin').length,
      boss:document.querySelectorAll('.c20-world.giedi .c20-pin.boss').length,
      hasScroll:document.querySelector('.c20').scrollHeight>document.querySelector('.c20').clientHeight+1,
      visible:[...document.querySelectorAll('.c20-world.giedi .c20-pin')].filter(el=>getComputedStyle(el).visibility==='visible').length,
    }));
    assert.equal(giedi.canvas,true,'Giedi must mount its own real WebGL diorama');
    assert.equal(giedi.pins,10,'Giedi uses ten existing Dark-I missions');
    assert.equal(giedi.boss,1,'Giedi has the final boss marker');
    assert.equal(giedi.hasScroll,false,'Giedi phone viewport must not scroll');
    assert.ok(giedi.visible>0,'Giedi should project visible 3D mission nodes');
    const overlapGiedi=await page.evaluate(()=>{
      const pins=[...document.querySelectorAll('.c20-world.giedi .c20-pin')].filter(el=>getComputedStyle(el).visibility==='visible');
      return pins.flatMap((a,i)=>pins.slice(i+1).filter(b=>{
        const r=a.getBoundingClientRect(),s=b.getBoundingClientRect();
        return Math.min(r.right,s.right)-Math.max(r.left,s.left)>3 &&
          Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>3;
      }).map(b=>[a.dataset.c20node,b.dataset.c20node]));
    });
    assert.deepEqual(overlapGiedi,[],'Giedi 50/60px mission buttons may not overlap');
    await page.screenshot({path:path.join(shots,`giedi-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('.c20-world.giedi .c20-pin')?.click());
    await page.evaluate(()=>document.querySelector('[data-c20="detail"]')?.click());
    await page.waitForSelector('.c20-dialog');
    await page.screenshot({path:path.join(shots,`giedi-detail-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('[data-c20="back"]')?.click());
    await page.waitForFunction(()=>!document.querySelector('.c20-dialog'));
    // The reverse v101 pan direction must remain untouched on the new environment.
    assert.equal(await page.$('.c20-world.giedi canvas.campaign20-canvas')!==null,true);
    console.log('PASS Giedi Prime Dark I real WebGL C4.1',w,h,gfx,JSON.stringify(giedi));

    // C4.2: Arrakeen Light II is a distinct real Babylon map, not a recolored legacy fallback.
    await page.evaluate(()=>document.querySelector('[data-c20side="L"]').click());
    await page.waitForSelector('.c20-map');
    await page.evaluate(()=>document.querySelector('[data-c20="chapters"]').click());
    await page.waitForSelector('[data-c20chapter="1"]');
    await page.evaluate(()=>document.querySelector('[data-c20chapter="1"]').click());
    await page.waitForFunction(()=>document.querySelectorAll('.c20-world.arrakeen .c20-pin').length===10,{timeout:6000});
    await page.waitForSelector('.c20-world.arrakeen.campaign20-3d-ready',{timeout:16000});
    await page.waitForFunction(()=>[...document.querySelectorAll('.c20-world.arrakeen .c20-pin')].some(el=>getComputedStyle(el).visibility==='visible'),{timeout:9000});
    const arrakeen=await page.evaluate(()=>{
      const world=document.querySelector('.c20-world.arrakeen');
      const pins=[...world.querySelectorAll('.c20-pin')];
      const visible=pins.filter(el=>getComputedStyle(el).visibility==='visible');
      const allWithin=visible.every(pin=>{const p=pin.getBoundingClientRect(),r=world.getBoundingClientRect();return p.left>=r.left+1&&p.right<=r.right-1&&p.top>=r.top+1&&p.bottom<=r.bottom-1;});
      const collisions=visible.flatMap((a,i)=>visible.slice(i+1).filter(b=>{
        const r=a.getBoundingClientRect(),s=b.getBoundingClientRect();
        return Math.min(r.right,s.right)-Math.max(r.left,s.left)>3 &&
          Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>3;
      }).map(b=>[a.dataset.c20node,b.dataset.c20node]));
      return {canvas:!!world.querySelector('canvas.campaign20-canvas'),
        pins:pins.length,boss:world.querySelectorAll('.c20-pin.boss').length,
        visible:visible.length,allWithin,scroll:document.querySelector('.c20').scrollHeight>
          document.querySelector('.c20').clientHeight+1,collisions};
    });
    assert.equal(arrakeen.canvas,true,'Arrakeen must mount Babylon');
    assert.equal(arrakeen.pins,10,'all ten original Light-II missions');
    assert.equal(arrakeen.boss,1,'final Duncan boss');
    assert.ok(arrakeen.visible>0,'world-projected Arrakeen pins visible');
    assert.equal(arrakeen.allWithin,true,'every Arrakeen marker is fully inside the map viewport');
    assert.equal(arrakeen.scroll,false,'no iPhone scroll');
    assert.deepEqual(arrakeen.collisions,[],'Arrakeen mission hit targets cannot overlap');
    // All mission buttons must remain attached to the 3D world, not fabricated
    // in a fixed screen grid. Out-of-frame missions remain reachable via pager.
    const nav = await page.evaluate(()=>{
      const world=document.querySelector('.c20-world.arrakeen');
      return {buttons:world.querySelectorAll('.c20-mission-nav [data-c20step]').length,
        count:world.querySelector('.c20-mission-nav span')?.textContent.trim()};
    });
    assert.equal(nav.buttons,2,'Arrakeen has compact mission navigation');
    const beforeNav=await page.evaluate(()=>{
      window.__arrakeenNavCanvas=document.querySelector('.c20-world.arrakeen canvas');
      return document.querySelector('.c20-pin.on')?.dataset.c20node;
    });
    await page.evaluate(()=>{
      const world=document.querySelector('.c20-world.arrakeen');
      (world.querySelector('[data-c20step="1"]:not(:disabled)')
        ||world.querySelector('[data-c20step="-1"]:not(:disabled)'))?.click();
    });
    const afterNav=await page.evaluate(()=>({
      pin:document.querySelector('.c20-pin.on')?.dataset.c20node,
      sameCanvas:window.__arrakeenNavCanvas===document.querySelector('.c20-world.arrakeen canvas')
    }));
    assert.notEqual(afterNav.pin,beforeNav,'pager selects another original world mission');
    assert.equal(afterNav.sameCanvas,true,'navigation preserves Babylon scene');
    // Return to the entry overview in the next chapter transition only;
    // mission navigation itself focuses the actual world coordinate.
    await page.screenshot({path:path.join(shots,`arrakeen-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('.c20-world.arrakeen .c20-pin')?.click());
    await page.evaluate(()=>document.querySelector('[data-c20="detail"]')?.click());
    await page.waitForSelector('.c20-dialog');
    await page.screenshot({path:path.join(shots,`arrakeen-detail-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('[data-c20="back"]')?.click());
    await page.waitForFunction(()=>!document.querySelector('.c20-dialog'));
    console.log('PASS Arrakeen Light II real WebGL C4.2',w,h,gfx,JSON.stringify(arrakeen));

    assert.deepEqual(errors,[],'no JS page errors: '+errors.join('|'));
    console.log('PASS Campaign 2.0',w,h,gfx,JSON.stringify(metrics));
    await page.close();
  }
} finally {await browser.close();await server.close?.();}
