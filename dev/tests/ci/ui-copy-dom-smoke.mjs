// CI-OPT-02: focused, real Chromium smoke for a certified display-only diff.
// Existing save-v1 boot; no claim buttons, transactions or save writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';

const require=createRequire(import.meta.url);
const puppeteer=require('puppeteer-core');
const html=path.resolve(process.argv[2] || 'dist/pwa/index.html');
const fixture=fs.readFileSync(new URL('../fixtures/saves/03-late.json',import.meta.url),'utf8');
const chrome=process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'UI-copy acceptance requires real Chromium');
assert.equal(JSON.parse(fixture).v,1,'legacy v1 save must remain supported');

const srv=await serve(path.dirname(html));
let browser;
const errors=[];
try {
  browser=await puppeteer.launch({
    executablePath:chrome,headless:true,
    args:['--no-sandbox','--disable-background-networking',
      '--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
  });
  const page=await browser.newPage();
  page.on('pageerror',err=>errors.push(String(err)));
  await page.setViewport({width:844,height:390,deviceScaleFactor:1,
    isMobile:true,hasTouch:true,isLandscape:true});
  await page.evaluateOnNewDocument(raw=>{
    localStorage.setItem('dune-goh-v1',raw);
    try {Object.defineProperty(navigator,'serviceWorker',
      {value:undefined,configurable:true});} catch {}
  },fixture);
  await page.goto(srv.url(path.basename(html)),{waitUntil:'load',timeout:75000});
  await page.waitForFunction(()=>{
    try {
      const state=(0,eval)('start.writerLifecycle()');
      return state.armed && !state.blocked && state.reason==='active' &&
        state.writer.status==='owned' &&
        (0,eval)('typeof S !== "undefined"');
    } catch { return false; }
  },{timeout:35000,polling:50});
  const result=await page.evaluate(()=>{
    const run=code=>(0,eval)(code);
    const pill=document.querySelector('header .pill[data-info="candle"]');
    const water=document.querySelector('header .pill[data-info="water"]');
    const candle=run('S.candle'), waterCount=run('S.water');
    const title=run('RES_INFO.candle.n');
    const reward=run('RW_TITLE.candle');
    const help=run('RES_INFO.candle.d');
    const chronicle=run('CAMP_DEF.C.desc');
    return {
      writer:run('start.writerLifecycle().writer.status'),
      pill:pill?.querySelector('span')?.textContent,
      waterLabel:water?.querySelector('span')?.textContent,
      candle,candleAfter:run('S.candle'),waterCount,
      display:title,reward,help,chronicle,
      pillText:pill?.textContent
    };
  });
  assert.equal(result.writer,'owned');
  // This CI-infrastructure PR runs against pre-rename main. Future proven
  // copy-only PRs may use new labels: assert the rendered surfaces agree,
  // rather than baking any particular approved word into the CI router.
  assert.ok(['Свечи','Огни'].includes(result.pill),'known chronicle energy HUD label');
  assert.equal(result.waterLabel?.startsWith('Вода'),true);
  assert.equal(result.pill,result.reward,'HUD and rewards display the same resource');
  assert.match(result.display,/хроник/i,'resource info identifies Chronicles');
  assert.match(result.help,/Энергия для Хроник Дюны/,'energy help remains contextual');
  assert.match(result.chronicle,/Хроники|Хроник/,'campaign remains about Chronicles');
  assert.equal(result.candle,result.candleAfter,'render did not spend candle energy');
  assert.ok(Number.isFinite(result.waterCount));
  assert.ok(result.pillText?.includes('/'),'energy balance is displayed');
  assert.deepEqual(errors,[],'no page errors on guarded PWA boot');
  console.log('PASS CI-OPT-02 UI-copy DOM:',html,
    'native writer v1 boot, energy labels/description, no resource spending');
} finally {
  if(browser)await browser.close();
  await srv.close();
}
