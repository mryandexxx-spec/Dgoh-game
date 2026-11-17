// ARCH-01C5a-A2: read-only v134 DFS and UI-owned predecessor search.
// NO dev/src edits. Actual production esbuild is overridden in memory only.
// Failure to find exact ESM candidates is NO-GO, not a CI failure.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const read=f=>fs.readFileSync(path.join(SRC,f),'utf8');
const mainSha='b3d65303130dbd385caaac299f1f2dfc0473cd8c';
const data='data/conquest-data.js', ui='ui/overlays/celebrate.js';
const oldData=read(data), oldEdge="import '../ui/overlays/celebrate.js'; // порядок исполнения\n";
assert.equal(oldData.split(oldEdge).length,2,'known Conquest side-effect predecessor must exist exactly once');
const noEdge=oldData.replace(oldEdge,'');
const ledger=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.deepEqual(ledger,[
 'data/conquest-data.js -> ui/overlays/celebrate.js',
 'data/story.js -> assets/models.js'
]);
const originals=SPLIT.map(([,name])=>name);
assert.equal(originals.length,167);
const current=analyzeTree(DEV);
assert.equal(current.modules,173);
assert.equal(current.staticImports,1000);
assert.equal(current.dynamicImports,0);
assert.equal(current.unresolved.length,0);
assert.deepEqual(current.cycles.map(c=>c.length).sort((a,b)=>b-a),[106,6]);

function allFiles(root,out=[]){
 for(const e of fs.readdirSync(root,{withFileTypes:true})){
  const full=path.join(root,e.name);
  if(e.isDirectory())allFiles(full,out);
  else if(e.isFile() && full.endsWith('.js'))out.push(path.relative(SRC,full).split(path.sep).join('/'));
 }
 return out.sort();
}
const files=allFiles(SRC);
assert.equal(files.length,173);
const baseEdges=Object.fromEntries(files.map(f=>[f,importEdges(read(f),f).filter(e=>e.kind==='static').map(e=>e.to)]));
const importers=target=>files.filter(f=>baseEdges[f].includes(target));
const visits=[],parent=new Map(),seen=new Set();
function dfs(file,route){
 if(seen.has(file))return;
 seen.add(file);
 parent.set(file,route);
 visits.push(file);
 for(const next of baseEdges[file]||[])dfs(next,[...route,file]);
}
dfs('main.js',[]);
assert.ok(seen.size>=167 && seen.size<=173,'unexpected entry graph reachability '+seen.size);
const pathway=f=>[...(parent.get(f)||[]),f];
const before=pathway(data),beforeUi=pathway(ui);
const oldLarge=current.cycles.find(c=>c.includes(data));
assert.ok(oldLarge&&oldLarge.length===106);
console.log('ARCH-01C5a-A2 PATH '+JSON.stringify({
 main:mainSha,entry:'main.js',dataPath:before,celebratePath:beforeUi,
 firstEncounter:{data:visits.indexOf(data),celebrate:visits.indexOf(ui)},
 dataImporters:importers(data),celebrateImporters:importers(ui),
 commonAncestors:before.filter(x=>beforeUi.includes(x)),
 uiAncestorsBeforeData:before.filter(x=>x.startsWith('ui/')),
 oldLargeSccSize:oldLarge.length,
 topLevelEffects:{
  celebrate:'CELEB[] queue, showCeleb(), UI callbacks (dependency reward-tiles/notifications)',
  rewards:'MutationObserver(document.body) at module evaluation',
  story:'data/story order-only imports assets/models; models top-level b3Pre(loadAssets3)',
 }
}));

const buildGraphs=edits=>{
 const graph={},forbidden=[],errors=[];
 let count=0;
 for(const f of files){
  const code=edits.get(f)??read(f);
  let links;
  try {links=importEdges(code,f).filter(e=>e.kind==='static');}catch(err){errors.push(f+': '+String(err));continue;}
  graph[f]=links.map(e=>e.to);
  count+=links.length;
  if(f.startsWith('data/'))for(const e of links)if(!e.to.startsWith('data/'))forbidden.push(f+' -> '+e.to);
 }
 return {graph,cycles:stronglyConnected(graph),count,errors,forbidden:forbidden.sort()};
};
const baseline=buildGraphs(new Map());
assert.deepEqual(baseline.forbidden,ledger.slice().sort());
const refScc=baseline.cycles.map(c=>c.join('|')).sort();
function markers(text){
 return [...text.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m=>m[1]).filter(f=>f!=='main.js');
}
async function esbuildOrder(edits){
 const plugin=edits.size?[{name:'arch01c5a-a2-in-memory',setup(build){
  build.onLoad({filter:/\.js$/},args=>{
   const f=path.relative(SRC,args.path).split(path.sep).join('/');
   if(edits.has(f))return{contents:edits.get(f),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }}]:[];
 const output=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],format:'esm',bundle:true,
  write:false,treeShaking:false,charset:'utf8',legalComments:'none',
  target:'esnext',logLevel:'silent',
  logOverride:{'commonjs-variable-in-esm':'silent'},plugins:plugin,
 });
 return markers(output.outputFiles[0].text);
}
assert.deepEqual(await esbuildOrder(new Map()),originals,
 'frozen v134 source must match exact original 167 ESM modules');

