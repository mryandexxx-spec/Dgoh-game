// ARCH-01C4c Stage A2: two EXACT-ESM, architecturally permitted
// virtual boot candidates from the Stage A production-esbuild matrix.
// Exercise both in the same real game's Node VM as immutable golden tests.
// No changes to actual src/, version, SPLIT, baseline, golden, assets or PWA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { loadGame } from '../lib/load.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src'),ASSETS=path.join(DEV,'assets');
const read=p=>fs.readFileSync(path.join(SRC,p),'utf8');
function once(s,a,b){assert.equal(s.split(a).length,2,'unique frozen predecessor '+a);return s.replace(a,b);}
const looks='data/looks.js',boot='boot.js',conq='ui/views/conq.js';
const oldLooks=read(looks),oldBoot=read(boot),oldConq=read(conq);
const removed=once(oldLooks,"import '../logic/battle/ai.js'; // порядок исполнения\n",'');
const rootPrelude=[
 "import './data/gear-cap.js'; // ARCH-01C4c VIRTUAL root predecessor",
 "import './logic/cinematic-preference.js'; // ARCH-01C4c VIRTUAL root predecessor",
 "import './logic/battle/ai.js'; // ARCH-01C4c VIRTUAL root predecessor"
].join('\n')+'\n';
const rootBoot=once(oldBoot,"import './ui/views/conq.js'; // порядок исполнения\n",
 rootPrelude+"import './ui/views/conq.js'; // порядок исполнения\n");
const uiPrelude=[
 "import '../../data/gear-cap.js'; // ARCH-01C4c VIRTUAL root predecessor",
 "import '../../logic/cinematic-preference.js'; // ARCH-01C4c VIRTUAL root predecessor",
 "import { computeIntents } from '../../logic/battle/ai.js';"
].join('\n')+'\n';
const uiAnchor=oldConq.split('\n').find(l=>l.startsWith('import '));
const namedAI="import { computeIntents } from '../../logic/battle/ai.js';\n";
let uiConq=once(oldConq,namedAI,'');
uiConq=once(uiConq,uiAnchor+'\n',uiPrelude+uiAnchor+'\n');
assert.ok(removed.startsWith('// data/looks.js'));
assert.ok(oldConq.includes(namedAI));
assert.ok(read('data/boss.js').includes('CH.worm = WORM;'));
assert.ok(read('logic/battle/ai.js').includes("if (typeof module !== 'undefined') module.exports"));
function noChangedBody(before,after){
 return before.split('\n').filter(x=>!x.startsWith('import ')).join('\n')===
 after.split('\n').filter(x=>!x.startsWith('import ')).join('\n');
}
assert.equal(noChangedBody(oldBoot,rootBoot),true);
assert.equal(noChangedBody(oldConq,uiConq),true);
assert.equal(removed,once(oldLooks,"import '../logic/battle/ai.js'; // порядок исполнения\n",''));

