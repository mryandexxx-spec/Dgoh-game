// ARCH-01C4c Stage A: VIRTUAL-only composition-root boot alternatives.
// No src, SPLIT, legacy baseline, golden, version, release or PWA writes.
// Every option uses allowed src/boot.js or ui/views/conq.js imports only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(DEV, 'src');
const source = new Map();
function visit(dir) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const filename = path.join(dir, ent.name);
    if (ent.isDirectory()) visit(filename);
    else if (ent.isFile() && filename.endsWith('.js'))
      source.set(path.relative(SRC, filename).split(path.sep).join('/'), fs.readFileSync(filename, 'utf8'));
  }
}
visit(SRC);

const looks='data/looks.js', ai='logic/battle/ai.js', boot='boot.js', conq='ui/views/conq.js';
const oldLine="import '../logic/battle/ai.js'; // порядок исполнения\n";
const bootAnchor="import './ui/views/conq.js'; // порядок исполнения";
const conqAnchor=source.get(conq).split('\n').find(x=>x.startsWith('import '));
const conqAI="import { computeIntents } from '../../logic/battle/ai.js';";
const ledger=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
const before=analyzeTree(DEV), markers=SPLIT.map(([,m])=>m);
assert.deepEqual(ledger,[
  'data/conquest-data.js -> ui/overlays/celebrate.js',
  'data/looks.js -> logic/battle/ai.js',
  'data/story.js -> assets/models.js'
]);
assert.equal(source.size,173);
assert.equal(before.staticImports,998);
assert.deepEqual(before.cycles.map(x=>x.length),[106,6]);
assert.equal(markers.length,167);
assert.equal(before.unresolved.length,0);
assert.ok(source.get(looks).includes(oldLine));
assert.ok(source.get(boot).includes(bootAnchor+'\n'));
assert.ok(source.get(conq).includes(conqAI+'\n'));
assert.ok(source.get(ai).includes("if (typeof module !== 'undefined') module.exports"));
assert.ok(source.get('data/boss.js').includes('CH.worm = WORM;'));

