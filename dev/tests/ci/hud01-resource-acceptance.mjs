// HUD-01: real compiled PWA/artifact resource bar, Inter font and mobile UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const fixture = fs.readFileSync(new URL('../fixtures/saves/03-late.json', import.meta.url), 'utf8');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome, 'Chromium is mandatory for HUD-01 acceptance');
const server = await serve(path.dirname(html));
let browser;
try {
  browser = await puppeteer.launch({executablePath:chrome,headless:true,args:
    ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',
     '--ignore-gpu-blocklist','--disable-background-networking']});
  for(const [width,height,visible] of [[1280,720,7],[844,390,7],[667,375,4],[390,844,4]]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e=>errors.push(e.message));
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:width!==1280,hasTouch:width!==1280,isLandscape:width>height});
    await page.evaluateOnNewDocument(raw=>{
      localStorage.setItem('dune-goh-v1',raw);
      localStorage.setItem('dune-cine-off','true');
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});}catch{}
    },fixture);
    await page.goto(server.url(path.basename(html)),{waitUntil:'load',timeout:75000});
    await page.waitForFunction(()=>!!document.querySelector('.lobby .resbox .hud-water'),{timeout:35000});
    const result = await page.evaluate(async()=>{
      const root=document.querySelector('.lobby .resbox');
      const items=[...root.querySelectorAll(':scope > .hud-cell')];
      const shown=items.filter(el=>getComputedStyle(el).display!=='none');
      const allKeys=items.map(el=>el.dataset.info);
      const rect=root.getBoundingClientRect();
      const fontFaces=await document.fonts.load('600 14px "Dune Inter"','Кристаллы 123456789');
      const balances=(0,eval)('JSON.stringify([S.solari,S.plast,S.teeth,S.cry,S.rid])');
      (0,eval)('renderRes()');
      const after=(0,eval)('JSON.stringify([S.solari,S.plast,S.teeth,S.cry,S.rid])');
      return {
        count:shown.length,keys:allKeys,
        visibleInside:shown.every(e=>{const b=e.getBoundingClientRect();return b.left>=rect.left-1&&b.right<=rect.right+1}),
        inViewport:rect.left>=-1&&rect.right<=innerWidth+1,
        fontFaces:fontFaces.length,cssFont:getComputedStyle(items[0]).fontFamily,
        noCurrencyMutation:balances===after,
        meters:items.slice(0,2).every(x=>!!x.querySelector('.hud-meter > i')),
        hasTimers:items.slice(0,2).every(x=>!!x.querySelector('.hud-timer')),
        details:!!root.querySelector('.hud-overflow summary'),
        heights:{bar:rect.height,window:innerHeight},
      };
    });
    assert.equal(result.count,visible,width+' visible currencies');
    assert.deepEqual(result.keys,['water','candle','sol','pl','teeth','cry','rid']);
    assert.ok(result.visibleInside && result.inViewport,'No resource overflow: '+width+' '+JSON.stringify(result));
    assert.ok(result.fontFaces>=1&&result.cssFont.includes('Dune Inter'),'Local Inter font: '+width);
    assert.ok(result.noCurrencyMutation&&result.meters&&result.hasTimers&&result.details,'HUD contract: '+width);
    if(width===667) {
      await page.evaluate(()=>document.querySelector('.lobby .hud-overflow summary').click());
      const menu=await page.$eval('.lobby .hud-dropdown',e=>({visible:getComputedStyle(e).display!=='none',keys:[...e.querySelectorAll('[data-info]')].map(n=>n.dataset.info)}));
      assert.deepEqual(menu.keys,['pl','teeth','rid']);
      assert.ok(menu.visible);
      await page.evaluate(()=>document.querySelector('.lobby .hud-dropdown [data-info="rid"]').click());
      assert.ok(await page.$('#overlay2 .infosheet'),'Resource button must open existing info sheet');
    }
    assert.deepEqual(errors,[],'Browser errors: '+width);
    await page.close();
    console.log('PASS HUD-01',path.basename(html),width+'x'+height,JSON.stringify(result.heights));
  }
} finally {
  if(browser)await browser.close();
  await server.close();
}
