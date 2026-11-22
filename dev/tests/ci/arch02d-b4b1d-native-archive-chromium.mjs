// ARCH-02D-B4b1d — browser-native archive export and additive restoration.
// Real Chromium Blob URL download, native input file, SHA-256 and Web Locks.
// Both PWA and standalone; no simulated DOM/File/crypto, no external network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../lib/serve.mjs';

const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core');
const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fixture=JSON.parse(fs.readFileSync(path.join(DEV,
 'tests/fixtures/saves/01-legacy-v1.json'),'utf8'));
const key='dune-goh-v1',backup=key+'.backup';
const chrome=process.env.CHROME_PATH ||
 ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'real Chromium required for archive import/download');
// Match the REAL browser's current local week; fixed November dates would
// auto-rotate Conquest at boot and make the archive export test misleading.
const date=new Date();
date.setHours(12,0,0,0);
const monday=new Date(date);
monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
const active=monday.toDateString();
function week(wk,points=15){return {v:2,wk,diff:'easy',
 done:{'0-0-0':1},tk:{c0:1,s0:1},route:{0:{0:'0-0-0'}},
 disks:[{k:'stam',on:1}],stars:points,pts:10,fp:{},fd:{},
 dpick:{},foe:{},sta:{},buy:{}};}
const previousWeek=new Date(monday);previousWeek.setDate(previousWeek.getDate()-7);
const weekBefore=new Date(monday);weekBefore.setDate(weekBefore.getDate()-14);
const first=week(weekBefore.toDateString());
const second=week(previousWeek.toDateString());
function save(history) {return {...fixture,conq:{v:2,wk:active,
 diff:'easy',done:{},tk:{},route:{},disks:[],sta:{},foe:{},dpick:{},
 buy:{},stars:0,pts:0,fp:{},fd:{},en:100,enTs:date.getTime(),
 weekArchive:history}};}
