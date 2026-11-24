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
        // UI-03c: each daily row has a unique hand-authored collectible,
        // not the old Unicode text badge or the generic 16px glyph.
        symbols:[...root.querySelectorAll('.ui03-quest')].map(q=>{
          const badge=q.querySelector('.ui03-qicon'),
            art=badge?.querySelector('svg[data-ui03quest-art]'),
            frame=art?.getBoundingClientRect();
          return {key:badge?.dataset.ui03quest,art:art?.dataset.ui03questArt,
            count:badge?.querySelectorAll('svg.ui03-quest-svg').length||0,
            paths:art?.querySelectorAll('path').length||0,
            gradients:art?.querySelectorAll('linearGradient, radialGradient').length||0,
            pixels:frame?.width||0,visible:!!frame?.height,
            glyph:badge?.textContent.trim()||''};
        }),
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
    assert.equal(daily.symbols.length,daily.questCount,'every active quest has art');
    assert.equal(new Set(daily.symbols.map(x=>x.key)).size,daily.questCount,
      'mission badges are different for each quest');
    for(const icon of daily.symbols){
      assert.equal(icon.art,icon.key,'no generic quest icon fallback: '+icon.key);
      assert.equal(icon.count,1,'one self-contained SVG per quest: '+icon.key);
      assert.ok(icon.paths>=3 && icon.gradients>=4,'illustrated vector art: '+icon.key);
      assert.ok(icon.pixels>=(width<=700?27:32),'badge legible on iPhone: '+icon.key);
      assert.ok(icon.visible,'daily SVG is not clipped away: '+icon.key);
      assert.equal(icon.glyph,'','no leftover Unicode placeholder: '+icon.key);
    }
    const arts=await page.evaluate(()=>Object.keys((0,eval)('QUEST_ART')).sort());
    assert.deepEqual(arts,['camp','chron','craft','login','lvl','raid','shop','skill','ult','water'],
      'all ten authorized DAILY.k categories have original source art');
    // Capture actual click interception on the standalone HTML artifact.
    // On failure this reports the target and hit-test element rather than
    // silently weakening the existing interaction assertion.
    await page.evaluate(() => {
      window.__ui03FilterTrace = [];
      document.addEventListener('click', e => {
        const hit = e.target;
        if (document.querySelector('.ui03-daily'))
          window.__ui03FilterTrace.push({
            tag: hit.tagName, html: hit.outerHTML.slice(0, 150),
            key: hit.closest('[data-ui03filter]')?.dataset.ui03filter || null
          });
      }, true);
    });
    await page.click('[data-ui03filter="got"]');
    let pressed = await page.$eval('[data-ui03filter="got"]', el => el.getAttribute('aria-pressed'));
    if (pressed !== 'true') {
      // An asynchronous layout replacement can move the filter between Puppeteer's
      // bounding-box calculation and pointerup. The previous diagnostic proved
      // the click hit BODY, not the visible button. Recheck hit-testing then
      // retry ONCE, without suppressing a genuine non-interactive filter.
      await page.waitForFunction(() => {
        const b = document.querySelector('[data-ui03filter="got"]');
        if (!b) return false;
        const r = b.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
        return hit === b || b.contains(hit);
      }, { timeout: 5000, polling: 80 });
      await page.click('[data-ui03filter="got"]');
      pressed = await page.$eval('[data-ui03filter="got"]', el => el.getAttribute('aria-pressed'));
    }
    if (pressed !== 'true') {
      const debug = await page.evaluate(() => {
        const b = document.querySelector('[data-ui03filter="got"]'), r = b.getBoundingClientRect();
        const mid = document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        return { center: mid?.outerHTML.slice(0, 220),
          button: b.outerHTML.slice(0, 200),
          clicks: window.__ui03FilterTrace, 
          view: document.querySelector('.ui03-daily')?.getBoundingClientRect().toJSON() };
      });
      console.log('UI-03 filter click diagnostic', JSON.stringify({debug, errors}));
    }
    assert.equal(pressed, 'true', 'daily filter is interactive');
    await page.click('[data-ui03filter="all"]');
    await page.click('.ui03-daily [data-cal]');
    const cal=await page.evaluate(()=>{
      const root=document.querySelector('#overlay2 .ui03-calendar-screen');
      if (!root)return null;
      const sc=root.querySelector('.ui03-calendar-body .ui03-scroll');
      const bounds=root.getBoundingClientRect();
      return {rootHeight:bounds.height,bottom:bounds.bottom,
        days:root.querySelectorAll('[data-ui03day]').length,
        expected:(0,eval)('todayKey.clock.snapshot().daysInMonth'),
        overflow:getComputedStyle(sc).overflowY,
        claim:!!root.querySelector('[data-calclaim]')};
    });
    assert.ok(cal,'calendar opens from daily');
    assert.equal(cal.rootHeight,height,'UI-03 calendar viewport height');
    assert.ok(Math.abs(cal.bottom-height)<2,'UI-03 calendar bottom stays visible');
    assert.equal(cal.days,cal.expected,'calendar preserves month length');
    assert.equal(cal.overflow,'auto','calendar has internal scrolling');
    assert.equal(cal.claim,true,'verified login claim control exists');
    // UI-03b: first-open portrait must stay strictly inside its artboard and
    // keep the same geometry after a harmless view render (no claim/write).
    // Every recurring calendar reward, including secondary milestone loot,
    // gets a native-size handcrafted SVG, not the tiny generic 16px glyph.
    const readArt=()=>page.evaluate(()=>{
      const root=document.querySelector('#overlay2 .ui03-calendar-screen');
      const portrait=root.querySelector('.ui03-portrait');
      const fig=portrait?.querySelector('.biofig');
      const svg=fig?.querySelector('svg');
      const grid=root.querySelector('.ui03-calendar-grid');
      const scroll=root.querySelector('.ui03-calendar-body .ui03-scroll');
      const first=root.querySelector('[data-ui03day="1"] .ui03-loot-svg');
      const firstReward=root.querySelector('[data-ui03day="1"] [data-ui03reward]');
      const last=root.querySelectorAll('[data-ui03day]')[root.querySelectorAll('[data-ui03day]').length-1];
      const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
      return {portrait:box(portrait),fig:box(fig),svg:box(svg),
        cover:getComputedStyle(portrait).contain,
        icon:box(first),
        kinds:[...new Set([...root.querySelectorAll('[data-ui03reward]')].map(e=>e.dataset.ui03reward))].sort(),
        svgCount:root.querySelectorAll('.ui03-loot-svg').length,
        dayCount:root.querySelectorAll('[data-ui03day]').length,
        day15:root.querySelectorAll('[data-ui03day="15"] [data-ui03reward]').length,
        last: last.querySelectorAll('[data-ui03reward]').length,
        gridHeight:grid.getBoundingClientRect().height,
        scrollHeight:scroll.getBoundingClientRect().height,
        rootHeight:root.getBoundingClientRect().height,
        externalImages:root.querySelectorAll('.ui03-dayitems image[href^="http"]').length};
    });
    const initialArt=await readArt();
    assert.ok(initialArt.portrait.height>30,'portrait reserves a stable visible artboard');
    assert.ok(initialArt.fig.width>0 && initialArt.fig.height>0,'portrait has concrete size');
    assert.ok(Math.abs(initialArt.fig.height-initialArt.portrait.height)<2,'portrait height is constrained');
    assert.ok(initialArt.svg.left>=initialArt.portrait.left-2 &&
      initialArt.svg.right<=initialArt.portrait.right+2 &&
      initialArt.svg.top>=initialArt.portrait.top-2 &&
      initialArt.svg.bottom<=initialArt.portrait.bottom+2,
      'initial hero SVG stays within its panel');
    assert.match(initialArt.cover,/size/,'portrait intrinsic SVG cannot grow the flex row');
    assert.ok(initialArt.icon.height>=(width<=700?28:34),'premium rewards are legible at native phone size');
    assert.deepEqual(initialArt.kinds,['cry','folio','pl','seal','shard','sol','teeth','water','wol'],
      'all nine calendar reward kinds have illustrated art');
    assert.equal(initialArt.day15,2,'day 15 shows both seal and shards');
    assert.equal(initialArt.last,2,'month end shows shards and Water of Life');
    assert.ok(initialArt.gridHeight>=initialArt.scrollHeight-3,'reward grid uses free vertical area');
    assert.equal(initialArt.externalImages,0,'calendar SVG art is local and offline-ready');
    await page.evaluate(()=>(0,eval)('openCalendar()'));
    const redrawArt=await readArt();
    assert.ok(Math.abs(redrawArt.svg.height-initialArt.svg.height)<2 &&
      Math.abs(redrawArt.svg.width-initialArt.svg.width)<2 &&
      Math.abs(redrawArt.portrait.height-initialArt.portrait.height)<2,
      'hero portrait remains unchanged after calendar rerender');
    console.log('PASS UI-03b calendar portrait and collectible art:',width+'x'+height,
      initialArt.kinds.join(','),Math.round(initialArt.icon.height)+'px');

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