const variants=[
 {name:'root-gear-cine-ai',patch:new Map([[looks,removed],[boot,rootBoot]])},
 {name:'ui-gear-cine-existing-ai',patch:new Map([[looks,removed],[conq,uiConq]])}
];
function filesUnder(dir) {
 if(!fs.existsSync(dir))return [];
 const out=[];
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,e.name);
  if(e.isDirectory())out.push(...filesUnder(full));
  else if(e.isFile())out.push(full);
 }
 return out.sort();
}
const assets=Object.fromEntries(filesUnder(ASSETS).filter(p=>
 path.relative(ASSETS,p).split(path.sep).join('/')!=='ktx2/manifest.json').map(p=>{
 const name=path.relative(ASSETS,p).split(path.sep).join('/');
 const hash=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0,8);
 return [name,'assets/'+name.replace(/(\.[^./]+)$/,'.'+hash+'$1')];
}));
function substitute(js){
 assert.equal(js.split('__APP_VER__').length,2,'exactly one APP_VER placeholder');
 assert.equal(js.split('__ASSET_MAP__').length,2,'exactly one asset map placeholder');
 const map=JSON.stringify(assets);
 if(/['\\]/.test(map))throw Error('unsafe asset path in JSON map');
 return js.replace('__APP_VER__','v133 · ARCH-01C4c virtual')
   .replace('__ASSET_MAP__',map.slice(1,-1));
}
async function production(patch){
 const plugin={name:'arch01c4c-runtime-overlay',setup(b){
  b.onLoad({filter:/\.js$/},args=>{
   const key=path.relative(SRC,args.path).split(path.sep).join('/');
   if(patch.has(key))return {contents:patch.get(key),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }};
 const result=await esbuild.build({absWorkingDir:DEV,entryPoints:['src/main.js'],
  bundle:true,write:false,format:'esm',treeShaking:false,charset:'utf8',
  legalComments:'none',target:'esnext',logLevel:'silent',
  logOverride:{'commonjs-variable-in-esm':'silent'},
  plugins:patch.size?[plugin]:[]});
 assert.equal(result.outputFiles.length,1);
 const js=result.outputFiles[0].text;
 const marks=[...js.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(x=>x[1]).filter(p=>p!=='main.js');
 assert.deepEqual(marks,SPLIT.map(([,p])=>p),'exact 167 ESM order mandatory');
 return js;
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dune-arch01c4c-'));
function gameHtml(key,js) {
 const dir=path.join(temp,key);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'virtual.js'),substitute(js),'utf8');
 const html=path.join(dir,'index.html');
 fs.writeFileSync(html,'<!doctype html><html><head></head><body><script src="virtual.js"></script></body></html>','utf8');
 return html;
}
function vmSnapshot(html,seed=77){
 const game=loadGame(html,{seed});
 const run=expr=>game.run(expr);
 const clone=expr=>JSON.parse(run('JSON.stringify('+expr+')'));
 for(const name of ['CH','CHARS','WORM','LOOK','SKINS','OL','FEM','ghash','sigil',
  'aiPlan','computeIntents','createBattle','nextActor','startTurn','act','endTurn',
  'unitStats','unitPower','skMax','autoSk','bossPlan','bossTurn','newSave','cqK','cqScore'])
  assert.notEqual(run('typeof '+name),'undefined','runtime missing '+name);
 assert.equal(run('CH.worm === WORM'),true,'WORM top-level unique mutation');
 assert.equal(run('CH.worm.id'),'worm');
 assert.equal(run("skMax(CH.duncan,'passive')"),7);
 assert.equal(run('phaseOf(0.8)'),1);
 assert.equal(run('phaseOf(0.1)'),4);
 assert.equal(run('RAID_TIERS.length'),3);
 assert.equal(run("typeof CINE_OFF"),'function','cinematic preference bootstrap');
 const stats=clone('unitStats(CH.duncan,{lvl:50,stars:7,gear:10,eq:[],relic:0})');
 assert.ok(stats.maxHp>0&&stats.dmg>0&&stats.spd>0);
 assert.ok(clone('unitPower(CH.duncan,{lvl:50,stars:7,gear:10,eq:[],relic:0})')>0);
 const value={
  looks:clone('LOOK'), skins:clone('SKINS'), outline:run('OL'),
  fem:clone('Array.from(FEM)'), hash:run("ghash('duncan')"),
  sigil:run("sigil('atr',30,32,'#abc')"),
  worm:clone('WORM'), rosterCount:run('CHARS.length'),
  skills:run("skMax(CH.duncan,'passive')"), phase:run('phaseOf(0.1)'),
  stats, levels:clone('RAID_TIERS.map(t=>t.hp)'),
  freshSaveKeys:clone('Object.keys(newSave()).sort()'),
  aiPlan:run('typeof aiPlan'), intents:run('typeof computeIntents')
 };
 return value;
}
const status={stage:'ARCH-01C4c A2',tested:variants.length,
 baselineBoot:false,variants:[],runtimeEvidenceOnly:true,
 sourceChanged:false,fullBrowserValidated:false};
try{
 const baseline=gameHtml('baseline',await production(new Map()));
 const baselineSnap=vmSnapshot(baseline);
 assert.deepEqual(vmSnapshot(baseline,101),baselineSnap,
  'baseline cold/warm equivalent deterministic snapshot');
 status.baselineBoot=true;
 for(const v of variants){
  const item={name:v.name,esmExact:false,boot:false,golden:[],
   runtimeNoGo:false,readyForB1:false};
  try{
   const candidate=gameHtml(v.name,await production(v.patch));
   item.esmExact=true;
   for(const seed of [77,101]){
    const snapshot=vmSnapshot(candidate,seed);
    assert.deepEqual(snapshot,baselineSnap,'candidate VM boot snapshot differs from published v133');
   }
   item.boot=true;
   for(const script of [
    'tests/golden/battles.mjs',
    'tests/golden/meta.mjs',
    'tests/golden/saves.mjs',
    'tests/arch01c4a-boss-bootstrap.mjs',
    'tests/arch01c3b3-conquest-selectors.mjs'
   ]){
    try{
     const out=execFileSync(process.execPath,[script,candidate],{
      cwd:DEV,encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024
     });
     item.golden.push({test:script,status:'PASS',tail:out.trim().slice(-200)});
     console.log('ARCH-01C4c GOLDEN '+JSON.stringify({variant:v.name,...item.golden.at(-1)}));
    }catch(e){
     item.golden.push({test:script,status:'NO-GO',
      error:String(e.stderr||e.message).slice(0,1300)});
     break;
    }
   }
   item.runtimeNoGo=item.golden.some(x=>x.status!=='PASS');
  }catch(e){
   item.runtimeNoGo=true;
   item.error=String(e.stack||e).slice(0,1600);
  }
  status.variants.push(item);
  console.log('ARCH-01C4c RUNTIME TRIAL '+JSON.stringify(item));
 }
 console.log('ARCH-01C4c RUNTIME SUMMARY '+JSON.stringify(status));
}finally{
 fs.rmSync(temp,{recursive:true,force:true});
}
console.log('ARCH-01C4c Stage A2 read-only VM/golden analysis complete; no production or reference-file changes.');
