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
    // The calendar appears asynchronously on some LOW SwiftShader boots.
    // Keep dismissing its real close control until it is absent on a stable tick.
    // This is not a shortcut through campaign/gameplay UI.
    let calendarClosed=false,quietTicks=0;
    for(let attempt=0;attempt<40;attempt++){
      const hadOverlay=await page.evaluate(()=>{
        const detail=document.querySelector('#overlay2 .detail');
        if(!detail)return false;
        document.querySelector('#overlay2 button[data-iclose="1"]')?.click();
        return true;
      });
      quietTicks=hadOverlay?0:quietTicks+1;
      await new Promise(resolve=>setTimeout(resolve,180));
      // Require a quiet boot interval, not one frame before the async calendar.
      if(quietTicks>=7 && await page.evaluate(()=>!document.querySelector('#overlay2 .detail'))){
        calendarClosed=true;break;
      }
    }
    assert.equal(calendarClosed,true,'boot calendar must be dismissed before campaign navigation');
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
    // C4.2 route: never substitute a screen-space 5x2 matrix or pager.
    // The local view may show only a few pins, but those pins must be consecutive.
    const checkRoute=async(label)=>{
      const result=await page.evaluate(()=>{
        const world=document.querySelector('.c20-world.arrakeen');
        const nums=[...world.querySelectorAll('.c20-pin')]
          .filter(el=>getComputedStyle(el).visibility==='visible')
          .map(el=>Number(el.querySelector('b')?.textContent))
          .sort((a,b)=>a-b);
        return {nums,nav:world.querySelectorAll('[data-c20step],.c20-mission-nav').length,
          world3d:!!world.querySelector('canvas.campaign20-canvas')};
      });
      assert.equal(result.nav,0,'no artificial navigation buttons');
      assert.equal(result.world3d,true,'Babylon canvas retained');
      assert.ok(result.nums.length>=2,label+' at least two pins should be visible: '+JSON.stringify(result));
      assert.ok(result.nums.every((n,i)=>i===0||n===result.nums[i-1]+1),
        label+' visible mission numbers must be consecutive: '+JSON.stringify(result));
      return result;
    };
    const currentRoute=await checkRoute('current mission viewport');
    await page.screenshot({path:path.join(shots,`arrakeen-${w}-${gfx}.png`)});
    // Programmatically select mission 1 to validate the opposite, desert end of
    // the swipable world without changing game progress or mission identifiers.
    await page.evaluate(()=>document.querySelector('.c20-world.arrakeen .c20-pin b')?.closest('.c20-pin')?.click());
    await new Promise(resolve=>setTimeout(resolve,510));
    const approachRoute=await checkRoute('mission one / desert approach');
    await page.screenshot({path:path.join(shots,`arrakeen-approach-${w}-${gfx}.png`)});
    assert.ok(approachRoute.nums.includes(1),'desert entry frame must show mission 1');
    console.log('Arrakeen consecutive local mission route',w,gfx,JSON.stringify({currentRoute,approachRoute}));
    await page.evaluate(()=>document.querySelector('.c20-world.arrakeen .c20-pin')?.click());
    await page.evaluate(()=>document.querySelector('[data-c20="detail"]')?.click());
    await page.waitForSelector('.c20-dialog');
    await page.screenshot({path:path.join(shots,`arrakeen-detail-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('[data-c20="back"]')?.click());
    await page.waitForFunction(()=>!document.querySelector('.c20-dialog'));
    console.log('PASS Arrakeen Light II real WebGL C4.2',w,h,gfx,JSON.stringify(arrakeen));

    // C4.3 D:1: real Conspiracy environment, with a continuous swipe route.
    // Only neighboring world-space numbers should fit at the camera's local zoom.
    await page.evaluate(()=>document.querySelector('[data-c20side="D"]').click());
    await page.waitForSelector('.c20-map');
    await page.evaluate(()=>document.querySelector('[data-c20="chapters"]').click());
    await page.waitForSelector('[data-c20chapter="1"]');
    await page.evaluate(()=>document.querySelector('[data-c20chapter="1"]').click());
    await page.waitForFunction(()=>document.querySelectorAll('.c20-world.conspiracy .c20-pin').length===10,{timeout:6000});
    await page.waitForSelector('.c20-world.conspiracy.campaign20-3d-ready',{timeout:18000});
    const checkConspiracy=async(label)=>{
      await page.waitForFunction(()=>[...document.querySelectorAll('.c20-world.conspiracy .c20-pin')]
        .some(el=>getComputedStyle(el).visibility==='visible'),{timeout:9000});
      const result=await page.evaluate(()=>{
        const world=document.querySelector('.c20-world.conspiracy');
        const pins=[...world.querySelectorAll('.c20-pin')];
        const visible=pins.filter(el=>getComputedStyle(el).visibility==='visible');
        const nums=visible.map(el=>Number(el.querySelector('b')?.textContent)).sort((a,b)=>a-b);
        const rect=world.getBoundingClientRect();
        const within=visible.every(el=>{const r=el.getBoundingClientRect();
          return r.left>=rect.left+1&&r.right<=rect.right-1&&r.top>=rect.top+1&&r.bottom<=rect.bottom-1;});
        const overlaps=visible.flatMap((a,i)=>visible.slice(i+1).filter(b=>{
          const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
          return Math.min(x.right,y.right)-Math.max(x.left,y.left)>3
            &&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>3;
        }).map(b=>[a.dataset.c20node,b.dataset.c20node]));
        return {nums,pins:pins.length,boss:pins.filter(el=>el.classList.contains('boss')).length,
          within,overlaps,canvas:!!world.querySelector('canvas.campaign20-canvas'),
          pager:world.querySelectorAll('[data-c20step],.c20-mission-nav').length,
          scroll:document.querySelector('.c20').scrollHeight>document.querySelector('.c20').clientHeight+1};
      });
      assert.equal(result.pins,10,'D:1 original ten mission ids');
      assert.equal(result.boss,1,'D:1 final Hawat boss');
      assert.equal(result.canvas,true,'Conspiracy mounted real Babylon canvas');
      assert.equal(result.pager,0,'no artificial mission navigation');
      assert.equal(result.within,true,'Conspiracy visible markers fully inside map');
      assert.deepEqual(result.overlaps,[],'Conspiracy mission markers do not overlap');
      assert.equal(result.scroll,false,'Conspiracy has no viewport scroll');
      assert.ok(result.nums.length>=2,label+' nearby markers should be visible: '+JSON.stringify(result));
      assert.ok(result.nums.every((n,i)=>i===0||n===result.nums[i-1]+1),
        label+' mission numbers must be consecutive: '+JSON.stringify(result));
      return result;
    };
    const conspiracyLast=await checkConspiracy('imperial sector');
    await page.screenshot({path:path.join(shots,`conspiracy-${w}-${gfx}.png`)});
    // Select the existing first mission: standard selection must focus actual 3D position.
    await page.evaluate(()=>document.querySelector('.c20-world.conspiracy .c20-pin b')?.closest('.c20-pin')?.click());
    await new Promise(resolve=>setTimeout(resolve,550));
    const conspiracyFirst=await checkConspiracy('covert cargo yard');
    assert.ok(conspiracyFirst.nums.includes(1),'first route segment shows mission 1');
    await page.screenshot({path:path.join(shots,`conspiracy-approach-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('.c20-world.conspiracy .c20-pin')?.click());
    await page.evaluate(()=>document.querySelector('[data-c20="detail"]')?.click());
    await page.waitForSelector('.c20-dialog');
    await page.screenshot({path:path.join(shots,`conspiracy-detail-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('[data-c20="back"]')?.click());
    await page.waitForFunction(()=>!document.querySelector('.c20-dialog'));
    console.log('PASS Conspiracy Dark II real WebGL C4.3',w,h,gfx,
      JSON.stringify({conspiracyLast,conspiracyFirst}));

    // C4.4: five distinct historical districts, original ten C:0 missions.
    // Side switch is owned by the Chronicles cover, not the story-side buttons.
    await page.evaluate(()=>document.querySelector('[data-c20="home"]')?.click());
    await page.waitForSelector('.c20-home',{timeout:7000});
    await page.evaluate(()=>document.querySelector('[data-c20="chron"]')?.click());
    await page.waitForSelector('.c20-map',{timeout:7000});
    await page.evaluate(()=>document.querySelector('[data-c20="chapters"]')?.click());
    await page.waitForSelector('[data-c20chapter="0"]');
    await page.evaluate(()=>document.querySelector('[data-c20chapter="0"]').click());
    await page.waitForFunction(()=>document.querySelectorAll('.c20-world.atreides-chronicles .c20-pin').length===10,{timeout:7000});
    await page.waitForSelector('.c20-world.atreides-chronicles.campaign20-3d-ready',{timeout:18000});
    const checkChronicles=async(label)=>{
      await page.waitForFunction(()=>[...document.querySelectorAll('.c20-world.atreides-chronicles .c20-pin')]
        .some(el=>getComputedStyle(el).visibility==='visible'),{timeout:9000});
      const state=await page.evaluate(()=>{
        const world=document.querySelector('.c20-world.atreides-chronicles');
        const pins=[...world.querySelectorAll('.c20-pin')];
        const visible=pins.filter(el=>getComputedStyle(el).visibility==='visible');
        const nums=visible.map(p=>Number(p.querySelector('b')?.textContent)).sort((a,b)=>a-b);
        const overlaps=visible.flatMap((a,i)=>visible.slice(i+1).filter(b=>{
          const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
          return Math.min(x.right,y.right)-Math.max(x.left,y.left)>3 &&
            Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>3;
        }).map(b=>[a.dataset.c20node,b.dataset.c20node]));
        return {nums,pins:pins.length,boss:pins.filter(p=>p.classList.contains('boss')).length,
          overlaps,canvas:!!world.querySelector('canvas.campaign20-canvas'),
          pager:world.querySelectorAll('[data-c20step],.c20-mission-nav').length};
      });
      assert.equal(state.pins,10,'Chronicles preserves ten original missions');
      assert.equal(state.boss,1,'Chronicles final Harkonnen boss');
      assert.equal(state.canvas,true,'Chronicles uses real Babylon');
      assert.equal(state.pager,0,'Chronicles navigates by swipe, not buttons');
      assert.deepEqual(state.overlaps,[],'Chronicles world pins do not overlap');
      assert.ok(state.nums.length>=2,label+' two nearby mission pins: '+JSON.stringify(state));
      assert.ok(state.nums.every((n,i)=>i===0||n===state.nums[i-1]+1),
        label+' visible mission numbers must be consecutive: '+JSON.stringify(state));
      return state;
    };
    const chronLast=await checkChronicles('selected historical district');
    await page.screenshot({path:path.join(shots,`chronicles-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('.c20-world.atreides-chronicles .c20-pin')?.click());
    await new Promise(resolve=>setTimeout(resolve,550));
    const chronFirst=await checkChronicles('Caladan historical entrance');
    console.log('Chronicle end-to-end positions',w,gfx,JSON.stringify({chronLast,chronFirst}));
    assert.ok(chronFirst.nums.includes(1),'chronicle opening must display the old duke: '+JSON.stringify(chronFirst));
    await page.screenshot({path:path.join(shots,`chronicles-first-${w}-${gfx}.png`)});
    console.log('PASS Atreides Chronicles C4.4 WebGL',w,h,gfx,JSON.stringify({chronLast,chronFirst}));

    // C4.5: Gurney's ten unchanged Chronicles C:1 story missions.
    await page.evaluate(()=>document.querySelector('[data-c20="chapters"]')?.click());
    await page.waitForSelector('[data-c20chapter="1"]');
    await page.evaluate(()=>document.querySelector('[data-c20chapter="1"]').click());
    await page.waitForFunction(()=>document.querySelectorAll('.c20-world.harkonnen-chronicles .c20-pin').length===10,{timeout:7000});
    await page.waitForSelector('.c20-world.harkonnen-chronicles.campaign20-3d-ready',{timeout:18000});
    const checkGurney=async(label)=>{
      await page.waitForFunction(()=>[...document.querySelectorAll('.c20-world.harkonnen-chronicles .c20-pin')].some(p=>getComputedStyle(p).visibility==='visible'),{timeout:9000});
      const state=await page.evaluate(()=>{
        const world=document.querySelector('.c20-world.harkonnen-chronicles');
        const pins=[...world.querySelectorAll('.c20-pin')];
        const visible=pins.filter(p=>getComputedStyle(p).visibility==='visible');
        const nums=visible.map(p=>Number(p.querySelector('b')?.textContent)).sort((a,b)=>a-b);
        const overlap=visible.flatMap((a,i)=>visible.slice(i+1).filter(b=>{
          const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
          return Math.min(x.right,y.right)-Math.max(x.left,y.left)>3 &&
            Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>3;
        }).map(b=>[a.dataset.c20node,b.dataset.c20node]));
        const rect=world.getBoundingClientRect();
        return {nums,ids:pins.map(p=>p.dataset.c20node),boss:pins.filter(p=>p.classList.contains('boss')).length,
          overlap,within:visible.every(p=>{const b=p.getBoundingClientRect();return b.left>=rect.left+1&&b.right<=rect.right-1&&b.top>=rect.top+1&&b.bottom<=rect.bottom-1;}),
          canvas:!!world.querySelector('canvas.campaign20-canvas'),
          pager:world.querySelectorAll('[data-c20step],.c20-mission-nav').length};
      });
      assert.equal(state.ids.length,10,'C:1 original ten mission IDs');
      assert.equal(new Set(state.ids).size,10,'C:1 mission IDs unique');
      assert.equal(state.boss,1,'Rabban final boss mission');
      assert.equal(state.canvas,true,'real Babylon mounted for C:1');
      assert.equal(state.pager,0,'no mission pager');
      assert.equal(state.within,true,'C:1 pins stay on screen');
      assert.deepEqual(state.overlap,[],'C:1 50/60px pins do not overlap');
      assert.ok(state.nums.length>=2,label+' nearby visible pins: '+JSON.stringify(state));
      assert.ok(state.nums.every((n,i)=>i===0||n===state.nums[i-1]+1),label+' contiguous route: '+JSON.stringify(state));
      return state;
    };
    const gurneyLast=await checkGurney('end route');
    await page.screenshot({path:path.join(shots,`harkonnen-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('.c20-world.harkonnen-chronicles .c20-pin')?.click());
    await new Promise(resolve=>setTimeout(resolve,550));
    const gurneyFirst=await checkGurney('slave pits');
    assert.ok(gurneyFirst.nums.includes(1),'opening frame shows slave pit mission');
    await page.screenshot({path:path.join(shots,`harkonnen-first-${w}-${gfx}.png`)});
    console.log('PASS Harkonnen Chronicles C4.5 real WebGL',w,h,gfx,JSON.stringify({gurneyLast,gurneyFirst}));

    // C4.6: The approved imperial road joins Kaitain, Salusa and Ix without
    // touching the ten original Chronicles mission IDs or any other chapter.
    await page.evaluate(()=>document.querySelector('[data-c20="chapters"]')?.click());
    await page.waitForSelector('[data-c20chapter="2"]');
    await page.evaluate(()=>document.querySelector('[data-c20chapter="2"]').click());
    await page.waitForFunction(()=>document.querySelectorAll('.c20-world.corrino-chronicles .c20-pin').length===10,{timeout:7000});
    await page.waitForSelector('.c20-world.corrino-chronicles.campaign20-3d-ready',{timeout:18000});
    const checkCorrino=async(label)=>{
      await page.waitForFunction(()=>[...document.querySelectorAll('.c20-world.corrino-chronicles .c20-pin')]
        .some(p=>getComputedStyle(p).visibility==='visible'),{timeout:9000});
      const state=await page.evaluate(()=>{
        const world=document.querySelector('.c20-world.corrino-chronicles');
        const all=[...world.querySelectorAll('.c20-pin')];
        const visible=all.filter(p=>getComputedStyle(p).visibility==='visible');
        const nums=visible.map(p=>Number(p.querySelector('b')?.textContent)).sort((a,b)=>a-b);
        const rect=world.getBoundingClientRect();
        const overlaps=visible.flatMap((a,i)=>visible.slice(i+1).filter(b=>{
          const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
          return Math.min(x.right,y.right)-Math.max(x.left,y.left)>3 &&
            Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>3;
        }).map(b=>[a.dataset.c20node,b.dataset.c20node]));
        return {nums,ids:all.map(p=>p.dataset.c20node),boss:all.filter(p=>p.classList.contains('boss')).length,
          canvas:!!world.querySelector('canvas.campaign20-canvas'),
          within:visible.every(p=>{const r=p.getBoundingClientRect();return r.left>=rect.left+1&&r.right<=rect.right-1&&r.top>=rect.top+1&&r.bottom<=rect.bottom-1;}),
          overlaps,pager:world.querySelectorAll('[data-c20step],.c20-mission-nav').length};
      });
      assert.equal(state.ids.length,10,'C:2 ten unchanged mission IDs');
      assert.equal(new Set(state.ids).size,10,'C:2 unique existing mission IDs');
      assert.equal(state.boss,1,'C:2 Golden Lion Throne boss');
      assert.equal(state.canvas,true,'C:2 genuine Babylon canvas');
      assert.equal(state.pager,0,'C:2 navigation uses accepted swipe only');
      assert.equal(state.within,true,'C:2 labels remain inside phone viewport');
      assert.deepEqual(state.overlaps,[],'C:2 50/60px targets cannot overlap');
      assert.ok(state.nums.length>=2,label+' at least two consecutive visible mission labels: '+JSON.stringify(state));
      assert.ok(state.nums.every((n,i)=>i===0||n===state.nums[i-1]+1),label+' continuous labels: '+JSON.stringify(state));
      return state;
    };
    const corrinoEnd=await checkCorrino('Lion Throne route');
    await page.screenshot({path:path.join(shots,`corrino-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('.c20-world.corrino-chronicles .c20-pin')?.click());
    await new Promise(resolve=>setTimeout(resolve,550));
    const corrinoStart=await checkCorrino('Kaitain opening');
    assert.ok(corrinoStart.nums.includes(1),'first Kaitain mission visibly selectable');
    await page.screenshot({path:path.join(shots,`corrino-first-${w}-${gfx}.png`)});
    console.log('PASS Corrino Chronicles C4.6 real WebGL',w,h,gfx,JSON.stringify({corrinoEnd,corrinoStart}));

    // C4.7: independent Butlerian Jihad geography with original C:3 nodes.
    await page.evaluate(()=>document.querySelector('[data-c20="chapters"]')?.click());
    await page.waitForSelector('[data-c20chapter="3"]');
    await page.evaluate(()=>document.querySelector('[data-c20chapter="3"]').click());
    await page.waitForFunction(()=>document.querySelectorAll('.c20-world.butlerian-jihad .c20-pin').length===10,{timeout:7000});
    await page.waitForSelector('.c20-world.butlerian-jihad.campaign20-3d-ready',{timeout:20000});
    const checkJihad=async(label)=>{
      await page.waitForFunction(()=>[...document.querySelectorAll('.c20-world.butlerian-jihad .c20-pin')]
        .some(p=>getComputedStyle(p).visibility==='visible'),{timeout:9000});
      const state=await page.evaluate(()=>{
        const world=document.querySelector('.c20-world.butlerian-jihad');
        const all=[...world.querySelectorAll('.c20-pin')];
        const visible=all.filter(p=>getComputedStyle(p).visibility==='visible');
        const nums=visible.map(p=>Number(p.querySelector('b')?.textContent)).sort((a,b)=>a-b);
        const rect=world.getBoundingClientRect();
        const overlaps=visible.flatMap((a,i)=>visible.slice(i+1).filter(b=>{
          const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
          return Math.min(x.right,y.right)-Math.max(x.left,y.left)>3 &&
            Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>3;
        }).map(b=>[a.dataset.c20node,b.dataset.c20node]));
        return {nums,ids:all.map(p=>Number(p.dataset.c20node)),
          boss:all.filter(p=>p.classList.contains('boss')).length,
          canvas:!!world.querySelector('canvas.campaign20-canvas'),
          within:visible.every(p=>{const r=p.getBoundingClientRect();return r.left>=rect.left+1&&r.right<=rect.right-1&&r.top>=rect.top+1&&r.bottom<=rect.bottom-1;}),
          overlaps,pager:world.querySelectorAll('[data-c20step],.c20-mission-nav').length,
          fallbackCoords:all.every(p=>p.style.getPropertyValue('--px')&&p.style.getPropertyValue('--py'))};
      });
      assert.deepEqual(state.ids,Array.from({length:10},(_,i)=>i+170),'C:3 original 170–179');
      assert.equal(state.boss,1,'C:3 only original final boss');
      assert.equal(state.canvas,true,'C:3 real Babylon canvas');
      assert.equal(state.pager,0,'C:3 navigation via v101 swipes only');
      assert.equal(state.fallbackCoords,true,'C:3 2D fallback pin placement');
      assert.equal(state.within,true,'C:3 labels inside MED/LOW viewport');
      assert.deepEqual(state.overlaps,[],'C:3 50/60px marker collisions');
      assert.ok(state.nums.length>=2,label+' requires two adjacent pins '+JSON.stringify(state));
      assert.ok(state.nums.every((n,i)=>!i||n===state.nums[i-1]+1),
        label+' requires consecutive visible numbers '+JSON.stringify(state));
      return state;
    };
    const jihadEnd=await checkJihad('Omnius army finale');
    await page.screenshot({path:path.join(shots,`jihad-${w}-${gfx}.png`)});
    await page.evaluate(()=>document.querySelector('.c20-world.butlerian-jihad .c20-pin')?.click());
    await new Promise(resolve=>setTimeout(resolve,560));
    const jihadStart=await checkJihad('machine city opening');
    assert.ok(jihadStart.nums.includes(1),'C:3 first machine city pin visible');
    await page.screenshot({path:path.join(shots,`jihad-first-${w}-${gfx}.png`)});
    console.log('PASS Butlerian Jihad C4.7 real WebGL',w,h,gfx,JSON.stringify({jihadEnd,jihadStart}));

    assert.deepEqual(errors,[],'no JS page errors: '+errors.join('|'));
    console.log('PASS Campaign 2.0',w,h,gfx,JSON.stringify(metrics));
    await page.close();
  }
} finally {await browser.close();await server.close?.();}
