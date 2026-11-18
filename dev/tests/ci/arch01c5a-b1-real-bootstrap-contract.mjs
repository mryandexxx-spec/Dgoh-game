// ARCH-01C5a-B1: real-source fail-closed migration of the approved A6 virtual UI bootstrap.
// Historical A6 remains committed intact; this gate compares approved original v134 vs REAL candidate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as acorn from 'acorn';
import * as esbuild from 'esbuild';
import {SPLIT} from '../../tools/split.config.mjs';
import {analyzeTree,importEdges,stronglyConnected} from '../../tools/arch-init-graph.mjs';
const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const read=p=>fs.readFileSync(path.join(SRC,p),'utf8');
const DATA='data/conquest-data.js', OWNER='ui/views/conq.js', CELEBRATE='ui/overlays/celebrate.js';
const OLD="import '../ui/overlays/celebrate.js'; // порядок исполнения\n";
const PRE="import '../overlays/celebrate.js'; // ARCH-01C5a-B1 UI-owned Conquest bootstrap\n";
const sourceData=read(DATA),sourceOwner=read(OWNER);
const gitBlob=s=>{const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
assert.equal(sourceData.split(OLD).length,1,'real data must not import UI celebration predecessor');
assert.equal(sourceOwner.split(PRE).length,2,'real UI owner predecessor exactly once');
assert.ok(sourceOwner.startsWith(sourceOwner.split('\n')[0]+'\n'+PRE+'import { cq, cqAddDisk'),'new predecessor is the first actual import');
const historical=new Map([
 [DATA,sourceData.replace("import { MENTAT } from './chars.js';",OLD+"import { MENTAT } from './chars.js';")],
 [OWNER,sourceOwner.replace(PRE,'')],
]);
assert.equal(gitBlob(historical.get(DATA)),'300efc9d37904c8b2fe8361c6d3553ab31888aa3',
 'the 125-line historical v134 Conquest data must be byte-identical aside from old order-only import');
assert.equal(gitBlob(historical.get(OWNER)),'262178e3f40aa0545291202b8113d7b9c3dbbc66',
 'the historical v134 Conquest UI must be byte-identical aside from added order-only import');
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

const parse=(p,s=read(p))=>acorn.parse(s,{ecmaVersion:'latest',sourceType:'module',locations:true});
const imports=(p,s=read(p))=>parse(p,s).body.filter(n=>n.type==='ImportDeclaration').map(n=>({
 to:path.posix.normalize(path.posix.join(path.posix.dirname(p),n.source.value)),
 symbols:n.specifiers.map(x=>x.type==='ImportSpecifier'?(x.imported.name??x.imported.value):
  x.type==='ImportDefaultSpecifier'?'default':'*'),
}));
function checkBindings(readSource=read){
 let total=0;
 for(const [p,to,names] of NAMED){
  const actual=imports(p,readSource(p)).filter(e=>e.to===to);
  assert.equal(actual.length,1,'one live named edge '+p+'→'+to);
  assert.deepEqual(actual[0].symbols,names,'exact binding symbols '+p+'→'+to);
  total+=names.length;
 }
 assert.equal(total,74);assert.equal(NAMED.length,7);
}
checkBindings();
checkBindings(p=>historical.get(p)??read(p));
const ownerImp=imports(OWNER),historicOwnerImp=imports(OWNER,historical.get(OWNER));
assert.deepEqual(ownerImp[0],{to:CELEBRATE,symbols:[]});
assert.deepEqual(ownerImp.slice(1),historicOwnerImp);
const hero=imports('ui/hero-window.js').filter(e=>e.to==='core/boot.js');
assert.equal(hero.length,1);assert.deepEqual(hero[0].symbols,[]);
const REGISTRATIONS=[
 ['ui/notifications.js','onPersist(notePoll);'],
 ['ui/overlays/squad-select.js',"rewardHooks.unlock = id => celebQueue({ type: 'unlock', id });"],
 ['boot.js','b3Pre(loadAssets3);'],
];
function checkRegisters(readSource=read){
 for(const [p,statement] of REGISTRATIONS){
  const s=readSource(p);
  const top=parse(p,s).body.filter(n=>n.type==='ExpressionStatement').map(n=>s.slice(n.start,n.end).trim());
  assert.equal(top.filter(x=>x===statement).length,1,'exactly one eager top-level registration '+p+': '+statement);
 }
 const core=readSource('core/boot.js');
 const start=parse('core/boot.js',core).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='start');
 assert.ok(start);assert.ok(core.slice(start.body.body[0].start,start.body.body[0].end).startsWith('set_S('));
 const root=readSource('boot.js');
 assert.ok(root.includes("import './ui/views/conq.js'; // порядок исполнения"));
 const invocations=parse('boot.js',root).body.filter(n=>n.type==='ExpressionStatement');
 assert.equal(invocations.filter(n=>root.slice(n.start,n.end).includes('start(window.claude?.hot?.data ?? {})')).length,1);
}
checkRegisters();
assert.throws(()=>checkBindings(p=>p==='ui/notifications.js'?
 read(p).replace("import { CQ_SECT } from '../data/conquest-data.js';",''):read(p)),/one live named edge/);
