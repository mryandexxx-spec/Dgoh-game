// ARCH-01C5 Stage A: READ-ONLY virtual esbuild/AST/ESM diagnostics.
// No src file, SPLIT, golden, baseline, save or PWA is modified.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(DEV, 'src');
const read = rel => fs.readFileSync(path.join(SRC, rel), 'utf8');
const oldNames = SPLIT.map(([, name]) => name);
const story = 'data/story.js', conquest = 'data/conquest-data.js';
const storyEdge = "import '../assets/models.js'; // порядок исполнения\n";
const conquestEdge = "import '../ui/overlays/celebrate.js'; // порядок исполнения\n";
const storyOld = read(story), cqOld = read(conquest);
assert.equal(storyOld.split(storyEdge).length, 2);
assert.equal(cqOld.split(conquestEdge).length, 2);
assert.ok(read('assets/models.js').includes('b3Pre(loadAssets3);'));
assert.ok(read('ui/overlays/celebrate.js').includes('function showCeleb()'));
const ledger = JSON.parse(fs.readFileSync(path.join(DEV, 'tools/arch-import-baseline.json'), 'utf8')).legacy;
assert.deepEqual(ledger, [
 'data/conquest-data.js -> ui/overlays/celebrate.js',
 'data/story.js -> assets/models.js',
]);
const current = analyzeTree(DEV);
assert.equal(current.modules, 173);
assert.equal(current.staticImports, 1000);
assert.equal(current.unresolved.length, 0);
assert.equal(oldNames.length, 167);
assert.deepEqual(current.cycles.map(c => c.length).sort((a,b)=>b-a), [106,6]);
const cleanStory = storyOld.replace(storyEdge, '');
const cleanConquest = cqOld.replace(conquestEdge, '');
const boot = read('boot.js'), uiConq=read('ui/views/conq.js'), celebrate=read('ui/overlays/celebrate.js');
const rootAnchor = "import './ui/views/conq.js'; // порядок исполнения";
const aiAnchor = "import './logic/battle/ai.js';";
const storyAnchor = "import { BIOS } from '../../data/story.js';";
const conqAnchor = "import { cq, cqAddDisk";
assert.ok(boot.includes(rootAnchor) && boot.includes(aiAnchor) &&
 celebrate.includes(storyAnchor) && uiConq.includes(conqAnchor));

