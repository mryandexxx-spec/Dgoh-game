// Regression: authored Baron, upgraded portrait cache, source clips and A/B images.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const before = path.resolve(process.argv[3] || '../index.html');
const out = path.resolve('dist/young-baron-shots'); fs.mkdirSync(out,{recursive:true});
const save = fs.readFileSync('tests/fixtures/saves/03-late.json','utf8');
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/chromium',headless:true,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try {
 for (const [tag,file] of [['before',before],['after',html]]) {
  const srv = await serve(path.dirname(file));
  try {
   for (const [width,height,quality] of [[844,390,'med'],[667,375,'low']]) {
    const p=await browser.newPage(), errors=[];
    p.on('pageerror',e=>errors.push(e.message));
    await p.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true,isLandscape:true});
    await p.evaluateOnNewDocument((save,quality)=>{
      localStorage.setItem('dune-goh-v1',save);localStorage.setItem('dune-gfx',JSON.stringify({p:quality,auto:0}));
      localStorage.setItem('dune-cine-off','true');
      try {Object.defineProperty(navigator,'serviceWorker',{value:undefined});}catch{}
    },save,quality);
    await p.goto(srv.url(path.basename(file)),{waitUntil:'load'});
    await p.evaluate(async()=>{window.openCalendar=()=>{};window.__bakePortraits=bakePortraits;window.bakePortraits=()=>{};await loadB3();closeInfo(true);closeOverlay();openDetail('baron');});
    await new Promise(r=>setTimeout(r,2500));
    const summary=await p.evaluate(async tag=>{
      const o=HERO_STAGE.o;HERO_STAGE.auto=false;HERO_STAGE.yaw=-.3;
      if(!o.root._authored)throw Error('Baron did not load authored model');
      await HERO_STAGE.scene.whenReadyAsync();
      heroHold(true);
      const sample=(name)=>{
        const now=10000;o.dead=false;o.act=null;o.hitT=0;
        if(name==='Attack')o.act={kind:'shoot',t0:now-640*.5,dur:640,dir:V3(0,0,1),to:V3(0,0,0),fx:1};
        if(name==='Hit')o.hitT=now-170;
        if(name==='Death'){o.dead=true;o.deathT=now-900;}
        poseHuman(HERO_STAGE,o,now,1.3,1);o.root.rotation.y=-.3;
        o.root.computeWorldMatrix(true);
        for(const m of o.root.getChildMeshes()){m.computeWorldMatrix(true);if(m.skeleton)m.skeleton.prepare(true);}
        HERO_STAGE.scene.render();
        return {clip:o.root._clip,rotation:o.R.sh.rotationQuaternion?.asArray(),hip:o.hips.position.asArray()};
      };
      window.__baronSample=sample;
      const poses=Object.fromEntries(['Idle','Attack','Hit','Death'].map(name=>[name,sample(name)]));sample('Idle');
      return {poses,cache:tag==='after'?bakeKey('baron'):null,model:assetUrl('models/young-baron.dgm')};
    },tag);
    await p.screenshot({path:path.join(out,`${tag}-${width}-${quality}-hero.png`)});
    if(tag==='after') {
      assert.notEqual(summary.cache,'b9:baron');assert(summary.cache.includes(summary.model));
      for(const name of ['Idle','Attack','Hit','Death'])assert.equal(summary.poses[name].clip,name);
      assert.notDeepEqual(summary.poses.Idle.rotation,summary.poses.Attack.rotation);
      for(const name of ['Attack','Hit','Death']){
        await p.evaluate(name=>window.__baronSample(name),name);
        await p.screenshot({path:path.join(out,`${tag}-${width}-${quality}-${name}.png`)});
      }
    }
    await p.evaluate(()=>{window.__baronSample('Idle');heroHold(false);});
    const portrait=await p.evaluate(async()=>{
      const bk=new Baker();try {
        const r=await bk.bake(CH.baron);window.__baronBaked=r;
        const asData=b=>new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(b);});
        if(!r.face || !r.full)throw Error('Portrait textures did not become ready');
        return {face:await asData(r.face),full:await asData(r.full)};
      }finally{bk.dispose();}
    });
    for(const [key,data]of Object.entries(portrait))fs.writeFileSync(path.join(out,`${tag}-${width}-${quality}-${key}.png`),Buffer.from(data.split(',')[1],'base64'));
    if(tag==='after'){
      const upgraded=await p.evaluate(async()=>{
        const db=await bakeDB(), original={...BAKED};
        // An installation where all portraits already exist under the old keys.
        for(const c of CHARS.filter(c=>!c.boss && c.id!=='baron'))await idbPut(db,bakeKey(c.id),window.__baronBaked);
        await idbPut(db,'b9:baron',{full:new Blob(['old']),face:new Blob(['old'])});
        await window.__bakePortraits();
        const fresh=await idbGet(db,bakeKey('baron'));db.close();
        for(const id of Object.keys(BAKED))if(id!=='baron'){delete BAKED[id];if(original[id])BAKED[id]=original[id];}
        return {bytes:fresh?.face?.size,key:bakeKey('baron')};
      });
      assert(upgraded.bytes>1000,'old install did not regenerate the Baron portrait');
      await p.evaluate(portrait=>{
        BAKED.baron=portrait;closeInfo(true);closeOverlay();view='squad';render();
      },portrait);
      await p.screenshot({path:path.join(out,`${tag}-${width}-${quality}-roster.png`)});
    }
    await p.evaluate(()=>{
      closeInfo(true);closeOverlay();view='lobby';render();S.skipDlg=true;
      launch({mode:'camp',dlg:false,scene:'court',i:0,title:'Молодой Барон — проверка 3D',
        desert:false,squad:['baron','duncan','leto','paul','gurney'],enemy:['baron','rabban','piter','trooper','feyd'].map(id=>enemyProg(id,65,false))});
      clearTimeout(BT.timer);
    });
    await new Promise(r=>setTimeout(r,1800));
    await p.screenshot({path:path.join(out,`${tag}-${width}-${quality}-battle.png`)});
    assert.equal(await p.evaluate(()=>!!Object.values(BT.arena.units).find(o=>o.def.id==='baron' && o.side==='A' && o.root._authored)),true);
    assert.equal(errors.length,0,errors.join('\n'));console.log('BH4',tag,width,quality,JSON.stringify(summary));
    await p.close();
   }
  } finally {await srv.close();}
 }
 console.log('PASS BH4 source clips, versioned portrait cache, A/B screenshots (MED/LOW)');
}finally{await browser.close();}