assert.throws(()=>checkRegisters(p=>p==='ui/overlays/squad-select.js'?
 read(p).replace(REGISTRATIONS[1][1],''):read(p)),/top-level registration/);
assert.throws(()=>checkRegisters(p=>p==='boot.js'?
 read(p).replace(REGISTRATIONS[2][1],''):read(p)),/top-level registration/);
const ledger=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.deepEqual(ledger,[],'all reverse data debts removed by separately approved B1');
const actualGraph=analyzeTree(DEV);
assert.equal(actualGraph.modules,173);assert.equal(actualGraph.staticImports,1001);
assert.equal(actualGraph.dynamicImports,0);assert.equal(actualGraph.unresolved.length,0);
assert.deepEqual(actualGraph.cycles.map(c=>c.length),[60,11,6,3]);
const edges={};const oldEdges={};
function visit(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);
  if(e.isDirectory())visit(p);
  else if(e.isFile()&&e.name.endsWith('.js')){
   const name=path.relative(SRC,p).split(path.sep).join('/');
   edges[name]=importEdges(read(name),name).filter(e=>e.kind==='static').map(e=>e.to);
   oldEdges[name]=importEdges(historical.get(name)??read(name),name).filter(e=>e.kind==='static').map(e=>e.to);
  }
 }
}
visit(SRC);
assert.deepEqual(stronglyConnected(edges),actualGraph.cycles);
assert.equal(Object.values(edges).reduce((n,x)=>n+x.length,0),1001);
assert.equal(Object.values(oldEdges).reduce((n,x)=>n+x.length,0),1001);
const priorCycles=stronglyConnected(oldEdges);
assert.deepEqual(priorCycles.map(c=>c.length),[62,11,6,3]);
const preB1=new Map([
 ['data/story.js',read('data/story.js').replace(/^\/\/ data\/story\.js[^\n]*\n/,
   m=>m+"import '../assets/models.js'; // порядок исполнения\n")],
 ['assets/models.js',read('assets/models.js').replace(
  "// Registration is owned by the application composition root (boot.js).\n// Keep the historical named base import to preserve the independently reviewed ESM graph.",
  'b3Pre(loadAssets3);')],
 ['boot.js',read('boot.js').replace(
  "import { loadAssets3 } from './assets/models.js';\nimport { b3Pre } from './render3d/base.js'; // ARCH-01C5b-B1 application composition root\n",
  '').replace("// ARCH-01C5b-B1: register exactly once before start() can first render 3D.\nb3Pre(loadAssets3);\n",'')],
]);
// Historical Conquest A6 + historical Story/models B1: faithfully restores v134.
// This is not allowed to modify real src or the current SPLIT/approved order.
const v134Sources=new Map([...preB1,...historical]);

const oldLarge=priorCycles.find(c=>c.includes(DATA));
const newLarge=actualGraph.cycles.find(c=>c.includes(CELEBRATE));
assert.ok(oldLarge);assert.ok(newLarge);
console.log('ARCH-01C5a under Story B1 prior-only members '+JSON.stringify(oldLarge.filter(p=>!newLarge.includes(p))));
assert.deepEqual(oldLarge.filter(p=>!newLarge.includes(p)),[DATA]);
assert.deepEqual(newLarge.filter(p=>!oldLarge.includes(p)),[]);
assert.deepEqual(actualGraph.cycles.find(c=>c.length===6),priorCycles.find(c=>c.length===6));
const forbidden=Object.entries(edges).flatMap(([from,x])=>from.startsWith('data/')?
 x.filter(to=>!to.startsWith('data/')).map(to=>from+' -> '+to):[]);
