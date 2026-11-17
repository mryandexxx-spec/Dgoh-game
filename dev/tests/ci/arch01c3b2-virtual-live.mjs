// ARCH-01C3b2 Stage A — ONLY virtual in-memory production esbuild + AST/SCC probes.
// No source, SPLIT, ledger, golden, version, assets or published output is modified.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'), SRC=path.join(DEV,'src');
const read=p=>fs.readFileSync(path.join(SRC,p),'utf8');
const files=new Map();
function walk(dir) {
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else if(entry.isFile()&&entry.name.endsWith('.js'))
   files.set(path.relative(SRC,full).split(path.sep).join('/'),fs.readFileSync(full,'utf8'));
 }
}
walk(SRC);
const dname='data/conquest-data.js',lname='logic/conquest.js',uname='ui/views/conq.js';
const data=read(dname),logic=read(lname),ui=read(uname);
const ledger=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
const ast=analyzeTree(DEV),expected=SPLIT.map(([,n])=>n);
assert.equal(expected.length,167);
assert.equal(files.size,173);
assert.equal(ast.modules,173);
assert.equal(ast.cycles.length,2);
assert.equal(ast.unresolved.length,0);
assert.equal(ledger.length,6);
assert.equal(ast.cycles.find(c=>c.includes(dname))?.length,106);
for(const target of ['logic/conquest.js','core/state.js','ui/overlays/celebrate.js'])
 assert.ok(ledger.includes(dname+' -> '+target));
assert.deepEqual(importEdges(data,dname).filter(e=>e.kind==='static').map(e=>e.to),[
 'logic/conquest.js','ui/overlays/celebrate.js','core/state.js','data/chars.js','data/fx.js'
]);
assert.ok(data.includes("import '../ui/overlays/celebrate.js'; // порядок исполнения"));
const stateRefs=data.split('\n').map((line,i)=>({line:i+1,source:line})).filter(x=>/\b(NOTES|S)\b/.test(x.source));
assert.equal(stateRefs.length,2,'only NOTES.push and the state import may reference S/NOTES');
const i0=data.indexOf('function cqBump(ev, s, n = 1, abs = false) {');
const i1=data.indexOf('const CQ_EN = ',i0);
assert.ok(i0>0&&i1>i0);
const bump=data.slice(i0,i1).trimEnd()+'\n';
assert.ok(bump.includes("NOTES.push({ id: Math.random().toString(36).slice(2), kind: 'cqf', F: x.F, v: x.v })"));
const definitions={
 cqK:"const cqK = () => ({ easy: 1, normal: 1.25, hard: 1.5 })[cq().diff] || 1;\n",
 cqModD:"const cqModD = m => { const x = cqMod(m); return typeof x.d === 'function' ? x.d(cqK()) : x.d; };\n",
 cqScore:"const cqScore = () => { const C = cq(); return C.stars + (C.pts || 0); };\n",
};
const names=['cqK','cqModD','cqScore','cqBump'];
function once(code,from,to) {
 assert.equal(code.split(from).length,2,'virtual anchor missing/duplicate: '+from.slice(0,70));
 return code.replace(from,to);
}
for(const s of Object.values(definitions))assert.equal(data.split(s).length,2);
assert.equal(data.split(bump).length,2);
const stateImport="import { NOTES, S } from '../core/state.js';\n";
const logicStateImport="import { S } from '../core/state.js';";
function cycleGraph(overrides) {
 const g=Object.fromEntries([...files.keys()].sort().map(k=>[k,[]]));
 const edges=new Set();
 for(const [p,source] of files)for(const e of importEdges(overrides.get(p)??source,p)){
  if(e.kind!=='static')continue;
  assert.ok(files.has(e.to),'unresolved '+p+' to '+e.to);
  g[p].push(e.to);edges.add(e.from+' -> '+e.to);
 }
 return {cycles:stronglyConnected(g),edges};
}
function exportsOf(overrides){
 const result=[];
 for(const [p,source] of files){
  const tree=acorn.parse(overrides.get(p)??source,{ecmaVersion:'latest',sourceType:'module'});
  for(const n of tree.body){
   if(n.type==='ExportNamedDeclaration'){
    for(const s of n.specifiers)result.push(p+':'+(s.exported.name??s.exported.value));
    if(n.declaration?.id?.name)result.push(p+':'+n.declaration.id.name);
   }else if(n.type==='ExportDefaultDeclaration')result.push(p+':default');
  }
 }
 return result.sort();
}
function splitApi(overrides){
 return SPLIT.flatMap(([,p])=>{
  const m=/^export \\{ (.+) \\};$/m.exec(overrides.get(p)??files.get(p));
  return m?m[1].split(', ').map(n=>p+':'+n):[];
 }).sort();
}
const before=cycleGraph(new Map()),baseApi=exportsOf(new Map()),baseSplitApi=splitApi(new Map());
assert.deepEqual(before.cycles,ast.cycles);
assert.equal(baseSplitApi.length,898,'frozen check-bundle public named export baseline');
assert.ok(baseApi.length>=baseSplitApi.length,'AST corpus export count must cover canonical SPLIT exports');
const markerList=code=>[...code.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m=>m[1]).filter(n=>n!=='main.js');
async function bundle(overrides){
 const plugins=overrides.size?[{name:'arch01c3b2-read-only',setup(b){
  b.onLoad({filter:/\.js$/},args=>{
   const key=path.relative(SRC,args.path).split(path.sep).join('/');
   if(overrides.has(key))return {contents:overrides.get(key),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }}]:[];
 const build=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
  format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',
  logLevel:'silent',logOverride:{'commonjs-variable-in-esm':'silent'},plugins
 });
 return markerList(build.outputFiles[0].text);
}
assert.deepEqual(await bundle(new Map()),expected,'unchanged production esbuild MUST reproduce original 167 markers');

const consumers=[];
for(const [p,source] of files){
 const tree=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});
 for(const n of tree.body.filter(n=>n.type==='ImportDeclaration')){
  if(!n.source.value.startsWith('.'))continue;
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(p),n.source.value));
  if(target===dname||target===lname||target==='core/state.js'){
   const imported=n.specifiers.filter(s=>s.type==='ImportSpecifier').map(s=>s.imported.name);
   const relevant=imported.filter(s=>[...names,'cq','cqFeats','NOTES','S'].includes(s));
   if(relevant.length&&([dname,lname,uname,'core/state.js'].includes(p)||target===dname))
    consumers.push({from:p,to:target,names:relevant});
  }
 }
}
console.log('ARCH-01C3b2 BASE '+JSON.stringify({
 modules:ast.modules,staticImports:ast.staticImports,legacy:ledger.length,
 sccSizes:ast.cycles.map(c=>c.length),conquestScc:ast.cycles.find(c=>c.includes(dname)),
 dataStateReferences:stateRefs,consumers,splitExports:baseSplitApi.length,allAstExports:baseApi.length
}));

