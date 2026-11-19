// ARCH-01C5a-B1: real production PWA / real input, real CELEB and NOTES interactions.
// No in-memory replacement: tests the current built B1 source, never the A5 virtual candidate.
// SW/offline/standalone and 3-cycle EngineHost remain covered by separate mandatory jobs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {serve} from '../lib/serve.mjs';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core');
const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const PWA=path.join(DEV,'dist/pwa');
const chrome=process.env.CHROME_PATH ||
 ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'real Chromium browser required; no emulator or stub fallback');
assert.ok(fs.existsSync(path.join(PWA,'app.js'))&&fs.existsSync(path.join(PWA,'index.html')));
const warm=fs.readFileSync(path.join(DEV,'tests/fixtures/saves/03-late.json'),'utf8');
assert.equal(JSON.parse(warm).v,1,'historical late-save fixture must be authentic');
const srv=await serve(PWA);
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:[
 '--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',
 '--ignore-gpu-blocklist','--disable-background-networking']});
const profiles={
 cold:{width:844,height:390,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true},
 warm:{width:667,height:375,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true},
};
const phaseQueue="(()=>{ const before={sectors:CQ_SECT.length,disks:Object.keys(CQ_DISKS).length};"+
 "const changed=cqBump('win',0,1);const cqf=NOTES.filter(n=>n.kind==='cqf');"+
 "CELEB.push({type:'star',id:'paul',from:2,to:3,pw0:100});"+
 "CELEB.push({type:'unlock',id:'paul'});showCeleb();renderNotes();"+
 "return {before,changed:changed.map(x=>x.F.key),count:cqf.length,"+
 "star:!!document.querySelector('#celeb.star'),"+
 "notesHidden:!!document.querySelector('#notes')?.hidden,queued:CELEB.length};})()";
const phaseUnlock="(()=>{renderNotes();return {shown:!!document.querySelector('#celeb.unlock'),"+
 "hasName:(document.querySelector('#celeb')?.textContent||'').includes('Новый герой'),"+
 "notesHidden:!!document.querySelector('#notes')?.hidden,queued:CELEB.length};})()";
const phaseNotes="(()=>{closeInfo(true);closeOverlay();renderNotes();"+
 "const n=document.querySelector('#notes');"+
 "return {eligible:!BT?.B&&!document.querySelector('#celeb')&&!document.querySelector('#lvlup')"+
 "&&!document.querySelector('#rwwin')&&!document.querySelector('#overlay').innerHTML.trim()"+
 "&&!document.querySelector('#overlay2').innerHTML.trim(),"+
 "visible:!!n&&!n.hidden,count:document.querySelectorAll('#notes .nt').length,"+
 "queue:NOTES.filter(x=>x.kind==='cqf').length,celebQueue:CELEB.length};})()";
const phaseWeek="(()=>{S.cqUnlock={...S.cqUnlock,easy:'b1-permanent-unlock'};"+
 "const c=cq();const wk=cqWeek();S.conq={...c,wk:'Mon Jan 05 2026',"+
 "stars:4321,pts:876,done:{'0-0-0':1},route:{0:{chosen:1}},diff:'hard'};"+
 "const reset=cq();persist0();const disk=loadSave();"+
 "return {wk,resetWeek:reset.wk,stars:reset.stars,pts:reset.pts,"+
 "done:Object.keys(reset.done).length,route:Object.keys(reset.route).length,"+
 "unlock:S.cqUnlock.easy,savedUnlock:disk.cqUnlock.easy,savedWeek:disk.conq.wk};})()";
const phaseRestored="(()=>{const c=cq();return {week:c.wk,stars:c.stars,"+
 "unlock:S.cqUnlock?.easy,saved:loadSave()?.cqUnlock?.easy};})()";
const phase3d="(async()=>{const registered=B3_PRE.filter(fn=>fn===loadAssets3).length;"+
 "const loaded=await loadB3();const names=Object.keys(MODEL_DATA).sort();"+
 "return{registered,loaded,has3d:HAS3D,globalB3:!!globalThis.__B3,"+
 "duncan:!!MODEL_DATA.duncan,worm:!!MODEL_DATA.worm,names,"+
 "liveEngines:(globalThis.__B3?.EngineStore?.Instances||[]).filter(x=>!x.isDisposed).length};})()";
