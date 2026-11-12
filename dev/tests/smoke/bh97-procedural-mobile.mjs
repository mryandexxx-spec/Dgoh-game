// BH9.8 — mobile integration acceptance of the approved temporary procedural
// Margot/Yue. No new meshes, hero kits, save migrations or gameplay changes.
// node tests/smoke/bh97-procedural-mobile.mjs dist/pwa/index.html
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';

const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const chrome = process.env.CHROME_PATH || '/usr/bin/chromium';
const out = path.resolve('dist/bh97-procedural-mobile-shots');
const fixture = fs.readFileSync('tests/fixtures/saves/03-late.json', 'utf8');
const sizes = [[844,390,'med'],[667,375,'med'],[844,390,'low'],[667,375,'low']];
fs.mkdirSync(out, {recursive:true});
const browser = await puppeteer.launch({executablePath:chrome,headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const server = await serve(path.dirname(html));
const results = [];
try {
  for (const [width,height,quality] of sizes) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    await page.evaluateOnNewDocument((save,gfx)=>{
      localStorage.clear();
      localStorage.setItem('dune-goh-v1',save);
      localStorage.setItem('dune-gfx',JSON.stringify({p:gfx,auto:0,bad:0,good:0,noUp:true}));
      localStorage.setItem('dune-cine-off','true');
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch{}
    },fixture,quality);
    await page.goto(server.url(path.basename(html)),{waitUntil:'load',timeout:120000});
    // The splash and delayed login calendar are real overlays. A screenshot
    // is only valid after startup has completed and the canvas is unobscured.
    await page.waitForFunction(()=>!document.getElementById('splash'),{timeout:15000});
    const roster = await page.evaluate(async()=>{
      if(!await loadB3())throw Error('Babylon unavailable');
      window.openCalendar=()=>{};closeInfo(true);closeOverlay();
      view='squad';render();
      const cards=['margot','yue'].map(id=>document.querySelector('[data-hc="'+id+'"]'));
      if(cards.some(c=>!c))throw Error('Public roster missing Margot/Yue');
      if(!cards.every(c=>c.classList.contains('lockd')))throw Error('Story heroes should be locked in legacy save');
      const before=JSON.stringify(S.roster);
      return {count:document.querySelectorAll('#rgrid [data-hc]').length,before};
    });
    await page.evaluate(()=>{closeInfo(true);
      if(document.getElementById('splash') || document.querySelector('#overlay2')?.innerHTML.trim())
        throw Error('Roster capture obscured by startup or monthly calendar');
      document.querySelector('[data-hc="margot"]').scrollIntoView({block:'center'});
    });
    await page.screenshot({path:path.join(out,`${width}x${height}-${quality}-roster.png`)});
    for(const id of ['margot','yue']){
      await page.evaluate(id=>{closeInfo(true);
        document.querySelector('[data-hc="'+id+'"]').scrollIntoView({block:'center'});
      },id);
      await page.screenshot({path:path.join(out,`${width}x${height}-${quality}-${id}-roster.png`)});
    }
    assert.equal(roster.count,27,'Two ordinary heroes and a distinct legendary Baron are public');

    const cards=[];
    for(const id of ['margot','yue']){
      await page.evaluate(id=>{closeInfo(true);closeOverlay();openDetail(id);},id);
      await page.waitForFunction(id=>!!(typeof HERO_STAGE!=='undefined' &&
        HERO_STAGE?.o?.root && HERO_STAGE.o.def?.id===id &&
        HERO_STAGE.scene.getFrameId()>2),{timeout:60000},id);
      const data=await page.evaluate(({id,before})=>{
        closeInfo(true);
        const hero=HERO_STAGE.o,card=document.querySelector('#overlay .hc');
        if(!card||card.dataset.cid!==id)throw Error('Wrong standard hero card');
        const stage=document.querySelector('#overlay .hcfig');
        return {id,regular:!!CH[id]&&!CH[id].legendary,
          locked:card.classList.contains('locked'),
          procedural:!hero.root._authored,
          meshes:hero.root.getChildMeshes().length,
          stage:!!stage,skills:[...card.querySelectorAll('.hcsk')].length,
          rosterPreserved:JSON.stringify(S.roster)===before};
      },{id,before:roster.before});
      assert.equal(data.regular,true,id+' is ordinary');
      assert.equal(data.locked,true,id+' starts locked');
      assert.equal(data.procedural,true,id+' has temporary procedural model');
      assert.equal(data.rosterPreserved,true,id+' card leaves prior progress unchanged');
      assert.ok(data.meshes>0,id+' generated 3D geometry');
      assert.ok(data.stage && data.skills>0,id+' uses the shared ability card');
      cards.push(data);
      await page.evaluate(()=>{
        closeInfo(true);
        if(document.getElementById('splash') || document.querySelector('#overlay2')?.innerHTML.trim())
          throw Error('Hero card screenshot obscured by an overlay');
        const center=document.elementFromPoint(innerWidth/2,innerHeight/2);
        if(!center?.closest('.hc'))throw Error('Shared hero card not topmost');
      });
      await page.screenshot({path:path.join(out,`${width}x${height}-${quality}-${id}-card.png`)});
      // Diagnostic art view ONLY: remove the ordinary locked-card dimming in
      // this screenshot, without altering production UI, save or asset files.
      const art=await page.evaluate(()=>{
        const canvas=document.querySelector('#overlay .hcfig canvas');
        if(!canvas?.isConnected)throw Error('Live WebGL model canvas absent');
        const locked=getComputedStyle(canvas).filter;
        if(locked==='none')throw Error('Expected locked-card dimming in production');
        canvas.style.filter='none';
        return {locked,review:getComputedStyle(canvas).filter};
      });
      assert.equal(art.review,'none');
      await page.screenshot({path:path.join(out,`${width}x${height}-${quality}-${id}-art-review.png`)});
      await page.evaluate(()=>{document.querySelector('#overlay .hcfig canvas')?.style.removeProperty('filter');});
    }
    const battle = await page.evaluate(()=>{
      closeInfo(true);closeOverlay();
      // Ephemeral test-only progress; never persist, alter fixture or grant shards.
      S.roster.margot.stars=1;
      S.roster.yue.stars=1;
      launch({mode:'camp',dlg:false,scene:'court',i:0,
        title:'BH9.8 procedural mobile smoke',desert:false,
        squad:['margot','yue','paul'],
        enemy:[enemyProg('piter',65,false),enemyProg('rabban',65,false)]});
      const b=BT?.B;
      return {ids:b?.units.filter(u=>u.side==='A').map(u=>u.def.id)};
    });
    assert.deepEqual(battle.ids,['margot','yue','paul'],'Both heroes participate in a real battle');
    await page.waitForFunction(()=>!!(window.BT?.arena?.scene?.getFrameId?.()>3 &&
      BT.B.units.filter(u=>u.side==='A').every(u=>BT.arena.units[u.uid]?.root)),{timeout:60000});
    const scene=await page.evaluate(()=>{
      const units=BT.B.units.filter(u=>u.def.id==='margot'||u.def.id==='yue');
      return units.map(u=>({id:u.def.id,procedural:!BT.arena.units[u.uid].root._authored,
        meshes:BT.arena.units[u.uid].root.getChildMeshes().length}));
    });
    assert.equal(scene.length,2);
    for(const item of scene){assert.equal(item.procedural,true);assert.ok(item.meshes>0);}
    await page.screenshot({path:path.join(out,`${width}x${height}-${quality}-battle.png`)});
    assert.deepEqual(errors,[],'Browser and WebGL errors');
    results.push({width,height,quality,roster:roster.count,cards,scene});
    console.log('PASS BH9.8 procedural roster/card/battle',width+'x'+height,quality);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
// 2D fallback is a separate browser process with WebGL deliberately disabled.
// The same saved heroes must retain their normal cards and SVG figures.
const fallbackBrowser = await puppeteer.launch({executablePath:chrome,headless:true,
  args:['--no-sandbox','--disable-webgl','--disable-3d-apis']});
const fallbackServer = await serve(path.dirname(html));
try {
  for(const [width,height] of [[844,390],[667,375]]){
    const page=await fallbackBrowser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    await page.evaluateOnNewDocument(save=>{
      localStorage.clear();
      localStorage.setItem('dune-goh-v1',save);
      localStorage.setItem('dune-cine-off','true');
      try{Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch{}
    },fixture);
    await page.goto(fallbackServer.url(path.basename(html)),{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>!document.getElementById('splash'),{timeout:15000});
    const verdict=await page.evaluate(()=>{
      window.openCalendar=()=>{};closeInfo(true);closeOverlay();view='squad';render();
      const count=document.querySelectorAll('#rgrid [data-hc]').length;
      const cards=[];
      for(const id of ['margot','yue']){
        closeInfo(true);openDetail(id);
        const card=document.querySelector('#overlay .hc');
        cards.push({id,shared:card?.dataset.cid===id,
          svg:!!document.querySelector('#overlay .hcfig svg'),
          locked:card?.classList.contains('locked')});
      }
      return {count,cards};
    });
    assert.equal(verdict.count,27);
    for(const card of verdict.cards) {
      assert.equal(card.shared,true);
      assert.equal(card.svg,true,card.id+' renders SVG without WebGL');
      assert.equal(card.locked,true);
    }
    assert.deepEqual(errors,[],'2D fallback page errors');
    // Verify the art is actually visible; do not mistake the intro splash
    // for a valid SVG fallback screenshot again.
    for(const id of ['margot','yue']){
      await page.evaluate(id=>{
        closeInfo(true);openDetail(id);
        if(document.getElementById('splash') || document.querySelector('#overlay2')?.innerHTML.trim())
          throw Error('2D fallback screenshot obscured');
        const card=document.querySelector('#overlay .hc');
        if(card?.dataset.cid!==id || !card.querySelector('.hcfig svg'))
          throw Error('Missing visible SVG hero fallback');
        if(!document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('.hc'))
          throw Error('2D hero card is not topmost');
      },id);
      await page.screenshot({path:path.join(out,`${width}x${height}-2d-${id}.png`)});
    }
    await page.close();
    console.log('PASS BH9.8 2D fallback',width+'x'+height);
  }
} finally {
  await fallbackBrowser.close();
  await fallbackServer.close();
}
assert.equal(results.length,4);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(results,null,2));
console.log('PASS BH9.8 procedural iPhone preview MED/LOW, 4 resolution/profile cases, both heroes, shared cards, live battle and 2D fallback');