const patched = (which, additions=[]) => {
 const edits = new Map();
 if (which.includes('S')) edits.set(story, cleanStory);
 if (which.includes('C')) edits.set(conquest, cleanConquest);
 for(const [file, anchor, imports, position] of additions){
  const old = edits.has(file) ? edits.get(file) : read(file);
  assert.ok(old.includes(anchor), 'unrecognised virtual anchor '+file+':'+anchor);
  const inserted = imports.map(s=>s+' // ARCH-01C5 virtual only').join('\n');
  edits.set(file, old.replace(anchor, position==='after' ? anchor+'\n'+inserted : inserted+'\n'+anchor));
 }
 return edits;
};
const S=()=>patched('S'), C=()=>patched('C');
const scenarios = [
 {name:'story/remove-only', edits:S()},
 {name:'conquest/remove-only', edits:C()},
 {name:'story/root-after-ai', edits:patched('S',[['boot.js',aiAnchor,["import './assets/models.js';"],'after']])},
 {name:'story/root-after-cine', edits:patched('S',[['boot.js',"import './logic/cinematic-preference.js';",["import './assets/models.js';"],'after']])},
 {name:'story/root-before-cine', edits:patched('S',[['boot.js',"import './logic/cinematic-preference.js';",["import './assets/models.js';"],'before']])},
 {name:'story/root-before-conq', edits:patched('S',[['boot.js',rootAnchor,["import './assets/models.js';"],'before']])},
 {name:'story/root-after-conq', edits:patched('S',[['boot.js',rootAnchor,["import './assets/models.js';"],'after']])},
 {name:'story/celebrate-before-story', edits:patched('S',[['ui/overlays/celebrate.js',storyAnchor,["import '../../assets/models.js';"],'before']])},
 {name:'story/celebrate-first', edits:patched('S',[['ui/overlays/celebrate.js',"import '../reward-tiles.js'; // порядок исполнения",["import '../../assets/models.js';"],'before']])},
 {name:'conquest/root-before-conq', edits:patched('C',[['boot.js',rootAnchor,["import './ui/overlays/celebrate.js';"],'before']])},
 {name:'conquest/root-after-conq', edits:patched('C',[['boot.js',rootAnchor,["import './ui/overlays/celebrate.js';"],'after']])},
 {name:'conquest/ui-conq-first', edits:patched('C',[['ui/views/conq.js',conqAnchor,["import '../overlays/celebrate.js';"],'before']])},
 {name:'conquest/ui-conq-before-data', edits:patched('C',[['ui/views/conq.js',"import { CQ_CHESTS",["import '../overlays/celebrate.js';"],'before']])},
 {name:'both/root-models-then-celebrate', edits:patched('SC',[['boot.js',rootAnchor,["import './assets/models.js';","import './ui/overlays/celebrate.js';"],'before']])},
 {name:'both/root-celebrate-then-models', edits:patched('SC',[['boot.js',rootAnchor,["import './ui/overlays/celebrate.js';","import './assets/models.js';"],'before']])},
 {name:'both/celebrate-models-and-root-celebrate', edits:patched('SC',[
  ['ui/overlays/celebrate.js',storyAnchor,["import '../../assets/models.js';"],'before'],
  ['boot.js',rootAnchor,["import './ui/overlays/celebrate.js';"],'before'],
 ])},
];
function markers(s){return [...s.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(x=>x[1]).filter(x=>x!=='main.js');}
async function bundle(edits){
 const plugins=edits.size?[{name:'arch01c5-read-only-memory',setup(build){
  build.onLoad({filter:/\.js$/},args=>{
   const rel=path.relative(SRC,args.path).split(path.sep).join('/');
   if(edits.has(rel))return {contents:edits.get(rel),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }}]:[];
 const out=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
  format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',
  target:'esnext',logLevel:'silent',
  logOverride:{'commonjs-variable-in-esm':'silent'},plugins,
 });
 return markers(out.outputFiles[0].text);
}
const reference=await bundle(new Map());
assert.deepEqual(reference,oldNames,'current main: real esbuild must exactly match SPLIT 167 markers');
function walk(dir,acc=[]){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,e.name);
  if(e.isDirectory())walk(full,acc);
  else if(e.isFile()&&e.name.endsWith('.js'))acc.push(path.relative(SRC,full).split(path.sep).join('/'));
 }
 return acc;
}
const files=walk(SRC);
assert.equal(files.length,173);
const snapScc = edits => {
 const deps={};let staticCount=0;const violations=[];
 for(const file of files){
  const src=edits.get(file)??read(file);
  const ed=importEdges(src,file).filter(e=>e.kind==='static');
  deps[file]=ed.map(x=>x.to);
  staticCount+=ed.length;
  if(file.startsWith('data/'))for(const e of ed)if(!e.to.startsWith('data/'))violations.push(file+' -> '+e.to);
 }
 return {cycles:stronglyConnected(deps).map(c=>c.join('|')).sort(),staticCount,violations:violations.sort()};
};
const graph0=snapScc(new Map());
assert.deepEqual(graph0.violations,ledger.slice().sort());
assert.equal(graph0.staticCount,1000);
const results=[];
for(const {name,edits} of scenarios){
 const observed=await bundle(edits);
 const missing=oldNames.filter(x=>!observed.includes(x));
 const extra=observed.filter(x=>!oldNames.includes(x));
 const moved=oldNames.filter((x,i)=>observed[i]!==x);
 const first=oldNames.findIndex((x,i)=>observed[i]!==x);
 const g=snapScc(edits), expected=ledger.filter(edge=>!((name.startsWith('story/')&&edge.includes('story.js'))||(name.startsWith('conquest/')&&edge.includes('conquest-data.js'))||name.startsWith('both/')));
 const noUnexpectedDebts=g.violations.every(edge=>expected.includes(edge));
 const exact=missing.length===0&&extra.length===0&&moved.length===0;
 const res={name,exact,moved:moved.length,missing,extra,first:first<0?'none':first+':'+oldNames[first]+' -> '+observed[first],
  staticImports:g.staticCount,sccSame:JSON.stringify(g.cycles)===JSON.stringify(graph0.cycles),sccSizes:g.cycles.map(x=>x.split('|').length).sort((a,b)=>b-a),
  forbidden:g.violations,noUnexpectedDebts,
  virtualGo:exact&&noUnexpectedDebts&&JSON.stringify(g.cycles)===JSON.stringify(graph0.cycles)};
 results.push(res); console.log('ARCH-01C5 virtual '+JSON.stringify(res));
}
console.log('ARCH-01C5 SUMMARY '+JSON.stringify({
 main:'b3d65303130dbd385caaac299f1f2dfc0473cd8c',
 modules:current.modules,imports:current.staticImports,markers:oldNames.length,oldScc:[106,6],debt:ledger.length,
 tested:results.length,exact:results.filter(x=>x.exact).map(x=>x.name),
 graphExact:results.filter(x=>x.virtualGo).map(x=>x.name),
 best:results.toSorted((a,b)=>a.moved-b.moved).slice(0,8).map(x=>({name:x.name,moved:x.moved,sccSame:x.sccSame})),
 note:'Stage A only; virtual marker parity is necessary but NOT sufficient for runtime/TDZ/save/3D approval',
}));
