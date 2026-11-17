// ARCH-01C4b Stage A — "looks → ai" ESM order-only legacy import.
// Production-esbuild read-only source overlays: NO source edits, no golden
// rewriting, no SPLIT changes, no baseline change, no publish/merge.
// The C4a naive looks deletion moved 60 ESM markers; re-evaluate from v133.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src'),looks='data/looks.js',ai='logic/battle/ai.js';
const oldLine="import '../logic/battle/ai.js'; // порядок исполнения";
const source=new Map();
function walk(p) {
 for(const ent of fs.readdirSync(p,{withFileTypes:true})){
  const full=path.join(p,ent.name);
  if(ent.isDirectory())walk(full);
  else if(ent.isFile()&&full.endsWith('.js'))
   source.set(path.relative(SRC,full).split(path.sep).join('/'),fs.readFileSync(full,'utf8'));
 }
}
walk(SRC);
const base=analyzeTree(DEV),markers=SPLIT.map(([,p])=>p);
const ledger=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.equal(base.modules,173);
assert.equal(base.staticImports,998);
assert.deepEqual(base.cycles.map(x=>x.length),[106,6]);
assert.equal(base.unresolved.length,0);
assert.equal(source.size,173);
assert.equal(markers.length,167);
assert.deepEqual(ledger,[
 'data/conquest-data.js -> ui/overlays/celebrate.js',
 'data/looks.js -> logic/battle/ai.js',
 'data/story.js -> assets/models.js'
]);
assert.ok(source.get(looks).includes(oldLine+'\n'));
assert.deepEqual(importEdges(source.get(looks),looks).filter(x=>x.kind==='static').map(x=>x.to),[ai]);
assert.ok(source.get(ai).includes("if (typeof module !== 'undefined') module.exports"));
assert.ok(markers.indexOf(ai)<markers.indexOf(looks));
assert.ok(source.get('data/boss.js').includes('CH.worm = WORM;'));
assert.ok(source.get('logic/battle/stats.js').includes("import { SK_KEYS, autoSk } from './skills.js';\nimport { STAR_MULT } from '../../data/boss.js';"));
assert.ok(source.get('data/conquest-data.js').includes("import '../ui/overlays/celebrate.js'; // порядок исполнения"));
assert.ok(source.get('data/story.js').includes("import '../assets/models.js'; // порядок исполнения"));
const names=()=>SPLIT.flatMap(([,p])=>{
 const m=/^export \{ ([^\n]+) \};$/m.exec(source.get(p));
 return m?m[1].split(', '):[];
});
const publicNames=names();
assert.equal(publicNames.length,898);

function removePredecessor(){
 const s=source.get(looks);
 assert.equal(s.split(oldLine+'\n').length,2);
 return new Map([[looks,s.replace(oldLine+'\n','')]]);
}
function reorder(p,movable,before) {
 const text=source.get(p),rows=text.split('\n');
 assert.equal(rows.filter(x=>x===movable).length,1,'move source '+p+': '+movable);
 assert.equal(rows.filter(x=>x===before).length,1,'before '+p+': '+before);
 const origin=rows.indexOf(movable),beforeIdx=rows.indexOf(before);
 assert.ok(origin>beforeIdx,'candidate must move existing later import earlier');
 rows.splice(origin,1);rows.splice(rows.indexOf(before),0,movable);
 assert.ok(rows.filter(x=>!x.startsWith('import ')).join('\n')===
  text.split('\n').filter(x=>!x.startsWith('import ')).join('\n'),
  'no game functions, comments, or top-level effects may be moved');
 return new Map([[p,rows.join('\n')]]);
}
const cases=[];
function add(name,kind,mods=[],note=''){
 const patch=removePredecessor();
 for(const [p,m,b] of mods)for(const [key,val] of reorder(p,m,b))patch.set(key,val);
 cases.push({name,kind,patch,note});
}
const conq='ui/views/conq.js',battle='ui/battle/battle-ui.js',hero='ui/hero-card.js';
const imports=p=>source.get(p).split('\n').filter(x=>x.startsWith('import '));
const cAI="import { computeIntents } from '../../logic/battle/ai.js';";
const cFig="import { portrait } from '../../render2d/figures.js';";
const cLook="import { ghash } from '../../data/looks.js';";
const cFirst=imports(conq)[0];
const bAI="import { aiPlan, hasPrescience } from '../../logic/battle/ai.js';";
const bTurn="import { act, endTurn, glMeter, startTurn } from '../../logic/battle/turns.js';";
const bEngine="import { abilityReady, createBattle, advanceWave, foe, living, nextActor, previewOrder, validTargets } from '../../logic/battle/engine.js';";
const bFig="import { figureSVG, portrait, wormSVG, bakedFullPortraitUrl } from '../../render2d/figures.js';";
const bLook="import { ghash } from '../../data/looks.js';";
const bScene="import { SceneBG, reduceMotion } from '../../render2d/scene-bg.js';";
const bFx="import { FXLayer } from '../../render2d/fx-layer.js';";
const bFirst=imports(battle)[0];
const hStats="import { unitPower, unitStats } from '../logic/battle/stats.js';";
const hSkills="import { SK_KEYS, skMax } from '../logic/battle/skills.js';";
const hFig="import { figureSVG } from '../render2d/figures.js';";
add('naive-delete','negative, known 60 marker drift');
add('conq-ai-before-direct-looks','existing UI named import',[ [conq,cAI,cLook] ]);
add('conq-ai-before-figures','existing UI named import',[ [conq,cAI,cFig] ]);
add('conq-ai-first','existing UI named import',[ [conq,cAI,cFirst] ]);
add('battle-ai-before-direct-looks','existing UI named import',[ [battle,bAI,bLook] ]);
add('battle-ai-before-figures','existing UI named import',[ [battle,bAI,bFig] ]);
add('battle-ai-before-scene-bg','existing UI named import',[ [battle,bAI,bScene] ]);
add('battle-ai-before-fx-layer','existing UI named import',[ [battle,bAI,bFx] ]);
add('battle-ai-first','existing UI named import',[ [battle,bAI,bFirst] ]);
add('battle-turns-before-figures','existing UI named import',[ [battle,bTurn,bFig] ]);
add('battle-engine-before-figures','existing UI named import',[ [battle,bEngine,bFig] ]);
add('battle-turns-before-fx','existing UI named import',[ [battle,bTurn,bFx] ]);
add('battle-engine-before-fx','existing UI named import',[ [battle,bEngine,bFx] ]);
add('hero-stats-before-figures','existing UI named import',[ [hero,hStats,hFig] ]);
add('hero-skills-before-figures','existing UI named import',[ [hero,hSkills,hFig] ]);
add('conq-and-battle-ai-before-figures','two UI owner reorders',[
 [conq,cAI,cFig],[battle,bAI,bFig]]);
