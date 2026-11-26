// SHOP-INTEGRATION — actual compiled PWA and artifact, native Web Locks + Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {serve} from '../lib/serve.mjs';
const require=createRequire(import.meta.url);
const puppeteer=require('puppeteer-core');
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const fixture=fs.readFileSync(new URL('../fixtures/saves/03-late.json',import.meta.url),'utf8');
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Chromium required');
const server=await serve(path.dirname(html));
const shots=path.resolve('shop-art-shots',path.basename(html,'.html'));
fs.mkdirSync(shots,{recursive:true});
let browser;
try{
  browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-background-networking']});
  for(const [width,height] of [[844,390],[667,375]]){
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    await page.evaluateOnNewDocument(raw=>{
      localStorage.setItem('dune-goh-v1',raw);
      localStorage.setItem('dune-cine-off','true');
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});}catch{}
    },fixture);
    await page.goto(server.url(path.basename(html)),{waitUntil:'load',timeout:75000});
    await page.waitForFunction(()=>!!document.querySelector('.lobby .resbox .hud-water'),{timeout:35000});
    const run=code=>page.evaluate(c=>(0,eval)(c),code);
    // Assert a genuine pointer hit, not a click on a different stacked screen.
    const click=async selector=>{
      await page.waitForSelector(selector,{visible:true,timeout:10000});
      const hit=await page.$eval(selector,el=>{
        const r=el.getBoundingClientRect();
        const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        return {ok:!!top&&el.contains(top),top:top?.outerHTML.slice(0,320),target:el.outerHTML.slice(0,320)};
      });
      assert.ok(hit.ok,'Pointer blocked for '+selector+': '+JSON.stringify(hit));
      await page.click(selector);
    };
    // Startup auto-calendar is an actual overlay, even if the shop DOM exists
    // underneath. Let ordinary boot finish, then dismiss via its real button.
    await page.waitForFunction(()=>{try{const s=(0,eval)('start.writerLifecycle()');return s.armed&&!s.blocked&&s.writer.status==='owned'}catch{return false}},{timeout:35000});
    if(await page.$('.ui03-close[data-iclose]')) await click('.ui03-close[data-iclose]');
    // Close any old info/detail presentation before routing, just like shoptab.
    await run('closeInfo(true);closeOverlay()');

    await run("S.solari=1000000;S.cry=5000;S.buys={d:todayKey(),n:{}};persist();S.shopTab='post';set_view('shop');render()");
    assert.equal(await run('loadSave.writer.state().status'),'owned');
    const snap=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dune-goh-v1'));return {solari:s.solari,plast:s.plast,buys:s.buys.n['post:pl']||0}});
    const shot=async label=>{await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.shop-art img')].map(i=>i.decode().catch(()=>{})))});await page.screenshot({path:path.join(shots,width+'-'+label+'.png')})};
    const layout=await page.evaluate(async()=>{
      const root=document.querySelector('.shop-art'), cards=[...root.querySelectorAll('.sa-card')];
      const elems=[...root.querySelectorAll('.sa-card,.sa-buy,.sa-nav button,.sa-ix,.sa-pager,.sa-wallet,.sa-stage,.sa-catalog')];
      const inView=elems.every(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&b.left>=-1&&b.top>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1});
      const files=[...new Set([getComputedStyle(cards[0]).backgroundImage,getComputedStyle(cards[1]).backgroundImage,getComputedStyle(root.querySelector('.sa-stage')).backgroundImage,getComputedStyle(root.querySelector('.sa-buy')).backgroundImage])].map(s=>s.match(/url\(["']?(.*?)["']?\)/)?.[1]);
      const loaded=await Promise.all(files.map(src=>new Promise(resolve=>{if(!src)return resolve(false);const i=new Image();i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);i.src=src})));
      return {cards:cards.length,inView,files,loaded,rootScroll:document.documentElement.scrollHeight>innerHeight+1||document.documentElement.scrollWidth>innerWidth+1,fonts:(await document.fonts.load('600 14px "Dune Inter"','Пласталь')).length};
    });
    assert.equal(layout.cards,6);
    assert.ok(layout.inView&&!layout.rootScroll,JSON.stringify(layout));
    assert.ok(layout.loaded.every(Boolean)&&layout.files.some(s=>s.includes('a3-'+width)),JSON.stringify(layout));
    assert.ok(layout.fonts>=1);
    assert.equal(await page.$eval('#overlay2',e=>e.innerHTML.trim()),'','no calendar or info sheet covering shop');
    assert.equal(await page.$eval('#overlay',e=>e.innerHTML.trim()),'','no detail overlay covering shop');
    const stageBounds=await page.evaluate(()=>{
      const box=s=>document.querySelector(s).getBoundingClientRect();
      const art=box('.sa-hero img'),region=box('.sa-object'),pedestal=box('.sa-pedestal'),buy=box('.sa-foot .sa-buy');
      return {contained:art.top>=region.top-1&&art.bottom<=region.bottom+1&&art.left>=region.left-1&&art.right<=region.right+1,
        standVisible:pedestal.height>=40&&art.bottom<=pedestal.top+8,
        noOverlap:art.bottom<=buy.top&&region.bottom<=buy.top,
        artHeight:art.height,regionHeight:region.height};
    });
    assert.ok(stageBounds.contained&&stageBounds.standVisible&&stageBounds.noOverlap&&stageBounds.artHeight>20,JSON.stringify(stageBounds));
    await shot('normal');
    await click('[data-postpage="1"]');assert.equal(await page.$eval('.sa-pager span',e=>e.textContent),'2/2');assert.equal(await page.$$eval('.sa-card',a=>a.length),5);
    await click('[data-postfilter="shards"]');assert.equal(await page.$$eval('.sa-card',a=>a.length),4);
    await click('[data-postfilter="all"]');await click('[data-postselect="post:pl"]');
    const old=await snap();
    await click('[data-postquote="post:pl"]');
    assert.ok(await page.$('.sa-dialog[aria-label="Подтверждение покупки"]'));
    assert.equal(await page.$eval('.sa-layout',e=>e.inert),true);
    await shot('confirm');
    await click('[data-postclose]');assert.deepEqual(await snap(),old);
    await click('[data-postquote="post:pl"]');
    const token=await page.$eval('[data-shopquote]',e=>e.dataset.shopquote);
    await click('[data-shopquote]');
    assert.ok(await page.$('.sa-dialog[aria-label="Покупка завершена"]'));
    const next=await snap();assert.deepEqual(next,{solari:old.solari-6000,plast:old.plast+5,buys:old.buys+1});
    await shot('receipt');
    await page.evaluate(token=>{const b=document.createElement('button');b.dataset.buy='post:pl';b.dataset.shopquote=token;document.body.append(b);b.click();b.remove()},token);
    assert.deepEqual(await snap(),next);
    await click('[data-postclose]');
    for(let i=0;i<2;i++){await click('[data-postquote="post:pl"]');await click('[data-shopquote]');await click('[data-postclose]')}
    assert.ok(await page.$('[data-postquote="post:pl"]:disabled'));
    await shot('sold');
    await run('S.solari=0;persist();render()');await click('[data-postselect="post:folio"]');
    assert.ok(await page.$('[data-postquote="post:folio"]:disabled'));
    await shot('poor');
    await click('.sa-wallet[data-info="cry"]');assert.ok(await page.$('#overlay2 .infosheet'));
    await run('closeInfo(true);closeOverlay()');
    await click('.sa-nav [data-shoptab="sietch"]');assert.ok(await page.$('.ctab.on[data-shoptab="sietch"]'));
    await click('.ctab[data-shoptab="post"]');assert.ok(await page.$('.shop-art'));
    await click('.sa-ix');assert.equal(await run('view'),'recycler');
    assert.equal(await page.$('.shop-art'),null);
    assert.deepEqual(errors,[]);
    await page.close();
    console.log('PASS SHOP-ART',path.basename(html),width+'x'+height,JSON.stringify(layout));
  }
}finally{if(browser)await browser.close();await server.close()}
