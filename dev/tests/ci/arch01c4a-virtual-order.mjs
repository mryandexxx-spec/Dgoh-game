// ARCH-01C4a Stage A: two independent ORDER-ONLY data->logic predecessors.
// Read-only, in-memory production esbuild tests. NEVER change game's sources,
// SPLIT, existing baseline/golden, published PWA, or the raid boss mutation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const files=new Map();
function walk(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,item.name);
  if(item.isDirectory())walk(full);
  else if(item.isFile()&&full.endsWith('.js'))
   files.set(path.relative(SRC,full).split(path.sep).join('/'),fs.readFileSync(full,'utf8'));
 }
}
walk(SRC);
const boss='data/boss.js', looks='data/looks.js';
const skills='logic/battle/skills.js', ai='logic/battle/ai.js';
const b=files.get(boss),l=files.get(looks);
const graph=analyzeTree(DEV);
const markers=SPLIT.map(([,mod])=>mod);
const ledger=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.equal(files.size,173);
assert.equal(graph.modules,173);
assert.equal(graph.staticImports,999);
assert.deepEqual(graph.cycles.map(c=>c.length),[106,9]);
assert.equal(graph.unresolved.length,0);
assert.equal(markers.length,167);
assert.deepEqual(ledger,[
 'data/boss.js -> logic/battle/skills.js',
 'data/conquest-data.js -> ui/overlays/celebrate.js',
 'data/looks.js -> logic/battle/ai.js',
 'data/story.js -> assets/models.js',
]);
assert.ok(markers.indexOf(skills)<markers.indexOf(boss));
assert.ok(markers.indexOf(ai)<markers.indexOf(looks));
const bossPre="import '../logic/battle/skills.js'; // порядок исполнения";
const looksPre="import '../logic/battle/ai.js'; // порядок исполнения";
assert.ok(b.includes(bossPre)&&l.includes(looksPre));
assert.deepEqual(importEdges(b,boss).filter(x=>x.kind==='static').map(x=>x.to),[skills,'data/chars.js']);
assert.deepEqual(importEdges(l,looks).filter(x=>x.kind==='static').map(x=>x.to),[ai]);
assert.ok(b.includes('CH.worm = WORM;'),'WORM mutation must be kept at historical top-level');
assert.ok(files.get(ai).includes("if (typeof module !== 'undefined') module.exports"),'AI CommonJS compatibility must remain');
assert.ok(files.get('data/conquest-data.js').includes("import '../ui/overlays/celebrate.js'; // порядок исполнения"));
assert.ok(files.get('data/story.js').includes("import '../assets/models.js'; // порядок исполнения"));

