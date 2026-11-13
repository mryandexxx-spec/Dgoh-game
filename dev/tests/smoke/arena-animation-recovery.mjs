// Full real-WebGL Muad Dib combat lifecycle; watch swallowed arena-loop warnings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {serve} from '../lib/serve.mjs';
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const out=path.resolve(process.argv[3]||'dist/arena-animation');fs.mkdirSync(out,{recursive:true});
const save=fs.readFileSync('tests/fixtures/saves/03-late.json','utf8');
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,
 args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const srv=await serve(path.dirname(html));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 for(const [width,height,p]of [[844,390,'med'],[667,375,'low']]){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/arena-loop|arena-pose|TypeError/.test(m.text()))errors.push(m.text());});
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
  await page.setRequestInterception(true);
  page.on('request',r=>/^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url())?r.continue():r.abort());
  await page.evaluateOnNewDocument((save,p)=>{
   localStorage.setItem('dune-goh-v1',save);localStorage.setItem('dune-gfx',JSON.stringify({p,auto:0}));
   localStorage.setItem('dune-cine-off','true');
   try{Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch{}
  },save,p);
  await page.goto(srv.url(path.basename(html)),{waitUntil:'load'});
  await page.evaluate(async()=>{
   await loadB3();
   for(let i=0;i<300&&!MODEL_DATA.muaddib;i++)await new Promise(r=>setTimeout(r,50));
   if(!MODEL_DATA.muaddib)throw Error('Authored Muad Dib not loaded');
   Object.assign(prog('muaddib'),{stars:7,lvl:85,gear:13});
   launch({mode:'camp',dlg:false,scene:'giedi',i:0,title:'Animation recovery',desert:false,
    squad:['muaddib','leto','paul','jessica','duncan'],enemy:['trooper','feyd','rabban','thufir','baron'].map(id=>enemyProg(id,85,false))});
   clearTimeout(BT.timer);BT.speed=4;
   const u=BT.B.units.find(u=>u.def.id==='muaddib');BT.waiting=u;BT.B.active=u;BT.B.actor=u.uid;ensureCur(BT.B,u);
   for(const u of BT.B.units){u.maxHp=u.hp=1e7;u.maxShield=u.shield=1e6;}
   renderBattle();
   if(!BT.arena.units[u.uid].root._clipRest)throw Error('Need real local-TRS authored model');
  });
  const samples=[];
  const check=async label=>{
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await page.waitForFunction(()=>[...BT.arena.worldHud.rows.values()].every(r=>{
    const b=r.label.getBoundingClientRect();return Math.abs(Math.ceil(b.width)-r.w)<=1&&Math.abs(Math.ceil(b.height)-r.h)<=1;
   }),{timeout:15000,polling:'raf'});
   const d=await page.evaluate(()=>{
    const A=BT.arena;
    const faults=[...ERR_T.keys()].filter(x=>x.startsWith('arena-loop|')||x.startsWith('arena-pose:'));
    const rects=[...document.querySelectorAll('.unit:not(.dead) .world-label')].map(el=>{const b=el.getBoundingClientRect();return{id:el.parentElement.dataset.uid,x:b.x,y:b.y,w:b.width,h:b.height};});
    const rows=[...A.worldHud.rows.values()].filter(r=>!r.dead).map(r=>({id:r.id,x:r.x,y:r.y,w:r.w,h:r.h}));
    return {frames:A.scene.getFrameId(),faults,rects,rows,flash:A.glLight?.intensity||0,
     authored:Object.values(A.units).find(o=>o.def.id==='muaddib').root._clip,
     sun:A.sun.intensity,ambient:A.scene.lights.find(l=>l.name==='hemi')?.intensity};
   });
   assert.deepEqual(d.faults,[],label+' swallowed arena exception');
   for(const a of d.rects){
    const r=d.rows.find(r=>r.id===a.id);if(!r)continue;
    if(!(Math.abs(a.x-r.x)<1&&Math.abs(a.y-r.y)<1)){
     const detail=await page.evaluate(id=>{
      const A=BT.arena,row=A.worldHud.rows.get(id),el=row?.label,unit=el?.parentElement,field=document.getElementById('field');
      const cr=A.cv.getBoundingClientRect(),fr=field?.getBoundingClientRect(),ur=unit?.getBoundingClientRect(),lr=el?.getBoundingClientRect();
      return {id,bodyScroll:[scrollX,scrollY],cr:{x:cr.x,y:cr.y,w:cr.width,h:cr.height},fr:fr&&{x:fr.x,y:fr.y,w:fr.width,h:fr.height},
       ur:ur&&{x:ur.x,y:ur.y,w:ur.width,h:ur.height},lr:lr&&{x:lr.x,y:lr.y,w:lr.width,h:lr.height},
       fieldInset:A._hudInsets,origin:[A._hdx,A._hdy],dimensions:[A.w,A.h],
       unitInline:unit?.getAttribute('style'),labelInline:el?.getAttribute('style'),
       transform:el&&getComputedStyle(el).transform,row:row&&{x:row.x,y:row.y,w:row.w,h:row.h,ax:row.ax,ay:row.ay,dx:row.dx,dy:row.dy,seen:row.seen,dead:row.dead}};
     },a.id);
     console.error('ARENA_HUD_DRIFT_DIAG '+label+' '+JSON.stringify(detail));
    }
    assert.ok(Math.abs(a.x-r.x)<1&&Math.abs(a.y-r.y)<1,label+' HUD projection drift '+a.id);
   }
   samples.push({label,...d});return d;
  };
  await sleep(500);const initial=await check('initial');
  // Regression for issue #63: a 3D battle must never translate the DOM HUD
  // independently of its WebGL canvas when the legacy quake class fires.
  // The camera already implements the 3D shake. Keep the <1px HUD assertion.
  await page.evaluate(()=>document.querySelector('.battle.pkg9')?.classList.add('quake'));
  await sleep(130);
  const quakeName=await page.evaluate(()=>getComputedStyle(document.querySelector('.battle.pkg9 .bwrap')).animationName);
  assert.equal(quakeName,'none','3D quake cannot animate the HUD wrapper independently of the canvas');
  await check('3d-quake-isolation');
  await page.evaluate(()=>document.querySelector('.battle.pkg9')?.classList.remove('quake'));
  for(const speed of [1,4])for(let cycle=0;cycle<3;cycle++){
   await page.evaluate(speed=>{
    const u=BT.B.units.find(u=>u.def.id==='muaddib');BT.speed=speed;BT.auto=false;BT.waiting=u;BT.B.active=u;BT.B.actor=u.uid;
    ensureCur(BT.B,u);renderBattle();doAct(u,'basic',BT.cur);clearTimeout(BT.timer);
   },speed);
   await page.waitForFunction(()=>{const o=Object.values(BT.arena.units).find(o=>o.def.id==='muaddib');return !o.act&&o.root._clip==='Idle';},{timeout:25000});
   const d=await check('basic-idle-x'+speed+'-'+cycle);
   assert.ok(d.frames>initial.frames,'scene stopped rendering');
   await page.evaluate(()=>{const o=Object.values(BT.arena.units).find(o=>o.def.id==='muaddib');o.hitT=performance.now();});
   await sleep(450);await check('hit-idle');
  }
  // Flash cleanup and actual automated combat at x4 after repeated transitions.
  await page.evaluate(()=>{BT.arena.glT=performance.now();BT.auto=true;BT.speed=4;step();});
  const start=await check('auto-start');await sleep(8000);
  const auto=await check('auto-x4');assert.ok(auto.frames>start.frames+5,'auto froze');
  assert.equal(auto.sun,initial.sun);assert.equal(auto.ambient,initial.ambient);
  await page.evaluate(()=>{clearTimeout(BT.timer);BT.auto=false;});
  await sleep(1800);const end=await check('flash-expired');assert.equal(end.flash,0,'flash lighting stuck');
  await page.screenshot({path:path.join(out,`arena-${width}-${p}.png`)});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,`result-${width}-${p}.json`),JSON.stringify({samples,errors},null,2));
  console.log('PASS real authored combat + auto x4 + animation/HUD/light recovery '+width+' '+p);
  await page.close();
 }
}finally{await browser.close();await srv.close();}
