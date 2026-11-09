// E3 browser regression + screenshots for 844×390 and 667×375.
// node tests/smoke/gear-e3-dom.mjs dist/pwa/index.html
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const DEV = process.cwd();
const require = createRequire(path.join(DEV, 'package.json'));
const puppeteer = require('puppeteer-core');
const { serve } = await import(path.join(DEV, 'tests/lib/serve.mjs'));
const html = process.argv[2] || 'dist/pwa/index.html';
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome, 'Chrome required');
const fixture = fs.readFileSync('tests/fixtures/saves/03-late.json', 'utf8');
const server = await serve(path.dirname(path.resolve(html)));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const [width,height] of [[844,390],[667,375]]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: true });
    await page.setRequestInterception(true);
    page.on('request', req => /^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(req.url()) ? req.continue() : req.abort());
    await page.evaluateOnNewDocument(save => {
      localStorage.clear();
      localStorage.setItem('dune-goh-v1', save);
      localStorage.setItem('dune-cine-off', 'true');
      try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch {}
    }, fixture);
    await page.goto(server.url(path.basename(html)), {waitUntil:'load'});
    await page.waitForFunction(() => !!document.querySelector('#overlay'), {timeout:30000});
    await page.evaluate(code => (0, eval)(code), `
      { const p=prog('paul'); p.gear=8; p.eq=[false,false,false,false,false,false];
        S.solari=100000; S.plast=100;
        const it=gearPlan('paul',p.gear)[0]; S.inv[it]=FRAG_NEED[8];
        openDetail('paul'); openItem('paul',0); }
    `);
    await page.waitForSelector('.e3sheet');
    const size = await page.$eval('.e3sheet', el => { const b=el.getBoundingClientRect(); return {w:b.width,h:b.height,x:b.left,y:b.top}; });
    assert.ok(size.w <= width + 2 && size.h <= height + 2, width + ': window fits screen');
    const parts = await page.$$('[data-gearpart]');
    assert.equal(parts.length,2, width + ': nested recipe has two parts');
    await page.screenshot({path:'dist/e3-' + width + '.png'});
    await page.click('[data-gearpart]');
    assert.ok(await page.$('[data-buildpart]'), width + ': component screen');
    await page.click('[data-buildpart]');
    assert.equal(await page.$$eval('[data-gearpart]', els=>els.length),2, width + ': returned to recipe');
    await page.click('[data-gearfind]');
    assert.ok(await page.$('#overlay2 .sheet'), width + ': search opened');
    await page.click('#overlay2 button[data-iclose]');
    assert.ok(await page.$('.e3sheet'), width + ': return from search');
    await page.click('[data-craft]');
    const equipped = await page.evaluate(() => (0,eval)("prog('paul').eq[0]"));
    assert.equal(equipped,true,width + ': craft and equip works');
    assert.deepEqual(errors, [], width + ': no uncaught page errors');
    console.log('E3 browser PASS', width + '×' + height);
    await page.close();
  }
} finally {
  await browser.close();
  server.close?.();
}