function exportedNames(){
 return SPLIT.flatMap(([,p])=>{
  const match=/^export \{ ([^\n]+) \};$/m.exec(source.get(p));
  return match?match[1].split(', '):[];
 });
}
const publicNames=exportedNames();
assert.equal(publicNames.length,898);
const aliases={
 gear:'data/gear-cap.js', cine:'logic/cinematic-preference.js',
 fx:'data/fx.js', chars:'data/chars.js',
 skills:'logic/battle/skills.js', boss:'data/boss.js',
 stats:'logic/battle/stats.js', engine:'logic/battle/engine.js',
 turns:'logic/battle/turns.js', raid:'logic/battle/raid.js', ai
};
function oldWithoutPredecessor(){
 const text=source.get(looks);
 assert.equal(text.split(oldLine).length,2);
 return new Map([[looks,text.replace(oldLine,'')]]);
}
function prepend(p,keys,moveNamedAI=false){
 const text=source.get(p), rows=text.split('\n');
 const anchor=p===boot?bootAnchor:conqAnchor;
 const at=rows.indexOf(anchor);
 assert.ok(at>=0,'composition root anchor not found: '+p);
 if(moveNamedAI){
  assert.equal(p,conq);
  assert.equal(rows.filter(x=>x===conqAI).length,1);
  rows.splice(rows.indexOf(conqAI),1);
 }
 const prefix=keys.map(k=>{
  if(k==='existing-ai'){
   assert.ok(moveNamedAI);
   return conqAI;
  }
  const target=aliases[k];
  assert.ok(target,'unknown bootstrap module: '+k);
  const rel=path.posix.relative(path.posix.dirname(p),target);
  const spec=rel.startsWith('.')?rel:'./'+rel;
  const line="import '"+spec+"'; // ARCH-01C4c VIRTUAL root predecessor";
  assert.ok(!rows.includes(line));
  return line;
 });
 rows.splice(rows.indexOf(anchor),0,...prefix);
 const result=rows.join('\n');
 assert.equal(
  result.split('\n').filter(x=>!x.startsWith('import ')).join('\n'),
  text.split('\n').filter(x=>!x.startsWith('import ')).join('\n'),
  'virtual composition must only edit import declarations'
 );
 return result;
}
const cases=[];
function sample(name,p,keys,moveNamedAI=false){
 const patch=oldWithoutPredecessor();
 patch.set(p,prepend(p,keys,moveNamedAI));
 cases.push({name,owner:p,keys,patch});
}
cases.push({name:'negative-naive-delete',owner:'none',keys:[],patch:oldWithoutPredecessor()});
const rootSets=[
 ['ai'],
 ['gear','ai'],['cine','ai'],['gear','cine','ai'],['cine','gear','ai'],
 ['gear','ai','cine'],['cine','ai','gear'],
 ['gear','cine','fx','ai'],['gear','cine','chars','ai'],
 ['gear','cine','skills','ai'],['gear','cine','boss','ai'],
 ['gear','cine','stats','ai'],['gear','cine','engine','ai'],
 ['gear','cine','turns','ai'],['gear','cine','raid','ai'],
 ['gear','cine','skills','boss','stats','engine','turns','raid','ai'],
 ['gear','cine','fx','chars','skills','boss','stats','engine','turns','raid','ai']
];
for(const keys of rootSets) sample('root-'+keys.join('-'),boot,keys);
const conqSets=[
 ['existing-ai'],['gear','existing-ai'],['cine','existing-ai'],
 ['gear','cine','existing-ai'],['cine','gear','existing-ai'],
 ['gear','cine','skills','existing-ai'],
 ['gear','cine','stats','existing-ai'],
 ['gear','cine','raid','existing-ai'],
 ['gear','cine','fx','chars','existing-ai'],
 ['gear','cine','fx','chars','skills','boss','stats','engine','turns','raid','existing-ai']
];
for(const keys of conqSets) sample('ui-'+keys.join('-'),conq,keys,true);

