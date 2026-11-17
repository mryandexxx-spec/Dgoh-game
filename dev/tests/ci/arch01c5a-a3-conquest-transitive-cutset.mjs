// ARCH-01C5a-A3: graph-only (never executable refactor) transitive UI→Conquest cut-set diagnosis.
// No src/SPLIT/ledger/golden edits; no new runtime imports or release output.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const data='data/conquest-data.js';
const celebrate='ui/overlays/celebrate.js';
const story='data/story.js';
const models='assets/models.js';
const mainSha='b3d65303130dbd385caaac299f1f2dfc0473cd8c';
const codeOf=f=>fs.readFileSync(path.join(SRC,f),'utf8');
const legacy=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.deepEqual(legacy,[
 'data/conquest-data.js -> ui/overlays/celebrate.js',
 'data/story.js -> assets/models.js'
]);
const names=SPLIT.map(([,f])=>f);
assert.equal(names.length,167);
assert.equal(new Set(names).size,167);
const baseline=analyzeTree(DEV);
assert.equal(baseline.modules,173);
assert.equal(baseline.staticImports,1000);
assert.equal(baseline.dynamicImports,0);
assert.deepEqual(baseline.unresolved,[]);
assert.deepEqual(baseline.cycles.map(c=>c.length),[106,6]);

function enumerate(dir,out=[]){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,e.name);
  if(e.isDirectory())enumerate(full,out);
  else if(e.isFile() && full.endsWith('.js'))out.push(path.relative(SRC,full).split(path.sep).join('/'));
 }
 return out.sort();
}
const files=enumerate(SRC);
assert.equal(files.length,173);
const edges=[],details=new Map();
for(const f of files){
 const source=codeOf(f);
 const parsed=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true});
 const declarations=parsed.body.filter(n=>
  n.type==='ImportDeclaration' || n.type==='ExportAllDeclaration' ||
  (n.type==='ExportNamedDeclaration' && n.source));
 const astEdges=importEdges(source,f).filter(e=>e.kind==='static');
 const declEdges=declarations.filter(n=>typeof n.source?.value==='string'&&n.source.value.startsWith('.')).map(n=>{
  const to=path.posix.normalize(path.posix.join(path.posix.dirname(f),n.source.value));
  return{from:f,to,line:n.loc.start.line,
   kind:n.type,mode:n.type==='ImportDeclaration' && !n.specifiers.length?'order-only':'binding-or-reexport',
   symbols:n.type==='ImportDeclaration'?n.specifiers.map(s=>s.local.name):[]};
 });
 assert.equal(declEdges.length,astEdges.length,f+' AST import declaration mismatch');
 for(let i=0;i<astEdges.length;i++)assert.equal(declEdges[i].to,astEdges[i].to,f+' edge order mismatch');
 for(const e of declEdges){
  const key=e.from+' -> '+e.to;
  // One module can have multiple declarations importing the same target.
  // Preserve all 1000 AST declarations, but collapse parallel graph arcs:
  // ESM evaluates a dependency once and min-cut must not double-count its link.
  const prior=details.get(key);
  if(prior){
   prior.lines.push(e.line);
   prior.symbols=[...new Set([...prior.symbols,...e.symbols])];
   if(e.mode!=='order-only')prior.mode='binding-or-reexport';
  }else details.set(key,{...e,lines:[e.line]});
  edges.push(e);
 }
}
assert.equal(edges.length,1000);
const graph=Object.fromEntries(files.map(f=>[f,[...new Set(edges.filter(e=>e.from===f).map(e=>e.to))]]));
const key=(a,b)=>a+' -> '+b;
const forbidden=edges.filter(e=>e.from.startsWith('data/')&&!e.to.startsWith('data/')).map(e=>key(e.from,e.to));
assert.deepEqual(forbidden,legacy);
const originalScc=stronglyConnected(graph).find(c=>c.includes(data));
assert.equal(originalScc.length,106);
assert.ok(originalScc.includes(celebrate));
const copies=g=>Object.fromEntries(Object.entries(g).map(([k,v])=>[k,[...v]]));
function deleteEdges(g,keys){
 const out=copies(g);
 for(const k of keys){
  const [from,to]=k.split(' -> ');
  const before=out[from].length;
  out[from]=out[from].filter(v=>v!==to);
  assert.equal(before-out[from].length,1,'expected exactly one edge '+k);
 }
 return out;
}
const withoutData=deleteEdges(graph,[key(data,celebrate)]);
const sccNoData=stronglyConnected(withoutData);
const largeNoData=sccNoData.find(c=>c.includes(celebrate));
assert.equal(largeNoData.length,105);
assert.ok(!largeNoData.includes(data));
assert.deepEqual(originalScc.filter(f=>!largeNoData.includes(f)),[data]);