// A: move cqBump to existing logic owner; data re-exports original name via
// its EXISTING import from logic. No new graph edge; one ADDITIVE logic export.
function stateBridge(anchor){
 let d=once(data,"import { cq } from '../logic/conquest.js';","import { cq, cqBump } from '../logic/conquest.js';");
 d=once(d,stateImport,'');d=once(d,bump,'');
 let l=once(logic,'cqBump, cqRar, cqScore','cqFeats, cqRar, cqScore');
 l=once(l,logicStateImport,"import { NOTES, S } from '../core/state.js';");
 l=once(l,'cqRfN, cqRfCost, cqHot };','cqRfN, cqRfCost, cqBump, cqHot };');
 l=once(l,anchor,bump+'\n'+anchor);
 return new Map([[dname,d],[lname,l]]);
}
// B: exact 898 exports, but a new top-level mutation of the cq function as
// hidden notification port; DO NOT call this production-safe purely from order.
function statePort(anchor){
 let d=once(data,stateImport,'');
 d=once(d,"for (const x of out) NOTES.push({ id: Math.random().toString(36).slice(2), kind: 'cqf', F: x.F, v: x.v });",
  'cq.notifyFeats(out);');
 let l=once(logic,logicStateImport,"import { NOTES, S } from '../core/state.js';");
 const fn="cq.notifyFeats = out => { for (const x of out) NOTES.push({ id: Math.random().toString(36).slice(2), kind: 'cqf', F: x.F, v: x.v }); };\n";
 l=once(l,anchor,fn+anchor);
 return new Map([[dname,d],[lname,l]]);
}
// C: rehome all dynamic selectors to logic and retarget existing Conquest UI
// imports; removes both live reverse edges but removes old data exports.
function rehomeAll(anchor){
 let d=once(data,"import { cq } from '../logic/conquest.js';\n",'');
 d=once(d,stateImport,'');
 for(const s of Object.values(definitions))d=once(d,s,'');
 d=once(d,bump,'');
 const regex=/^export \{ ([^\n]+) \};$/m,m=regex.exec(d);
 assert.ok(m);
 d=d.replace(regex,'export { '+m[1].split(', ').filter(n=>!names.includes(n)).join(', ')+' };');
 let l=once(logic,'cqBump, cqRar, cqScore','cqFeats, cqMod, cqRar');
 l=once(l,logicStateImport,"import { NOTES, S } from '../core/state.js';");
 l=once(l,'cqRfN, cqRfCost, cqHot };','cqRfN, cqRfCost, cqK, cqModD, cqScore, cqBump, cqHot };');
 l=once(l,anchor,Object.values(definitions).join('')+bump+'\n'+anchor);
 const dImp=/^import \{ ([^\n]+) \} from '\.\.\/\.\.\/data\/conquest-data\.js';$/m;
 const lImp=/^import \{ ([^\n]+) \} from '\.\.\/\.\.\/logic\/conquest\.js';$/m;
 const md=dImp.exec(ui),ml=lImp.exec(ui);
 assert.ok(md&&ml);
 const dataNames=md[1].split(', '),logicNames=ml[1].split(', ');
 assert.ok(names.every(n=>dataNames.includes(n)));
 let u=ui.replace(dImp,"import { "+dataNames.filter(n=>!names.includes(n)).join(', ')+" } from '../../data/conquest-data.js';");
 u=u.replace(lImp,"import { "+[...logicNames,...names].join(', ')+" } from '../../logic/conquest.js';");
 return new Map([[dname,d],[lname,l],[uname,u]]);
}
const scenarios=[
 {name:'remove-state-only',kind:'unbound NOTES must be rejected',files:new Map([[dname,once(data,stateImport,'')]])},
 ...['const cqWeek = () =>','const cqRfN = () =>','export { cqWeek,'].map((a,i)=>({
  name:'state-bridge-'+i,kind:'additive logic named API',files:stateBridge(a)})),
 ...['// ---- Решимость','const cqRfN = () =>'].map((a,i)=>({
  name:'state-port-'+i,kind:'top-level mutable cq.notifyFeats side-channel',files:statePort(a)})),
 ...['const cqWeek = () =>','const cqRfN = () =>','export { cqWeek,'].map((a,i)=>({
  name:'rehome-all-'+i,kind:'remove original data named exports',files:rehomeAll(a)}))
];
const reports=[];
for(const scenario of scenarios){
 try{
  const output=await bundle(scenario.files);
  const graph=cycleGraph(scenario.files),nowApi=exportsOf(scenario.files),nowSplit=splitApi(scenario.files);
  const missing=expected.filter(n=>!output.includes(n)),extra=output.filter(n=>!expected.includes(n));
  const moved=expected.filter((n,i)=>output.indexOf(n)!==i),first=expected.findIndex((n,i)=>output[i]!==n);
  const introducedEdges=[...graph.edges].filter(x=>!before.edges.has(x));
  const removedEdges=[...before.edges].filter(x=>!graph.edges.has(x));
  const addedExports=nowApi.filter(x=>!baseApi.includes(x));
  const removedExports=baseApi.filter(x=>!nowApi.includes(x));
  const exact=!moved.length&&!missing.length&&!extra.length;
  const cycleSame=JSON.stringify(graph.cycles)===JSON.stringify(before.cycles);
  const splitAdd=nowSplit.filter(x=>!baseSplitApi.includes(x));
  const splitRemoved=baseSplitApi.filter(x=>!nowSplit.includes(x));
  const apiStable=!addedExports.length&&!removedExports.length&&!splitAdd.length&&!splitRemoved.length;
  const report={name:scenario.name,kind:scenario.kind,markerExact:exact,
   moved:moved.length,missing,extra,first:first<0?'none':first+':'+expected[first]+' -> '+output[first],
   sccSizes:graph.cycles.map(c=>c.length),cycleSame,introducedEdges,removedEdges,
   exports:nowSplit.length,allAstExports:nowApi.length,addedExports,removedExports,splitAdd,splitRemoved,apiStable,
   stateEdgeRemoved:!graph.edges.has(dname+' -> core/state.js'),
   logicEdgeRemoved:!graph.edges.has(dname+' -> logic/conquest.js'),
   strictStructuralGate:exact&&cycleSame&&!introducedEdges.length&&apiStable,
   runtimeTDZProven:false};
  reports.push(report);
  console.log('ARCH-01C3b2 TRIAL '+JSON.stringify(report));
 }catch(error){
  const report={name:scenario.name,error:String(error.stack||error).slice(0,650)};
  reports.push(report);
  console.log('ARCH-01C3b2 TRIAL '+JSON.stringify(report));
 }
}
console.log('ARCH-01C3b2 RESULT '+JSON.stringify({
 trials:reports.length,exact:reports.filter(r=>r.markerExact).length,
 strictStructuralCandidates:reports.filter(r=>r.strictStructuralGate).map(r=>r.name),
 best:reports.filter(r=>Number.isInteger(r.moved)).sort((a,b)=>a.moved-b.moved)
  .slice(0,8).map(r=>({name:r.name,moved:r.moved,apiStable:r.apiStable,cycleSame:r.cycleSame})),
 note:'In-memory virtual-only. No real save, week, notification, TDZ or gameplay proof; no source change permitted.'
}));
console.log('ARCH-01C3b2 diagnostic only: no production source edits or new ESM module');
