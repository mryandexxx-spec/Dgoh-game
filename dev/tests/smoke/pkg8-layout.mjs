// Пакет 8: реальная WebGL-проекция 5×5 на iPhone. Проверяет не боковую камеру,
// расстояние между экранными силуэтами и компактный HUD LOW; сохраняет снимки.
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
    const result = await page.evaluate(async ()=>{
      if(!await loadB3()) throw Error('3D engine did not load');
      const ids = Object.keys(CH).filter(id=>CH[id]&&!CH[id].boss&&prog(id).stars).slice(0,5);
      if(ids.length!==5) throw Error('Need 5 unlocked allies, got '+ids.length);
      const foeIds = Object.keys(CH).filter(id=>CH[id]&&!CH[id].boss).slice(5,10);
      if(foeIds.length!==5) throw Error('Need 5 opponents');
      launch({mode:'camp',dlg:false,scene:'court',i:0,title:'Тест построения 5×5',
        desert:false,squad:ids,enemy:foeIds.map(id=>enemyProg(id,65,false))});
      if(!BT.arena) throw Error('Arena3D not mounted');
      // Замеряем геометрию самой сцены, без CSS-имитации и без сортировки по DOM.
      const A=BT.arena;
      for (let i=0; i<100 && A.scene.getFrameId()<2; i++) await new Promise(r=>setTimeout(r,30));
      if (A.scene.getFrameId()<2) throw Error('Arena did not render');
      const arr=Object.values(A.units).map(o=>{
        const p=A.project(o.base.add(new __B3.Vector3(0,o.h*.65,0)));
        return {side:o.side,x:p[0],y:p[1],z:o.base.z,worldX:o.base.x};
      });
      if(arr.length!==10) throw Error('Expected 10 models, got '+arr.length);
      const minDistance=side=>{
        const a=arr.filter(o=>o.side===side);let d=Infinity;
        for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)
          d=Math.min(d,Math.hypot(a[i].x-a[j].x,a[i].y-a[j].y));
        return d;
      };
      return {arr,allyMin:minDistance('A'),enemyMin:minDistance('B'),
        cam:{x:A.camX,y:A.camH,z:A.camDist},w:A.w,h:A.h,
        compact:document.getElementById('battle').classList.contains('compact-world-hud')};
    });
    await new Promise(r=>setTimeout(r,1200));
    await page.screenshot({path:path.join(shots,`battle-${width}-${gfx}${baseline?'-v75':''}.png`)});
    const all=result.arr, ally=all.filter(o=>o.side==='A'), enemy=all.filter(o=>o.side==='B');
    const valid=baseline ? !errors.length && all.length===10 : !errors.length && result.cam.x < -10 &&
      ally.every(o=>o.worldX<0) && enemy.every(o=>o.worldX>0) &&
      result.allyMin >= 45 && result.enemyMin >= 43 &&
      Math.max(...ally.map(o=>o.x)) < Math.max(...enemy.map(o=>o.x)) &&
      result.compact === (gfx==='low') &&
      all.every(o=>o.x>=35&&o.x<=width-30&&o.y>=65&&o.y<=height-45);
    console.log((valid?'PASS':'FAIL')+(baseline?' v75 reference ':' camera + 5x5 spacing ')+width+'×'+height+' '+gfx+
      ' ally '+result.allyMin.toFixed(1)+'px enemy '+result.enemyMin.toFixed(1)+'px'+
      ' camera '+JSON.stringify(result.cam)+' errors '+errors.length);
    if(!valid){ console.log(JSON.stringify(result));failed++;}
    await page.close();
  }
} finally {await browser.close();await srv.close();}
if(failed) process.exit(1);
