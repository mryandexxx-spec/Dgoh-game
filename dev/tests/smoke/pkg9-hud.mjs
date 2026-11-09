// Package 9: real browser HUD interactions at both landscape phone sizes.
// This tests the shipped PWA (not the visual approval mockup).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../lib/serve.mjs';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const out = path.resolve(process.argv[3] || 'dist/pkg9-shots');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(f => fs.existsSync(f));
if (!chrome) throw Error('Chrome not found');
const SAVE = fs.readFileSync('tests/fixtures/saves/03-late.json', 'utf8');
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const srv = await serve(path.dirname(html));
let errorsCount = 0;
try {
  for (const [width,height,gfx] of [[844,390,'med'],[667,375,'low']]) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true });
    await page.setRequestInterception(true);
    page.on('request', r => /^(data|blob):|^http:\/\/127\.0\.0\.1:/.test(r.url()) ? r.continue() : r.abort());
    await page.evaluateOnNewDocument((save,p) => {
      localStorage.setItem('dune-goh-v1',save);
      localStorage.setItem('dune-cine-off','true');
      localStorage.setItem('dune-gfx',JSON.stringify({p,auto:0}));
      try {Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch(e){}
    }, SAVE, gfx);
    await page.goto(srv.url(path.basename(html)), {waitUntil:'load'});
    await page.evaluate(async () => {
      if (!await loadB3()) throw Error('3D unavailable');
      const ids=Object.keys(CH).filter(id=>CH[id]&&!CH[id].boss&&prog(id).stars).slice(0,5);
      const enemies=Object.keys(CH).filter(id=>CH[id]&&!CH[id].boss).slice(5,10);
      launch({mode:'camp',dlg:false,scene:'court',i:0,title:'Проверка A3+A4',desert:false,
        squad:ids,enemy:enemies.map(id=>enemyProg(id,65,false))});
    });
    await page.waitForFunction(() => !!(window.BT && BT.waiting && document.querySelector('.battle.pkg9 .pkg9-action')), {timeout:30000});
    const a = await page.evaluate(() => {
      const el = s => document.querySelector(s);
      const box = s => {const r=el(s)?.getBoundingClientRect();return r && {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
      return { pkg9:!!el('.battle.pkg9'), drawer:!!el('.pkg9-drawer'),
        actor:box('.pkg9-actor'), abilities:[...document.querySelectorAll('.pkg9-action .abil')].map(n => {
          const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};
        }), controls:box('.pkg9-controls'), enemy:box('.pkg9-enemy'),
        compact:el('#battle').classList.contains('compact-world-hud') };
    });
    const inside = r => r && r.x >= -1 && r.y >= -1 && r.right <= width+1 && r.bottom <= height+1;
    const pass = a.pkg9 && !a.drawer && inside({...a.actor,right:a.actor.x+a.actor.w,bottom:a.actor.y+a.actor.h}) &&
      a.abilities.length >= 3 && a.abilities.every(inside) &&
      inside({...a.controls,right:a.controls.x+a.controls.w,bottom:a.controls.y+a.controls.h}) &&
      inside({...a.enemy,right:a.enemy.x+a.enemy.w,bottom:a.enemy.y+a.enemy.h}) &&
      a.compact === (gfx==='low');
    await page.screenshot({path:path.join(out,'battle-'+width+'-'+gfx+'.png')});
    await page.click('[data-bdrawer]');
    const open = await page.$('.pkg9-drawer .pkg9-log') !== null;
    await page.click('.pkg9-dhead [data-bdrawer]');
    const closed = await page.$('.pkg9-drawer') === null;
    await page.click('[data-hud]');
    const hidden = await page.$eval('#battle', e => e.classList.contains('hud-hidden'));
    const compact = await page.$eval('#battle', e => e.classList.contains('compact-world-hud'));
    const good = pass && open && closed && hidden && compact === a.compact && errors.length===0;
    console.log((good?'PASS':'FAIL')+' package9 HUD '+width+'x'+height+' / '+gfx+' actions='+a.abilities.length+' drawer='+open+'/'+closed+' errors='+errors.length);
    if (!good) {console.log(JSON.stringify({a,open,closed,hidden,compact,errors}));errorsCount++;}
    await page.close();
  }
} finally {await browser.close();await srv.close();}
if (errorsCount) process.exit(1);
