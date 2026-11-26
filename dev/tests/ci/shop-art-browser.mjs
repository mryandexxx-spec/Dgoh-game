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
      // Resolve and measure the CURRENT connected element in one browser
      // evaluation. Never retain a handle across a render. Wait only for
      // mounting/layout, not for a covering overlay or a disabled purchase.
      const probe=await page.waitForFunction(sel=>{
        const el=document.querySelector(sel);
        if(!el||!el.isConnected)return false;
        const r=el.getBoundingClientRect();
        if(r.width<=0||r.height<=0)return false;
        const x=r.left+r.width/2,y=r.top+r.height/2;
        const top=document.elementFromPoint(x,y);
        return {ok:!!top&&el.contains(top)&&!el.disabled,x,y,top:top?.outerHTML.slice(0,320),target:el.outerHTML.slice(0,320)};
      },{timeout:10000,polling:'raf'},selector);
      const hit=await probe.jsonValue();
      await probe.dispose();
      assert.ok(hit.ok,'Pointer blocked for '+selector+': '+JSON.stringify(hit));
      // Use the verified viewport point directly. Puppeteer's ElementHandle.click
      // performs a second layout/scroll/handle lookup; that handle may detach
      // on a normal render. One native tap only; never retry a purchase.
      await page.mouse.click(hit.x,hit.y);
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
        standVisible:pedestal.height>=region.height*.55&&art.bottom>=pedestal.top&&art.bottom<=pedestal.top+pedestal.height*.55,
        noOverlap:art.bottom<=buy.top&&region.bottom<=buy.top,
        artHeight:art.height,regionHeight:region.height};
    });
    assert.ok(stageBounds.contained&&stageBounds.standVisible&&stageBounds.noOverlap&&stageBounds.artHeight>20,JSON.stringify(stageBounds));
    assert.equal(await page.$eval('.sa-title h2',e=>e.textContent),'Пласталь');
    assert.match(await page.$eval('.sa-cat-head strong',e=>e.textContent),/ЛОТЫ\s+11/);
    await shot('normal');
    await click('[data-postpage="1"]');assert.equal(await page.$eval('.sa-pager span',e=>e.textContent),'2/2');assert.equal(await page.$$eval('.sa-card',a=>a.length),5);
    await click('[data-postfilter="shards"]');assert.equal(await page.$$eval('.sa-card',a=>a.length),4);
    await click('[data-postfilter="all"]');await click('[data-postselect="post:pl"]');
    const old=await snap();
    await click('[data-postquote="post:pl"]');
    assert.ok(await page.$('.sa-dialog[aria-label="Подтверждение покупки"]'));
    assert.equal(await page.$eval('.sa-layout',e=>e.inert),true);
    await shot('confirm');
    // Real status toast (including nested resource icon) cannot steal input.
    await run("toast('Лишние осколки героев 7★ обменены: '+amt('wring',10))");
    assert.ok(await page.$('body>.toast[role="status"]'));
    assert.equal(await page.$eval('body>.toast',e=>getComputedStyle(e).pointerEvents),'none');
    assert.equal(await page.$eval('body>.toast .amt',e=>getComputedStyle(e).pointerEvents),'none');
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
    for(let i=0;i<2;i++){
      const prior=await snap();
      await click('[data-postquote="post:pl"]');
      assert.ok(await page.$('.sa-dialog[aria-label="Подтверждение покупки"]'),'repeat quote '+i);
      await click('[data-shopquote]');
      assert.ok(await page.$('.sa-dialog[aria-label="Покупка завершена"]'),'repeat receipt '+i);
      assert.deepEqual(await snap(),{solari:prior.solari-6000,plast:prior.plast+5,buys:prior.buys+1},'repeat exact debit '+i);
      await click('[data-postclose]');
      assert.equal(await page.$('.sa-dialog'),null,'receipt closed '+i);
    }
    assert.ok(await page.$('[data-postquote="post:pl"]:disabled'));
    await shot('sold');
    await run('S.solari=0;persist();render()');await click('[data-postselect="post:folio"]');
    assert.ok(await page.$('[data-postquote="post:folio"]:disabled'));
    await shot('poor');
    await click('.sa-wallet[data-info="cry"]');assert.ok(await page.$('#overlay2 .infosheet'));
    await run('closeInfo(true);closeOverlay()');
    // Other daily markets: same rendering and one-shot quote, actual balances.
    await run('S.teeth=10000;S.rid=10000;S.wring=10000;persist()');
    for(const [tab,cur,key,field,price,qty] of [
      ['sietch','teeth','sietch:pl','plast',80,5],
      ['chron','rid','chron:folio','folio',40,5],
      ['ring','wring','ring:pl','plast',80,10]
    ]){
      await click('.sa-nav [data-shoptab="'+tab+'"]');
      assert.ok(await page.$('.shop-art[data-market="'+tab+'"]'));
      assert.ok(await page.$('.sa-wallet[data-info="'+cur+'"]'));
      assert.equal(await page.$eval('.sa-nav [aria-current]',e=>e.dataset.shoptab),tab);
      assert.equal(await page.$eval('.sa-pager span',e=>e.textContent.split('/')[0]),'1');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1),true);
      await shot(tab+'-normal');
      await click('[data-postfilter="resources"]');
      await click('[data-postselect="'+key+'"]');
      const read=()=>page.evaluate(([c,f])=>{const x=JSON.parse(localStorage.getItem('dune-goh-v1'));return [x[c],x[f]]},[cur,field]);
      const old=await read();
      await click('[data-postquote="'+key+'"]');
      assert.ok(await page.$('.sa-dialog[aria-label="Подтверждение покупки"]'));
      await click('[data-postclose]');
      assert.equal(await page.$('.sa-dialog'),null);
      assert.deepEqual(await read(),old);
      await click('[data-postquote="'+key+'"]');await click('[data-shopquote]');
      assert.ok(await page.$('.sa-dialog[aria-label="Покупка завершена"]'));
      assert.deepEqual(await read(),[old[0]-price,old[1]+qty]);
      await shot(tab+'-receipt');await click('[data-postclose]');
      if(tab==='sietch'){
        await click('[data-postfrags]');assert.ok(await page.$('.sa-fragments .sa-frag-scroll'));
        await shot('sietch-fragments');
        const fragment=await page.$('.sa-frag-scroll [data-fbuy]:not(:disabled)');
        if(fragment){
          const key=await fragment.evaluate(e=>e.dataset.fbuy);
          const id=key.split(':').slice(0,-1).join(':');
          const snapFrag=()=>page.evaluate(id=>{const x=JSON.parse(localStorage.getItem('dune-goh-v1'));return [x.teeth,x.inv[id]||0]},id);
          const old=await snapFrag();
          const selector='.sa-frag-scroll [data-fbuy="'+key+'"]';
          await page.$eval(selector,e=>e.scrollIntoView({block:'center',inline:'nearest'}));
          await click(selector);
          const after=await snapFrag();
          assert.ok(after[0]<old[0]);assert.equal(after[1],old[1]+1);
          assert.ok(await page.$('.sa-fragments'));
        }
        await click('.sa-fragments [data-postclose]');
      }
    }
    // E2: live weekly shop with the existing atomic Conquest purchase route.
    await run('S.jt=10000;persist()');
    await click('.sa-nav [data-shoptab="jihad"]');
    assert.ok(await page.$('.shop-art[data-market="jihad"]'));
    assert.ok(await page.$('.sa-wallet[data-info="jt"]'));
    await shot('jihad-normal');
    await click('[data-postfilter="med"]');
    assert.equal(await page.$$eval('.sa-card',a=>a.length),2);
    await click('[data-postselect="med3"]');
    const medState=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dune-goh-v1'));return [s.jt,s.cqMed||0]});
    const oldMed=await medState();
    await click('[data-postquote="med3"]');await click('[data-postclose]');
    assert.deepEqual(await medState(),oldMed);
    await click('[data-postquote="med3"]');
    const medToken=await page.$eval('[data-shopquote]',e=>e.dataset.shopquote);
    await click('[data-cqjbuy="med3"][data-shopquote]');
    assert.ok(await page.$('.sa-dialog[aria-label="Покупка завершена"]'));
    assert.deepEqual(await medState(),[oldMed[0]-80,oldMed[1]+3]);
    await shot('jihad-med-receipt');
    await page.evaluate(token=>{const b=document.createElement('button');b.dataset.cqjbuy='med3';b.dataset.shopquote=token;document.body.append(b);b.click();b.remove()},medToken);
    assert.deepEqual(await medState(),[oldMed[0]-80,oldMed[1]+3]);
    await click('[data-postclose]');
    await click('[data-postfilter="disks"]');
    assert.equal(await page.$$eval('.sa-card',a=>a.length),5);
    const disk=await run("JSON.stringify(cqShopItems().find(x=>x.key.startsWith('d:')&&!x.sold))");
    assert.ok(disk,'fixture has a purchasable weekly disk');
    const offer=JSON.parse(disk);
    await click('[data-postselect="'+offer.key+'"]');
    await shot('jihad-disk');
    const beforeDisk=await medState();
    await click('[data-postquote="'+offer.key+'"]');
    await click('[data-cqjbuy][data-shopquote]');
    assert.ok(await page.$('.sa-dialog[aria-label="Покупка завершена"]'));
    assert.deepEqual(await medState(),[beforeDisk[0]-offer.price,beforeDisk[1]]);
    assert.equal(await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem('dune-goh-v1'));return s.conq.disks.filter(x=>x.k===k.slice(2)).length},offer.key),1);
    await click('[data-postclose]');
    assert.ok(await page.$('[data-postquote="'+offer.key+'"]:disabled'));
    await shot('jihad-sold');
    await click('.sa-nav [data-shoptab="post"]');assert.ok(await page.$('.shop-art[data-market="post"]'));
    await click('.sa-ix');assert.equal(await run('view'),'recycler');
    assert.equal(await page.$('.shop-art'),null);
    assert.deepEqual(errors,[]);
    await page.close();
    console.log('PASS SHOP-ART',path.basename(html),width+'x'+height,JSON.stringify(layout));
  }
}finally{if(browser)await browser.close();await server.close()}
