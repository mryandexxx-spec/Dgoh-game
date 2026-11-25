// GFX-05/D: real verified progression handlers on isolated browser fixtures.
// No synthetic heroFeedback calls, fake writer, or production save changes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const profile = process.argv[3] || 'med';
const width = Number(process.argv[4] || 844);
const height = width === 667 ? 375 : 390;
const out = path.resolve(process.argv[5] || 'gfx05d-evidence');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p => fs.existsSync(p));
assert(chrome, 'Chrome required');
fs.mkdirSync(out, { recursive: true });
const fixture = JSON.parse(fs.readFileSync(path.join(here,'../fixtures/saves/03-late.json'),'utf8'));
const server = await serve(path.dirname(html));
const browser = await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const reports = [];
try {
  for (const id of ['duncan','muaddib']) {
    const ctx = await browser.createBrowserContext();
    try {
      const page = await ctx.newPage();
      await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
      await page.emulateTimezone('Europe/Moscow');
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const save = structuredClone(fixture);
      Object.assign(save.roster[id], { stars:id==='duncan'?6:7, shards:1000, lvl:10, gear:13, relic:0, eq:[true,true,true,true,true,false] });
      save.solari = 100000000;
      save.plast = 100000;
      await page.evaluateOnNewDocument((s,p) => {
        localStorage.setItem('dune-goh-v1',JSON.stringify(s));
        localStorage.setItem('dune-cine-off','true');
        localStorage.setItem('dune-gfx',JSON.stringify({p,auto:0}));
        try { Object.defineProperty(navigator,'serviceWorker',{value:undefined}); } catch {}
      },save,profile);
      await page.goto(server.url(path.basename(html)),{waitUntil:'load',timeout:180000});
      const ev = code => page.evaluate(c => (0,eval)(c),code);
      const wait = code => page.waitForFunction(c => {try{return !!(0,eval)(c)}catch{return false}}, {timeout:60000,polling:100},code);
      await wait("loadSave.writer.state().gated && loadSave.writer.state().status === 'owned' && !!S");
      assert(await ev("loadB3()"),'WebGL unavailable');
      const h = JSON.stringify(id);
      // Seed an owned item through the genuine writer (only this temporary fixture).
      assert(await ev(`loadSave.writer.transact(()=>{const p=prog(${h});p.gear=MAX_GEAR;p.eq=[true,true,true,true,true,false];const item=slotState(${h},5).it.id;S.gearOwned[item]=1;for(const [k,n] of Object.entries(MEM_COSTS[1]))if(k!=='sol')S[k]=n*2;return true}).ok`),'fixture commit failed');
      const open = async () => {
        await ev(`closeInfo(true);closeOverlay();openDetail(${h});`);
        await wait(`HERO_STAGE?.motionHero===${h} && HERO_STAGE.o.root._authored && HERO_STAGE.awake && HERO_STAGE.isCur()`);
        await page.waitForFunction(()=>!document.querySelector('#splash') || document.querySelector('#splash').classList.contains('off'),{timeout:30000});
      };
      await open();
      await ev(`(() => {
        const key=loadSave.writer.primaryKey;
        window.__gfxD={calls:[], accents:[]};
        const h=HERO_STAGE, play=h.playCinematic;
        h.playCinematic=function(kind){
          const result=play.call(this,kind);
          window.__gfxD.calls.push({kind,result,raw:localStorage.getItem(key)});
          return result;
        };
        const animate=Element.prototype.animate;
        Element.prototype.animate=function(frames,opts){
          if(this.closest('#celeb') || this.closest('#overlay2')) window.__gfxD.accents.push({duration:opts?.duration,raw:localStorage.getItem(key)});
          return animate.call(this,frames,opts);
        };
      })()`);
      const snapshot = () => ev(`(() => {const raw=localStorage.getItem(loadSave.writer.primaryKey);return {raw,hero:JSON.parse(raw).roster[${h}],live:prog(${h}),calls:window.__gfxD.calls.slice(),accents:window.__gfxD.accents.slice(),cinematic:HERO_STAGE?.cinematic?.kind||null}})()`);
      const clear = () => ev("HERO_STAGE.cancelCinematic();window.__gfxD.calls.length=0;window.__gfxD.accents.length=0;");
      const accepted = async (name, action, verify, dialogDuration=null, motion=profile==='med') => {
        await clear();
        const before = await snapshot();
        await ev(action);
        const after = await snapshot();
        assert.notEqual(after.raw,before.raw,name+' did not commit');
        verify(before,after);
        assert.equal(after.live.lvl,after.hero.lvl,name+' live/save disagreement');
        assert(after.calls.length>0,name+' missing post-commit signal');
        assert(after.calls.every(c=>c.raw===after.raw),name+' signal before verified storage');
        if(dialogDuration===null) assert.equal(after.calls.some(c=>c.result),motion,name+' motion gate');
        if(dialogDuration!==null){
          await wait("!!document.querySelector('#celeb')");
          const overlay=await snapshot();
          assert.equal(overlay.accents.filter(a=>a.duration===dialogDuration).length,motion?1:0,name+' overlay accent count');
          assert(overlay.accents.every(a=>a.raw===after.raw),name+' overlay before commit');
          await page.screenshot({path:path.join(out,id+'-'+name+'.png')});
          await ev("celebClick({celebok:'1'});");
          await new Promise(r=>setTimeout(r,750));
          assert(!(await snapshot()).cinematic,name+' replay after overlay');
        }
        reports.push({id,profile,width,name,committed:true,motion:after.calls.map(c=>c.result)});
      };
      const denied = async (name, action) => {
        await clear(); const before=await snapshot(); await ev(action);
        await new Promise(r=>setTimeout(r,120));
        const after=await snapshot();
        assert.equal(after.raw,before.raw,name+' changed storage');
        assert.deepEqual(after.live,before.live,name+' changed live hero');
        assert.equal(after.calls.length,0,name+' emitted cinematic');
        assert.equal(after.accents.length,0,name+' emitted overlay accent');
        assert.equal(await page.$('#celeb'),null,name+' emitted dialog');
        await ev("closeInfo(true);");
        reports.push({id,profile,width,name,denied:true});
      };
      await accepted('level',`verifiedUpgradeClick({lvl:${h}})`,(b,a)=>assert.equal(a.hero.lvl,b.hero.lvl+1));
      await accepted('craft-all',`craftAll(${h})`,(b,a)=>{assert.equal(b.hero.eq[5],false);assert.equal(a.hero.eq[5],true)});
      await denied('craft-repeat',`craftAll(${h})`);
      if(id==='duncan'){
        await accepted('star',`verifiedUpgradeClick({star:${h}})`,(b,a)=>assert.equal(a.hero.stars,b.hero.stars+1),420);
      }
      await denied('star-max',`verifiedUpgradeClick({star:${h}})`);
      await open();
      await accepted('relic',`verifiedUpgradeClick({relic:${h}})`,(b,a)=>assert.equal(a.hero.relic,b.hero.relic+1),600);
      await open();
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await accepted('reduced-level',`verifiedUpgradeClick({lvl:${h}})`,(b,a)=>assert.equal(a.hero.lvl,b.hero.lvl+1),null,false);
      await page.emulateMediaFeatures([]);
      await clear();
      await open();
      assert(!(await snapshot()).cinematic,'reopen replayed progression');
      await page.screenshot({path:path.join(out,id+'-reopen.png')});
      assert.deepEqual(errors,[],'browser page errors');
      fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(reports,null,2));
    } finally { await ctx.close(); }
  }
} finally { await browser.close(); server.close(); }
console.log(JSON.stringify(reports,null,2));
