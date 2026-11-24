// CI-OPT-01: focused real-browser ECON-01 daily/chest UI smoke.
// Uses the genuine asynchronous exclusive Web Locks startup for an existing
// v1 save; only tests ephemeral in-memory counters, never persists claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const fixture = fs.readFileSync(new URL('../fixtures/saves/03-late.json', import.meta.url), 'utf8');
const chrome = process.env.CHROME_PATH ||
  ['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome, 'Real Chromium is mandatory for focused daily DOM acceptance');
assert.equal(JSON.parse(fixture).v, 1, 'must boot existing v1 save');

const server = await serve(path.dirname(html));
let browser;
const errors = [];
try {
  browser = await puppeteer.launch({
    executablePath: chrome, headless: true,
    args: ['--no-sandbox','--use-angle=swiftshader',
      '--enable-unsafe-swiftshader','--ignore-gpu-blocklist',
      '--disable-background-networking'],
  });
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  await page.setViewport({width:844,height:390,deviceScaleFactor:1,
    isMobile:true,hasTouch:true,isLandscape:true});
  await page.evaluateOnNewDocument(raw => {
    localStorage.setItem('dune-goh-v1', raw);
    try { Object.defineProperty(navigator,'serviceWorker',
      {value:undefined,configurable:true}); } catch {}
  }, fixture);
  await page.goto(server.url(path.basename(html)), {waitUntil:'load',timeout:75000});
  await page.waitForFunction(() => {
    try {
      const phase=(0,eval)('start.writerLifecycle()');
      return phase.armed && !phase.blocked &&
        phase.reason === 'active' && phase.writer.status === 'owned' &&
        (0,eval)('typeof S !== "undefined"');
    } catch { return false; }
  }, {timeout:35000,polling:50});

  const output = await page.evaluate(() => {
    // Render only — never dispatch claim clicks or call persist(). The
    // browser-local fixture cannot change any real user's save.
    const run = code => (0,eval)(code);
    const balances = () => run('JSON.stringify([S.cry,S.solari,S.plast,S.seal])');
    const read = () => {
      const host=document.querySelector('#view');
      const quests=[...host.querySelectorAll('.quest, .ui03-quest')];
      const quest=label => {
        const q=quests.find(x=>x.querySelector('.qtx b, .ui03-qcopy b')?.textContent===label);
        if(!q) throw Error('Missing daily quest: '+label);
        return {state:q.classList.contains('done')?'done':q.classList.contains('got')?'got':'prog',
          progress:q.querySelector('.qtx .mono, .ui03-qstat span')?.textContent,
          claim:!!q.querySelector('button[data-qclaim]')};
      };
      const chest=host.querySelector('.chest, .ui03-hero'),btn=chest?.querySelector('[data-qchest]');
      return {
        title:host.querySelector('h2, .ui03-brand-copy strong')?.textContent,
        questCount:quests.length,
        shop:quest('3 покупки или 5 боёв кампании'),
        craft:quest('Собрать предмет или провести 10 боёв'),
        lvl:quest('3 повышения уровня или 3 боя Хроник'),
        chest: { ready:!!chest?.classList.contains('ready'),
          opened:!!chest?.classList.contains('opened'),
          disabled:!!btn?.disabled, text:btn?.textContent,
          progress:chest?.querySelector('.chtx .mono, .ui03-progressline b')?.textContent },
      };
    };
    const initialBalances=balances();
    run('S.daily={d:todayKey(),c:{},got:{},chest:false};renderDaily()');
    const fresh=read();
    run('S.daily.c={camp:10,chron:3};renderDaily()');
    const goals=read();
    run('S.daily.got=Object.fromEntries(["login","water","camp","chron","shop","raid","ult"].map(k=>[k,true]));renderDaily()');
    const ready=read();
    run('S.daily.chest=true;renderDaily()');
    const claimed=read();
    return {fresh,goals,ready,claimed,
      noRewardsFromRender:initialBalances===balances(),
      writer:run('start.writerLifecycle().writer.status')};
  });
  assert.equal(output.writer,'owned');
  assert.equal(output.noRewardsFromRender,true,'daily rendering must not award resources');
  assert.match(output.fresh.title,/^(Ежедневные задания|Задания дня)$/);
  assert.equal(output.fresh.questCount,9,'level-60 legacy save hides skill daily only');
  assert.deepEqual(output.fresh.shop,{state:'prog',progress:'0/3 или 0/5',claim:false});
  assert.deepEqual(output.fresh.craft,{state:'prog',progress:'0/1 или 0/10',claim:false});
  assert.deepEqual(output.fresh.lvl,{state:'prog',progress:'0/3 или 0/3',claim:false});
  assert.equal(output.fresh.chest.disabled,true);
  for(const key of ['shop','craft','lvl']) {
    assert.equal(output.goals[key].state,'done',key+' OR goal must unlock');
    assert.equal(output.goals[key].claim,true,key+' must render reward claim button');
  }
  assert.equal(output.goals.shop.progress,'0/3 или 5/5',
    'alternative progress must not exceed requirement');
  assert.equal(output.goals.craft.progress,'0/1 или 10/10');
  assert.equal(output.goals.lvl.progress,'0/3 или 3/3');
  assert.equal(output.ready.chest.ready,true);
  assert.equal(output.ready.chest.disabled,false);
  assert.match(output.ready.chest.progress,/7\s*\/\s*7/);
  assert.equal(output.claimed.chest.opened,true);
  assert.equal(output.claimed.chest.disabled,true);
  assert.match(output.claimed.chest.text,/Получено/);
  assert.deepEqual(errors,[],'uncaught browser errors');
  console.log('PASS ECON-01 daily DOM:',html,'v1+native writer, OR progress, claims and chest state');
} finally {
  if(browser) await browser.close();
  await server.close();
}
