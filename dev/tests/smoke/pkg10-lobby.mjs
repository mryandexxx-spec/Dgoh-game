// Package 10 B1: verify the real three-zone lobby on iPhone-sized viewports.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const shots = path.resolve(process.argv[3] || 'dist/pkg10-shots');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium'].find(x=>fs.existsSync(x));
if (!chrome) throw Error('Chrome not found');
const SAVE=fs.readFileSync('tests/fixtures/saves/03-late.json','utf8');
const browser=await puppeteer.launch({executablePath:chrome,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const srv=await serve(path.dirname(html));
fs.mkdirSync(shots,{recursive:true});
const expected=[['camp','legend'],['squad'],['raid','shop','trials','conq']];
let fail=0;
try {
  for(const [width,height,gfx] of [[844,390,'med'],[667,375,'low']]){
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    await page.setRequestInterception(true);
    page.on('request',r=>/^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url())?r.continue():r.abort());
    await page.evaluateOnNewDocument((save,quality)=>{
      localStorage.setItem('dune-goh-v1',save);
      localStorage.setItem('dune-cine-off','true');
      localStorage.setItem('dune-gfx',JSON.stringify({p:quality,auto:0}));
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch(e){}
    },SAVE,gfx);
    await page.goto(srv.url(path.basename(html)),{waitUntil:'load'});
    await page.waitForSelector('.lobby.has3d',{timeout:25000});
    for(let zone=0;zone<3;zone++){
      await page.evaluate(z=>document.querySelector('[data-lnav="'+z+'"]').click(),zone);
      await new Promise(r=>setTimeout(r,1200));
      const result=await page.evaluate(()=>{
        const lobby=document.querySelector('.lobby');
        const entries=[...lobby.querySelectorAll('.spot[data-zone]')].filter(e=>getComputedStyle(e).visibility!=='hidden');
        return {zone:+lobby.dataset.lzone,figures:lobby.querySelectorAll('.lfig[data-hid]').length,
          entries:entries.map(e=>e.dataset.v),projected:entries.every(e=>e.style.transform.includes('translate3d'))};
      });
      const valid=result.zone===zone&&result.figures===5&&result.projected&&
        expected[zone].every(name=>result.entries.includes(name))&&result.entries.length===expected[zone].length;
      await page.screenshot({path:path.join(shots,'lobby-'+width+'-'+gfx+'-zone'+zone+'.png')});
      console.log((valid?'PASS':'FAIL')+' B1 '+width+'x'+height+' zone '+zone+' '+JSON.stringify(result));
      if(!valid)fail++;
    }
    // The approved relocated navigation must remain reachable in the profile.
    await page.click('.pchip');
    const profile=await page.$('#overlay2 [data-v="rules"]');
    if(!profile){
      const debug=await page.evaluate(()=>{
        const p=document.querySelector('.pchip'), r=p?.getBoundingClientRect();
        return {profile:!!document.querySelector('#overlay2 .profsheet'),
          overlay2:(document.querySelector('#overlay2')?.innerHTML||'').slice(0,220),
          clickable:r?document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,180):null,
          view:document.querySelector('.lobby')?.dataset.lzone};
      });
      console.error('FAIL B1 rules not found in profile '+JSON.stringify(debug));fail++;
    }
    if(errors.length){console.error('FAIL B1 JS errors '+JSON.stringify(errors));fail++;}
    await page.close();
  }
} finally {await browser.close();await srv.close();}
if(fail)process.exit(1);