const source=JSON.stringify(save([first,second]));
const recipient=JSON.stringify(save([second]));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dune-conquest-history-'));
const server=await serve(path.join(DEV,'dist'));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:[
 '--no-sandbox','--disable-background-networking','--use-angle=swiftshader',
 '--enable-unsafe-swiftshader','--ignore-gpu-blocklist'
]});
const delay=ms=>new Promise(done=>setTimeout(done,ms));
async function pageFor(entry,raw) {
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewport({width:844,height:390,deviceScaleFactor:1,
   isMobile:true,hasTouch:true,isLandscape:true});
 await page.evaluateOnNewDocument(initial=>{
   window.claude={hot:{ready(fn){window.__b4dEntry=fn;},snapshot(){}}};
   try {Object.defineProperty(navigator,'serviceWorker',
     {value:undefined,configurable:true});}catch(e){}
   // Seed ONCE per tab; a cold reload must NOT overwrite the imported save.
   if(sessionStorage.getItem('__b4d_once')!=='1') {
     localStorage.setItem('dune-goh-v1',initial);
     localStorage.removeItem('dune-goh-v1.backup');
     sessionStorage.setItem('__b4d_once','1');
   }
 },raw);
 await page.goto(server.url(entry),{waitUntil:'load',timeout:75000});
 await page.waitForFunction(()=>typeof window.__b4dEntry==='function',{timeout:25000});
 assert.equal((await page.evaluate(()=>window.__b4dEntry({}))).status,'started');
 assert.equal((await page.evaluate(()=>loadSave.writer.state())).status,'owned');
 return {page,errors};
}
try {
 for(const [name,entry] of [['PWA','pwa/index.html'],['HTML','artifact.html']]) {
   const dir=path.join(tmp,name);fs.mkdirSync(dir,{recursive:true});
   const exportTab=await pageFor(entry,source);
   const before=await exportTab.page.evaluate(k=>localStorage.getItem(k),key);
   assert.ok(JSON.parse(before).conq.weekArchive.length===2);
   const cdp=await exportTab.page.target().createCDPSession();
   await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
   await exportTab.page.evaluate(()=>metaClick({cqarc:1}));
   await exportTab.page.waitForSelector('[data-cqarcdownload]',{timeout:30000});
   await exportTab.page.click('[data-cqarcdownload]');
   const filename=path.join(dir,'dune-goh-conquest-history-v1.json');
   let exists=false;
   for(let n=0;n<120;n++){
     if(fs.existsSync(filename)&&!fs.existsSync(filename+'.crdownload')){exists=true;break;}
     await delay(100);
   }
   assert.equal(exists,true,name+' browser did not download Conquest archive');
   const pkg=JSON.parse(fs.readFileSync(filename,'utf8'));
   assert.equal(pkg.format,'dune-goh-conquest-history');
   assert.deepEqual(JSON.parse(pkg.historyRaw),[first,second]);
   const manifest=JSON.stringify({format:pkg.format,version:pkg.version,
     sourceWeek:pkg.sourceWeek,count:pkg.count,historyRaw:pkg.historyRaw});
   assert.equal(pkg.sha256,createHash('sha256').update(manifest,'utf8').digest('hex'));
   assert.equal(await exportTab.page.evaluate(k=>localStorage.getItem(k),key),before,
     name+' history export unexpectedly modified primary');
   assert.deepEqual(exportTab.errors,[]);
   await exportTab.page.evaluate(()=>loadSave.writer.release());
   await cdp.detach();await exportTab.page.close();

   const tab=await pageFor(entry,recipient),previous=await tab.page.evaluate(k=>localStorage.getItem(k),key);
   await tab.page.evaluate(()=>metaClick({cqarc:1}));
   const chooser=await tab.page.$('#cqarcfile');
   assert.ok(chooser,name+' missing native Conquest archive file input');
   await chooser.uploadFile(filename);
   await tab.page.click('[data-cqarcread]');
   await tab.page.waitForFunction(()=>!!document.querySelector('[data-saveconfirm]'),
     {timeout:30000,polling:50});
   assert.equal(await tab.page.evaluate(k=>localStorage.getItem(k),key),previous,
     name+' archive preview modified primary');
   await tab.page.click('[data-saveconfirm]');
   let committed=await tab.page.evaluate(k=>localStorage.getItem(k),key);
   // Background time drifts can require a THIRD positive user confirmation.
   if(committed===previous && await tab.page.$('[data-saveconfirm]')) {
     await tab.page.click('[data-saveconfirm]');
     committed=await tab.page.evaluate(k=>localStorage.getItem(k),key);
   }
   assert.deepEqual(JSON.parse(committed).conq.weekArchive,[first,second],
     name+' archive did not restore both historical weeks');
   assert.equal(JSON.parse(committed).solari,JSON.parse(previous).solari,
     name+' history transfer changed account resources');
   assert.deepEqual(JSON.parse(committed).conq.tk,JSON.parse(previous).conq.tk,
     name+' archive transfer altered active claim tokens');
   const copy=JSON.parse(committed);
   copy.conq.weekArchive=JSON.parse(previous).conq.weekArchive;
   assert.deepEqual(copy,JSON.parse(previous),'only archive history may change');
   assert.equal(JSON.parse(await tab.page.evaluate(k=>localStorage.getItem(k),backup)).raw,
     previous,'predecessor was not safely backed up');
   assert.equal((await tab.page.evaluate(()=>loadSave.writer.state())).status,'session-stale');
   await tab.page.reload({waitUntil:'load'});
   await tab.page.waitForFunction(()=>typeof window.__b4dEntry==='function',{timeout:25000});
   assert.equal((await tab.page.evaluate(()=>window.__b4dEntry({}))).status,'started');
   assert.equal(await tab.page.evaluate(()=>S.conq.weekArchive.length),2);
   assert.equal(await tab.page.evaluate(()=>S.conq.tk.c0),undefined);
   assert.deepEqual(tab.errors,[]);
   await tab.page.evaluate(()=>loadSave.writer.release());
   await tab.page.close();
   console.log('  '+name+' native SHA-256 Conquest archive download + additive restore + cold reload PASS');
 }
 console.log('ARCH-02D-B4b1d real Chromium archival PWA + HTML PASS');
} finally {
 await browser.close();await server.close();fs.rmSync(tmp,{recursive:true,force:true});
}
