// Regression: settings HIGH + 30 FPS -> retreat through real modal -> enter battle again.
// Exercises the shipped PWA, native Web Locks, delegated button clicks and real WebGL.
// Never modifies a user's save; uses an isolated local late-game fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';

const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
if (!chrome) throw Error('Chrome not found');
const save = fs.readFileSync('tests/fixtures/saves/03-late.json', 'utf8');
const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const srv = await serve(path.dirname(html));
let page;
const detail = async () => page.evaluate(() => ({
  gfx: readGfx().p, fps: readBattleFps(),
  battle: !!(BT && BT.B), done: BT?.done, over: BT?.B?.over,
  inDom: !!document.querySelector('#battle'),
  squad: !!document.querySelector('[data-sqgo]'),
  popup: !!document.querySelector('#bpop'),
  result: !!document.querySelector('.result'),
  status: loadSave.writer.state().status,
  check: loadSave.writer.check().ok,
  selector: document.querySelector('[data-sqgo]')?.disabled,
  overlay: document.querySelector('#overlay')?.textContent?.slice(0, 120),
}));
const click = async selector => {
  await page.waitForSelector(selector, { timeout: 15000 });
  await page.click(selector);
};
try {
  page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: '+e.message));
  page.on('console', e => { if (e.type()==='error') errors.push('console: '+e.text()); });
  await page.setViewport({ width:844, height:390, deviceScaleFactor:1, isMobile:true, hasTouch:true, isLandscape:true });
  await page.setRequestInterception(true);
  page.on('request', r => /^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url()) ? r.continue() : r.abort());
  await page.evaluateOnNewDocument(raw => {
    localStorage.setItem('dune-goh-v1', raw);
    localStorage.setItem('dune-cine-off', 'true');
    try { Object.defineProperty(navigator,'serviceWorker',{value:undefined}); } catch (e) {}
  }, save);
  await page.goto(srv.url(path.basename(html)), { waitUntil:'load' });
  await page.waitForFunction(() => {
    const s = (0,eval)('start.writerLifecycle()');
    return s.armed && !s.blocked && s.writer.status==='owned';
  }, { timeout:30000, polling:100 });
  await page.evaluate(async () => {
    if (!await loadB3()) throw Error('Babylon WebGL unavailable');
    S.skipDlg = true; set_view('camp'); render(); openSquadSel('camp', 0);
  });
  await click('[data-sqgo]:not([disabled])');
  await page.waitForFunction(() => BT?.B && !!document.querySelector('#battle'), {timeout:20000});
  await page.evaluate(() => clearTimeout(BT.timer));
  await click('[data-bset]');
  await click('[data-bsgfx="high"]');
  await click('[data-bsfps="30"]');
  assert.equal((await detail()).gfx,'high');
  assert.equal((await detail()).fps,30);
  await click('[data-bsquit]');
  await page.waitForFunction(() => BT?.done && !!document.querySelector('.result'), { timeout:15000 });
  const afterRetreat = await detail();
  assert.equal(afterRetreat.status,'owned','retreat must keep verified writer authority');
  await click('[data-tocamp]');
  const afterExit = await detail();
  assert.equal(afterExit.inDom,false,'battle DOM must be removed on retreat');
  assert.equal(afterExit.battle,false,'stale battle must not block re-entry');
  assert.equal(afterExit.status,'owned','writer must survive settings/retreat');
  await page.evaluate(() => { openSquadSel('camp', 0); });
  await click('[data-sqgo]:not([disabled])');
  await page.waitForFunction(() => !!BT?.B && !BT.done && !!document.querySelector('#battle'), {timeout:20000});
  const resumed = await detail();
  assert.equal(resumed.status,'owned');
  assert.equal(resumed.gfx,'high');
  assert.equal(resumed.fps,30);
  assert.deepEqual(errors,[]);
  console.log('PASS battle settings HIGH 30fps -> retreat -> campaign -> reentry, Web Locks owned');
  console.log(JSON.stringify({afterRetreat,afterExit,resumed}));
} catch (e) {
  console.error('FAIL settings reentry',e.message);
  try { console.error(JSON.stringify(await detail())); } catch (x) { console.error(String(x)); }
  throw e;
} finally {
  if (page) await page.close().catch(() => {});
  await browser.close();
  await srv.close();
}
