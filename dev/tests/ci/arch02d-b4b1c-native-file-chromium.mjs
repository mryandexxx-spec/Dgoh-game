// ARCH-02D-B4b1c — actual Chromium offline JSON-file download and import.
// Real Blob/ObjectURL, native <input type=file>, Web Locks, v1 backup, reload.
// Two compiled targets; no remote network or fake File/DOM/locks here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../lib/serve.mjs';

const require=createRequire(import.meta.url), puppeteer=require('puppeteer-core');
const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const primary='dune-goh-v1', backup=primary+'.backup';
const fixture=fs.readFileSync(path.join(DEV,'tests/fixtures/saves/01-legacy-v1.json'),'utf8');
const chrome=process.env.CHROME_PATH ||
  ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'native Chromium required; never silently skip browser file tests');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dune-file-transfer-'));
const server=await serve(path.join(DEV,'dist'));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:[
  '--no-sandbox','--disable-background-networking','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--ignore-gpu-blocklist'
]});
const delay=ms=>new Promise(done=>setTimeout(done,ms));
try {
  for (const [id,entry] of [['PWA','pwa/index.html'],['HTML','artifact.html']]) {
    const directory=path.join(temp,id);fs.mkdirSync(directory,{recursive:true});
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.setViewport({width:844,height:390,deviceScaleFactor:1,
      isMobile:true,hasTouch:true,isLandscape:true});
    await page.evaluateOnNewDocument(saved=>{
      window.claude={hot:{ready(fn){window.__entry=fn;},snapshot(){}}};
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});}catch(e){}
      if(localStorage.getItem('dune-goh-v1')===null)
        localStorage.setItem('dune-goh-v1',saved);
    },fixture);
    await page.goto(server.url(entry),{waitUntil:'load',timeout:75000});
    await page.waitForFunction(()=>typeof window.__entry==='function',{timeout:25000});
    assert.equal((await page.evaluate(()=>window.__entry({}))).status,'started');
    assert.equal((await page.evaluate(()=>loadSave.writer.state())).status,'owned');
    const original=await page.evaluate(k=>localStorage.getItem(k),primary);
    assert.ok(original);
    // A native browser download must contain EXACTLY the verified primary,
    // not a reserialized or possibly newer heap snapshot.
    const cdp=await page.target().createCDPSession();
    await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:directory});
    await page.evaluate(()=>metaClick({saveexp:1}));
    await page.waitForSelector('[data-savefileexp]',{visible:true});
    await page.click('[data-savefileexp]');
    const exported=path.join(directory,'dune-goh-v1-verified.json');
    let downloaded=false;
    for(let n=0;n<120;n++){
      if(fs.existsSync(exported) && !fs.existsSync(exported+'.crdownload')){
        downloaded=true;break;
      }
      await delay(100);
    }
    assert.equal(downloaded,true,id+' native browser JSON download missing');
    assert.equal(fs.readFileSync(exported,'utf8'),original,
      id+' downloaded bytes must equal exact verified primary');
    // Upload a separate v1 JSON file through the *native file picker*.
    const candidate={...JSON.parse(original),solari:JSON.parse(original).solari+987};
    const file=path.join(directory,'candidate.json');
    fs.writeFileSync(file,JSON.stringify(candidate),'utf8');
    await page.evaluate(()=>metaClick({saveimp:1}));
    const input=await page.$('#savefile');
    assert.ok(input,id+' missing File input');
    await input.uploadFile(file);
    await page.click('[data-savefileload]');
    await page.waitForFunction(()=>!!document.querySelector('[data-saveconfirm]'),
      {timeout:20000,polling:50});
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),primary),original,
      id+' preview must not touch storage');
    await page.click('[data-saveconfirm]');
    // Legitimate background RAM drift may require the existing third
    // explicit consent. Never auto-commit without the visible second click.
    let after=await page.evaluate(k=>localStorage.getItem(k),primary);
    if(after===original && await page.$('[data-saveconfirm]')){
      await page.click('[data-saveconfirm]');
      after=await page.evaluate(k=>localStorage.getItem(k),primary);
    }
    assert.equal(JSON.parse(after).solari,candidate.solari,
      id+' native file import was not verified and committed');
    const reserved=await page.evaluate(k=>localStorage.getItem(k),backup);
    assert.equal(JSON.parse(reserved).raw,original,
      id+' predecessor backup not preserved');
    assert.equal((await page.evaluate(()=>loadSave.writer.state())).status,'session-stale');
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>typeof window.__entry==='function',{timeout:25000});
    assert.equal((await page.evaluate(()=>window.__entry({}))).status,'started');
    assert.equal(await page.evaluate(()=>S.solari),candidate.solari,
      id+' cold restart must adopt verified primary');
    assert.deepEqual(errors,[],id+' browser errors');
    await page.evaluate(()=>loadSave.writer.release());
    await cdp.detach();
    await page.close();
    console.log('  '+id+' real Chromium downloaded exact JSON, native file input committed v1 and cold reloaded PASS');
  }
  console.log('ARCH-02D-B4b1c Chromium native JSON-file PWA + standalone PASS');
} finally {
  await browser.close();
  await server.close();
  fs.rmSync(temp,{recursive:true,force:true});
}
