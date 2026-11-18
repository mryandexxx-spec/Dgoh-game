// ARCH-01C5a-A5: real browser side-by-side, v134 and virtual UI Conquest bootstrap.
// No runtime/source/artefact writes; all state changes are isolated in fresh test tabs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {serve} from '../lib/serve.mjs';
import {DEV,makeBundles,fillAssetMap} from './arch01c5a-a5-virtual-bootstrap.mjs';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core');
const chrome=process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'A5 real Chrome required; no mock fallback');
const root=path.join(DEV,'dist/pwa'),unmin=fs.readFileSync(path.join(DEV,'dist/app.unmin.js'),'utf8');
assert.ok(fs.existsSync(path.join(root,'index.html')));
const b=await makeBundles();
assert.equal(b.order.moved,47);
const scripts={baseline:fillAssetMap(b.base.code,unmin),candidate:fillAssetMap(b.virtual.code,unmin)};
const warm=fs.readFileSync(path.join(DEV,'tests/fixtures/saves/03-late.json'),'utf8');
assert.equal(JSON.parse(warm).v,1);
const srv=await serve(root);
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:[
 '--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',
 '--ignore-gpu-blocklist','--disable-background-networking']});
const pause=n=>new Promise(r=>setTimeout(r,n));
const view={
 cold:{width:844,height:390,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true},
 warm:{width:667,height:375,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true}
};
const phaseQueue=String.raw`(()=>{
 const before={sectorCount:CQ_SECT.length,disks:Object.keys(CQ_DISKS).length,
   stateKeys:Object.keys(S).length,week:cqWeek(),celebrations:CELEB.length};
 const bumped=cqBump('win',0,1);
 const realNotes=NOTES.filter(n=>n.kind==='cqf').length;
 renderNotes();
 const note={exists:!!document.querySelector('#notes'),
   hidden:!!document.querySelector('#notes')?.hidden,
   text:(document.querySelector('#notes')?.textContent||'').includes('Джихада')};
 CELEB.push({type:'star',id:'paul',from:2,to:3,pw0:100});
 CELEB.push({type:'unlock',id:'paul'});
 showCeleb();
 const star={present:!!document.querySelector('#celeb.star'),
   text:(document.querySelector('#celeb')?.textContent||'').includes('Звёздность повышена'),
   queued:CELEB.length,notesHidden:!!document.querySelector('#notes')?.hidden};
 const closed=celebClick({celebok:1});
 return{before,bump:bumped.map(x=>({key:x.F.key,v:x.v,need:x.F.need})),realNotes,note,star,closed};
})()`;
const phaseClose=String.raw`(()=>{
 const unlock={present:!!document.querySelector('#celeb.unlock'),
   text:(document.querySelector('#celeb')?.textContent||'').includes('Новый герой'),
   queued:CELEB.length,notesHidden:!!document.querySelector('#notes')?.hidden};
 const closed=celebClick({celebok:1});
 return {unlock,closed};
})()`;
const phaseNotes=String.raw`(()=>({
  queue:CELEB.length,celebGone:!document.querySelector('#celeb'),
  conqNoteCount:NOTES.filter(x=>x.kind==='cqf').length,
  notesVisible:!document.querySelector('#notes')?.hidden
}))()`;
const phaseWeekly=String.raw`(()=>{
 S.cqUnlock={...S.cqUnlock,easy:'a5-permanent-unlock'};
 const c=cq();const wk=cqWeek();
 S.conq={...c,wk:'Mon Jan 05 2026',stars:4321,pts:876,
   done:{'0-0-0':1},route:{0:{chosen:1}},diff:'hard'};
 const reset=cq();persist0();
 const disk=loadSave();
 return {wk,resetWeek:reset.wk,stars:reset.stars,pts:reset.pts,
   done:Object.keys(reset.done).length,route:Object.keys(reset.route).length,
   unlock:S.cqUnlock.easy,savedUnlock:disk.cqUnlock.easy,
   savedWeek:disk.conq.wk};
})()`;
const phaseRestored=String.raw`(()=>{
 const c=cq();return {wk:c.wk,stars:c.stars,pts:c.pts,
   done:Object.keys(c.done).length,route:Object.keys(c.route).length,
   permanent:S.cqUnlock.easy,stored:loadSave()?.cqUnlock?.easy};
})()`;
const phase3d=String.raw`(async()=>{
 const assetsBefore=Object.keys(MODEL_DATA).length;
 const loaded=await loadB3();
 const keys=Object.keys(MODEL_DATA).sort();
 return {assetsBefore,loaded,has3d:HAS3D,globalB3:!!globalThis.__B3,
   keys,hasDuncan:!!MODEL_DATA.duncan,hasWorm:!!MODEL_DATA.worm,
   engines:(globalThis.__B3?.EngineStore?.Instances||[]).filter(x=>!x.isDisposed).length};
})()`;
const record=[];
async function run(mode,kind){
 const page=await browser.newPage();
 const errors=[],consoleErrors=[],requests={app:0,b3:0,model:0,anim:0};
 await page.setViewport(view[kind]);
 page.on('pageerror',e=>errors.push(e.message.slice(0,300)));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,150));});
 await page.evaluateOnNewDocument(save=>{
  try{
   // Initialize once per new tab, never wipe the persist0 result on reload.
   if(sessionStorage.getItem('__a5_initialized')!=='1'){
    localStorage.clear();
    if(save)localStorage.setItem('dune-goh-v1',save);
    localStorage.setItem('dune-cine-off','true');
    sessionStorage.setItem('__a5_initialized','1');
   }
  }catch(e){}
  try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});}catch(e){}
  window.__A5={marks:[]};
  window.__A5_MARK=n=>window.__A5.marks.push(n);
 },kind==='warm'?warm:'');
 await page.setRequestInterception(true);
 page.on('request',r=>{
  const f=new URL(r.url()).pathname.slice(1);
  if(f==='app.js'){
   requests.app++;
   return r.respond({status:200,contentType:'text/javascript; charset=utf-8',
    body:scripts[mode],headers:{'cache-control':'no-store'}});
  }
  if(f==='babylon3d.js')requests.b3++;
  if(f.includes('.dgm'))requests.model++;
  if(f.startsWith('anim/'))requests.anim++;
  return /^http:\/\/127\.0\.0\.1:/.test(r.url())||/^(data|blob):/.test(r.url())?
    r.continue():r.abort();
 });
 try{
  await page.goto(srv.url('index.html'),{waitUntil:'load',timeout:75000});
  await page.waitForFunction(()=>(0,eval)('typeof cq==="function"&&typeof S!=="undefined"&&!!S'),
   {timeout:45000,polling:100});
  const ev=async t=>page.evaluate(s=>(0,eval)(s),t);
  const queue=await ev(phaseQueue);
  // The original CELEB queue waits for a 50ms UI timer and can be delayed
  // by 3D/camp startup in real headless mobile Chromium. Don't race the timer.
  await page.waitForFunction(()=>!!document.querySelector('#celeb.unlock'),
   {timeout:6000,polling:50}).catch(()=>{});
  const close=await ev(phaseClose);
  await page.waitForFunction(()=>
    !document.querySelector('#celeb') &&
    (0,eval)('typeof CELEB!=="undefined" && CELEB.length===0'),
   {timeout:3500,polling:50}).catch(()=>{});
  const notes=await ev(phaseNotes);
  const weekly=await ev(phaseWeekly);
  await page.reload({waitUntil:'load',timeout:75000});
  await page.waitForFunction(()=>(0,eval)('typeof cq==="function"&&typeof S!=="undefined"&&!!S'),
   {timeout:45000,polling:100});
  const restored=await ev(phaseRestored);
  const three=await ev(phase3d);
  return{queue,close,notes,weekly,restored,three,requests,errors,
   consoleErrors:consoleErrors.slice(0,6)};
 }catch(e){return{fatal:String(e).slice(0,450),errors,requests,
  consoleErrors:consoleErrors.slice(0,6)};}
 finally{await page.close();}
}
function stable(x){if(x.fatal)return x;return{
 queue:x.queue,close:x.close,notes:x.notes,
 weekly:x.weekly,restored:x.restored,three:x.three,requests:x.requests
};}
try{
 for(const kind of ['cold','warm']){
  const baseline=await run('baseline',kind);
  const candidate=await run('candidate',kind);
  const equal=JSON.stringify(stable(baseline))===JSON.stringify(stable(candidate));
  record.push({kind,baseline,candidate,equal});
  console.log('ARCH-01C5a-A5 REAL '+JSON.stringify({kind,equal,
   baseline:stable(baseline),candidate:stable(candidate),
   baselineErrors:baseline.errors,candidateErrors:candidate.errors,
   baselineFatal:baseline.fatal||null,candidateFatal:candidate.fatal||null}));
  // Sanity gates confirm ACTUAL positive flows, not fake no-op API probes.
  assert.ok(!baseline.fatal,kind+' original v134 must execute live scenarios');
  assert.equal(baseline.requests.app,2,'both original loads must use real injected JS');
  assert.ok(baseline.queue.bump.length>=1&&baseline.queue.realNotes>=1,
    'real Conquest win must generate nonempty cqf NOTES');
  assert.ok(baseline.queue.star.present&&baseline.queue.star.text&&baseline.queue.star.queued===1,
    'actual star overlay must be shown with unlock queued');
  assert.ok(baseline.close.unlock.present&&baseline.close.unlock.text,
    'second queued unlock overlay must render in original v134');
  assert.ok(baseline.notes.queue===0&&baseline.notes.celebGone,
    'actual star and unlock queue must drain');
  assert.ok(baseline.weekly.resetWeek===baseline.weekly.wk&&
    baseline.weekly.stars===0&&baseline.weekly.done===0&&
    baseline.weekly.unlock==='a5-permanent-unlock'&&
    baseline.weekly.savedUnlock==='a5-permanent-unlock',
    'weekly rollover must reset only weekly progress, not permanent unlock');
  assert.equal(baseline.restored.stored,'a5-permanent-unlock',
    'real page reload and save hydration must preserve account unlock');
  assert.ok(baseline.requests.b3>=1&&baseline.requests.model>=1,
    'loadB3 must fetch actual Babylon chunk and named DGM model assets');
  assert.ok(baseline.three.loaded&&baseline.three.hasDuncan&&baseline.three.globalB3,
    'loadB3 must decode real mesh model data, not just install a hook');
 }
 console.log('ARCH-01C5a-A5 DECISION '+JSON.stringify({
  main:'b3d65303130dbd385caaac299f1f2dfc0473cd8c',
  scenarios:record.map(x=>({kind:x.kind,equal:x.equal,
   reference3d:x.baseline.three?.loaded,virtual3d:x.candidate.three?.loaded,
   candidateFatal:x.candidate.fatal||null,candidatePageErrors:x.candidate.errors})),
  candidateParity:record.every(x=>x.equal&&!x.candidate.fatal),
  movedESM:47,realImplementationGO:false,gameSourcesWritten:false,
  remainingSourceDebts:2,physicalSafariVerified:false
 }));
}finally{await browser.close();await srv.close();}