function bfs(g,start,goal){
 if(start===goal)return[start];
 const queue=[start],parent=new Map([[start,null]]);
 for(let i=0;i<queue.length;i++){
  const v=queue[i];
  for(const w of g[v]||[]){
   if(parent.has(w))continue;
   parent.set(w,v);
   if(w===goal){
    const route=[];for(let p=w;p!==null;p=parent.get(p))route.push(p);
    return route.reverse();
   }
   queue.push(w);
  }
 }
 return null;
}
const oldMainToData=bfs(graph,'main.js',data);
assert.ok(oldMainToData);
const oldDirect=graph[celebrate];
const branches=oldDirect.map((next,index)=>{
 const route=bfs(withoutData,next,data);
 const entry=details.get(key(celebrate,next));
 return {index,via:next,kind:entry.mode,symbols:entry.symbols,
  line:entry.line,shortest:route?[celebrate,...route]:null};
});
const liveBranches=branches.filter(b=>b.shortest);
assert.ok(liveBranches.length>1,'must expose multiple actual Conquest reentry paths');

const dfsSeen=new Set(),dfsParent=new Map();
const dfsOrder=[];
function visit(f,p){
 if(dfsSeen.has(f))return;
 dfsSeen.add(f);dfsParent.set(f,p);dfsOrder.push(f);
 for(const to of graph[f])visit(to,f);
}
visit('main.js',null);
function ancestor(f){
 const p=[];for(let n=f;n!==null;n=dfsParent.get(n))p.push(n);
 return p.reverse();
}
assert.deepEqual(ancestor(data),['main.js','boot.js','ui/views/conq.js','logic/conquest.js',data]);
assert.deepEqual(ancestor(celebrate),[...ancestor(data),celebrate]);
assert.equal(dfsOrder.indexOf(data),24);
assert.equal(dfsOrder.indexOf(celebrate),25);

// In-memory graph max-flow. Deleting any named import here is only a conceptual
// graph cut, NOT an executable refactor or preservation of its bound values.
const INF=10000;
function minCut(rule){
 const adjacency=Object.fromEntries(files.map(f=>[f,[]]));
 function add(u,v,capacity){
  const forward={to:v,cap:capacity,original:capacity,from:u,rev:adjacency[v].length};
  const backward={to:u,cap:0,original:0,from:v,rev:adjacency[u].length};
  adjacency[u].push(forward);adjacency[v].push(backward);
 }
 const flat=[...details.values()].filter(e=>!(e.from===data&&e.to===celebrate));
 for(const e of flat)add(e.from,e.to,rule(e)?1:INF);
 let maxFlow=0,iterations=0;
 for(;;){
  const q=[celebrate],prev=new Map([[celebrate,null]]);
  for(let i=0;i<q.length&&!prev.has(data);i++){
   for(const e of adjacency[q[i]]){
    if(e.cap<=0||prev.has(e.to))continue;
    prev.set(e.to,{node:q[i],edge:e});q.push(e.to);
    if(e.to===data)break;
   }
  }
  if(!prev.has(data))break;
  let amount=INF;
  for(let at=data;at!==celebrate;){
   const p=prev.get(at);amount=Math.min(amount,p.edge.cap);at=p.node;
  }
  for(let at=data;at!==celebrate;){
   const p=prev.get(at);p.edge.cap-=amount;
   adjacency[at][p.edge.rev].cap+=amount;at=p.node;
  }
  maxFlow+=amount;iterations++;
  assert.ok(iterations<200,'unexpected unbounded augmentations');
 }
 const reachable=new Set([celebrate]),q=[celebrate];
 for(let i=0;i<q.length;i++)for(const e of adjacency[q[i]]){
  if(e.cap>0&&!reachable.has(e.to)){reachable.add(e.to);q.push(e.to);}
 }
 const crossing=flat.filter(e=>reachable.has(e.from)&&!reachable.has(e.to));
 const eligible=crossing.filter(e=>rule(e));
 const keys=crossing.map(e=>key(e.from,e.to));
 const finite=maxFlow<INF;
 if(finite){
  assert.equal(eligible.length,crossing.length,'finite cut must use only allowed edges');
  const tested=deleteEdges(withoutData,keys);
  assert.equal(bfs(tested,celebrate,data),null,'minimal cut must disconnect celebrate→data');
 }
 return {
  possible:finite,cost:finite?maxFlow:null,flow:maxFlow,pathsAugmented:iterations,
  cut:finite?eligible.map(e=>({from:e.from,to:e.to,lines:e.lines,mode:e.mode,
     symbols:e.symbols})):[],
  blocker:finite?null:'At least one Conquest path cannot be broken using only allowed edges',
  graphOnly:true,runtimeExecutable:false,
 };
}
const cuts={
 uiOnly:minCut(e=>e.from.startsWith('ui/')),
 orderOnlyUI:minCut(e=>e.from.startsWith('ui/')&&e.mode==='order-only'),
 directConquestImports:minCut(e=>e.from.startsWith('ui/')&&
   (e.to===data||e.to==='logic/conquest.js')),
 uiToUi:minCut(e=>e.from.startsWith('ui/')&&e.to.startsWith('ui/')),
};
assert.ok(cuts.uiOnly.possible);
assert.ok(cuts.uiOnly.cut.length>1);
assert.ok(cuts.uiOnly.cut.some(e=>e.mode==='binding-or-reexport'),
 'transitive cut must include named imports, not only reorder-only edges');
