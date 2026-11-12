// BH8: screenshot the REAL shared hero card with the staged legendary Baron DGM.
// No new UI layout, public CHARS registration, routes, player-save writes or art substitutions.
// node tests/smoke/baron-legend-card.mjs dist/pwa/index.html
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';
import { BARON_LEGEND_KIT } from '../../src/data/baron-legend-kit.js';
import { defaultStagedHero } from '../../src/logic/baron-roster-integration.js';

const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const chrome = process.env.CHROME_PATH || '/usr/bin/chromium';
const out = path.resolve('dist/baron-legend-bh8-shots/card');
const save = fs.readFileSync('tests/fixtures/saves/03-late.json', 'utf8');
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const srv = await serve(path.dirname(html));
const cases = [[844,390,'med'],[667,375,'med'],[844,390,'low'],[667,375,'low']];
const results = [];

try {
  for (const [w,h,quality] of cases) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewport({ width:w, height:h, deviceScaleFactor:1, isMobile:true, hasTouch:true, isLandscape:true });
    await page.evaluateOnNewDocument((fixture, gfx) => {
      localStorage.clear();
      localStorage.setItem('dune-goh-v1', fixture);
      localStorage.setItem('dune-gfx', JSON.stringify({ p:gfx, auto:0, bad:0, good:0, noUp:true }));
      try { Object.defineProperty(navigator, 'serviceWorker', { value:undefined }); } catch {}
    }, save, quality);
    await page.goto(srv.url(path.basename(html)), { waitUntil:'load', timeout:120000 });
    await page.evaluate(async () => {
      if (!await loadB3()) throw Error('3D engine failed to load');
      if (!MODEL_DATA.baron_legend) throw Error('Legendary Baron DGM not loaded');
      if (!CH.baron || !CH.baron_legend || !CH.margot || !CH.yue) throw Error('Public hero identity gate broken');
      closeInfo(true); // monthly calendar lives in #overlay2; closeOverlay only clears #overlay
      closeOverlay();
      openDetail('muaddib');
    });
    await page.waitForFunction(() => !!(typeof HERO_STAGE !== 'undefined' && HERO_STAGE?.o?.root && HERO_STAGE.scene.getFrameId() > 2), { timeout:60000 });
    await new Promise(r => setTimeout(r, 1100));
    await page.evaluate(() => closeInfo(true)); // async monthly calendar may appear after boot
    await page.screenshot({ path:path.join(out, `${w}x${h}-${quality}-existing-muaddib.png`) });
    const begin = await page.evaluate((def, progress) => {
      closeInfo(true);
      const before = JSON.stringify(S.roster);
      openDetail('baron_legend', { def, progress });
      closeInfo(true); // info overlay can be opened by deferred login jobs
      const hc = document.querySelector('#overlay .hc');
      if (!hc || hc.dataset.cid !== 'baron_legend') throw Error('Shared hero card not mounted');
      if (document.querySelector('#overlay2')?.innerHTML.trim()) throw Error('Monthly calendar/info overlay obscures card screenshot');
      if (!document.elementFromPoint(innerWidth/2, innerHeight/2)?.closest('.hc')) throw Error('Card is not topmost at viewport center');
      const disabled = [...hc.querySelectorAll('button:not([data-close]):not([data-dback]):not([data-hcstat])')];
      if (!disabled.length || disabled.some(b => !b.disabled)) throw Error('Staged mutations not disabled');
      if (JSON.stringify(S.roster) !== before) throw Error('Staged preview changed save roster');
      window.__bh8CardBefore = before;
      return { disabledButtons:disabled.length, cardClass:hc.className };
    }, BARON_LEGEND_KIT, defaultStagedHero());
    await page.waitForFunction(() => !!(typeof HERO_STAGE !== 'undefined' && HERO_STAGE?.o?.root?._authored &&
      HERO_STAGE.o.def?.id === 'baron_legend' && HERO_STAGE.scene.getFrameId() > 5), { timeout:60000 });
    await new Promise(r => setTimeout(r, 1400));
    const verdict = await page.evaluate(() => {
      closeInfo(true); // perform after async model warmup, immediately before screenshot
      const o = HERO_STAGE.o, hc = document.querySelector('#overlay .hc');
      const skinned = o.root.getChildMeshes().filter(m => m.skeleton).length;
      const items = [...hc.querySelectorAll('.hcsk')].map(b => b.textContent.trim());
      const result = {
        id:o.def.id, authored:!!o.root._authored, skinned, heroCard:hc.classList.contains('hc'),
        previewLocked:hc.classList.contains('locked'), text:hc.textContent.includes('Барон Владимир Харконнен'),
        actions:['Приказ Барона','Власть через страх','Глаза императора','Падение Атрейдесов'].every(n => items.some(i => i.includes(n))),
        rosterUnchanged:JSON.stringify(S.roster) === window.__bh8CardBefore,
        youngBaronUnchanged:!!CH.baron && CH.baron.id === 'baron',
        publicApproved:!!CH.baron_legend,
        infoLayerClear:!document.querySelector('#overlay2')?.innerHTML.trim(),
        topmost:!!document.elementFromPoint(innerWidth/2, innerHeight/2)?.closest('.hc'),
        frame:HERO_STAGE.scene.getFrameId(),
      };
      return result;
    });
    await page.screenshot({ path:path.join(out, `${w}x${h}-${quality}-legend-baron.png`) });
    // Art-review diagnostic ONLY. The shared EngineHost canvas can be parked
    // between frames on slow LOW/SwiftShader runs. Remount the SAME live HeroStage,
    // never create another engine/model or modify production locked-card CSS.
    await page.evaluate(() => {
      const host = document.querySelector('#overlay .hcfig');
      if (!host || !host.isConnected || HERO_STAGE?.o?.def?.id !== 'baron_legend' ||
          !HERO_STAGE.o.root?._authored) throw Error('Authentic staged hero stage unavailable');
      if (!host.querySelector('canvas')) HERO_STAGE.attach(host);
    });
    await page.waitForFunction(() => {
      const host = document.querySelector('#overlay .hcfig');
      const canvas = host?.querySelector('canvas');
      return !!(host?.isConnected && canvas?.isConnected &&
        HERO_STAGE?.o?.def?.id === 'baron_legend' && HERO_STAGE.o.root?._authored);
    }, { timeout:15000 });
    // The normal locked card deliberately dims its 3D canvas. The override
    // exists only in this ephemeral screenshot page, after production capture.
    const artReview = await page.evaluate(() => {
      const canvas = document.querySelector('#overlay .hcfig canvas');
      if (!canvas?.isConnected) throw Error('Shared hero canvas not mounted');
      const before = getComputedStyle(canvas).filter;
      canvas.style.filter = 'none';
      return { lockedCanvasFilter: before, reviewCanvasFilter: getComputedStyle(canvas).filter };
    });
    assert.notEqual(artReview.lockedCanvasFilter, 'none', 'Preview must reflect genuine shared locked card styling');
    assert.equal(artReview.reviewCanvasFilter, 'none');
    await page.screenshot({ path:path.join(out, `${w}x${h}-${quality}-legend-baron-art-review.png`) });

    assert.equal(verdict.id, 'baron_legend');
    assert.equal(verdict.authored, true, 'Procedural fallback is not an approved DGM model');
    assert.equal(verdict.skinned, 11, 'Exactly 11 skinned meshes expected from legend DGM');
    for (const key of ['heroCard','previewLocked','text','actions','rosterUnchanged','youngBaronUnchanged','publicApproved','infoLayerClear','topmost'])
      assert.equal(verdict[key], true, `${w}x${h} ${quality}: ${key}`);
    assert.equal(errors.length, 0, 'WebGL/browser console errors: '+JSON.stringify(errors));
    results.push({ resolution:`${w}x${h}`, quality, ...begin, ...verdict });
    console.log('PASS BH8 standard card, authentic DGM', w+'x'+h, quality, JSON.stringify(verdict));
    await page.close();
  }
} finally {
  await browser.close();
  await srv.close();
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(results, null, 2));
assert.equal(results.length, 4);
console.log('PASS BH8 4 real WebGL card screenshots + 4 existing-card controls, no roster/save changes');
