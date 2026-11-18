// ARCH-01C5a-A4: actual Chromium differential run of read-only virtual Conquest UI predecessor.
// Not a production refactor. Uses the exact validated PWA assets, no src file writes.
// Called only by required E3 browser CI after setup-chrome and verified build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
import { DEV, makeBundles, fillAssetMap, PROBE_MODULES } from './arch01c5a-a4-virtual-bootstrap.mjs';

const require=createRequire(import.meta.url);
const puppeteer=require('puppeteer-core');
const chromepath=process.env.CHROME_PATH ||
 ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
  .find(f=>fs.existsSync(f));
assert.ok(chromepath,'A4 browser differential must run with a real Chromium binary (no mocks)');
const unminPath=path.join(DEV,'dist/app.unmin.js');
const htmlPath=path.join(DEV,'dist/pwa/index.html');
assert.ok(fs.existsSync(unminPath),'verified dist/app.unmin.js is required');
assert.ok(fs.existsSync(htmlPath),'validated production PWA HTML is required');
const exact=fs.readFileSync(unminPath,'utf8');
const {base,virtual,order,topology}=await makeBundles();
const bundled={
 baseline:fillAssetMap(base.code,exact),
 candidate:fillAssetMap(virtual.code,exact),
};
const nameSet=new Set(PROBE_MODULES);
assert.ok(nameSet.has('assets/models.js')&&nameSet.has('ui/notifications.js'));
const late=fs.readFileSync(path.join(DEV,'tests/fixtures/saves/03-late.json'),'utf8');
JSON.parse(late);
const server=await serve(path.dirname(htmlPath));
const browser=await puppeteer.launch({
 executablePath:chromepath,headless:true,
 args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',
 '--ignore-gpu-blocklist','--disable-background-networking']
});
const cases=[
 {name:'cold-844-med',viewport:{width:844,height:390,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true},save:''},
 {name:'warm-667-low',viewport:{width:667,height:375,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true},save:late},
];
const outcomes=[];
async function probe(label,scenario){
 const page=await browser.newPage();
 const pageErrors=[],browserErrors=[],requests={app:0,failed:0};
 await page.setViewport(scenario.viewport);
 page.on('pageerror',e=>pageErrors.push(String(e.message).slice(0,350)));
 page.on('console',m=>{if(m.type()==='error')browserErrors.push(m.text().slice(0,350));});
 page.on('requestfailed',r=>{
  if(/\/app\.js(?:\?|$)/.test(r.url()))requests.failed++;
 });
 await page.evaluateOnNewDocument(save=>{
  const T=globalThis.__A4={
   marks:[],listeners:{},observers:[],intervals:0,
   events:[],time:performance.now()
  };
  globalThis.__A4_MARK=name=>T.marks.push({name,t:Math.round(performance.now()-T.time)});
  try{localStorage.clear();if(save)localStorage.setItem('dune-goh-v1',save);
   localStorage.setItem('dune-cine-off','true');}catch(e){T.events.push('storage:'+e.message);}
  try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});}catch(e){}
  const add=document.addEventListener;
  document.addEventListener=function(type,...rest){
   T.listeners[type]=(T.listeners[type]||0)+1;
   return add.call(this,type,...rest);
  };
  const observe=MutationObserver.prototype.observe;
  MutationObserver.prototype.observe=function(target,options){
   T.observers.push({target:target===document.body?'body':target===document?'document':
    target?.nodeName||'unknown',childList:!!options?.childList,subtree:!!options?.subtree});
   return observe.apply(this,arguments);
  };
  const interval=globalThis.setInterval;
  globalThis.setInterval=function(...a){T.intervals++;return interval.apply(this,a);};
 },scenario.save);
 await page.setRequestInterception(true);
 page.on('request',r=>{
  if(new URL(r.url()).pathname==='/app.js'){
   requests.app++;
   return r.respond({status:200,contentType:'text/javascript; charset=utf-8',
    body:bundled[label],headers:{'cache-control':'no-store'}});
  }
  if(/^http:\/\/127\.0\.0\.1:/.test(r.url())||/^(data|blob):/.test(r.url()))return r.continue();
  return r.abort();
 });
 try{
  await page.goto(server.url('index.html'),{waitUntil:'load',timeout:75000});
  await page.waitForFunction(()=>
   (window.__A4?.marks?.length||0)>=12 &&
    !!document.body && !!document.querySelector('#view'),
   {timeout:35000,polling:100}).catch(()=>{});
  await new Promise(resolve=>setTimeout(resolve,350));
  const result=await page.evaluate(()=>{
   const get=expr=>{try{return(0,eval)(expr);}catch(e){return 'A4_EVAL_ERROR:'+e.name+':'+e.message;}};
   const before={
    view:get('typeof view === "undefined"?null:view'),
    conqSectorCount:get('typeof CQ_SECT === "undefined"?null:CQ_SECT.length'),
    conqDiskCount:get('typeof CQ_DISKS === "undefined"?null:Object.keys(CQ_DISKS).length'),
    celebrations:get('typeof CELEB === "undefined"?null:CELEB.length'),
    notes:get('typeof NOTES === "undefined"?null:NOTES.length'),
    stateKeys:get('typeof S === "undefined" || !S ? null : Object.keys(S).length'),
    conqKeys:get('typeof S === "undefined" || !S || !S.conq ? null : Object.keys(S.conq).sort().join(",")'),
    splash:!!document.querySelector('#splash'),
    viewChildren:document.querySelector('#view')?.children?.length??-1
   };
   const calls={};
   for(const [name,expr] of [
    ['notePoll','typeof notePoll === "function" ? (notePoll(true),"ok") : "missing"'],
    ['renderNotes','typeof renderNotes === "function" ? (renderNotes(),"ok") : "missing"'],
    ['showCeleb','typeof showCeleb === "function" ? (showCeleb(),"ok") : "missing"'],
    ['cqStatic','typeof cqStatic === "function" ? !!cqStatic() : "missing"'],
   ])calls[name]=get(expr);
   const T=window.__A4;
   return {before,calls,marks:T.marks.map(x=>x.name),
    markTimes:T.marks,observerInstalls:T.observers,
    eventListeners:T.listeners,intervals:T.intervals,
    emittedEvents:T.events};
  });
  return{...result,pageErrors,browserErrors:browserErrors.slice(0,6),requests};
 }catch(e){
  return{fatal:String(e).slice(0,450),pageErrors,browserErrors:browserErrors.slice(0,6),requests};
 }finally{await page.close();}
}
try{
 for(const scenario of cases){
  const baseline=await probe('baseline',scenario);
  const candidate=await probe('candidate',scenario);
  const first=(baseline.marks||[]).findIndex((v,i)=>v!==(candidate.marks||[])[i]);
  const markDelta={
   unchanged:JSON.stringify(baseline.marks||[])===JSON.stringify(candidate.marks||[]),
   firstIndex:first,baseline:(baseline.marks||[])[first]||null,
   candidate:(candidate.marks||[])[first]||null
  };
  const cmp=(k)=>JSON.stringify(baseline[k])===JSON.stringify(candidate[k]);
  const equal={
   bootState:cmp('before'),publicCalls:cmp('calls'),
   observerRegistrations:cmp('observerInstalls'),
   listeners:cmp('eventListeners'),intervals:cmp('intervals'),
   noFatal:!baseline.fatal&&!candidate.fatal,
   noTDZ:!candidate.pageErrors.some(e=>/before initialization|ReferenceError|Cannot access/.test(e))
  };
  const row={
   case:scenario.name,markDelta,equal,
   baseline:{before:baseline.before,calls:baseline.calls,
    marks:baseline.marks,observerInstalls:baseline.observerInstalls,
    pageErrors:baseline.pageErrors,browserErrors:baseline.browserErrors,
    intervalCount:baseline.intervals,listenerCounts:baseline.eventListeners,
    fatal:baseline.fatal,requests:baseline.requests},
   candidate:{before:candidate.before,calls:candidate.calls,
    marks:candidate.marks,observerInstalls:candidate.observerInstalls,
    pageErrors:candidate.pageErrors,browserErrors:candidate.browserErrors,
    intervalCount:candidate.intervals,listenerCounts:candidate.eventListeners,
    fatal:candidate.fatal,requests:candidate.requests}
  };
  outcomes.push(row);
  console.log('ARCH-01C5a-A4 BROWSER '+JSON.stringify(row));
 }
 const baselineSafe=outcomes.every(r=>
  !r.baseline.fatal && r.baseline.requests.app===1 &&
  !r.baseline.pageErrors.some(e=>/before initialization|ReferenceError|Cannot access/.test(e)) &&
  (r.baseline.marks||[]).includes('ui/notifications.js') &&
  (r.baseline.marks||[]).includes('assets/models.js')
 );
 // Baseline failure is a diagnostic blocker and must not be classified as a virtual success.
 const candidateParity=outcomes.every(r=>
  Object.values(r.equal).every(Boolean)&&r.markDelta.unchanged &&
  r.candidate.requests.app===1&&
  !r.candidate.pageErrors.length
 );
 console.log('ARCH-01C5a-A4 DECISION '+JSON.stringify({
  frozenMain:'b3d65303130dbd385caaac299f1f2dfc0473cd8c',
  codeInMemoryOnly:true,completeCases:outcomes.length,
  bestVirtualMoved:order.moved,firstMismatch:order.first,
  virtualScc:topology.scc,remainingDebt:topology.dataDebts,
  baselineSafe,candidateParity,
  baselineErrors:outcomes.map(x=>({case:x.case,errors:x.baseline.pageErrors})),
  virtualErrors:outcomes.map(x=>({case:x.case,errors:x.candidate.pageErrors})),
  immediateB1Go:false,reason:'No source refactor approved, 47 old ESM positions shifted; diagnostic parity is insufficient for release',
 }));
 assert.ok(baselineSafe,'reference v134 instrumented browser baseline must run without TDZ errors');
 assert.ok(outcomes.every(r=>r.baseline.requests.app===1&&r.candidate.requests.app===1),
  'each isolated browser session must load the intended injected script exactly once');
}finally{
 await browser.close();
 await server.close();
}
