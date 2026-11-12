// Simulate an indefinitely hanging mandatory DGM on mobile; Babylon/camp
// must become ready via procedural fallback without blocking the game.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {serve} from '../lib/serve.mjs';
const require=createRequire(import.meta.url);
const puppeteer=require('puppeteer-core');
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw Error('Chrome missing');
const save=fs.readFileSync(new URL('../fixtures/saves/03-late.json',import.meta.url),'utf8');
const server=await serve(path.dirname(html));
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
  for(const [width,height] of [[844,390],[667,375]]){
    const page=await browser.newPage(),errors=[];let blocked=0;
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    await page.evaluateOnNewDocument(s=>{
      try{localStorage.setItem('dune-goh-v1',s);localStorage.setItem('dune-cine-off','true');}catch(e){}
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch(e){}
    },save);
    await page.setRequestInterception(true);
    page.on('request',req=>{
      // Babylon and all OTHER files remain reachable; a required model hangs.
      if(/\/models\/duncan\.[a-f0-9]+\.dgm(?:\?|$)/.test(req.url())||/\/models\/duncan\.dgm(?:\?|$)/.test(req.url())){blocked++;return;}
      /^http:\/\/127\.0\.0\.1/.test(req.url())?req.continue():req.abort();
    });
    await page.goto(server.url(path.basename(html)),{waitUntil:'load'});
    await page.waitForFunction(()=>!!window.__B3 && !!document.querySelector('.lobby.has3d') && !!document.querySelector('.lobby canvas'),{timeout:23000});
    assert.ok(blocked>0,'must actually hold core Duncan request');
    assert.deepEqual(errors,[],'uncaught JS errors');
    console.log('PASS core model stall does not block lobby',width,height,'held='+blocked);
    await page.close();
  }
}finally{await browser.close();await server.close?.();}
