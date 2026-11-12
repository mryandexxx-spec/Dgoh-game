// Regression: an indefinitely pending optional Muad'Dib asset must not block
// the globally shared Babylon loader and unrelated 3D scenes on mobile.
// Run from dev/: node tests/smoke/optional-model-boot.mjs dist/pwa/index.html
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(f => fs.existsSync(f));
if (!chrome) throw new Error('Chrome missing');
const save = fs.readFileSync(new URL('../fixtures/saves/03-late.json', import.meta.url), 'utf8');
const server = await serve(path.dirname(html));
const browser = await puppeteer.launch({
  executablePath: chrome, headless: true,
  args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
});
try {
  const page = await browser.newPage(), errors = [];
  await page.setViewport({width: 844, height: 390, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: true});
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(s => {
    try { localStorage.setItem('dune-goh-v1', s); localStorage.setItem('dune-cine-off', 'true'); } catch (_) {}
    try { Object.defineProperty(navigator, 'serviceWorker', {value: undefined}); } catch (_) {}
  }, save);
  let held = 0;
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (/muad-dib-legend/i.test(req.url())) { held++; return; } // intentionally NEVER finish
    return /^http:\/\/127\.0\.0\.1/.test(req.url()) ? req.continue() : req.abort();
  });
  await page.goto(server.url(path.basename(html)), {waitUntil:'load'});
  await page.waitForFunction(() => !!document.querySelector('.lobby.has3d') &&
    !!document.querySelector('.lobby canvas.stage3d, .lobby canvas.camp3d') &&
    !!window.__B3, {timeout: 35000});
  assert.ok(held > 0, 'optional Muad-Dib request was held open');
  const scene = await page.evaluate(() => ({
    has3d: !!document.querySelector('.lobby.has3d'),
    canvas: !!document.querySelector('.lobby canvas.stage3d, .lobby canvas.camp3d'),
    babylon: !!window.__B3
  }));
  assert.deepEqual(errors, [], 'no uncaught JS errors');
  console.log('PASS optional asset cannot block 3D', JSON.stringify({held, scene}));
  await page.close();
} finally {
  await browser.close();
  await server.close?.();
}