add('conq-early-and-battle-early','two UI owner reorders',[
 [conq,cAI,cFirst],[battle,bAI,bFirst]]);
add('conq-ai-and-battle-turns','two UI owner reorders',[
 [conq,cAI,cFig],[battle,bTurn,bFig]]);
add('conq-ai-and-hero-stats','UI owner reorders',[
 [conq,cAI,cFig],[hero,hStats,hFig]]);
add('battle-ai-and-hero-stats','UI owner reorders',[
 [battle,bAI,bFig],[hero,hStats,hFig]]);
add('conq-battle-hero-triple','three existing UI owner reorders',[
 [conq,cAI,cFig],[battle,bAI,bFig],[hero,hStats,hFig]]);
// Allowed direction but an ADDITIONAL import: experimental composition root
// so the gate must explicitly report this new edge rather than treating it
// as an unconditional GO.
function explicitUiPredecessor(p,before,newLine){
 const patch=removePredecessor(),text=source.get(p);
 assert.ok(text.includes(before+'\n'));
 patch.set(p,text.replace(before+'\n',newLine+'\n'+before+'\n'));
 return patch;
}
cases.push({name:'conq-explicit-ui-ai-before-figures',
 kind:'redundant existing UI→logic dependency; conditional only',
 patch:explicitUiPredecessor(conq,cFig,"import '../../logic/battle/ai.js'; // VIRTUAL ui composition root")});
cases.push({name:'battle-explicit-ui-ai-before-figures',
 kind:'redundant existing UI→logic dependency; conditional only',
 patch:explicitUiPredecessor(battle,bFig,"import '../../logic/battle/ai.js'; // VIRTUAL ui composition root")});
cases.push({name:'portrait-ui-explicit-ai-before-figures',
 kind:'new allowed UI→logic edge; composition root candidate',
 patch:explicitUiPredecessor('ui/portrait.js',
 "import { figureSVG } from '../render2d/figures.js';",
 "import '../logic/battle/ai.js'; // VIRTUAL ui composition root")});
cases.push({name:'hero-ui-explicit-ai-before-figures',
 kind:'new allowed UI→logic edge; composition root candidate',
 patch:explicitUiPredecessor(hero,hFig,
 "import '../logic/battle/ai.js'; // VIRTUAL ui composition root")});

