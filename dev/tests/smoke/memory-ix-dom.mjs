// Package 12: iPhone landscape recycler UI, interaction and viewport safety.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const DEV = process.cwd(), require = createRequire(path.join(DEV,'package.json'));
const puppeteer = require('puppeteer-core');
const { serve } = await import(path.join(DEV,'tests/lib/serve.mjs'));
const html = process.argv[2] || 'dist/pwa/index.html';
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Chrome required');
const fixture = fs.readFileSync('tests/fixtures/saves/03-late.json','utf8');
const server = await serve(path.dirname(path.resolve(html)));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
try {
  for (const [width,height] of [[844,390],[667,375]]) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror',err=>errors.push(err.message));
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    await page.setRequestInterception(true);
    page.on('request',req=>/^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(req.url())?req.continue():req.abort());
    await page.evaluateOnNewDocument(save=>{
      localStorage.clear(); localStorage.setItem('dune-goh-v1',save);
      localStorage.setItem('dune-cine-off','true');
      try { Object.defineProperty(navigator,'serviceWorker',{value:undefined}); } catch {}
    },fixture);
    await page.goto(server.url(path.basename(html)),{waitUntil:'load'});
    await page.waitForFunction(()=>!!document.querySelector('#overlay'),{timeout:30000});
    // Boot may schedule the login calendar over the recycler; dismiss it after its scheduled entry.
    await new Promise(resolve => setTimeout(resolve, 3100));
    await page.evaluate(code=>(0,eval)(code), `
      closeInfo(true); closeOverlay();
      S.squad=[];S.squadC=[];S.squadD=[];S.raidPick=[]; S.inv.mask2=100;
      S.scrapCarry.ix_plate=5;S.scrapLocks.mask2=false;
      view='recycler';render();
    `);
    await page.waitForSelector('.ixpage');
    const box=await page.$eval('.ixpage',el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom};});
    console.log('Ix viewport',width+'x'+height,JSON.stringify(box));
    await page.screenshot({path:'dist/ix-debug-' + width + '.png'});
    assert.ok(box.x>=-2 && box.right<=width+2 && box.y>=-2 && box.bottom<=height+2,width+': recycler viewport '+JSON.stringify(box));
    assert.ok(await page.$('[data-ixkind="ix_plate"]'),width+': categories');
    const initialPlate = await page.evaluate(() => (0,eval)('S.ix_plate'));
    await page.screenshot({path:'dist/ix-' + width + '.png'});
    await page.click('[data-ixselect="mask2"]');
    console.log('ix click modal',await page.evaluate(() => ({html:document.querySelector('#overlay2')?.innerHTML.slice(0,1200),errors:document.querySelectorAll('.toast').length, current:document.querySelector('[data-ixselect="mask2"]')?.outerHTML}))); 
    assert.ok(await page.$('[data-ixadd="10"]'),width+': selection modal');
    await page.click('[data-ixadd="10"]');
    assert.ok(await page.$('[data-ixconfirm]'),width+': quote');
    await page.click('[data-ixconfirm]');
    console.log('ix confirm dialog',width, await page.evaluate(() => ({html: document.querySelector('#overlay2')?.innerHTML.slice(0,900), quote:scrapQuote(S,'ix_plate',[{id:'mask2',count:10}])})));
    assert.ok(await page.$('[data-ixdo]'),width+': confirmation');
    await page.click('[data-ixdo]');
    const after=await page.evaluate(()=>(0,eval)('([S.ix_plate,S.scrapCarry.ix_plate,S.inv.mask2])'));
    assert.deepEqual(JSON.parse(JSON.stringify(after)),[initialPlate+1,11,90],width+': conversion and carry');
    await page.click('[data-ixtab="rates"]');
    assert.ok(await page.$('.ixrates'),width+': rates tab');
    await page.click('[data-ixtab="stock"]');
    assert.ok(await page.$('.ixpage .ixpanel'),width+': stock tab');
    await page.click('[data-ixback]');
    assert.ok(await page.$('[data-ixenter]'),width+': back to shop');
    assert.deepEqual(errors,[],width+': no uncaught JS errors');
    console.log('PASS Ix UI',width+'×'+height);
    await page.close();
  }
} finally { await browser.close(); server.close?.(); }
