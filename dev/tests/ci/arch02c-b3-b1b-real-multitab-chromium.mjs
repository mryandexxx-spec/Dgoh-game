// ARCH-02C-B3-B1b: REAL shared-origin Chromium multi-tab Web Locks proof.
// Native browser Web Locks, real HTTP PWA, shared storage and real DOM,
// no fake VM/lock provider. This is OPT-IN; production startup remains legacy.
// An old uncooperative client is deliberately demonstrated as UNSAFE.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from '../lib/serve.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PWA = path.join(DEV,'dist/pwa');
const fixture = fs.readFileSync(path.join(DEV,'tests/fixtures/saves/01-legacy-v1.json'),'utf8');
const chrome = process.env.CHROME_PATH ||
  ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'real Chromium must be available; no stub fallback');
assert.equal(JSON.parse(fixture).v,1);
const server = await serve(PWA);
const browser = await puppeteer.launch({executablePath:chrome,headless:true,args:[
  '--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--disable-background-networking','--ignore-gpu-blocklist'
]});
const pages=[];
const errors=[];
async function open(){
  const page=await browser.newPage();
  pages.push(page);
  page.on('pageerror',e=>errors.push(String(e).slice(0,400)));
  await page.setViewport({width:844,height:390,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
  await page.evaluateOnNewDocument(raw=>{
    // Intercept the real application composition root's optional host-ready
    // callback BEFORE app.js executes. This deliberately does not change code
    // on disk, reload the published PWA or grant a lock to legacy start().
    window.claude={hot:{ready(fn){window.__b3Entry=fn;},snapshot(){}}};
    try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});}
    catch(e){}
    try{if(localStorage.getItem('dune-goh-v1')===null)
      localStorage.setItem('dune-goh-v1',raw);}
    catch(e){}
  },fixture);
  await page.goto(server.url('index.html'),{waitUntil:'load',timeout:75000});
  await page.waitForFunction(()=>typeof window.__b3Entry==='function',
    {timeout:25000,polling:50});
  return page;
}
const evaluate=(page,code)=>page.evaluate(source=>(0,eval)(source),code);
const start=page=>page.evaluate(()=>window.__b3Entry.writer({}));
const phase=page=>page.evaluate(()=>window.__b3Entry.writerLifecycle());
const storage=page=>page.evaluate(()=>localStorage.getItem('dune-goh-v1'));
try{
  const a=await open(),b=await open();
  assert.equal(await a.evaluate(()=>typeof navigator.locks?.request),'function',
    'native Web Locks API required in real Chromium');
  assert.equal((await start(a)).status,'started');
  assert.equal((await phase(a)).blocked,false);
  assert.equal((await start(b)).status,'busy');
  assert.equal((await phase(b)).blocked,true);
  assert.equal(await b.evaluate(()=>document.getElementById('save-writer-blocked')!==null),true);
  assert.equal(await evaluate(b,'S === undefined'),true);
  const base=JSON.parse(await storage(a)).solari;
  const confirmed=await evaluate(a,'S.solari += 100; persist0()');
  assert.equal(confirmed.ok,true);
  assert.equal(confirmed.verified,'committed');
  // Native Web Locks serialize cooperating writers, but storage cache/event
  // propagation across actual Chromium renderer processes is asynchronous.
  // Assert acknowledged bytes in owner immediately; require OBSERVABLE
  // convergence in a second actual page before claiming shared-origin proof.
  assert.equal(JSON.parse(await storage(a)).solari,base+100,
    'writer acknowledged bytes must match its own verified primary');
  await b.waitForFunction(expected=>{
    const raw=localStorage.getItem('dune-goh-v1');
    if (!raw) return false;
    try { return JSON.parse(raw).solari===expected; } catch(e) { return false; }
  },{timeout:10000,polling:50},base+100);
  assert.equal(JSON.parse(await storage(b)).solari,base+100,
    'separate page must observe the confirmed primary after propagation');
  const backup=await a.evaluate(()=>JSON.parse(localStorage.getItem('dune-goh-v1.backup')));
  assert.equal(backup.key,'dune-goh-v1');
  assert.ok(backup.raw,'verified backup must preserve previous primary');

  // Synchronous browser lifecycle event on the ACTIVE owner. Native lock is
  // released, then another actual page boots with latest confirmed bytes.
  await a.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  assert.equal((await phase(a)).blocked,true);
  assert.equal((await evaluate(a,'S.solari += 999; persist0()')).status,'session-stale');
  assert.equal(JSON.parse(await storage(a)).solari,base+100);
  const c=await open();
  const cStart=await start(c);
  assert.equal(cStart.status,'started','new real tab obtains released native lock');
  assert.equal(await evaluate(c,'S.solari'),base+100);
  assert.equal((await evaluate(c,'S.solari += 10; persist0()')).ok,true);
  assert.equal(JSON.parse(await storage(c)).solari,base+110);
  assert.equal((await start(b)).status,'session-blocked',
    'previously denied tab cannot activate stale S after lock is freed');
  console.log('[B3-B1b real Chromium] cooperative two-page exclusive writer: PASS');
  console.log('[B3-B1b real Chromium] pagehide -> release -> fresh boot +100/+10: PASS');

  // Opening a genuine browser tab backgrounds the previously active tab.
  // Its visibilitychange guard must release ownership immediately, BEFORE
  // any outsider save event. Do not mistake safe background invalidation for
  // an external-save-change notification.
  const old=await open();
  assert.equal((await phase(c)).blocked,true);
  assert.equal((await phase(c)).reason,'background-suspended',
    'real Chromium background visibility must invalidate stale owner');
  assert.equal((await evaluate(c,'S.solari += 22; persist0()')).status,'session-stale');
  await old.evaluate(()=>window.__b3Entry({})); // deliberate legacy bypass
  // Open a THIRD new opt-in owner; focus remains on this page. The old
  // uncooperative page is backgrounded but can still mutate localStorage.
  // This separate phase proves actual storage notifications to an ACTIVE,
  // otherwise unblocked Web-Locks writer, not mere background suspension.
  const active=await open();
  assert.equal((await start(active)).status,'started',
    'backgrounded c released its lock before fresh active boot');
  assert.equal((await phase(active)).blocked,false,
    'foreign write test must start with an ACTIVE nonblocked owner');
  assert.equal(await evaluate(active,'S.solari'),base+110,
    'new owner must reload most recent verified primary');
  assert.equal((await evaluate(old,'S.solari += 3; persist0()')).ok,true);
  const oldPrimary=await storage(old);
  assert.equal(JSON.parse(oldPrimary).solari,base+113,
    'legacy writer must acknowledge its actual uncoordinated primary write');
  // Require both the exact foreign bytes and explicit external-change reason.
  // Readback may lag across processes, but a missed event is NOT accepted.
  await active.waitForFunction(expected=>{
    const state=window.__b3Entry.writerLifecycle();
    return localStorage.getItem('dune-goh-v1')===expected &&
      state.blocked===true && state.reason==='external-save-change';
  },{timeout:10000,polling:50},oldPrimary);
  assert.equal(await storage(active),oldPrimary);
  assert.equal((await phase(active)).reason,'external-save-change');
  assert.equal((await evaluate(active,'S.solari += 22; persist0()')).status,'session-stale');
  assert.equal(await storage(active),oldPrimary);
  assert.equal((await evaluate(c,'persist0()')).status,'session-stale');
  console.log('[B3-B1b real Chromium] background tab safely releases writer: PASS');
  console.log('[B3-B1b real Chromium] active writer detects legacy foreign save and stops: PASS (legacy still UNSAFE)');

  // In addition to explicit pagehide, check that BFCache-style return does
  // not revive the old game heap into a new writer after c released.
  await a.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  assert.equal((await phase(a)).blocked,true);
  assert.equal((await evaluate(a,'persist0()')).status,'session-stale');
  console.log('[B3-B1b real Chromium] BFCache-style wake still blocked: PASS');
  assert.deepEqual(errors,[],'no unhandled browser exceptions in real-tab probe');
  console.log('[ARCH-02C-B3-B1b] REAL multi-page Chromium PASS; old PWA UNFENCED, Safari still needed');
} finally {
  await Promise.allSettled(pages.map(p=>p.close()));
  await browser.close();
  await server.close();
}
