// ARCH-01C5a-A6 Stage A only: executable, fail-closed UI-owned composition CONTRACT.
// No real runtime changes; frozen main v134, isolated esbuild virtual source overrides.
// B1 requires separate owner approval and full proof, regardless of this test result.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as acorn from 'acorn';
import * as esbuild from 'esbuild';
import {SPLIT} from '../../tools/split.config.mjs';
import {analyzeTree,importEdges,stronglyConnected} from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const read=p=>fs.readFileSync(path.join(SRC,p),'utf8');
const DATA='data/conquest-data.js',OWNER='ui/views/conq.js',CELEBRATE='ui/overlays/celebrate.js';
const LEGACY=[
 'data/conquest-data.js -> ui/overlays/celebrate.js',
 'data/story.js -> assets/models.js',
];
// Exact *existing* legal named APIs. A3's 8-link mincut has 7 named edges
// and 1 order-only edge. The design must retain every named binding unchanged.
const NAMED=[
 ['ui/battle/battle-ui.js','boot.js',['hourglass','spiceUser']],
 ['ui/notifications.js',DATA,['CQ_SECT']],
 ['ui/overlays/squad-select.js','logic/conquest.js',
  ['cq','cqEn','cqEnSpend','cqEnTxt','cqLive','cqNode','cqOpen','cqSta','cqStaCol','cqTypeN']],
 ['ui/overlays/squad-select.js',DATA,['CQ_EN','CQ_SECT','CQ_STA','cqMod']],
 [OWNER,'logic/conquest.js',
  ['cq','cqAddDisk','cqCanClaim','cqCanOn','cqChest','cqDiskOn','cqDiskPick','cqEn','cqEnSpend',
   'cqEnTxt','cqFoes','cqGoods','cqLayout','cqLive','cqNode','cqNodeDisks',
   'cqDifficultyAccess','cqRecordFinalBoss','cqRoute','cqRouteBlocked','cqCommitRoute','cqOpen',
   'cqStCan','cqStReady','cqSta','cqStaCol','cqStaPen','cqStaSet','cqStatic','cqSyncTrack',
   'cqTrack','cqTypeN','cqRfN','cqRfCost','cqBump','cqK','cqModD','cqScore']],
 [OWNER,DATA,
  ['CQ_CHESTS','CQ_DIFF','CQ_DISKS','CQ_DMAX','CQ_EN','CQ_ICON','CQ_LAST','CQ_LAYERS',
   'CQ_LFAC','CQ_LMAX','CQ_MED','CQ_RF','CQ_SECT','CQ_STA','CQ_TROPHY','cqFeats','cqMod','cqRar']],
 ['ui/views/lobby.js','logic/conquest.js',['cqHot']],
];
const FIRST_OWNER="import { cq, cqAddDisk";
const OLD_PREDECESSOR="import '../ui/overlays/celebrate.js'; // порядок исполнения\n";
const UI_PREDECESSOR="import '../overlays/celebrate.js'; // ARCH-01C5a-A6 DESIGN VIRTUAL ONLY\n";
const sourceData=read(DATA),sourceOwner=read(OWNER);
assert.equal(sourceData.split(OLD_PREDECESSOR).length,2,'frozen reverse order-only edge must occur once');
assert.equal(sourceOwner.split(FIRST_OWNER).length,2,'frozen UI first live Conquest import must occur once');
const proposed=new Map([
 [DATA,sourceData.replace(OLD_PREDECESSOR,'')],
 [OWNER,sourceOwner.replace(FIRST_OWNER,UI_PREDECESSOR+FIRST_OWNER)],
]);

function parse(from,s=read(from)){
 return acorn.parse(s,{ecmaVersion:'latest',sourceType:'module',locations:true});
}
function imports(from,s=read(from)){
 return parse(from,s).body.filter(n=>n.type==='ImportDeclaration').map(n=>({
  to:path.posix.normalize(path.posix.join(path.posix.dirname(from),n.source.value)),
  symbols:n.specifiers.map(x=>{
   if(x.type==='ImportSpecifier')return x.imported.name??x.imported.value;
   return x.type==='ImportDefaultSpecifier'?'default':'*';
  }),line:n.loc.start.line,
 }));
}
function checkNamed(readSource=read){
 let bindings=0;
 for(const [from,to,names] of NAMED){
  const found=imports(from,readSource(from)).filter(e=>e.to===to);
  assert.equal(found.length,1,from+' must have exactly one named import of '+to);
  assert.deepEqual(found[0].symbols,names,from+' must keep exact named ESM bindings from '+to);
  bindings+=names.length;
 }
 return bindings;
}
const namedCount=checkNamed();
assert.equal(NAMED.length,7);
assert.equal(namedCount,2+1+10+4+38+18+1);
assert.equal(checkNamed(f=>proposed.get(f)??read(f)),namedCount);
const orderOnly=imports('ui/hero-window.js').filter(e=>e.to==='core/boot.js');
assert.equal(orderOnly.length,1);
assert.deepEqual(orderOnly[0].symbols,[],'A3 historical hero-window→core/boot is order-only');