function graph(patch){
 const g=Object.fromEntries([...source.keys()].sort().map(m=>[m,[]]));
 const edges=[];
 for(const [owner,original] of source){
  const body=patch.get(owner)??original;
  for(const e of importEdges(body,owner)){
   if(e.kind!=='static')continue;
   assert.ok(source.has(e.to),'unresolved '+owner+' -> '+e.to);
   edges.push(owner+' -> '+e.to);
   g[owner].push(e.to);
  }
 }
 return {imports:edges.length,edgeSet:new Set(edges),cycles:stronglyConnected(g)};
}
function extract(js){
 return [...js.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m=>m[1]).filter(p=>p!=='main.js');
}
async function bundle(patch){
 const plug={name:'arch01c4c-in-memory',setup(b){
  b.onLoad({filter:/\.js$/},args=>{
   const key=path.relative(SRC,args.path).split(path.sep).join('/');
   if(patch.has(key))return {contents:patch.get(key),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }};
 const out=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',
  treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',
  logLevel:'silent',logOverride:{'commonjs-variable-in-esm':'silent'},
  plugins:patch.size?[plug]:[]
 });
 assert.equal(out.outputFiles.length,1);
 return extract(out.outputFiles[0].text);
}
const originGraph=graph(new Map()),originOrder=await bundle(new Map());
assert.equal(originGraph.imports,998);
assert.deepEqual(originGraph.cycles,before.cycles);
assert.deepEqual(originOrder,markers,'production esbuild baseline must match frozen SPLIT');
console.log('ARCH-01C4c BASE '+JSON.stringify({
 source:173,imports:998,esm:167,names:898,cycles:[106,6],legacy:ledger,
 baselineSHA:'v133-main-4d36590',cases:cases.length
}));
const results=[];
for(const trial of cases){
 try{
  const [order,g]=await Promise.all([bundle(trial.patch),Promise.resolve(graph(trial.patch))]);
  const missing=markers.filter(m=>!order.includes(m)),extra=order.filter(m=>!markers.includes(m));
  const moved=markers.filter((m,i)=>order.indexOf(m)!==i);
  const removed=[...originGraph.edgeSet].filter(e=>!g.edgeSet.has(e)).sort();
  const added=[...g.edgeSet].filter(e=>!originGraph.edgeSet.has(e)).sort();
  const exact=order.length===markers.length && !moved.length && !missing.length && !extra.length;
  const cyclesExact=JSON.stringify(before.cycles)===JSON.stringify(g.cycles);
  const layerForbidden=added.filter(x=>
   /^render2d\/.* -> logic\//.test(x)||
   /^render3d\/.* -> logic\//.test(x)||
   /^data\/.* -> (core|logic|ui|assets|render2d|render3d)\//.test(x)||
   /^logic\/.* -> ui\//.test(x)
  );
  const ownerAllowed=added.every(x=>
   x.startsWith('boot.js -> ') || x.startsWith('ui/views/conq.js -> ')
  );
  const bodiesExact=[...trial.patch].every(([p,s])=>
   p===looks?s===source.get(looks).replace(oldLine,''):
   s.split('\n').filter(line=>!line.startsWith('import ')).join('\n')===
    source.get(p).split('\n').filter(line=>!line.startsWith('import ')).join('\n')
  );
  const namesExact=JSON.stringify(exportedNames())===JSON.stringify(publicNames);
  const targetGone=removed.length===1&&removed[0]===looks+' -> '+ai;
  const architecturallyAllowed=layerForbidden.length===0&&ownerAllowed;
  const virtualCandidate=exact&&namesExact&&bodiesExact&&targetGone&&
   architecturallyAllowed; // CANDIDATE ONLY; cycles and runtime require review.
  const strictCandidate=virtualCandidate&&cyclesExact&&added.length===0&&g.imports===997;
  const row={
   name:trial.name,owner:trial.owner,
   ESMExact:exact,moved:moved.length,firstMoved:moved.slice(0,8),
   aiIndex:order.indexOf(ai),looksIndex:order.indexOf(looks),
   imports:g.imports,removed,added,layerForbidden,cycles:g.cycles.map(c=>c.length),
   cyclesExact,namesExact,bodiesExact,virtualCandidate,strictCandidate,
   runtimeValidated:false
  };
  results.push(row);
  console.log('ARCH-01C4c TRIAL '+JSON.stringify(row));
 }catch(error){
  const row={name:trial.name,error:String(error),ESMExact:false,virtualCandidate:false};
  results.push(row);
  console.log('ARCH-01C4c TRIAL '+JSON.stringify(row));
 }
}
assert.equal(results.length,cases.length);
assert.equal(results[0].ESMExact,false,'negative control: naive deletion must move ESM markers');
assert.equal(results[0].moved,60,'negative control drift changed; investigate graph baseline');
assert.ok(results.every(r=>!r.layerForbidden?.length),'never introduce forbidden render/data/logic edge');
console.log('ARCH-01C4c SUMMARY '+JSON.stringify({
 tested:results.length,exact:results.filter(x=>x.ESMExact).length,
 strict:results.filter(x=>x.strictCandidate).map(x=>x.name),
 conditionalReview:results.filter(x=>x.virtualCandidate&&!x.strictCandidate).map(x=>x.name),
 noGo:results.filter(x=>!x.virtualCandidate).map(x=>({name:x.name,moved:x.moved??null,error:x.error??null})),
 protected:'no production source, legacy ledger, SPLIT, golden, saves, version, camp, Campaign, root PWA or SW changed',
 note:'Read-only ESM and AST only. Even ESM-exact permitted-root candidates need cold/warm real VM, PWA+artifact, immutable golden, browser, offline, WebGL and owner approval before any B1.'
}));
