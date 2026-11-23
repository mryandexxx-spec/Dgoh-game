// HUD-01 / UI-02: existing real resource bar, local Inter and seven visible currencies at all screen sizes.
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
  for(const [width,height,visible] of [[1280,720,7],[844,390,7],[667,375,7],[390,844,7]]) {
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
      // UI-02: seven resources are fully visible in a real 4×2 layout.
      // No hidden 3-currency overflow is required on the lobby.
      assert.equal(await page.$eval('.lobby .hud-overflow',e=>getComputedStyle(e).display),'none');
      await page.evaluate(()=>document.querySelector('.lobby .resbox > [data-info="rid"]').click());
      assert.ok(await page.$('#overlay2 .infosheet'),'Visible resource opens the existing info sheet');
    }
    assert.deepEqual(errors,[],'Browser errors: '+width);
    await page.close();
    console.log('PASS HUD-01',path.basename(html),width+'x'+height,JSON.stringify(result.heights));
  }
} finally {
  if(browser)await browser.close();
  await server.close();
}
