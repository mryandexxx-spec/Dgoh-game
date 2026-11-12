// Approved ordinary-arena framing and non-overlapping world HUD, on shipped code.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const out = path.resolve(process.argv[3] || 'dist/arena-framing');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
const save = fs.readFileSync('tests/fixtures/saves/03-late.json','utf8');
fs.mkdirSync(out,{recursive:true});
const browser = await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const srv = await serve(path.dirname(html));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
try {
  for (const [width,height,gfx] of [[844,390,'med'],[667,375,'low'],[844,390,'high']]) {
    const page = await browser.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    await page.setRequestInterception(true);
    page.on('request',r=>/^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url())?r.continue():r.abort());
    await page.evaluateOnNewDocument((save,p)=>{
      localStorage.setItem('dune-goh-v1',save); localStorage.setItem('dune-cine-off','true');
      localStorage.setItem('dune-gfx',JSON.stringify({p,auto:0}));
      try {Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch(e){}
    },save,gfx);
    await page.goto(srv.url(path.basename(html)),{waitUntil:'load'});
    await page.evaluate(async()=>{
      if(!await loadB3())throw Error('3D unavailable');
      const ids=Object.keys(CH).filter(id=>!CH[id].boss&&prog(id).stars).slice(0,5);
      const foes=Object.keys(CH).filter(id=>!CH[id].boss).slice(5,10);
      launch({mode:'camp',dlg:false,scene:'court',i:0,title:'Arena close framing',desert:false,
        squad:ids,enemy:foes.map(id=>enemyProg(id,65,false))});
      clearTimeout(BT.timer);
      const u=BT.B.units.find(u=>u.side==='A'&&u.def.basic.dt==='blade'); BT.B.active=u; BT.B.actor=u.uid; BT.waiting=u;
      ensureCur(BT.B,u); renderBattle();
      for(const el of document.querySelectorAll('.toast'))el.remove();
    });
    await sleep(1500);
    const results=[];
    const check = async tag=>{
      const data=await page.evaluate(()=>{
        const A=BT.arena;
        const rows=[...document.querySelectorAll('.unit:not(.dead) .world-label')].map(el=>{
          const r=el.getBoundingClientRect(), hud=el.querySelector('.hud').getBoundingClientRect();
          const s=el.parentElement.style;
          return {id:el.parentElement.dataset.uid,x:r.x,y:r.y,w:r.width,h:r.height,
            hud:{x:hud.x,y:hud.y,w:hud.width,h:hud.height},dx:s.getPropertyValue('--hud-x'),dy:s.getPropertyValue('--hud-y')};
        });
        const heroes=Object.values(A.units).filter(o=>!o.dead).map(o=>{
          const f=A.project(o.root.position),h=A.project(o.root.position.add(new __B3.Vector3(0,o.h,0)));
          return {id:o.uid,side:o.side,height:f[1]-h[1]};
        });
        const layout=[...A.worldHud.rows.values()].map(r=>({id:r.id,w:r.w,h:r.h,x:r.x,y:r.y,ax:r.ax,ay:r.ay}));
        return {cam:{x:A.camX,y:A.camH,z:A.camDist},rows,heroes,layout};
      });
      results.push({tag,...data});
      for(const a of data.rows){
        assert.ok(a.x>=11.5&&a.x+a.w<=width-11.5&&a.y>=59.5&&a.y+a.h<=height-99.5,tag+' label inside safe bounds '+a.id);
        for(const b of data.rows)if(a!==b) assert.ok(
          a.x+a.w+4.5<=b.x||b.x+b.w+4.5<=a.x||a.y+a.h+4.5<=b.y||b.y+b.h+4.5<=a.y,
          tag+' overlap '+a.id+'/'+b.id+' '+JSON.stringify([a,b]));
      }
      return data;
    };
    const first=await check('idle');
    assert.equal(first.rows.length,10); assert.equal(first.cam.y,3.9); assert.equal(first.cam.x,-11.5);
    assert.ok(first.heroes.filter(x=>x.side==='A').every(x=>x.height>=75),'allies must stay large');
    await page.screenshot({path:path.join(out,`idle-${width}-${gfx}.png`)});
    // Every indicator carries multiple effects, shield, leader and a target arrow.
    await page.evaluate(()=>{
      for(const u of BT.B.units)for(const k of ['attackUp','defUp','poison','counter','speedUp'])if(FX[k])u.fx[k]={turns:2,stacks:1};
      renderBattle();
    });
    await sleep(400); await check('effects');
    await page.screenshot({path:path.join(out,`effects-${width}-${gfx}.png`)});
    // Target selection is a real pointer event on the displaced label.
    const enemy=await page.evaluate(()=>BT.B.units.filter(u=>u.side==='B'&&!u.fx.taunt)[1]?.uid||BT.B.units.find(u=>u.side==='B').uid);
    await page.click(`.unit[data-uid="${enemy}"] .hud`);
    await sleep(300); assert.equal(await page.evaluate(()=>BT.cur),enemy,'label must select its own hero'); await check('target');
    // Use the actual battle action/animation; freeze only the subsequent turn.
    await page.evaluate(()=>{doAct(BT.waiting,'basic',BT.cur);clearTimeout(BT.timer);});
    for(let i=0;i<8;i++){await sleep(120);await check('attack-'+i);}
    await page.screenshot({path:path.join(out,`attack-${width}-${gfx}.png`)});
    await sleep(2200); await check('return');
    // Remove a unit (death), then rebuild the field; stale boxes must disappear.
    await page.evaluate(()=>{const u=BT.B.units.find(u=>u.side==='B');u.alive=false;u.hp=0;renderBattle();});
    await sleep(300); const dead=await check('death'); assert.ok(dead.rows.length<10);
    const cleanup=await page.evaluate(()=>{const a=BT.arena,h=a.worldHud;leaveBattle();return {alive:a.alive,rows:h.rows.size};});
    assert.equal(cleanup.alive,false);assert.equal(cleanup.rows,0); assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,`metrics-${width}-${gfx}.json`),JSON.stringify({results,cleanup,errors},null,2));
    console.log('PASS arena camera + real HUD collision/status/target/attack/death/dispose '+width+' '+gfx);
    await page.close();
  }
} finally {await browser.close();await srv.close();}
