// UI-02 — Chromium acceptance of the approved unified lobby header.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
const require=createRequire(import.meta.url);
const puppeteer=require('puppeteer-core');
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const fixture=fs.readFileSync(new URL('../fixtures/saves/03-late.json',import.meta.url),'utf8');
assert.equal(JSON.parse(fixture).v,1,'legacy save v1 supported');
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Native Chromium required');
const server=await serve(path.dirname(html));
let browser;
try{
  browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-networking']});
  for(const [width,height] of [[1440,800],[844,390],[667,375],[390,844]]){
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:width!==1440,hasTouch:width!==1440,isLandscape:width>height});
    await page.evaluateOnNewDocument(raw=>{
      localStorage.setItem('dune-goh-v1',raw);
      localStorage.setItem('dune-cine-off','true');
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});}catch{}
    },fixture);
    await page.goto(server.url(path.basename(html)),{waitUntil:'load',timeout:75000});
    await page.waitForFunction(()=>!!document.querySelector('.lobby .ui02-profile')&&!!document.querySelector('.lobby .hud-water'),{timeout:45000});
    const measured=await page.evaluate(async()=>{
      await document.fonts.load('650 12px "Dune Inter"','Профиль Подвиги');
      const lobby=document.querySelector('.lobby'),root=lobby.querySelector('.ltop');
      const profile=root.querySelector('.ui02-profile');
      const resources=root.querySelector('.resbox');
      const actions=root.querySelector('.ui02-top-actions');
      const rect=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
      const layout=[profile,resources,actions].map(rect);
      const expectedProfile=(0,eval)('S.profile.nick');
      const expectedLevel=(0,eval)('S.acc.lvl');
      const expectedPower=(0,eval)('squadPower()');
      const rootKeys=[...resources.querySelectorAll(':scope > .hud-cell')].map(n=>n.dataset.info);
      return {
        layout,rootRect:rect(root),width:innerWidth,height:innerHeight,
        profileName:profile.querySelector('.ui02-player-name').textContent,
        profileLevel:profile.querySelector('.ui02-level').textContent,
        power:profile.querySelector('.ui02-power').textContent,
        expectedProfile,expectedLevel,expectedPower,
        keys:rootKeys,
        actions:[...actions.querySelectorAll('button')].map(b=>({label:b.querySelector('.ui02-action-label')?.textContent,view:b.dataset.v||'',cal:b.dataset.cal||''})),
        visibleResources:[...resources.querySelectorAll(':scope > .hud-cell')].filter(e=>getComputedStyle(e).display!=='none').length,
        font:getComputedStyle(profile).fontFamily
      };
    });
    assert.equal(measured.profileName,measured.expectedProfile,'actual selected account nickname');
    assert.ok(measured.profileLevel.includes(String(measured.expectedLevel)),'actual account level');
    assert.ok(measured.power.includes(new Intl.NumberFormat('ru-RU').format(measured.expectedPower).replace(/\u00a0/g,' ')) ||
      measured.power.replace(/[^0-9]/g,'').includes(String(measured.expectedPower)),
      'actual squad power');
    assert.deepEqual(measured.keys,['water','candle','sol','pl','teeth','cry','rid'],'seven original resource IDs');
    assert.equal(measured.visibleResources,7,'all seven resources visible');
    assert.deepEqual(measured.actions,[{label:'Подвиги',view:'feats',cal:''},{label:'Задания',view:'daily',cal:''},{label:'Календарь',view:'',cal:'1'}]);
    assert.ok(measured.font.includes('Dune Inter'),'Inter locally available');
    for(const b of measured.layout){
      assert.ok(b.width>35&&b.height>=45,'responsive touch geometry: '+JSON.stringify({width,b}));
      assert.ok(b.left>=-1 && b.right<=width+1 && b.top>=-1,'header fits viewport: '+JSON.stringify({width,b}));
    }
    // The profile must fill its allocated HUD column: the previous chip
    // inherited justify-self:start, leaving a large empty gap at 667px.
    assert.ok(measured.layout[0].width >= (width<=510?150:width<=770?150:width<=1100?195:250),
      'profile card fills the approved layout: '+JSON.stringify({width,layout:measured.layout}));
    // In landscape the three groups share one line, portrait is the approved two-row layout.
    if(width>510)assert.ok(Math.abs(measured.layout[0].top-measured.layout[1].top)<=2,'one unified HUD row: '+width);
    else assert.ok(measured.layout[1].top>measured.layout[0].bottom,'portrait resources below profile');
    if(width===844){
      // The boot login calendar may appear asynchronously over the HUD.
      // Dismiss it only after the writer is ready; taps must hit our buttons.
      await page.waitForFunction(()=>{
        try {const x=(0,eval)('start.writerLifecycle()');
          return x.armed && !x.blocked && x.writer.status==='owned';
        } catch {return false;}
      },{timeout:35000,polling:50});
      await new Promise(resolve=>setTimeout(resolve,3100));
      await page.evaluate(()=>(0,eval)('closeInfo(true);closeOverlay()'));
      await page.click('.ui02-profile');
      assert.ok(await page.$('.profsheet'),'existing native profile dialog');
      await page.evaluate(()=>(0,eval)('closeInfo(true)'));
      await page.click('.ui02-calendar');
      assert.ok(await page.$('.calsheet'),'existing native calendar dialog');
      await page.evaluate(()=>(0,eval)('closeInfo(true)'));
      await page.click('.ui02-feats');
      await page.waitForSelector('.feats',{timeout:30000});
      await page.evaluate(()=>(0,eval)("set_view('lobby');render()"));
      await page.waitForSelector('.lobby .ui02-daily');
      await page.click('.ui02-daily');
      await page.waitForSelector('.quests',{timeout:30000});
    }
    assert.deepEqual(errors,[],'no browser errors: '+width);
    console.log('PASS UI-02',path.basename(html),width+'x'+height,JSON.stringify({groups:measured.layout.map(x=>Math.round(x.width)),visibleResources:measured.visibleResources}));
    await page.close();
  }
}finally{if(browser)await browser.close();await server.close();}
