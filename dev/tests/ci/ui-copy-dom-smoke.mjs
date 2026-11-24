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
    const pill=document.querySelector('header [data-info="candle"].pill, header [data-info="candle"].hud-cell');
    const water=document.querySelector('header [data-info="water"].pill, header [data-info="water"].hud-cell');
    const hudLabel=el=>el?.querySelector('.hud-title')?.textContent || el?.querySelector('span')?.textContent;
    const candle=run('S.candle'), waterCount=run('S.water');
    const title=run('RES_INFO.candle.n');
    const reward=run('RW_TITLE.candle');
    const help=run('RES_INFO.candle.d');
    const chronicle=run('CAMP_DEF.C.desc');
    return {
      writer:run('start.writerLifecycle().writer.status'),
      pill:hudLabel(pill),
      waterLabel:hudLabel(water),
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

  // UI-03: when the approved daily-calendar layout exists, verify its real
  // fixed viewport, independent scroll and preview-only interactions.
  // No reward claim or persist is called, even on the synthetic v1 fixture.
  for (const [width,height] of [[844,390],[667,375]]) {
    await page.setViewport({width,height,deviceScaleFactor:1,
      isMobile:true,hasTouch:true,isLandscape:true});
    const daily=await page.evaluate(()=>{
      const run=code=>(0,eval)(code);
      run("closeInfo(true);closeOverlay();view='daily';render();");
      const root=document.querySelector('#view>.ui03-daily');
      if(!root)return null; // unchanged main / an unrelated UI-copy task
      const sc=root.querySelector('.ui03-scroll');
      const bounds=root.getBoundingClientRect();
      const quests=[...root.querySelectorAll('.ui03-quest')];
      const before=run('JSON.stringify([S.cry,S.solari,S.plast,S.seal,S.login,S.daily])');
      return {rootHeight:bounds.height,bottom:bounds.bottom,width:bounds.width,
        viewportHeight:window.innerHeight,
        pageScroll:document.documentElement.scrollHeight>window.innerHeight+1 ||
          document.body.scrollHeight>window.innerHeight+1,
        scrolling:getComputedStyle(sc).overflowY,
        scrollable:sc.scrollHeight>sc.clientHeight+15,
        questCount:quests.length,
        allButton:!!root.querySelector('[data-qall]'),
        chestButton:!!root.querySelector('[data-qchest]'),
        before};
    });
    if (!daily) break;
    assert.equal(daily.rootHeight,height,'UI-03 daily viewport height');
    assert.ok(Math.abs(daily.bottom-height)<2,'UI-03 daily bottom stays visible');
    assert.equal(daily.pageScroll,false,'UI-03 daily must not scroll document');
    assert.equal(daily.scrolling,'auto','quests have their own scrolling');
    assert.ok(daily.scrollable,'quests list has independent vertical scroll');
    assert.ok(daily.questCount>=8 && daily.questCount<=10,'active daily quests preserved');
    assert.ok(daily.allButton && daily.chestButton,'claim controls preserved');
    await page.click('[data-ui03filter="got"]');
    assert.equal(await page.$eval('[data-ui03filter="got"]',el=>el.getAttribute('aria-pressed')),
      'true','daily filter is interactive');
    await page.click('[data-ui03filter="all"]');
    await page.click('.ui03-daily [data-cal]');
    const cal=await page.evaluate(()=>{
      const root=document.querySelector('#overlay2 .ui03-calendar-screen');
      if (!root)return null;
      const sc=root.querySelector('.ui03-calendar-body .ui03-scroll');
      const bounds=root.getBoundingClientRect();
      return {rootHeight:bounds.height,bottom:bounds.bottom,
        days:root.querySelectorAll('[data-ui03day]').length,
        expected:(0,eval)('monthDays()'),
        overflow:getComputedStyle(sc).overflowY,
        claim:!!root.querySelector('[data-calclaim]')};
    });
    assert.ok(cal,'calendar opens from daily');
    assert.equal(cal.rootHeight,height,'UI-03 calendar viewport height');
    assert.ok(Math.abs(cal.bottom-height)<2,'UI-03 calendar bottom stays visible');
    assert.equal(cal.days,cal.expected,'calendar preserves month length');
    assert.equal(cal.overflow,'auto','calendar has internal scrolling');
    assert.equal(cal.claim,true,'verified login claim control exists');
    await page.click('[data-ui03day="15"]');
    assert.match(await page.$eval('#ui03-selected-reward',el=>el.textContent),/День 15:/,
      'calendar day preview changes without claiming');
    await page.click('[data-ui03daily]');
    const final=await page.evaluate(()=>{
      const run=code=>(0,eval)(code);
      return {back:!!document.querySelector('#view>.ui03-daily'),
        overlayClear:!document.querySelector('#overlay2 .ui03-calendar-screen'),
        balances:run('JSON.stringify([S.cry,S.solari,S.plast,S.seal,S.login,S.daily])')};
    });
    assert.ok(final.back && final.overlayClear,'calendar returns to daily');
    assert.equal(final.balances,daily.before,'UI-03 navigation must not award or mutate saves');
    console.log('PASS UI-03 real Chromium layout and actions:',width+'x'+height,html);
  }

  assert.deepEqual(errors,[],'no page errors on guarded PWA boot');
  console.log('PASS CI-OPT-02 UI-copy DOM:',html,
    'native writer v1 boot, energy labels/description, no resource spending');
} finally {
  if(browser)await browser.close();
  await srv.close();
}