async function scenario(kind){
 const page=await browser.newPage();
 const requests={app:0,babylon:0,dgm:0},errors=[],consoleErrors=[];
 page.on('pageerror',e=>errors.push(String(e).slice(0,350)));
 page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text().slice(0,240));});
 await page.setViewport(profiles[kind]);
 await page.evaluateOnNewDocument(save=>{
  try{
   if(sessionStorage.getItem('__arch01c5b1_initialized')!=='1'){
    localStorage.clear();
    if(save)localStorage.setItem('dune-goh-v1',save);
    localStorage.setItem('dune-cine-off','true');
    sessionStorage.setItem('__arch01c5b1_initialized','1');
   }
  }catch(e){}
  // SW is covered separately: keep this real-browser source-order probe isolated.
  try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});}catch(e){}
 },kind==='warm'?warm:'');
 await page.setRequestInterception(true);
 page.on('request',request=>{
  const url=request.url(),file=new URL(url).pathname.slice(1);
  if(file==='app.js')requests.app++;
  if(file==='babylon3d.js')requests.babylon++;
  if(file.includes('.dgm'))requests.dgm++;
  if(/^http:\/\/127\.0\.0\.1:/.test(url)||/^(data|blob):/.test(url))request.continue();
  else request.abort();
 });
 const ev=s=>page.evaluate(code=>(0,eval)(code),s);
 try{
  await page.goto(srv.url('index.html'),{waitUntil:'load',timeout:75000});
  await page.bringToFront();
  await page.waitForFunction(() => {
    const phase=(0,eval)('start.writerLifecycle()');
    return phase.armed && !phase.blocked &&
      phase.reason==='active' && phase.writer.status==='owned' &&
      (0,eval)('typeof cq==="function" && typeof S!=="undefined" && !!S');
  }, {timeout:45000,polling:100});
  const queue=await ev(phaseQueue);
  assert.equal(queue.before.sectors,5);
  assert.equal(queue.before.disks,23);
  assert.ok(queue.changed.length>=1&&queue.count>=1,'actual cqBump must create Conquest NOTES');
  assert.ok(queue.star&&queue.queued===1&&queue.notesHidden,'STAR must hide eligible notes');
  await page.focus('#celeb.star [data-celebok="1"]');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!!document.querySelector('#celeb.unlock'),
   {timeout:8000,polling:50});
  const unlock=await ev(phaseUnlock);
  assert.ok(unlock.shown&&unlock.hasName&&unlock.notesHidden,'UNLOCK follows STAR and suppresses notes');
  await page.focus('#celeb.unlock [data-celebok="1"]');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>
   !document.querySelector('#celeb') &&
   (0,eval)('typeof CELEB!=="undefined" && CELEB.length===0'),
   {timeout:8000,polling:50});
  const notes=await ev(phaseNotes);
  assert.ok(notes.eligible&&notes.visible&&notes.count>0&&notes.queue>0,
   'genuine Conquest notes MUST be visible once real overlays have been closed');
  const weekly=await ev(phaseWeek);
  assert.ok(weekly.wk===weekly.resetWeek&&weekly.stars===0&&weekly.pts===0&&
   weekly.done===0&&weekly.route===0&&weekly.savedUnlock==='b1-permanent-unlock',
   'weekly reset must preserve permanent unlock and persist correctly');
  await page.reload({waitUntil:'load',timeout:75000});
  await page.bringToFront();
  await page.waitForFunction(() => {
    const phase=(0,eval)('start.writerLifecycle()');
    return phase.armed && !phase.blocked &&
      phase.reason==='active' && phase.writer.status==='owned' &&
      (0,eval)('typeof cq==="function" && typeof S!=="undefined" && !!S');
  }, {timeout:45000,polling:100});
  const restored=await ev(phaseRestored);
  assert.equal(restored.saved,'b1-permanent-unlock');
  assert.equal(restored.unlock,'b1-permanent-unlock');
  const three=await ev(phase3d);
  assert.equal(three.registered,1,'cold/warm B1 must register exactly one loadAssets3 callback in B3_PRE');
  assert.ok(three.loaded&&three.has3d&&three.globalB3&&three.duncan&&three.worm,
   'actual Babylon + DGM decoded, no callback-only success');
  for(const name of ['baron','baron_legend','duncan','muaddib','worm'])
   assert.ok(three.names.includes(name),'5 authentic decoded DGM '+name);
  assert.equal(requests.app,2);
  assert.ok(requests.babylon>=1&&requests.dgm>=5);
  assert.deepEqual(errors,[],'zero page errors/TDZ in real B1 browser');
  console.log('ARCH-01C5a-B1 REAL CHROME '+JSON.stringify({
   kind,queue,unlock,notes,weekly,restored,three,requests,pageerrors:errors,
   consoleErrors:consoleErrors.slice(0,3),builtSource:true,physicalSafariVerified:false
  }));
 }finally{await page.close();}
}
try{await scenario('cold');await scenario('warm');}
finally{await browser.close();await srv.close();}
