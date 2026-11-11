// BH8 — real WebGL/SwiftShader frames of the *staged* legendary Baron DGM.
// No live CHARS registration, save mutation, new Engine or client preview route.
// Usage: node tests/smoke/baron-legend-gl.mjs dist/pwa/index.html
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';

const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const chrome=process.env.CHROME_PATH||'/usr/bin/chromium';
const out=path.resolve('dist/baron-legend-bh8-shots');
const save=fs.readFileSync('tests/fixtures/saves/03-late.json','utf8');
fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:chrome,headless:true,
 args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const srv=await serve(path.dirname(html));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const all=[];
try {
 for(const [w,h,q] of [[844,390,'med'],[667,375,'low'],[844,390,'low']]){
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.setViewport({width:w,height:h,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
  await page.evaluateOnNewDocument((data,quality)=>{
   localStorage.setItem('dune-goh-v1',data);
   localStorage.setItem('dune-gfx',JSON.stringify({p:quality,auto:0,bad:0,good:0,noUp:true}));
   localStorage.setItem('dune-cine-off','false');
   try{Object.defineProperty(navigator,'serviceWorker',{value:undefined})}catch{}
  },save,q);
  await page.goto(srv.url(path.basename(html)),{waitUntil:'load',timeout:120000});
  const begin=await page.evaluate(async()=>{
   if(!await loadB3())throw Error('Babylon chunk unavailable');
   if(!MODEL_DATA.baron_legend)throw Error('Staged DGM not loaded');
   const ids=Object.keys(CH).filter(id=>CH[id]&&!CH[id].boss&&prog(id).stars).slice(0,5);
   const enemies=Object.keys(CH).filter(id=>CH[id]&&!CH[id].boss).filter(id=>!ids.includes(id)).slice(0,5);
   if(ids.length!==5||enemies.length!==5)throw Error('5v5 fixture incomplete');
   launch({mode:'camp',dlg:false,scene:'court',i:0,title:'BH8\u2009—\u2009preview',desert:false,
     squad:ids,enemy:enemies.map(id=>enemyProg(id,65,false))});
   return {ids,enemies};
  });
  await page.waitForFunction(()=>!!(window.BT?.arena?.scene?.getFrameId?.()>3),{timeout:60000});
  const initial=await page.evaluate(()=>{
    const a=BT.arena;
    const source=a.units.u0;
    if(!source)throw Error('Original live actor unavailable');
    source.root.setEnabled(false);source.ring?.setEnabled(false);source.pool?.setEnabled(false);
    const def={id:'baron_legend',f:['hark'],role:'sup',legendary:true,
      basic:{n:'Приказ Барона',dt:'voice',tgt:'enemy'},
      special:{n:'Власть через страх'},ult:{n:'Глаза императора'},
      gl:{n:'Падение Атрейдесов',kind:'fall-of-atreides'}};
    a.addUnit({uid:'bh8_preview',idx:0,side:'A',gear:13,relic:0,def});
    const caster=a.units.bh8_preview;
    if(!caster?.root?._authored)throw Error('Model fell back to procedural');
    if(caster.root.getChildMeshes().filter(x=>x.skeleton).length!==11)
      throw Error('Expected 11 skinned model meshes');
    const foes=BT.B.units.filter(x=>x.side==='B').map(x=>a.units[x.uid]).filter(Boolean);
    if(foes.length<4)throw Error('Enemy formation missing');
    const t0=performance.now();
    caster.act={key:'gl',kind:'cast',t0,dur:2500,dir:V3(1,0,0),to:caster.base.clone(),tg:foes};
    a.startBaronGL(caster,foes,t0,1);
    window.__bh8={caster,foes,started:t0,initialMeshes:a.scene.meshes.length};
    return {meshes:a.scene.meshes.length,previewSkinned:caster.root.getChildMeshes().filter(x=>x.skeleton).length};
  });
  let phase=0;
  for(const [name,at] of [['rise',360],['command',1100],['strike',1900]]){
    const passed=await page.evaluate(()=>performance.now()-__bh8.started);
    if(passed<at)await sleep(at-passed);
    const stats=await page.evaluate(()=>{
      const a=BT.arena; a._loop(); const G=a.baronGL;
      return {motion:__bh8.caster.root._motion,chairMeshes:G?.chair?.getChildMeshes().length||0,
        rootY:__bh8.caster.root.position.y,frame:a.scene.getFrameId(),
        liveMeshes:a.scene.meshes.length,GLactive:!!G};
    });
    await page.screenshot({path:path.join(out,`${w}x${h}-${q}-${name}.png`)});
    all.push({w,h,q,name,...stats});
    assert(stats.frame>0,'real WebGL frame required: '+JSON.stringify(stats));
    assert(stats.GLactive,'GL ended before '+name);
    assert(stats.chairMeshes>=7,'GL chair lost in '+name);
    phase++;
  }
  const passed=await page.evaluate(()=>performance.now()-__bh8.started);
  if(passed<3000)await sleep(3000-passed);
  const end=await page.evaluate(()=>{
    const a=BT.arena;
    const visible=Object.values(a.units).filter(o=>o.def.id==='baron_legend');
    return {ended:!a.baronGL,modelOnlyPreview:visible.length===1,
      youthInPublicCH:!!CH.baron,legendInPublicCH:!!CH.baron_legend,
      frame:a.scene.getFrameId()};
  });
  assert.equal(end.ended,true,'chair lifecycle must finish');
  assert.equal(end.modelOnlyPreview,true);
  assert.equal(end.youthInPublicCH,true);
  assert.equal(end.legendInPublicCH,false,'public roster must remain locked');
  assert.deepEqual(errors,[],'GPU/browser errors');
  console.log('PASS BH8 real WebGL staged Baron',w+'x'+h,q,JSON.stringify({begin,initial,end,phases:phase}));
  await page.close();
 }
}finally{await browser.close();await srv.close()}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(all,null,2));
assert.equal(all.length,9);
console.log('PASS BH8 nine WebGL/SwiftShader frames of three GL stages, no public hero change');