// These registration expressions must execute once at module top-level,
// i.e. no lost hooks, delayed setup or registration in pure data/logic.
const REGISTRATIONS=[
 ['ui/notifications.js','onPersist(notePoll);'],
 ['ui/overlays/squad-select.js',"rewardHooks.unlock = id => celebQueue({ type: 'unlock', id });"],
 ['assets/models.js','b3Pre(loadAssets3);'],
];
function checkRegister(readSource=read){
 for(const [module,stmt] of REGISTRATIONS){
  const source=readSource(module);
  const top=parse(module,source).body.filter(n=>n.type==='ExpressionStatement')
   .map(n=>source.slice(n.start,n.end).trim());
  assert.equal(top.filter(x=>x===stmt).length,1,
   'registration must be ONE top-level statement in '+module+': '+stmt);
 }
 const core=readSource('core/boot.js');
 const ast=parse('core/boot.js',core);
 const start=ast.body.find(x=>x.type==='FunctionDeclaration'&&x.id.name==='start');
 assert.ok(start,'core/boot.start must remain named function');
 assert.ok(core.slice(start.body.body[0].start,start.body.body[0].end)
  .startsWith('set_S('),'start must hydrate state before side-effects/render');
 const entry=readSource('boot.js');
 assert.ok(entry.includes("import './ui/views/conq.js'; // порядок исполнения"),
  'root boot must import UI Conquest owner before core start');
 const bootEntry=parse('boot.js',entry).body.filter(x=>x.type==='ExpressionStatement');
 assert.equal(bootEntry.filter(n=>entry.slice(n.start,n.end).includes('start(window.claude?.hot?.data ?? {})')).length,1,
  'start invocation/Hot-ready composition must stay at original root entry');
}
checkRegister();
// In-memory mutation tests prove the contract gate FAILS if an essential API
// or a real registration is dropped. No mutations of src or CI baselines.
assert.throws(()=>checkNamed(f=>f==='ui/notifications.js'?
 read(f).replace("import { CQ_SECT } from '../data/conquest-data.js';",''):read(f)),/exactly one named/);
assert.throws(()=>checkRegister(f=>f==='assets/models.js'?
 read(f).replace('b3Pre(loadAssets3);',''):read(f)),/registration must be ONE top-level/);
assert.throws(()=>checkRegister(f=>f==='ui/overlays/squad-select.js'?
 read(f).replace("rewardHooks.unlock = id => celebQueue({ type: 'unlock', id });",''):read(f)),
 /registration must be ONE top-level/);
const baseline=analyzeTree(DEV);
assert.equal(baseline.modules,173);
assert.equal(baseline.staticImports,1000);
assert.equal(baseline.dynamicImports,0);
assert.deepEqual(baseline.cycles.map(c=>c.length),[106,6]);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy,LEGACY);
const all={};
function visit(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);
  if(e.isDirectory())visit(p);
  else if(e.isFile()&&e.name.endsWith('.js')){
   const f=path.relative(SRC,p).split(path.sep).join('/');
   all[f]=importEdges(proposed.get(f)??read(f),f).filter(e=>e.kind==='static').map(e=>e.to);
  }
 }
}
visit(SRC);
assert.equal(Object.keys(all).length,173);
assert.equal(Object.values(all).reduce((n,x)=>n+x.length,0),1000);
const reverse=Object.entries(all).flatMap(([from,x])=>from.startsWith('data/')?
 x.filter(to=>!to.startsWith('data/')).map(to=>from+' -> '+to):[]);
