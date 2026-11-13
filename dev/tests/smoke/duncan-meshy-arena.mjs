// Exercise Duncan via the normal battle ability entry point, then capture each contact.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {serve} from '../lib/serve.mjs';
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const out=path.resolve(process.argv[3]||'dist/duncan-meshy-shots');fs.mkdirSync(out,{recursive:true});
const save=fs.readFileSync('tests/fixtures/saves/03-late.json','utf8');
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,
 args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const srv=await serve(path.dirname(html));
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
   launch({mode:'camp',dlg:false,scene:'giedi',i:0,title:'Duncan ultimate',desert:false,
    squad:['paul','leto','jessica','duncan'],enemy:['trooper','feyd','rabban','thufir','baron'].map(id=>enemyProg(id,85,false))});
   clearTimeout(BT.timer);BT.speed=4;
   const u=BT.B.units.find(u=>u.def.id==='duncan');BT.waiting=u;BT.B.active=u;BT.B.actor=u.uid;ensureCur(BT.B,u);
   for(const u of BT.B.units){u.maxHp=u.hp=1e7;u.maxShield=u.shield=1e6;}
   renderBattle();
   if(!BT.arena.units[u.uid].root._clipRest)throw Error('Need real local-TRS authored model');
  });

  await page.evaluate(async()=>{await BT.arena.scene.whenReadyAsync();});
  const sample=await page.evaluate(()=>{
    const u=BT.B.units.find(u=>u.def.id==='duncan'),a=BT.arena,o=a.units[u.uid];
    BT.auto=false;BT.speed=1;BT.waiting=u;BT.B.active=u;BT.B.actor=u.uid;ensureCur(BT.B,u);
    renderBattle();doAct(u,'ult',BT.cur);clearTimeout(BT.timer);
    const action=o.act;
    if(!action||action.ab!==o.def.ult)throw Error('Arena ultimate did not start');
    const frames=[];
    for(const k of [.08,.16,.24,.45,.53,.71,.77,.825,1]){
      poseHuman(a,o,action.t0+k*action.dur,2,1);a.scene.render();
      const gl=a.engine._gl,w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,p=new Uint8Array(w*h*4);
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d'),im=c.createImageData(w,h);
      for(let y=0;y<h;y++)im.data.set(p.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);c.putImageData(im,0,0);
      frames.push({k,png:cv.toDataURL(),count:action.strikesPlayed,yaw:o.root.rotation.y,clip:o.root._clip});
    }
    return frames;
  });
  for(const f of sample){fs.writeFileSync(path.join(out,'duncan-ult-'+p+'-'+f.k+'.png'),Buffer.from(f.png.split(',')[1],'base64'));delete f.png;}
  console.log(p,JSON.stringify(sample));assert.deepEqual(sample.map(f=>f.count),[1,2,3,4,5,6,7,8,8]);assert.equal(sample.at(-1).clip,'Idle');assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close();await srv.close();}
