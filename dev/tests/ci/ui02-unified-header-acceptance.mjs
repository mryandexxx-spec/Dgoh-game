// UI-02 — Chromium acceptance of the approved unified lobby header.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
const require=createRequire(import.meta.url);
const puppeteer=require('puppeteer-core');
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const fixture=fs.readFileSync(new URL('../fixtures/saves/03-late.json',import.meta.url),'utf8');
assert.equal(JSON.parse(fixture).v,1,'legacy save v1 supported');
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
assert.ok(chrome,'Native Chromium required');
const server=await serve(path.dirname(html));
let browser;
try{
  browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-networking']});
  for(const [width,height] of [[1440,800],[844,390],[667,375],[390,844]]){
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:width!==1440,hasTouch:width!==1440,isLandscape:width>height});
    await page.evaluateOnNewDocument(raw=>{
      localStorage.setItem('dune-goh-v1',raw);
      localStorage.setItem('dune-cine-off','true');
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});}catch{}
    },fixture);
    await page.goto(server.url(path.basename(html)),{waitUntil:'load',timeout:75000});
    await page.waitForFunction(()=>!!document.querySelector('.lobby .ui02-profile')&&!!document.querySelector('.lobby .hud-water'),{timeout:45000});
    const measured=await page.evaluate(async()=>{
      await document.fonts.load('650 12px "Dune Inter"','Профиль Подвиги');
      const lobby=document.querySelector('.lobby'),root=lobby.querySelector('.ltop');
      const profile=root.querySelector('.ui02-profile');
      const resources=root.querySelector('.resbox');
      const actions=root.querySelector('.ui02-top-actions');
      const rect=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
      const layout=[profile,resources,actions].map(rect);
      const expectedProfile=(0,eval)('S.profile.nick');
      const expectedLevel=(0,eval)('S.acc.lvl');
      const expectedPower=(0,eval)('squadPower()');
      const rootKeys=[...resources.querySelectorAll(':scope > .hud-cell')].map(n=>n.dataset.info);
      return {
        layout,rootRect:rect(root),width:innerWidth,height:innerHeight,
        profileName:profile.querySelector('.ui02-player-name').textContent,
        profileLevel:profile.querySelector('.ui02-level').textContent,
        power:profile.querySelector('.ui02-power').textContent,
        expectedProfile,expectedLevel,expectedPower,
        keys:rootKeys,
        actions:[...actions.querySelectorAll('button')].map(b=>({label:b.querySelector('.ui02-action-label')?.textContent,view:b.dataset.v||'',cal:b.dataset.cal||''})),
        visibleResources:[...resources.querySelectorAll(':scope > .hud-cell')].filter(e=>getComputedStyle(e).display!=='none').length,
        font:getComputedStyle(profile).fontFamily
      };
    });
    assert.equal(measured.profileName,measured.expectedProfile,'actual selected account nickname');
    assert.ok(measured.profileLevel.includes(String(measured.expectedLevel)),'actual account level');
    assert.ok(measured.power.includes(new Intl.NumberFormat('ru-RU').format(measured.expectedPower).replace(/\u00a0/g,' ')) ||
      measured.power.replace(/[^0-9]/g,'').includes(String(measured.expectedPower)),
      'actual squad power');
    assert.deepEqual(measured.keys,['water','candle','sol','cry'],'four visible core resource IDs');
    assert.equal(measured.visibleResources,4,'all four resources visible');
    assert.deepEqual(measured.actions,[{label:'Подвиги',view:'feats',cal:''},{label:'Задания',view:'daily',cal:''},{label:'Календарь',view:'',cal:'1'}]);
    assert.ok(measured.font.includes('Dune Inter'),'Inter locally available');
    for(const b of measured.layout){
      assert.ok(b.width>35&&b.height>=45,'responsive touch geometry: '+JSON.stringify({width,b}));
      assert.ok(b.left>=-1 && b.right<=width+1 && b.top>=-1,'header fits viewport: '+JSON.stringify({width,b}));
    }
    const maxBar = width===390 ? 60 : width<=770 ? 72 : width<=1100 ? 76 : 82;
    assert.ok(measured.layout[1].height<=maxBar,'compact resource strip: '+JSON.stringify({width,layout:measured.layout}));
    // The profile must fill its allocated HUD column: the previous chip
    // inherited justify-self:start, leaving a large empty gap at 667px.
    assert.ok(measured.layout[0].width >= (width<=510?150:width<=770?150:width<=1100?195:250),
      'profile card fills the approved layout: '+JSON.stringify({width,layout:measured.layout}));
    // In landscape the three groups share one line, portrait is the approved two-row layout.
    if(width>510){
      assert.ok(Math.abs(measured.layout[0].top-measured.layout[1].top)<=2,'one unified HUD row: '+width);
      assert.ok(Math.abs(measured.layout[0].height-measured.layout[1].height)<=2,'profile and resources have equal height');
    }
    else assert.ok(measured.layout[1].top>measured.layout[0].bottom,'portrait resources below profile');

    // UI-06: in-memory fixture only, no purchase/persistence; exercise both transition directions.
    if(width>height){
      const hero=await page.evaluate(()=>{
        const id=(0,eval)('Object.keys(CH).find(k=>prog(k)?.stars>0)');
        const p=(0,eval)('prog('+JSON.stringify(id)+')');
        const old={gear:p.gear,relic:p.relic,eq:p.eq,stars:p.stars};
        const open=()=>{(0,eval)('closeInfo(true);closeOverlay();openDetail('+JSON.stringify(id)+')');};
        const slots=()=>document.querySelectorAll('#overlay .hc [data-slot]').length;
        try{
          p.gear=13;p.stars=7;p.eq=Array(6).fill(true);p.relic=0;open();
          const before=slots(),pl=document.querySelector('#overlay .hcres').textContent,seal=!!document.querySelector('#overlay .hcmem .memory-art');
          p.relic=3;(0,eval)('openDetail('+JSON.stringify(id)+')');const after=slots();
          p.relic=7;(0,eval)('openDetail('+JSON.stringify(id)+')');const max=!!document.querySelector('#overlay .hc-max');
          (0,eval)('openInfo('+JSON.stringify('bio:'+id)+')');
          const root=document.querySelector('#overlay2 .ui06-dossier');
          root.querySelector('[data-ui06-tab="stats"]').click();
          const stats=!root.querySelector('#ui06-pane-stats').hidden;
          const overflow=root.scrollHeight-root.clientHeight;
          root.querySelector('[data-ui06-tab="sources"]').click();const sources=!root.querySelector('#ui06-pane-sources').hidden;
          p.relic=0;open();const restored=slots();
          return {before,after,restored,seal,max,stats,sources,overflow,resources:document.querySelectorAll('#overlay .hcres .amt').length};
        }finally{Object.assign(p,old);(0,eval)('closeInfo(true);closeOverlay()');}
      });
      assert.deepEqual([hero.before,hero.after,hero.restored],[6,0,6],'UI-06 gear slots are view-only and restore on hero change');
      assert.ok(hero.seal&&hero.max&&hero.stats&&hero.sources,'UI-06 seal, maximum, and dossier tabs');
      assert.ok(hero.overflow<=1,'UI-06 dossier does not scroll as a screen');
      assert.equal(hero.resources,1,'UI-06 only solari in hero header');
    }
    // UI-07: actual shipped image paths, hero/skill/battle renderer and
    // memory layout under the 4-material DP5→DP6 purchase state.
    if(width>height){
      const art=await page.evaluate(async()=>{
        const id='duncan',p=(0,eval)('prog("duncan")'),acc=(0,eval)('S.acc');
        const old={gear:p.gear,relic:p.relic,eq:p.eq,stars:p.stars}, oldLevel=acc.lvl;
        const call=s=>(0,eval)(s);
        try{
          p.gear=13;p.stars=7;p.eq=Array(6).fill(true);p.relic=5;acc.lvl=85;
          call('closeInfo(true);closeOverlay();openDetail("duncan")');
          const card=[...document.querySelectorAll('#overlay .hcsk svg.skill-art image')];
          const urls=card.map(e=>e.getAttribute('href'));
          const render=['basic','special','ult','passive'].map(k=>call('skillSvg(CH.duncan,'+JSON.stringify(k)+')').includes('skill-art'));
          const other=call('Object.values(CH).find(d=>d.id!=="duncan")');
          const fallback=!call('skillSvg(CH['+JSON.stringify(other.id)+'],"basic")').includes('skill-art');
          const plaque=document.querySelector('#overlay .memory-plaque')?.getAttribute('src');
          const loaded=await Promise.all([...urls,plaque].map(url=>new Promise(resolve=>{
            const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);if(url)img.src=url;else resolve(false);
          })));
          call('hcMem("duncan")');
          const root=document.querySelector('#overlay2 .memscr'),mid=root.querySelector('.memmid'),steps=root.querySelector('.memsteps'),table=root.querySelector('.memna'),buy=root.querySelector('.membuy');
          const within=(inner,outer)=>{const a=inner.getBoundingClientRect(),b=outer.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;};
          const fit=within(table,mid)&&within(buy,mid)&&mid.getBoundingClientRect().right<=steps.getBoundingClientRect().left+1&&[...buy.querySelectorAll('.swmat,.btn')].every(el=>within(el,mid));
          const rank=root.querySelector('.mrc .memory-rank-value')?.textContent;
          return {count:card.length,unique:new Set(urls).size,render,fallback,loaded,fit,rank,screenScroll:root.scrollHeight-root.clientHeight,materials:buy.querySelectorAll('.swmat').length};
        }finally{Object.assign(p,old);acc.lvl=oldLevel;call('closeInfo(true);closeOverlay()');}
      });
      assert.equal(art.count,4,'UI-07 four Duncan card icons');
      assert.equal(art.unique,4,'UI-07 distinct art files');
      assert.ok(art.render.every(Boolean)&&art.fallback&&art.loaded.every(Boolean),'UI-07 shared art renderer, legacy fallback, and actual asset loading');
      assert.equal(art.rank,'5','UI-07 live rank value');
      assert.equal(art.materials,4,'UI-07 DP6 four-material fixture');
      assert.ok(art.fit&&art.screenScroll<=1,'UI-07 memory columns and controls fit: '+JSON.stringify({width,art}));
    }
    // UI-04: verify the actual compiled dossier, not the standalone mockup.
    if(width>height){
      await page.evaluate(()=>(0,eval)('closeInfo(true);closeOverlay();openProfile()'));
      const measureProfile=()=>page.evaluate(()=>{
        const root=document.querySelector('#overlay2 .ui04-profile'), area=root.querySelector('.ui04-scroll');
        const b=root.getBoundingClientRect();
        return {w:b.width,h:b.height,left:b.left,top:b.top,scroll:root.scrollHeight-root.clientHeight,
          horizontal:root.scrollWidth-root.clientWidth,area:area.clientHeight,areaScroll:area.scrollHeight,
          tab:root.querySelector('.ui04-tabs button.active').dataset.ui04Tab,
          power:root.querySelector('.ui04-power strong').textContent,
          bodyScroll:document.scrollingElement.scrollHeight-innerHeight};
      });
      const overview=await measureProfile();
      assert.ok(Math.abs(overview.w-width)<2 && Math.abs(overview.h-height)<2,'profile fills viewport: '+JSON.stringify({width,height,overview}));
      assert.ok(overview.scroll<=1 && overview.horizontal<=1,'no profile screen scroll: '+JSON.stringify(overview));
      assert.equal(overview.tab,'overview');
      assert.ok(overview.area>100 && overview.power,'account summary is visible');
      // Use DOM click for transient view-only controls, independent of the boot writer timing.
      const clickLocal=selector=>page.evaluate(s=>document.querySelector('#overlay2 '+s).click(),selector);
      await clickLocal('.ui04-edit');
      const collection=await measureProfile();
      assert.equal(collection.tab,'custom');
      if(width<=844)assert.ok(collection.areaScroll>collection.area,'avatar collection scrolls internally');
      else assert.ok(collection.area>100,'desktop collection remains usable');
      const total=await page.evaluate(()=>document.querySelectorAll('#overlay2 .ui04-item').length);
      const locked=await page.$('#overlay2 [data-ui04-locked]');
      if(locked){
        await page.evaluate(el=>el.click(),locked);
        assert.ok(await page.$eval('#overlay2 .ui04-hint',e=>!e.hidden&&!!e.textContent),'locked cosmetic explains requirement');
      }
      await clickLocal('[data-ui04-filter]');
      const filtered=await page.evaluate(()=>({count:document.querySelectorAll('#overlay2 .ui04-item').length,active:document.querySelector('#overlay2 [data-ui04-filter]').getAttribute('aria-pressed')}));
      assert.equal(filtered.active,'true','owned filter enabled');
      assert.ok(filtered.count<=total && (!locked || filtered.count<total),'owned filter count: '+JSON.stringify({total,filtered}));
      assert.equal(await page.evaluate(()=>document.querySelectorAll('#overlay2 [data-ui04-locked]').length),0,'owned filter hides locked');
      await clickLocal('[data-ui04-kind="frame"]');
      assert.ok(await page.$('#overlay2 [data-pframe]'),'frame choices');
      await clickLocal('[data-ui04-kind="title"]');
      assert.ok(await page.$('#overlay2 [data-ptitle]'),'title choices');
      await clickLocal('[data-ui04-kind="nick"]');
      assert.ok(await page.$('#overlay2 #pnick'),'name field');
      await clickLocal('[data-ui04-tab="save"]');
      assert.ok(await page.$('#overlay2 [data-saveexp]') && await page.$('#overlay2 [data-saveimp]'),'existing safe transfer controls');
      const art=await page.evaluate(()=>(0,eval)('JSON.stringify(["hawk","baron","eye","spice","lion","knife","sietch"].map(id=>avatarHtml("emb:"+id,"gold",76)))'));
      for(const html of JSON.parse(art))assert.ok(html.includes('fr-gold') && html.includes('stroke=') && html.length>500,'layered vector heraldry');
      assert.match(await page.evaluate(()=>(0,eval)('avatarHtml("emb:worm","basic")')),/<image href=/,'authored worm preserved');
      await page.evaluate(()=>(0,eval)('closeInfo(true)'));
      console.log('PASS UI-04 profile layout and navigation '+width+'x'+height);
    }

    if(width===844){
      // The boot login calendar may appear asynchronously over the HUD.
      // Dismiss it only after the writer is ready; taps must hit our buttons.
      await page.waitForFunction(()=>{
        try {const x=(0,eval)('start.writerLifecycle()');
          return x.armed && !x.blocked && x.writer.status==='owned';
        } catch {return false;}
      },{timeout:35000,polling:50});
      await new Promise(resolve=>setTimeout(resolve,3100));
      await page.evaluate(()=>(0,eval)('closeInfo(true);closeOverlay()'));
      await page.click('.ui02-profile');
      assert.ok(await page.$('.profsheet'),'existing native profile dialog');
      await page.evaluate(()=>(0,eval)('closeInfo(true)'));
      await page.click('.ui02-calendar');
      // UI-03 replaces the legacy calendar sheet with an approved full-screen
      // dialog. Continue checking a real opened dialog, its days and verified
      // claim control rather than silently dropping the old navigation guard.
      const calendar = await page.evaluate(()=>{
        const modern=document.querySelector('#overlay2 .ui03-calendar-screen');
        if (!modern) return {legacy:!!document.querySelector('.calsheet')};
        const box=modern.getBoundingClientRect();
        return {modern:true,role:modern.getAttribute('role'),
          height:box.height,days:modern.querySelectorAll('[data-ui03day]').length,
          hasClaim:!!modern.querySelector('[data-calclaim]'),
          hasClose:!!modern.querySelector('button[data-iclose]')};
      });
      if(calendar.modern){
        assert.equal(calendar.role,'dialog','UI-03 calendar is a dialog');
        assert.ok(Math.abs(calendar.height-height)<2,'UI-03 calendar fills the viewport');
        assert.ok(calendar.days>=28 && calendar.days<=31,'calendar day count');
        assert.ok(calendar.hasClaim && calendar.hasClose,'calendar claim/close controls');
      }else assert.ok(calendar.legacy,'existing native calendar dialog');
      await page.evaluate(()=>(0,eval)('closeInfo(true)'));
      await page.click('.ui02-feats');
      await page.waitForSelector('.feats',{timeout:30000});
      await page.evaluate(()=>(0,eval)("set_view('lobby');render()"));
      await page.waitForSelector('.lobby .ui02-daily');
      await page.click('.ui02-daily');
      // The approved UI-03 daily screen replaces .quests with its one-screen
      // root and independently scrolling list, without changing the HUD link.
      await page.waitForSelector('.ui03-daily .ui03-quest, .quests',{timeout:30000});
      const daily=await page.evaluate(()=>{
        const root=document.querySelector('#view>.ui03-daily');
        if(!root)return {legacy:!!document.querySelector('.quests')};
        return {modern:true,quests:root.querySelectorAll('.ui03-quest').length,
          hasChest:!!root.querySelector('[data-qchest]'),
          hasClaimAll:!!root.querySelector('[data-qall]')};
      });
      if(daily.modern){
        assert.ok(daily.quests>=8,'UI-03 daily tasks render');
        assert.ok(daily.hasChest && daily.hasClaimAll,'daily reward actions retained');
      }else assert.ok(daily.legacy,'existing daily quests view');
    }
    assert.deepEqual(errors,[],'no browser errors: '+width);
    console.log('PASS UI-02',path.basename(html),width+'x'+height,JSON.stringify({groups:measured.layout.map(x=>Math.round(x.width)),visibleResources:measured.visibleResources}));
    await page.close();
  }
}finally{if(browser)await browser.close();await server.close();}
