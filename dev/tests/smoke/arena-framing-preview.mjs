// Review only: capture current arena and a runtime-only camera/formation proposal.
// No production parameters or visual goldens are changed.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const shots = path.resolve(process.argv[3] || 'dist/pkg8-shots');
const baseline = process.argv.includes('--baseline');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(f => fs.existsSync(f));
if (!chrome) throw Error('Chrome not found');
const SAVE = fs.readFileSync('tests/fixtures/saves/03-late.json', 'utf8');
const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const srv = await serve(path.dirname(html));
fs.mkdirSync(shots, {recursive:true});
let failed = 0;
try {
  for (const [width,height,gfx] of [[844,390,'med'],[667,375,'low']]) {
    const page = await browser.newPage();
    await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    const errors = [];
    page.on('pageerror', e=>errors.push(e.message));
    await page.setRequestInterception(true);
    page.on('request', r=>/^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url())?r.continue():r.abort());
    await page.evaluateOnNewDocument((save, quality)=>{
      localStorage.setItem('dune-goh-v1',save);
      localStorage.setItem('dune-cine-off','true');
      localStorage.setItem('dune-gfx',JSON.stringify({p:quality,auto:0}));
      try { Object.defineProperty(navigator,'serviceWorker',{value:undefined}); } catch (e) {}
    },SAVE,gfx);
    await page.goto(srv.url(path.basename(html)),{waitUntil:'load'});
    await page.evaluate(async ()=>{
      if(!await loadB3()) throw Error('3D engine did not load');
      const ids = Object.keys(CH).filter(id=>CH[id]&&!CH[id].boss&&prog(id).stars).slice(0,5);
      if(ids.length!==5) throw Error('Need 5 unlocked allies, got '+ids.length);
      const foeIds = Object.keys(CH).filter(id=>CH[id]&&!CH[id].boss).slice(5,10);
      if(foeIds.length!==5) throw Error('Need 5 opponents');
      launch({mode:'camp',dlg:false,scene:'court',i:0,title:'Тест построения 5×5',
        desert:false,squad:ids,enemy:foeIds.map(id=>enemyProg(id,65,false))});
      if(!BT.arena) throw Error('Arena3D not mounted');
      clearTimeout(BT.timer); BT.waiting = true;
    });
    await new Promise(r=>setTimeout(r,1200));
    await page.screenshot({path:path.join(shots,`before-${width}-${gfx}.png`)});
    await page.evaluate(()=>{
      const A=BT.arena;
      A.camX=-13; A.camH=4.8; A.camDist=11; A.look.set(0,1.4,0);
      A.camera.fov=34*Math.PI/180;
      for(const o of Object.values(A.units)) {
        const i=o.slot[3]??0, ally=o.side==='A';
        const rear=i===1||i===3, z=[0,-1.8,3.6,1.8,-3.6][i];
        const x=ally?(rear?-5.2:-3.2):(rear?5.2:3.2);
        o.base.set(x,A.heightAt(x,z),z); o.root.position.copyFrom(o.base);
        o.ring.position.set(x,o.base.y+.05,z); if(o.pool)o.pool.position.set(x,o.base.y+.04,z);
      }
    });
    await new Promise(r=>setTimeout(r,1000));
    await page.screenshot({path:path.join(shots,`after-${width}-${gfx}.png`)});
    const metrics=await page.evaluate(()=>Object.values(BT.arena.units).map(o=>({side:o.side,h:o.h,foot:BT.arena.project(o.base),head:BT.arena.project(o.base.add(new __B3.Vector3(0,o.h,0)))})));
    fs.writeFileSync(path.join(shots,`metrics-${width}-${gfx}.json`),JSON.stringify({width,gfx,errors,metrics},null,2));
    if(errors.length) throw Error(errors.join('\n'));
    console.log(JSON.stringify({width,gfx,errors,metrics}));
    await page.close();
  }
} finally {await browser.close();await srv.close();}
if(failed) process.exit(1);