const variants=[],labels=new Set();
function add(label,modifications){
 assert.ok(!labels.has(label));labels.add(label);
 const edits=new Map([[data,noEdge],...modifications]);
 variants.push({label,edits});
}
function importLine(from,target){
 const relative=path.posix.relative(path.posix.dirname(from),target);
 return "import '"+(relative.startsWith('.')?relative:'./'+relative)+"'; // ARCH-01C5a-A2 VIRTUAL ONLY";
}
const imports=(file)=>read(file).split('\n').map((s,i)=>({s,i})).filter(z=>/^import /.test(z.s));
function addPreload(owner,at,anchorLabel=''){
 const lines=read(owner).split('\n');
 const importsAt=imports(owner);
 if(!importsAt.length)return;
 let atIdx;
 if(at==='first')atIdx=importsAt[0].i;
 else if(at==='after-last')atIdx=importsAt.at(-1).i+1;
 else if(at==='before-conquest') {
  const found=importsAt.find(z=>z.s.includes('conquest-data.js')||z.s.includes('logic/conquest.js'));
  if(!found)return;atIdx=found.i;
 } else if(at==='after-conquest'){
  const found=importsAt.find(z=>z.s.includes('conquest-data.js')||z.s.includes('logic/conquest.js'));
  if(!found)return;atIdx=found.i+1;
 } else if(typeof at==='number') atIdx=importsAt[at]?.i??-1;
 else throw Error('unknown position');
 if(atIdx<0)return;
 if(owner===ui||owner===data)return;
 lines.splice(atIdx,0,importLine(owner,ui));
 add('ui-owner:'+owner+':'+at+(anchorLabel?'#'+anchorLabel:''),[[owner,lines.join('\n')]]);
}
add('remove-only',[]);
// Historical best compared again as a local control.
addPreload('ui/views/conq.js','first');
// Sweep ALL actual existing UI modules only: no illegal logic/render2d import to UI.
const uiModules=files.filter(f=>f.startsWith('ui/') && f!==ui);
for(const owner of uiModules){
 for(const pos of ['first','after-last','before-conquest','after-conquest']) {
  const lab='ui-owner:'+owner+':'+pos;
  if(!labels.has(lab))addPreload(owner,pos);
 }
}
// The only declared architecture exceptions to normal runtime/data import rules.
for(const owner of ['boot.js','core/boot.js']){
 for(const pos of ['first','after-last','before-conquest','after-conquest']){
  const lab='ui-owner:'+owner+':'+pos;
  if(!labels.has(lab))addPreload(owner,pos);
 }
}
// Probe simultaneous UI-root placement and reorder of existing UI imports:
// - no gameplay-body edits; imports alone are permuted in memory.
const boot=read('boot.js'), conq=read('ui/views/conq.js');
const uiStart=importLine('ui/views/conq.js',ui);
const rootPre=importLine('boot.js',ui);
const conqLines=conq.split('\n');
const firstConq=conqLines.findIndex(s=>/^import /.test(s));
const firstLogic=conqLines.findIndex(s=>s.includes("from '../../logic/conquest.js'"));
const firstData=conqLines.findIndex(s=>s.includes("from '../../data/conquest-data.js'"));
assert.ok(firstConq>=0&&firstLogic>=0&&firstData>=0);
const withUi=conqLines.slice();withUi.splice(firstConq,0,uiStart);
const withDataFirst=withUi.slice();
const namedL=withDataFirst.findIndex(s=>s.includes("from '../../logic/conquest.js'"));
const namedD=withDataFirst.findIndex(s=>s.includes("from '../../data/conquest-data.js'"));
const [dataLine]=withDataFirst.splice(namedD,1);
withDataFirst.splice(namedL,0,dataLine);
add('two-edit:ui-first+data-before-logic', [['ui/views/conq.js',withDataFirst.join('\n')]]);
const bootLines=boot.split('\n'),rootIdx=bootLines.findIndex(s=>s.includes("import './ui/views/conq.js';"));
assert.ok(rootIdx>0);
const rootPair=bootLines.slice();rootPair.splice(rootIdx,0,rootPre);
add('two-edit:root-before-conq+ui-first',[['ui/views/conq.js',withUi.join('\n')],['boot.js',rootPair.join('\n')]]);
const uiNotif=read('ui/notifications.js').split('\n');
const notifIdx=uiNotif.findIndex(s=>s.includes("from './overlays/celebrate.js'"));
assert.ok(notifIdx>=0);
const nfirst=uiNotif.slice();
const [ni]=nfirst.splice(notifIdx,1);nfirst.splice(1,0,ni);
add('two-edit:ui-first+notification-promoted',[['ui/views/conq.js',withUi.join('\n')],['ui/notifications.js',nfirst.join('\n')]]);
const router=read('ui/router.js').split('\n');
const a=router.findIndex(s=>s.includes("from './views/conq.js'"));
const b=router.findIndex(s=>s.includes("from './notifications.js'"));
assert.ok(a>=0&&b>=0);
const routerSwapped=router.slice();
[routerSwapped[a],routerSwapped[b]]=[routerSwapped[b],routerSwapped[a]];
add('two-edit:ui-first+router-swap',[['ui/views/conq.js',withUi.join('\n')],['ui/router.js',routerSwapped.join('\n')]]);
const celebrate=read(ui).split('\n');
const rewIdx=celebrate.findIndex(s=>s.includes("import '../reward-tiles.js'"));
const notesIdx=celebrate.findIndex(s=>s.includes("from '../notifications.js'"));
assert.ok(rewIdx>=0&&notesIdx>rewIdx);
const reord=celebrate.slice(),[reward]=reord.splice(rewIdx,1);reord.splice(notesIdx,0,reward);
add('two-edit:ui-first+celebrate-defer-reward',[['ui/views/conq.js',withUi.join('\n')],[ui,reord.join('\n')]]);