assert.deepEqual(forbidden,ledger,'no new forbidden data edges');
assert.deepEqual(edges[DATA],['data/chars.js','data/fx.js']);
assert.deepEqual(oldEdges[DATA],['ui/overlays/celebrate.js','data/chars.js','data/fx.js']);
async function order(mode){
 const plugin={name:'b1-restore-v134-in-memory',setup(build){
  build.onLoad({filter:/\.js$/},args=>{
   const p=path.relative(SRC,args.path).split(path.sep).join('/');
   const s=mode==='v134'?v134Sources.get(p):mode==='v135'?preB1.get(p):null;
   if(s!==undefined&&s!==null)return{contents:s,loader:'js',resolveDir:path.dirname(args.path)};
  });
 }};
 const result=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
  format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',
  logLevel:'silent',logOverride:{'commonjs-variable-in-esm':'silent'},plugins:[plugin],
 });
 return [...result.outputFiles[0].text.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
  .map(m=>m[1]).filter(p=>p!=='main.js');
}
const [oldOrder,v135Order,newOrder]=await Promise.all([order('v134'),order('v135'),order('real')]);
const frozen=JSON.parse(fs.readFileSync(path.join(DEV,'tests/ci/arch01c5a-b1-v134-order.json'),'utf8'));
const approvedV135=JSON.parse(fs.readFileSync(path.join(DEV,'tests/ci/arch01c5a-b1-approved-order.json'),'utf8'));
const approvedB1=JSON.parse(fs.readFileSync(path.join(DEV,'tests/ci/arch01c5b-b1-proposed-order.json'),'utf8'));
assert.equal(frozen.length,167);
assert.deepEqual(oldOrder,frozen,'historical v134 must be exactly reconstructed using two independent source reversals');
assert.deepEqual(v135Order,approvedV135,'historical v135 must match its previously approved 167 markers');
assert.equal(newOrder.length,167);
assert.deepEqual([...newOrder].sort(),[...oldOrder].sort());
const first=oldOrder.findIndex((p,i)=>p!==v135Order[i]);
const shifts=oldOrder.filter((p,i)=>p!==v135Order[i]).length;
assert.equal(first,118);assert.equal(shifts,47,'ARCH-01C5a historical 47 shifts retained');
assert.equal(oldOrder[first],'logic/trials.js');assert.equal(v135Order[first],DATA);
assert.equal(v135Order.filter((p,i)=>p!==newOrder[i]).length,62,'B1 must move only its independently measured 62 markers');
for(const m of ['ui/notifications.js','ui/overlays/squad-select.js','assets/models.js','ui/overlays/celebrate.js','core/boot.js','ui/views/conq.js']){
 assert.ok(newOrder.indexOf(m)<newOrder.indexOf('boot.js'),'registration before start: '+m);
}
assert.ok(newOrder.indexOf('ui/overlays/squad-select.js')>newOrder.indexOf(DATA));
assert.ok(oldOrder.indexOf('ui/overlays/squad-select.js')<oldOrder.indexOf(DATA));
const exports=SPLIT.flatMap(([,p])=>{
 const m=/^export \{ ([^\n]+) \};$/m.exec(read(p));
 return m?m[1].split(', '):[];
});
assert.equal(exports.length,898,'all public names preserved');
assert.equal(approvedV135.length,167);
assert.deepEqual(newOrder,approvedB1,'real candidate B1 must equal independent first-run virtual CI attestation');
assert.deepEqual(SPLIT.map(([,p])=>p),approvedB1,'SPLIT must equal independently frozen B1 new ESM order');
console.log('ARCH-01C5a historical bootstrap PASS under B1: v134→v135 47 shifts preserved, B1 adds 62 reviewed shifts; 173 JS / 1001 current imports / SCC [61,11,6,3]→[60,11,6,3] / 898 exports / 0 Story debt');