const purified=deleteEdges(graph,[key(data,celebrate),key(story,models)]);
for(const f of files.filter(f=>f.startsWith('data/'))){
 assert.ok(purified[f].every(to=>to.startsWith('data/')),
  'pure data modules must only import data modules: '+f);
}
const pureScc=stronglyConnected(purified);
const mixed=pureScc.filter(c=>c.some(f=>f.startsWith('data/'))&&c.some(f=>!f.startsWith('data/')));
assert.deepEqual(mixed,[],'no lawful pure-data to runtime SCC can remain');
assert.equal(bfs(purified,data,celebrate),null);
assert.equal(bfs(purified,story,models),null);

// This is an unchanged ORIGINAL production build only; cuts above are NOT executable.
const output=await esbuild.build({
 absWorkingDir:DEV,entryPoints:['src/main.js'],format:'esm',bundle:true,
 write:false,treeShaking:false,charset:'utf8',legalComments:'none',
 target:'esnext',logLevel:'silent',
 logOverride:{'commonjs-variable-in-esm':'silent'},
});
const built=[...output.outputFiles[0].text.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
 .map(m=>m[1]).filter(f=>f!=='main.js');
assert.deepEqual(built,names,'actual v134 production esbuild ESM order must remain untouched');

const result={
 main:mainSha,version:134,sourceModules:files.length,imports:edges.length,
 esmMarkers:built.length,baselineScc:baseline.cycles.map(c=>c.length),
 firstVisit:{dataIndex:dfsOrder.indexOf(data),celebrateIndex:dfsOrder.indexOf(celebrate),
   dataPath:ancestor(data),celebratePath:ancestor(celebrate)},
 branches:{all:branches.length,canReachConquest:liveBranches.length,details:liveBranches},
 sccAfterRemoval:{sizes:sccNoData.map(c=>c.length),ejected:[data],remaining:largeNoData.length},
 cutSets:cuts,
 layeringTheorem:{pureDataEdgesAfterBothRemoved:0,mixedSccAfterBothRemoved:0,
  statement:'When all data imports terminate in data, no SCC may mix data and UI/logic/render/assets.'},
 noSourceEdits:true,cutCandidatesExecutable:false,sourceDebt:legacy,
 next:'A3 is graph theory and import ownership diagnosis, NOT an implementation GO',
};
console.log('ARCH-01C5a-A3 PATH '+JSON.stringify(result.firstVisit));
console.log('ARCH-01C5a-A3 BRANCHES '+JSON.stringify(result.branches));
console.log('ARCH-01C5a-A3 SCC '+JSON.stringify(result.sccAfterRemoval));
console.log('ARCH-01C5a-A3 CUTS '+JSON.stringify(result.cutSets));
console.log('ARCH-01C5a-A3 FINAL '+JSON.stringify({
 main:result.main,sourceModules:result.sourceModules,imports:result.imports,
 esmMarkers:result.esmMarkers,cutSummary:Object.fromEntries(Object.entries(cuts)
 .map(([k,v])=>[k,{possible:v.possible,cost:v.cost,cutEdges:v.cut.length}])),
 theorem:result.layeringTheorem,strictGo:false,
 graphOnly:true,originalGameUntouched:true,
}));