function exactlyOnce(src,from,to){
 assert.equal(src.split(from).length,2,'must have exactly one original predecessor '+from);
 return src.replace(from,to);
}
function edit(mod,prev,next){return new Map([[mod,exactlyOnce(files.get(mod),prev,next)]]);}
function combine(a,z){return new Map([...a,...z]);}
function noNewLogicOwner(overrides){
 return ['logic/battle/skills.js','logic/battle/ai.js','logic/battle/raid.js',
 'logic/battle/engine.js'].every(p=>!overrides.has(p));
}
const scenarios=[
 {name:'delete-boss-predecessor',kind:'negative/naive removal',patch:edit(boss,bossPre,'')},
 {name:'delete-looks-predecessor',kind:'negative/naive removal',patch:edit(looks,looksPre,'')},
 {name:'delete-both-predecessors',kind:'negative/naive removal',patch:combine(edit(boss,bossPre,''),edit(looks,looksPre,''))},
 {name:'boss-predecessor-to-chars',kind:'existing allowed data/chars dependency, redundant side-effect',patch:edit(boss,bossPre,"import './chars.js'; // порядок исполнения (виртуально)")},
 {name:'boss-predecessor-to-skill-ups',kind:'allowed data->data skill-ups dependency',patch:edit(boss,bossPre,"import './skill-ups.js'; // порядок исполнения (виртуально)")},
 {name:'looks-predecessor-to-boss',kind:'allowed data->data boss dependency',patch:edit(looks,looksPre,"import './boss.js'; // порядок исполнения (виртуально)")},
 {name:'looks-predecessor-to-chars',kind:'allowed data->data chars dependency',patch:edit(looks,looksPre,"import './chars.js'; // порядок исполнения (виртуально)")},
 {name:'looks-predecessor-to-skill-ups',kind:'allowed data->data skill-ups dependency',patch:edit(looks,looksPre,"import './skill-ups.js'; // порядок исполнения (виртуально)")},
 {name:'boss-chars-and-looks-boss',kind:'both pure data predecessor candidates',patch:combine(edit(boss,bossPre,"import './chars.js'; // порядок исполнения (виртуально)"),edit(looks,looksPre,"import './boss.js'; // порядок исполнения (виртуально)"))},
 {name:'boss-skill-ups-and-looks-boss',kind:'both pure data predecessor candidates',patch:combine(edit(boss,bossPre,"import './skill-ups.js'; // порядок исполнения (виртуально)"),edit(looks,looksPre,"import './boss.js'; // порядок исполнения (виртуально)"))},
 {name:'boss-chars-looks-delete',kind:'allowed boss alternative plus naive looks removal',patch:combine(edit(boss,bossPre,"import './chars.js'; // порядок исполнения (виртуально)"),edit(looks,looksPre,''))},
 {name:'boss-delete-looks-boss',kind:'naive boss removal plus allowed looks alternative',patch:combine(edit(boss,bossPre,''),edit(looks,looksPre,"import './boss.js'; // порядок исполнения (виртуально)"))},
];
function uniqueImports(overrides){
 const g=Object.fromEntries([...files.keys()].sort().map(p=>[p,[]]));
 const all=[];
 for(const [p,src] of files){
  for(const e of importEdges(overrides.get(p)??src,p)){
   if(e.kind!=='static')continue;
   assert.ok(files.has(e.to),'unknown import: '+p+' -> '+e.to);
   all.push(e);
   g[p].push(e.to);
  }
 }
 return {count:all.length,edges:new Set(all.map(x=>x.from+' -> '+x.to)),cycles:stronglyConnected(g)};
}
function namedExports(overrides){
 return SPLIT.flatMap(([,p])=>{
  const s=overrides.get(p)??files.get(p);
  const exp=/^export \{ ([^\n]+) \};$/m.exec(s);
  return exp?exp[1].split(', '):[];
 }).sort();
}
function markerList(s){return [...s.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(x=>x[1]).filter(p=>p!=='main.js');}
async function bundle(patch){
 const plugin={name:'arch01c4a-memory-virtual',setup(build){
  build.onLoad({filter:/\.js$/},args=>{
   const key=path.relative(SRC,args.path).split(path.sep).join('/');
   if(patch.has(key))return {contents:patch.get(key),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }};
 const built=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',
  treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',logLevel:'silent',
  logOverride:{'commonjs-variable-in-esm':'silent'},plugins:patch.size?[plugin]:[],
 });
 assert.equal(built.outputFiles.length,1);
 return markerList(built.outputFiles[0].text);
}
const baselineGraph=uniqueImports(new Map());
assert.deepEqual(baselineGraph.cycles,graph.cycles);
const baselineNames=namedExports(new Map());
assert.equal(baselineNames.length,898);
assert.deepEqual(await bundle(new Map()),markers,'must match 167 actual production esbuild markers');
console.log('ARCH-01C4a BASE '+JSON.stringify({
 modules:173,staticImports:999,ESM:167,publicNames:898,SCC:graph.cycles.map(x=>x.length),
 legacy:ledger,bossOrder:[markers.indexOf(skills),markers.indexOf(boss)],
 looksOrder:[markers.indexOf(ai),markers.indexOf(looks)],
 bossEffect:'CH.worm = WORM top-level mutation retained',
 aiEffect:"conditional module.exports top-level compatibility retained"
}));
const results=[];
for(const test of scenarios){
 try{
  const current=await bundle(test.patch);
  const next=uniqueImports(test.patch);
  const symbols=namedExports(test.patch);
  const missing=markers.filter(x=>!current.includes(x));
  const extra=current.filter(x=>!markers.includes(x));
  const moved=markers.filter((x,i)=>current.indexOf(x)!==i);
  const oldEdges=[...baselineGraph.edges].filter(x=>!next.edges.has(x)).sort();
  const addedEdges=[...next.edges].filter(x=>!baselineGraph.edges.has(x)).sort();
  const exactSCC=JSON.stringify(next.cycles)===JSON.stringify(graph.cycles);
  const namesExact=JSON.stringify(symbols)===JSON.stringify(baselineNames);
  const removedDebt=oldEdges.filter(x=>[boss+' -> '+skills,looks+' -> '+ai].includes(x));
  const otherRemoved=oldEdges.filter(x=>!removedDebt.includes(x));
  const b2=test.patch.get(boss)??b,l2=test.patch.get(looks)??l;
  const immutability=b2.replace(/^import .*\n/,'')===b.replace(/^import .*\n/,'')&&
   l2.replace(/^import .*\n/,'')===l.replace(/^import .*\n/,'');
  const preservesEffects=b2.includes('CH.worm = WORM;')&&files.get(ai).includes("if (typeof module !== 'undefined') module.exports");
  const esmExact=missing.length===0&&extra.length===0&&moved.length===0&&current.length===167;
  const virtualGo=esmExact&&exactSCC&&namesExact&&addedEdges.length===0&&
   otherRemoved.length===0&&removedDebt.length>0&&immutability&&preservesEffects&&
   noNewLogicOwner(test.patch);
  const row={scenario:test.name,kind:test.kind,esmExact,markersMoved:moved.length,
   firstMoved:moved[0]??null,missing,extra,staticImports:next.count,
   exactSCC,SCC:next.cycles.map(x=>x.length),publicNames:symbols.length,
   namesExact,removedEdges:oldEdges,addedEdges,immutability,preservesEffects,
   originalOrder:{skillsBeforeBoss:current.indexOf(skills)<current.indexOf(boss),
    aiBeforeLooks:current.indexOf(ai)<current.indexOf(looks)},
   virtualGo,runtimeValidated:false};
  results.push(row);
  console.log('ARCH-01C4a TRIAL '+JSON.stringify(row));
 }catch(e){
  const row={scenario:test.name,error:String(e.stack||e).slice(0,1200),virtualGo:false};
  results.push(row);
  console.log('ARCH-01C4a TRIAL '+JSON.stringify(row));
 }
}
console.log('ARCH-01C4a SUMMARY '+JSON.stringify({
 scenarios:results.length,exactESM:results.filter(x=>x.esmExact).length,
 virtualGo:results.filter(x=>x.virtualGo).map(x=>x.scenario),
 noGo:results.filter(x=>!x.virtualGo).map(x=>({scenario:x.scenario,
  moved:x.markersMoved??null,addedEdges:x.addedEdges??[],SCC:x.SCC??null,error:x.error??null})),
 evidence:'Actual production esbuild memory overlays only; NO game source, baseline, SPLIT, save, golden, version, camp, root PWA or SW changed.',
 caution:'Order-only imports in a cyclic ESM bootstrap: exact markers are necessary not sufficient. Full real built PWA/artifact and Safari needed before any Stage B.'
}));
console.log('ARCH-01C4a Stage A PASS; in-memory diagnostic only');
