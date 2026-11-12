// BH9.9 public journey navigation and locked/unlocked shared card on actual
// mobile-size browsers; this test never writes the player's persistent save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';

const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const out=path.resolve('dist/bh99-public-journey-shots');
const fixture=fs.readFileSync('tests/fixtures/saves/03-late.json','utf8');
fs.mkdirSync(out,{recursive:true});
const srv=await serve(path.dirname(html));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,
 args:['--no-sandbox','--disable-webgl','--disable-3d-apis']});
try{
 for(const [width,height] of [[844,390],[667,375]]){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
  await page.evaluateOnNewDocument(save=>{
    localStorage.clear();localStorage.setItem('dune-goh-v1',save);
    localStorage.setItem('dune-cine-off','true');
    try{Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch{}
  },fixture);
  await page.goto(srv.url(path.basename(html)),{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>!document.getElementById('splash'),{timeout:15000});
  const locked=await page.evaluate(()=>{
    window.openCalendar=()=>{};closeInfo(true);closeOverlay();
    view='legend';render();
    const link=document.querySelector('[data-v="baron_journey"]');
    if(!link)throw Error('Dedicated public journey link missing');
    link.click();
    closeInfo(true);
    const h=document.getElementById('view')?.innerHTML||'';
    const m= h.match(/data-bh9-start="0"/g)||[];
    const start=document.querySelector('[data-bh9-start="0"]');
    const hero=CH.baron_legend;
    return {route:view,link:!!link,buttons:document.querySelectorAll('[data-bh9-stage]').length,
      requirementCards:document.querySelectorAll('#view .reqh [data-open]').length,
      locked:!!start?.disabled,first:m.length,hero:hero?.id,regular:CH.baron.id,
      viewWidth:document.getElementById('view').scrollWidth,
      windowWidth:innerWidth,baron:JSON.stringify(S.roster.baron)};
  });
  assert.equal(locked.route,'baron_journey');
  assert.equal(locked.hero,'baron_legend');
  assert.equal(locked.regular,'baron');
  assert.equal(locked.buttons,5);
  assert.equal(locked.locked,true);
  assert.equal(locked.first,1);
  assert.ok(locked.viewWidth <= locked.windowWidth+3,'unexpected horizontal journey overflow');
  await page.screenshot({path:path.join(out,`${width}x${height}-locked.png`)});
  const ready=await page.evaluate(()=>{
    for(const [id,r] of [['baron',7],['feyd',5],['rabban',5],['piter',5],['margot',4],['fenring',4],['shaddam',4],['mohiam',4],['yue',3],['legion',2]])
      Object.assign(S.roster[id],{stars:7,gear:13,relic:r,lvl:85});
    render();
    const start=document.querySelector('[data-bh9-start="0"]');
    const second=document.querySelector('[data-bh9-stage="1"]');
    return {firstEnabled:!!start&&!start.disabled,second:!!second,baron:JSON.stringify(S.roster.baron)};
  });
  assert.equal(ready.firstEnabled,true);
  assert.equal(ready.second,true);
  await page.screenshot({path:path.join(out,`${width}x${height}-ready.png`)});
  const unlocked=await page.evaluate(()=>{
    S.roster.baron_legend.stars=7;
    S.journeys.baron_legend={0:true,1:true,2:true,3:true,4:true};
    render();
    const cardLink=document.querySelector('[data-open="baron_legend"]');
    if(!cardLink)throw Error('Unlocked legendary hero card link absent');
    cardLink.click();
    const card=document.querySelector('#overlay .hc');
    return {id:card?.dataset.cid,locked:card?.classList.contains('locked'),
      svg:!!card?.querySelector('.hcfig svg'),young:JSON.stringify(S.roster.baron)};
  });
  assert.equal(unlocked.id,'baron_legend');
  assert.equal(unlocked.locked,false);
  assert.equal(unlocked.svg,true);
  assert.equal(unlocked.young,ready.baron);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(out,`${width}x${height}-legend-card.png`)});
  await page.close();
  console.log('PASS BH9.9 public Baron journey 2D',width+'x'+height);
 }
}finally{await browser.close();await srv.close();}