assert.deepEqual(reverse,LEGACY.slice(1),'only Story→models reverse edge allowed in virtual A6');
assert.ok(!all[DATA].includes(CELEBRATE),'virtual source must remove forbidden reverse import');
const virtualOwner=imports(OWNER,proposed.get(OWNER));
assert.equal(virtualOwner[0].to,CELEBRATE,'UI must import celebration before live Conquest bindings');
assert.deepEqual(virtualOwner[0].symbols,[],'bootstrap import is pure order ownership, not fake API');
const originalOwner=imports(OWNER);
assert.equal(virtualOwner.length,originalOwner.length+1);
assert.deepEqual(virtualOwner.slice(1).map(x=>[x.to,x.symbols]),
 originalOwner.map(x=>[x.to,x.symbols]),'owner live import order and named bindings unchanged');
const sc=stronglyConnected(all);
assert.deepEqual(sc.map(c=>c.length),[105,6]);
const oldLarge=baseline.cycles.find(c=>c.includes(DATA));
const newLarge=sc.find(c=>c.includes(CELEBRATE));
assert.deepEqual(oldLarge.filter(n=>!newLarge.includes(n)),[DATA],
 'only data/conquest-data is ejected from the 106-member SCC');
assert.deepEqual(newLarge.filter(n=>!oldLarge.includes(n)),[],
 'must not introduce new members into the big SCC');

// Stronger than static graph: actual original build and proposed virtual build
// must have same 167-module multiset. Exact ESM order intentionally changes;
// recording this is mandatory, NOT a test bypass.
async function order(candidate){
 const plugin={name:'A6-VIRTUAL-ONLY',setup(build){
  build.onLoad({filter:/\.js$/},args=>{
   const f=path.relative(SRC,args.path).split(path.sep).join('/');
   const s=candidate?proposed.get(f):null;
   if(s!==undefined&&s!==null)return{contents:s,loader:'js',resolveDir:path.dirname(args.path)};
  });
 }};
 const build=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
  format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',
  target:'esnext',logLevel:'silent',
  logOverride:{'commonjs-variable-in-esm':'silent'},plugins:[plugin],
 });
 return [...build.outputFiles[0].text.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
  .map(m=>m[1]).filter(n=>n!=='main.js');
}
const [oldOrder,newOrder]=await Promise.all([order(false),order(true)]);
const FROZEN=SPLIT.map(([_,f])=>f);
assert.deepEqual(oldOrder,FROZEN,'original v134 must retain all 167 ESM marker positions');
assert.equal(newOrder.length,167);
assert.deepEqual([...newOrder].sort(),[...FROZEN].sort());
const shifts=FROZEN.filter((n,i)=>n!==newOrder[i]);
const first=FROZEN.findIndex((n,i)=>n!==newOrder[i]);
assert.equal(shifts.length,47,'the A6 selected design must explicitly record all 47 ESM shifts');
assert.equal(first,118);
for(const m of ['ui/notifications.js','ui/overlays/squad-select.js','assets/models.js',
 'ui/overlays/celebrate.js','core/boot.js','ui/views/conq.js']){
 assert.ok(oldOrder.indexOf(m)<oldOrder.indexOf('boot.js'),m+' original must register before root start');
 assert.ok(newOrder.indexOf(m)<newOrder.indexOf('boot.js'),m+' candidate must register before root start');
}
assert.ok(newOrder.indexOf('ui/overlays/squad-select.js')>newOrder.indexOf(DATA),
 'expected intentional A5 re-order risk: candidate data before squad-select');
assert.ok(oldOrder.indexOf('ui/overlays/squad-select.js')<oldOrder.indexOf(DATA),
 'expected frozen original inverse ordering');

console.log('ARCH-01C5a-A6 CONTRACT '+JSON.stringify({
 main:'b3d65303130dbd385caaac299f1f2dfc0473cd8c',
 contractOwner:OWNER,originalSourceModules:173,originalImports:1000,
 frozenESM:167,virtualESM:167,shifted:47,firstMismatch:first,
 firstOld:oldOrder[first],firstVirtual:newOrder[first],
 namedAPIEdges:NAMED.length,namedSymbols:namedCount,topLevelRegistrations:REGISTRATIONS.length,
 sccOriginal:[106,6],sccVirtual:[105,6],expelled:[DATA],
 originalDebts:LEGACY,virtualDebts:reverse,
 baselineAndCandidateRegistrationsBeforeStart:true,
 twoNegativeContractMutationsDetected:true,
 sourceEdits:0,stage:'A6 design only',realB1Go:false
}));
