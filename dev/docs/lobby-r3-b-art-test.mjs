import puppeteer from '../node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out = process.env.LAB_OUT || '/tmp/lobby-r3';
await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{
 for (const [width,height] of [[844,390],[667,375]]){
 const page=await browser.newPage();await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8765/dev/docs/lobby-r3-b-art.html',{waitUntil:'domcontentloaded'});
 try{await page.waitForFunction(()=>window.lab?.ready===true||window.lab?.errors?.length>0,{timeout:90000});await page.waitForFunction(()=>window.lab?.ready===true,{timeout:90000});}catch(e){await page.screenshot({path:out+'/error-'+width+'.png'});report.push({width,error:String(e),lab:await page.evaluate(()=>window.lab),errors});continue}
 const info=await page.evaluate(()=>JSON.parse(JSON.stringify(window.lab)));const routes=[];
 await page.screenshot({path:out+'/'+width+'-center.png'});
 for (const route of ['squad','camp']){const el=await page.$('[data-route="'+route+'"]:not([hidden])');assert(el,route);await el.click();await page.waitForFunction(()=>!document.getElementById('notice').hidden);assert.equal(await page.evaluate(()=>window.lab.route),route);routes.push(route);await page.click('#close')}
 await page.mouse.move(width*.36,height*.78);await page.mouse.down();await page.mouse.move(width*.76,height*.78,{steps:10});await page.mouse.up();await page.waitForFunction(()=>window.lab.zone===0);await new Promise(r=>setTimeout(r,700));await page.screenshot({path:out+'/'+width+'-left.png'});
 for (const route of ['legend','trials','raid']){const el=await page.$('[data-route="'+route+'"]:not([hidden])');assert(el,route);await el.click();assert.equal(await page.evaluate(()=>window.lab.route),route);routes.push(route);await page.click('#close')}
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>window.lab.zone===2);await new Promise(r=>setTimeout(r,700));await page.screenshot({path:out+'/'+width+'-right.png'});
 for(const route of ['conq','shop','recycler']){const el=await page.$('[data-route="'+route+'"]:not([hidden])');assert(el,route);await el.click();assert.equal(await page.evaluate(()=>window.lab.route),route);routes.push(route);await page.click('#close')}
 report.push({width,height,info,routes,errors});await page.close();
 }
}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close()}
assert.equal(report.length,2);for(const row of report){assert(!row.error,JSON.stringify(row));assert.equal(row.info.models.filter(m=>m.ok).length,5,JSON.stringify(row.info));assert.equal(row.info.landmarks.filter(m=>m.ok).length,3);assert.equal(row.routes.length,8);assert.equal(row.errors.length,0,JSON.stringify(row.errors));assert(row.info.frames>0)}
console.log('R3 isolated WebGL: 2 sizes, 6 frames, 16 routes, real model/GLB loads');
