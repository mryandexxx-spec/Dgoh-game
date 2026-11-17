// ARCH-01C3b3 Stage A — read-only production esbuild variants for Conquest data -> logic.
// In-memory replacements only. Never edit game source, SPLIT, baseline, golden or published assets.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),SRC=path.join(DEV,'src');
const files=new Map();
function walk(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const f=path.join(dir,e.name);
  if(e.isDirectory())walk(f);
  else if(e.isFile()&&e.name.endsWith('.js'))files.set(path.relative(SRC,f).split(path.sep).join('/'),fs.readFileSync(f,'utf8'));
 }
}
walk(SRC);
const dn='data/conquest-data.js',ln='logic/conquest.js',un='ui/views/conq.js';
const data=files.get(dn),logic=files.get(ln),ui=files.get(un);
const legacy=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
const graph=analyzeTree(DEV),markers=SPLIT.map(([,p])=>p);
assert.equal(files.size,173);assert.equal(graph.modules,173);assert.equal(graph.staticImports,1000);
assert.equal(graph.unresolved.length,0);assert.equal(graph.cycles.length,2);
assert.deepEqual(graph.cycles.map(c=>c.length),[106,9]);
assert.equal(markers.length,167);
assert.deepEqual(legacy,[
 'data/boss.js -> logic/battle/skills.js',
 'data/conquest-data.js -> logic/conquest.js',
 'data/conquest-data.js -> ui/overlays/celebrate.js',
 'data/looks.js -> logic/battle/ai.js',
 'data/story.js -> assets/models.js',
]);
assert.deepEqual(importEdges(data,dn).filter(x=>x.kind==='static').map(x=>x.to),[
 'logic/conquest.js','ui/overlays/celebrate.js','data/chars.js','data/fx.js'
]);
assert.ok(data.includes("import '../ui/overlays/celebrate.js'; // порядок исполнения"));
assert.ok(files.get('data/story.js').includes("import '../assets/models.js'; // порядок исполнения"));
assert.ok(logic.includes("import { NOTES, S } from '../core/state.js';"));
assert.ok(logic.includes('function cqBump(ev, s, n = 1, abs = false) {'));
function once(s,old,replacement){
 assert.equal(s.split(old).length,2,'Missing or duplicate source anchor: '+old.slice(0,90));
 return s.replace(old,replacement);
}
const decl=[
 "const cqK = () => ({ easy: 1, normal: 1.25, hard: 1.5 })[cq().diff] || 1;\n",
 "const cqModD = m => { const x = cqMod(m); return typeof x.d === 'function' ? x.d(cqK()) : x.d; };\n",
 "const cqScore = () => { const C = cq(); return C.stars + (C.pts || 0); };\n"
];
for(const fn of decl)assert.equal(data.split(fn).length,2,'existing selector byte body frozen');
const names=['cqK','cqModD','cqScore'];
function api(overrides){
 return SPLIT.flatMap(([,p])=>{
  const s=overrides.get(p)??files.get(p),m=/^export \{ (.+) \};$/m.exec(s);
  return m?m[1].split(', ').map(x=>p+':'+x):[];
 }).sort();
}
const baselineApi=api(new Map());
assert.equal(baselineApi.length,898);
const globalNames=arr=>arr.map(x=>x.slice(x.indexOf(':')+1)).sort();
const originalNames=globalNames(baselineApi);
function importGraph(overrides){
 const g=Object.fromEntries([...files.keys()].sort().map(p=>[p,[]])),edges=new Set(),all=[];
 for(const [p,src] of files){
  const edgesNow=importEdges(overrides.get(p)??src,p);
  for(const e of edgesNow){
   if(e.kind!=='static')continue;
   assert.ok(files.has(e.to),'unknown static import '+p+' -> '+e.to);
   g[p].push(e.to);edges.add(e.from+' -> '+e.to);all.push(e);
  }
 }
 return {cycles:stronglyConnected(g),edges,staticCount:all.length};
}
const oldGraph=importGraph(new Map());
assert.deepEqual(oldGraph.cycles,graph.cycles);
const apiImporters=[];
function importsOf(p,src,target){
 const t=acorn.parse(src,{ecmaVersion:'latest',sourceType:'module'});
 return t.body.filter(x=>x.type==='ImportDeclaration').flatMap(x=>{
  if(!x.source.value.startsWith('.'))return [];
  const to=path.posix.normalize(path.posix.join(path.posix.dirname(p),x.source.value));
  if(to!==target)return [];
  return x.specifiers.filter(x=>x.type==='ImportSpecifier').map(x=>({from:p,to,symbol:x.imported.name}));
 });
}
for(const [p,src] of files)for(const x of importsOf(p,src,dn))if(names.includes(x.symbol))apiImporters.push(x);
assert.deepEqual(apiImporters.slice().sort((a,b)=>a.from.localeCompare(b.from)||a.symbol.localeCompare(b.symbol)),[
 {from:'logic/conquest.js',to:dn,symbol:'cqScore'},
 {from:'ui/views/conq.js',to:dn,symbol:'cqK'},
 {from:'ui/views/conq.js',to:dn,symbol:'cqModD'},
 {from:'ui/views/conq.js',to:dn,symbol:'cqScore'},
],'must account for all path-specific importers of the three dynamic selectors');
const list=code=>[...code.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(x=>x[1]).filter(x=>x!=='main.js');
async function build(overrides){
 const plugins=overrides.size?[{name:'arch01c3b3-memory-only',setup(b){
  b.onLoad({filter:/\.js$/},args=>{
   const k=path.relative(SRC,args.path).split(path.sep).join('/');
   if(overrides.has(k))return {contents:overrides.get(k),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }}]:[];
 const r=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',
  treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',
  logLevel:'silent',logOverride:{'commonjs-variable-in-esm':'silent'},plugins
 });
 return list(r.outputFiles[0].text);
}
assert.deepEqual(await build(new Map()),markers,'same production esbuild options must have exact original markers');
console.log('ARCH-01C3b3 BASE '+JSON.stringify({modules:graph.modules,staticImports:graph.staticImports,
 legacy,markers:markers.length,apiNames:baselineApi.length,cycles:graph.cycles.map(x=>x.length),
 importers:apiImporters,selectors:decl.map(x=>x.trim())}));

const dataImp="import { cq } from '../logic/conquest.js';\n";
const lDataImport="cqFeats, cqRar, cqScore";
const lExport="cqRfN, cqRfCost, cqBump, cqHot };";
const dataExport=/^export \{ ([^\n]+) \};$/m;
const uiDataImport=/^import \{ ([^\n]+) \} from '\.\.\/\.\.\/data\/conquest-data\.js';$/m;
const uiLogicImport=/^import \{ ([^\n]+) \} from '\.\.\/\.\.\/logic\/conquest\.js';$/m;
const anchorArr=['const cqWeek = () =>','const cqRfN = () =>','export { cqWeek,'];
function relocate(anchor){
 let d=once(data,dataImp,'');
 for(const fn of decl)d=once(d,fn,'');
 let m=dataExport.exec(d);
 assert.ok(m&&names.every(n=>m[1].split(', ').includes(n)));
 d=d.replace(dataExport,'export { '+m[1].split(', ').filter(n=>!names.includes(n)).join(', ')+' };');
 let l=once(logic,lDataImport,'cqFeats, cqMod, cqRar');
 l=once(l,anchor,decl.join('')+'\n'+anchor);
 l=once(l,lExport,'cqRfN, cqRfCost, cqK, cqModD, cqScore, cqBump, cqHot };');
 const dm=uiDataImport.exec(ui),lm=uiLogicImport.exec(ui);
 assert.ok(dm&&lm&&names.every(n=>dm[1].split(', ').includes(n)));
 let u=ui.replace(uiDataImport,"import { "+dm[1].split(', ').filter(n=>!names.includes(n)).join(', ')+" } from '../../data/conquest-data.js';");
 u=u.replace(uiLogicImport,"import { "+[...lm[1].split(', '),...names].join(', ')+" } from '../../logic/conquest.js';");
 return new Map([[dn,d],[ln,l],[un,u]]);
}
function bridge(anchor){
 const changes=relocate(anchor);
 let d=changes.get(dn);
 d=once(d,"import '../ui/overlays/celebrate.js'; // порядок исполнения",
  "import { cqK, cqModD, cqScore } from '../logic/conquest.js';\nimport '../ui/overlays/celebrate.js'; // порядок исполнения");
 let m=dataExport.exec(d);
 d=d.replace(dataExport,'export { '+m[1]+', cqK, cqModD, cqScore };');
 return new Map([[dn,d],[ln,changes.get(ln)],[un,ui]]);
}
function halfTransfer(){
 let d=once(data,dataImp,"import { cqK } from '../logic/conquest.js';\n");
 d=once(d,decl[0],'');d=once(d,decl[2],'');
 let m=dataExport.exec(d);
 d=d.replace(dataExport,'export { '+m[1].split(', ').filter(n=>!['cqK','cqScore'].includes(n)).join(', ')+' };');
 let l=once(logic,lDataImport,'cqFeats, cqRar');
 l=once(l,'const cqWeek = () =>',decl[0]+decl[2]+'\nconst cqWeek = () =>');
 l=once(l,lExport,'cqRfN, cqRfCost, cqK, cqScore, cqBump, cqHot };');
 const dm=uiDataImport.exec(ui),lm=uiLogicImport.exec(ui);
 let u=ui.replace(uiDataImport,"import { "+dm[1].split(', ').filter(n=>!['cqK','cqScore'].includes(n)).join(', ')+" } from '../../data/conquest-data.js';");
 u=u.replace(uiLogicImport,"import { "+[...lm[1].split(', '),'cqK','cqScore'].join(', ')+" } from '../../logic/conquest.js';");
 return new Map([[dn,d],[ln,l],[un,u]]);
}
const scenarios=[
 {name:'delete-import-only',kind:'unbound cq selectors; negative control',overrides:new Map([[dn,once(data,dataImp,'')]])},
 ...anchorArr.map((anchor,i)=>({name:'relocate-three-'+i,kind:'only three state-dependent selectors move to logic',overrides:relocate(anchor)})),
 ...anchorArr.slice(0,2).map((anchor,i)=>({name:'compatibility-reexport-'+i,kind:'old data API maintained but +3 exports and old edge',overrides:bridge(anchor)})),
 {name:'half-transfer-retains-edge',kind:'two selectors to logic but cqModD still reverse-imports cqK',overrides:halfTransfer()},
 {name:'side-effect-predecessor-retains-edge',kind:'unchanged old data→logic import retained as side-effect',overrides:(()=>{
  const f=relocate(anchorArr[0]);f.set(dn,once(f.get(dn),"import '../ui/overlays/celebrate.js'; // порядок исполнения","import '../logic/conquest.js'; // порядок исполнения\nimport '../ui/overlays/celebrate.js'; // порядок исполнения"));return f;
 })()}
];
const results=[];
for(const sc of scenarios){
 try{
  const out=await build(sc.overrides),g=importGraph(sc.overrides),ex=api(sc.overrides);
  const moved=markers.filter((p,i)=>out.indexOf(p)!==i),missing=markers.filter(p=>!out.includes(p)),extra=out.filter(p=>!markers.includes(p));
  const changes={removed:[...oldGraph.edges].filter(p=>!g.edges.has(p)),introduced:[...g.edges].filter(p=>!oldGraph.edges.has(p))};
  const added=ex.filter(x=>!baselineApi.includes(x)),removed=baselineApi.filter(x=>!ex.includes(x));
  const cycleSame=JSON.stringify(oldGraph.cycles)===JSON.stringify(g.cycles);
  const namesSame=JSON.stringify(globalNames(ex))===JSON.stringify(originalNames);
  const dataHasLogic=g.edges.has(dn+' -> logic/conquest.js');
  const ownerOk=sc.overrides.has(dn)&&!sc.overrides.get(dn).includes('const cqK =')&&
    !sc.overrides.get(dn).includes('const cqModD =')&&!sc.overrides.get(dn).includes('const cqScore =')&&
    ['cqK','cqModD','cqScore'].every(n=>sc.overrides.get(ln)?.includes('const '+n+' ='));
  const staleNamed=[];
  for(const [p,source] of files){
   const x=importsOf(p,sc.overrides.get(p)??source,dn).filter(x=>names.includes(x.symbol));
   for(const imp of x)if(!ex.includes(dn+':'+imp.symbol))staleNamed.push(imp.from+':'+imp.symbol);
  }
  const eligible=!moved.length&&!missing.length&&!extra.length&&cycleSame&&namesSame&&
    !changes.introduced.length&&changes.removed.length===1&&
    changes.removed[0]===dn+' -> logic/conquest.js'&&ownerOk&&!staleNamed.length&&ex.length===898;
  const result={name:sc.name,kind:sc.kind,esmExact:!moved.length&&!missing.length&&!extra.length,
    moved:moved.length,missing,extra,firstMoved:moved[0]??null,
    cycleSame,sccSizes:g.cycles.map(c=>c.length),staticImports:g.staticCount,
    removedEdges:changes.removed,introducedEdges:changes.introduced,oldEdgeStill:dataHasLogic,
    exports:ex.length,globalsExact:namesSame,addedSymbols:added,removedSymbols:removed,
    ownerOk,staleNamed,virtualGo:eligible,runtimeValidated:false};
  results.push(result);
  console.log('ARCH-01C3b3 TRIAL '+JSON.stringify(result));
 }catch(err){
  const result={name:sc.name,error:String(err.stack||err).slice(0,900),virtualGo:false};
  results.push(result);console.log('ARCH-01C3b3 TRIAL '+JSON.stringify(result));
 }
}
console.log('ARCH-01C3b3 RESULT '+JSON.stringify({count:results.length,
 exact:results.filter(x=>x.esmExact).length,
 virtualGo:results.filter(x=>x.virtualGo).map(x=>x.name),
 noGo:results.filter(x=>!x.virtualGo).map(x=>({name:x.name,moved:x.moved,error:x.error?.slice(0,160)})),
 caution:'virtual esbuild only, not real JS runtime/TDZ/save; path-specific data:cqK,cqModD,cqScore exports migrate to logic owner and require full Stage B' }));
console.log('ARCH-01C3b3 Stage A PASS; diagnostic only, zero game edits, no baseline changes');