// Analyze topology and exact observed esbuild order for each candidate.
let observedMin=167,exact=0,conditional=0,valid=0;
const results=[];
for(const v of variants){
 const graph=buildGraphs(v.edits);
 assert.equal(graph.errors.length,0,v.label+' parse errors');
 const order=await esbuildOrder(v.edits);
 const missing=originals.filter(x=>!order.includes(x));
 const extra=order.filter(x=>!originals.includes(x));
 const moved=originals.filter((x,i)=>order[i]!==x);
 const ix=originals.findIndex((x,i)=>order[i]!==x);
 const sccEqual=JSON.stringify(graph.cycles.map(c=>c.join('|')).sort())===JSON.stringify(refScc);
 const noNewDebt=graph.forbidden.every(e=>ledger.includes(e));
 const identical=!moved.length&&!missing.length&&!extra.length;
 const r={name:v.label,moved:moved.length,first:ix<0?'none':ix+':'+originals[ix]+' => '+order[ix],
  missing:missing.length,extra:extra.length,sccSizes:graph.cycles.map(c=>c.length).sort((x,y)=>y-x),
  sccEqual,noNewDebt,staticImports:graph.count,
  strictGo:identical&&sccEqual&&noNewDebt,conditional:identical&&!sccEqual&&noNewDebt};
 results.push(r);
 observedMin=Math.min(observedMin,r.moved);if(identical)exact++;
 if(r.conditional)conditional++;if(r.strictGo)valid++;
 if(identical||r.moved<=12)console.log('ARCH-01C5a-A2 CANDIDATE '+JSON.stringify(r));
}
const removedGraph=buildGraphs(new Map([[data,noEdge]]));
const removedScc=removedGraph.cycles.find(c=>c.includes(data));
const expelled=oldLarge.filter(f=>!removedScc?.includes(f));
console.log('ARCH-01C5a-A2 SCC '+JSON.stringify({
 before:oldLarge.length,after:removedScc?.length,expelled,
 removedEdges:[data+' -> '+ui],
 incomingToExpelled:expelled.map(x=>({file:x,importers:importers(x)})),
}));
console.log('ARCH-01C5a-A2 SUMMARY '+JSON.stringify({
 main:mainSha,cases:results.length,strictGo:valid,conditionalGo:conditional,exact,
 best:results.toSorted((a,b)=>a.moved-b.moved).slice(0,18),debt:ledger,
 source:'read-only esbuild in memory, AST DFS/SCC; NO GAME SOURCE CHANGES',
}));