function graphOf(patch){
 const g=Object.fromEntries([...source.keys()].sort().map(x=>[x,[]]));
 let count=0;
 const all=[];
 for(const [p,s] of source)for(const e of importEdges(patch.get(p)??s,p)){
  if(e.kind!=='static')continue;
  assert.ok(source.has(e.to),'new unresolved static import: '+p+' -> '+e.to);
  g[p].push(e.to);all.push(e.from+' -> '+e.to);count++;
 }
 return {count,cycles:stronglyConnected(g),edgeSet:new Set(all)};
}
function markerNames(js){
 return [...js.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m=>m[1]).filter(p=>p!=='main.js');
}
async function bundle(patch){
 const plugin={name:'arch01c4b-memory-virtual',setup(b){
  b.onLoad({filter:/\.js$/},args=>{
   const key=path.relative(SRC,args.path).split(path.sep).join('/');
   if(patch.has(key))return {contents:patch.get(key),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }};
 const built=await esbuild.build({absWorkingDir:DEV,
  entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',
  treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',
  logLevel:'silent',logOverride:{'commonjs-variable-in-esm':'silent'},
  plugins:patch.size?[plugin]:[]});
 assert.equal(built.outputFiles.length,1);
 return markerNames(built.outputFiles[0].text);
}
const baseGraph=graphOf(new Map());
assert.equal(baseGraph.count,998);
assert.deepEqual(baseGraph.cycles,base.cycles);
assert.deepEqual(await bundle(new Map()),markers,'production v133 bundle markers equal frozen SPLIT');
console.log('ARCH-01C4b BASE '+JSON.stringify({
 head:'v133',modules:173,imports:998,markers:167,names:898,cycles:[106,6],
 oldLegacy:ledger,
 aiIndex:markers.indexOf(ai),looksIndex:markers.indexOf(looks),
 exactImporters:{conq:imports(conq).length,battle:imports(battle).length,
  hero:imports(hero).length},effect:'looks tables+functions; AI CommonJS compatibility top-level'
}));
const results=[];
for(const t of cases) {
 try{
  const current=await bundle(t.patch),g=graphOf(t.patch);
  const moved=markers.filter((x,i)=>current.indexOf(x)!==i);
  const missing=markers.filter(x=>!current.includes(x));
  const extra=current.filter(x=>!markers.includes(x));
  const oldEdges=[...baseGraph.edgeSet].filter(x=>!g.edgeSet.has(x)).sort();
  const addedEdges=[...g.edgeSet].filter(x=>!baseGraph.edgeSet.has(x)).sort();
  const removeExactly=oldEdges.length===1&&oldEdges[0]===looks+' -> '+ai;
  const namesExact=JSON.stringify(names())===JSON.stringify(publicNames);
  const cyclicExact=JSON.stringify(g.cycles)===JSON.stringify(base.cycles);
  const ESM=current.length===markers.length&&moved.length===0&&
   missing.length===0&&extra.length===0;
  const fixedBody=[...t.patch].every(([p,s])=>
   p===looks?s===source.get(looks).replace(oldLine+'\n',''):
   s.split('\n').filter(x=>!x.startsWith('import ')).join('\n')===
   source.get(p).split('\n').filter(x=>!x.startsWith('import ')).join('\n'));
  const noNew=addedEdges.length===0&&g.count===997,unconditional=ESM&&cyclicExact&&
   namesExact&&removeExactly&&fixedBody&&noNew;
  const conditional=ESM&&namesExact&&removeExactly&&fixedBody&&!unconditional;
  const row={name:t.name,kind:t.kind,importCount:g.count,ESMExact:ESM,
   markersMoved:moved.length,firstMoved:moved.slice(0,6),
   missing,extra,cycles:g.cycles.map(x=>x.length),
   cyclesExact:cyclicExact,removedEdges:oldEdges,addedEdges,
   namesExact,bodyExact:fixedBody,unconditionalVirtualGo:unconditional,
   conditionalCandidate:conditional,runtimeValidated:false};
  results.push(row);console.log('ARCH-01C4b TRIAL '+JSON.stringify(row));
 }catch(e){
  const row={name:t.name,error:String(e.stack||e).slice(0,1000),
   unconditionalVirtualGo:false,conditionalCandidate:false};
  results.push(row);console.log('ARCH-01C4b TRIAL '+JSON.stringify(row));
 }
}
console.log('ARCH-01C4b SUMMARY '+JSON.stringify({
 tested:results.length,ESMExact:results.filter(x=>x.ESMExact).length,
 strictGo:results.filter(x=>x.unconditionalVirtualGo).map(x=>x.name),
 conditional:results.filter(x=>x.conditionalCandidate).map(x=>x.name),
 noGo:results.filter(x=>!x.ESMExact).map(x=>({name:x.name,
  moved:x.markersMoved??null,error:x.error??null})),
 protected:'v133 game sources, existing AST ledger, SPLIT, golden, saves, camp, 210 Campaign, assets, published root PWA and SW unchanged',
 note:'ESM marker equality is necessary, not sufficient: real VM cold/warm + immutable golden + full PWA/artifact/browser CI required before any B1. Only Stage A diagnosis.'
}));
console.log('ARCH-01C4b Stage A read-only virtual matrix completed');
