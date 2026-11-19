// ARCH-02C-B3-B1c-B3 — REAL native Chromium, unflagged AUTOMATIC PWA boot.
// No host.hot.ready interception, no preview flag, no mocked lock manager.
// This is not Safari/iOS PWA or a test of old cached v140.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../lib/serve.mjs';

const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core');
const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const PWA=path.join(DEV,'dist/pwa'),KEY='dune-goh-v1',BACKUP=KEY+'.backup';
const seed=fs.readFileSync(path.join(DEV,'tests/fixtures/saves/01-legacy-v1.json'),'utf8');
const chrome=process.env.CHROME_PATH ||
  ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'native Chromium is REQUIRED; never silently mock');
const server=await serve(PWA);
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:[
  '--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--disable-background-networking','--ignore-gpu-blocklist'
]});
const pages=[],errors=[];
async function open({withoutLocks=false}={}){
  const page=await browser.newPage();
  pages.push(page);
  page.on('pageerror',e=>errors.push(String(e).slice(0,350)));
  await page.setViewport({width:844,height:390,deviceScaleFactor:1,
    isMobile:true,hasTouch:true,isLandscape:true});
  await page.evaluateOnNewDocument((raw,removeLocks)=>{
    // The frozen composition root will call start() itself. No test callback.
    try {
      if(localStorage.getItem('dune-goh-v1')===null)
        localStorage.setItem('dune-goh-v1',raw);
    }catch(e){}
    window.__primaryReads=0;window.__primaryWrites=0;
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
    Storage.prototype.getItem=function(k){
      if(k==='dune-goh-v1')window.__primaryReads++;
      return get.call(this,k);
    };
    Storage.prototype.setItem=function(k,v){
      if(k==='dune-goh-v1')window.__primaryWrites++;
      return set.call(this,k,v);
    };
    try{Object.defineProperty(navigator,'serviceWorker',
      {value:undefined,configurable:true});}catch(e){}
    if(removeLocks)Object.defineProperty(navigator,'locks',
      {value:undefined,configurable:true});
  },seed,withoutLocks);
  await page.goto(server.url('index.html'),{waitUntil:'load',timeout:75000});
  await page.waitForFunction(()=>{
    try {
      const s=(0,eval)('start.writerLifecycle()');
      return s.armed && s.reason!=='acquiring';
    }catch(e){return false;}
  },{timeout:25000,polling:50});
  return page;
}
const phase=page=>page.evaluate(()=>(0,eval)('start.writerLifecycle()'));
const get=(page,key=KEY)=>page.evaluate(k=>localStorage.getItem(k),key);
const expression=(page,js)=>page.evaluate(code=>(0,eval)(code),js);
const stop=page=>page.evaluate(()=>window.dispatchEvent(
  new PageTransitionEvent('pagehide',{persisted:true})));
try {
  const a=await open();
  assert.equal(await a.evaluate(()=>typeof navigator.locks?.request),'function');
  assert.equal((await phase(a)).reason,'active',
    'genuine automatic unflagged first PWA startup must own writer');
  assert.equal((await phase(a)).writer.status,'owned');
  const before=await get(a),base=JSON.parse(before).solari;
  assert.equal((await expression(a,'S.solari+=37;persist0()')).verified,'committed');
  const confirmed=await get(a);
  assert.equal(JSON.parse(confirmed).solari,base+37);
  assert.equal(JSON.parse(await get(a,BACKUP)).raw,before);
  console.log('[B3-B1c-B3 native] automatic unflagged PWA boot + verified commit: PASS');

  const b=await open();
  const aPhase=await phase(a),bPhase=await phase(b);
  assert.equal(aPhase.reason==='active'&&bPhase.reason==='active',false,
    'two independent top-level pages must never be concurrently writable');
  const bBlocked=bPhase.reason!=='active';
  if(bBlocked){
    assert.equal(await expression(b,'S===undefined'),true,
      'denied second page may not initialize progress');
    assert.equal(await b.evaluate(()=>
      document.getElementById('save-writer-blocked')!==null),true);
  }else{
    assert.equal(aPhase.blocked,true,
      'second page may start only after the first tab retired on backgrounding');
    assert.equal(await expression(b,'S.solari'),base+37);
  }
  assert.equal(JSON.parse(await get(b)).solari,base+37,
    'real second renderer must see latest committed primary');
  if(aPhase.reason==='active')await stop(a);
  if(bPhase.reason==='active')await stop(b);
  const fresh=await open();
  assert.equal((await phase(fresh)).reason,'active');
  assert.equal(await expression(fresh,'S.solari'),base+37);
  assert.equal((await expression(fresh,'S.solari+=11;persist0()')).ok,true);
  const finalRaw=await get(fresh);
  assert.equal(JSON.parse(finalRaw).solari,base+48);
  assert.equal((await expression(a,'persist0()')).status,'session-stale');
  assert.equal(await get(fresh),finalRaw);
  console.log('[B3-B1c-B3 native] independent tab + lifecycle handoff + cold reload: PASS');

  // Real Chromium with native locks removed BEFORE automatic boot. The
  // initial fixture seed occurs before counters are installed. No reads of
  // saved progress and no writes are allowed after boot begins.
  const noLocks=await open({withoutLocks:true});
  assert.equal(await noLocks.evaluate(()=>navigator.locks===undefined),true);
  assert.equal((await phase(noLocks)).reason,'unsupported');
  assert.equal(await expression(noLocks,'S===undefined'),true);
  assert.deepEqual(await noLocks.evaluate(()=>[
    window.__primaryReads,window.__primaryWrites]),[0,0]);
  assert.equal(await noLocks.evaluate(()=>
    document.getElementById('save-writer-blocked')!==null),true);
  assert.equal(await get(noLocks),finalRaw);
  console.log('[B3-B1c-B3 native] unavailable native locks fail-closed on automatic PWA start: PASS');
  assert.deepEqual(errors,[],'no uncaught browser errors in automatic PWA boot');
  console.log('[ARCH-02C-B3-B1c-B3] REAL native automatic Chromium PASS; physical Safari and cached v140 remain STOP gates');
}finally{
  await Promise.allSettled(pages.map(p=>p.close()));
  await browser.close();
  await server.close();
}
