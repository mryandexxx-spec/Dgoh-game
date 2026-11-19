// ARCH-02C-B3-B2-A2 — REAL Chromium user-confirmed import & recovery proof.
// Two genuine same-origin pages, browser-native Web Locks and localStorage,
// actual compiled PWA and DOM; never a simulated lock manager. Default-gated.
// Old cached v140 clients remain uncooperative/UNSAFE; Safari still pending.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../lib/serve.mjs';

const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core');
const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fixture=fs.readFileSync(path.join(DEV,'tests/fixtures/saves/01-legacy-v1.json'),'utf8');
const KEY='dune-goh-v1',BACKUP=KEY+'.backup';
const chrome=process.env.CHROME_PATH ||
  ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'real native Chromium is REQUIRED; no mock fallback');
const server=await serve(path.join(DEV,'dist/pwa'));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:[
  '--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--disable-background-networking','--ignore-gpu-blocklist'
]});
const pages=[],errors=[];
async function open({seed=true}={}){
  const page=await browser.newPage();pages.push(page);
  page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  await page.setViewport({width:844,height:390,deviceScaleFactor:1,
    isMobile:true,hasTouch:true,isLandscape:true});
  await page.evaluateOnNewDocument((raw,shouldSeed)=>{
    window.claude={hot:{ready(fn){window.__b3Entry=fn;},snapshot(){}}};
    try{Object.defineProperty(navigator,'serviceWorker',
      {value:undefined,configurable:true});}catch(e){}
    try{if(shouldSeed&&localStorage.getItem('dune-goh-v1')===null)
      localStorage.setItem('dune-goh-v1',raw);}catch(e){}
  },fixture,seed);
  await page.goto(server.url('index.html'),{waitUntil:'load',timeout:75000});
  await page.waitForFunction(()=>typeof window.__b3Entry==='function',
    {timeout:25000,polling:50});
  return page;
}
const start=page=>page.evaluate(()=>window.__b3Entry({}));
const phase=page=>page.evaluate(()=>window.__b3Entry.writerLifecycle());
const get=(page,key=KEY)=>page.evaluate(k=>localStorage.getItem(k),key);
const evaluate=(page,code)=>page.evaluate(source=>(0,eval)(source),code);
const release=page=>evaluate(page,'loadSave.writer.release()');
try{
  const a=await open(),denied=await open();
  assert.equal(await a.evaluate(()=>typeof navigator.locks?.request),'function');
  assert.equal((await start(a)).status,'started');
  assert.equal((await start(denied)).status,'busy');
  assert.equal((await phase(denied)).blocked,true);
  const before=await get(a),base=JSON.parse(before).solari;
  const candidate={...JSON.parse(fixture),solari:base+1234};
  // Inspect/confirm through the real source-built UI and event function,
  // NOT an under-the-hood direct checkpoint call.
  const preview=await a.evaluate(c=>{
    metaClick({saveimp:1});
    const field=document.querySelector('#savecode');
    if(!field)throw new Error('missing import textarea');
    field.value=btoa(unescape(encodeURIComponent(JSON.stringify(c))));
    metaClick({saveload:1});
    return {text:document.querySelector('#overlay2').textContent,
      hasConfirm:!!document.querySelector('[data-saveconfirm]')};
  },candidate);
  assert.equal(preview.hasConfirm,true,'B2 preview requires an explicit confirm');
  assert.equal(await get(a),before,'import preview must not write any bytes');
  await a.evaluate(()=>metaClick({saveconfirm:1}));
  const imported=await get(a);
  assert.equal(JSON.parse(imported).solari,candidate.solari);
  assert.equal(JSON.parse(await get(a,BACKUP)).raw,before);
  assert.equal((await phase(a)).blocked,true,
    'verified import must block all old-RAM gameplay input');
  assert.equal((await evaluate(a,'S.solari += 99; persist0()')).status,'session-stale');
  assert.equal(await get(a),imported);
  assert.equal((await start(denied)).status,'session-blocked',
    'previously denied tab cannot restart with stale S');
  const fresh=await open({seed:false});
  assert.equal((await start(fresh)).status,'started');
  assert.equal(await evaluate(fresh,'S.solari'),candidate.solari);
  console.log('[B3-B2-A2 real Chromium] two-page import + denied tab + fresh reload: PASS');

  // Prepare a verified prior checkpoint under the actual writer, then induce
  // a corrupt primary in TEST HARNESS ONLY. No game API is allowed to do this.
  const good=await get(fresh);
  assert.equal((await evaluate(fresh,'S.solari += 22; persist0()')).ok,true);
  assert.equal(JSON.parse(await get(fresh,BACKUP)).raw,good);
  await fresh.evaluate(()=>window.dispatchEvent(
    new PageTransitionEvent('pagehide',{persisted:false})));
  await fresh.evaluate(()=>localStorage.setItem('dune-goh-v1','{CORRUPTED'));
  const damaged=await open({seed:false});
  assert.equal((await start(damaged)).status,'corrupt');
  assert.equal(await get(damaged),'{CORRUPTED');
  assert.equal(await evaluate(damaged,'S === undefined'),true);
  assert.equal(await damaged.evaluate(()=>
    !!document.getElementById('save-recover-prepare')),true);
  assert.equal(await damaged.evaluate(()=>
    document.getElementById('save-recover-confirm').hidden),true);
  // Only click 1 may acquire and inspect. The original raw must persist
  // unchanged until click 2.
  await damaged.evaluate(()=>document.getElementById('save-recover-prepare').click());
  await damaged.waitForFunction(()=>{
    const el=document.getElementById('save-recover-confirm');
    return el && !el.hidden;
  },{timeout:10000,polling:50});
  assert.equal(await get(damaged),'{CORRUPTED');
  const previewText=await damaged.evaluate(()=>
    document.getElementById('save-recover-preview').textContent);
  assert.match(previewText,/ПРЕДЫДУЩАЯ копия v1/);
  // Genuine browser-native lock cannot be acquired by another same-origin
  // page while the UI is awaiting user approval.
  const outsiderObtained=await denied.evaluate(async name=>
    navigator.locks.request(name,{mode:'exclusive',ifAvailable:true},lock=>!!lock),
    KEY+'.writer');
  assert.equal(outsiderObtained,false,
    'native recovery-only lease must exclude a second browser page');
  await damaged.evaluate(()=>document.getElementById('save-recover-confirm').click());
  await damaged.waitForFunction(()=>document.getElementById('save-writer-title')
    ?.textContent.includes('Резервная копия восстановлена'),
    {timeout:10000,polling:50});
  assert.equal(await get(damaged),good);
  assert.equal(await evaluate(damaged,'S === undefined'),true);
  assert.equal((await evaluate(damaged,'persist0()')).status,'session-stale');
  console.log('[B3-B2-A2 real Chromium] corrupt primary + under-lease two-click restore: PASS');

  // Restore is not an in-place game reload. A fresh JS heap must read the
  // restored bytes under a NEW native lock.
  const restored=await open({seed:false});
  assert.equal((await start(restored)).status,'started');
  assert.equal(await evaluate(restored,'S.solari'),JSON.parse(good).solari);
  assert.equal(await get(restored),good);
  console.log('[B3-B2-A2 real Chromium] restored progress cold-boot readback: PASS');

  // A second recovery preview interrupted by a genuine pagehide must
  // immediately relinquish the lock and preserve damaged storage bytes.
  await restored.evaluate(()=>window.dispatchEvent(
    new PageTransitionEvent('pagehide',{persisted:true})));
  await restored.evaluate(()=>localStorage.setItem('dune-goh-v1','{SECOND-DAMAGE'));
  const interrupted=await open({seed:false});
  // A native recovery UI is intentionally disabled in a background tab.
  // Puppeteer's newPage() does not guarantee foreground visibility after
  // several same-origin tabs: explicitly focus the intended recovery owner.
  await interrupted.bringToFront();
  assert.equal(await interrupted.evaluate(()=>document.visibilityState),'visible',
    'the recovery test must exercise a foreground user action');
  assert.equal((await start(interrupted)).status,'corrupt');
  await interrupted.evaluate(()=>
    document.getElementById('save-recover-prepare').click());
  // A failed preview is NOT a pass: report its actionable reason instead
  // of hiding a Web Locks/storage/lifecycle bug behind a generic timeout.
  await interrupted.waitForFunction(()=>{
    const confirm=document.getElementById('save-recover-confirm');
    const message=document.getElementById('save-recover-status');
    return (confirm && !confirm.hidden) ||
      (message && /недоступно|прервана|Перезагрузите страницу/.test(
        message.textContent));
  },{timeout:10000,polling:50});
  const interruptedStatus=await interrupted.evaluate(()=>({
    visible:!document.getElementById('save-recover-confirm')?.hidden,
    message:document.getElementById('save-recover-status')?.textContent,
    phase:window.__b3Entry.writerLifecycle(),
    storage:{primary:localStorage.getItem('dune-goh-v1'),
      backupPresent:localStorage.getItem('dune-goh-v1.backup')!==null}
  }));
  assert.equal(interruptedStatus.visible,true,
    'recovery preview must own native lease: '+JSON.stringify(interruptedStatus));
  await interrupted.evaluate(()=>window.dispatchEvent(
    new PageTransitionEvent('pagehide',{persisted:true})));
  assert.equal((await phase(interrupted)).reason,'pagehide');
  assert.equal(await get(interrupted),'{SECOND-DAMAGE');
  assert.equal(await denied.evaluate(async name=>
    navigator.locks.request(name,{mode:'exclusive',ifAvailable:true},lock=>!!lock),
    KEY+'.writer'),true);
  console.log('[B3-B2-A2 real Chromium] interrupted recovery releases native lock: PASS');
  assert.deepEqual(errors,[],'no uncaught errors in actual browser tabs');
  console.log('[ARCH-02C-B3-B2-A2] REAL Chromium native multi-tab UX PASS; opt-in only, Safari pending');
} finally {
  await Promise.allSettled(pages.map(p=>p.close()));
  await browser.close();
  await server.close();
}
