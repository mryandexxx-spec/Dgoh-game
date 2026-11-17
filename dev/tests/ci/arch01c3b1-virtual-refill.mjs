// ARCH-01C3b1 — read-only virtual relocation of two LIVE Conquest refill
// functions to logic/conquest.js; preserve exact pricing/reset and UI contract.
// No production source/baseline/SPLIT changes in this diagnostic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { stronglyConnected, importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const read=file=>fs.readFileSync(path.join(SRC,file),'utf8');
const paths=['data/conquest-data.js','logic/conquest.js','ui/views/conq.js'];
const [data,logic,ui]=paths.map(read);
const rmDataEconomy="import { refillPrice, todayKey } from '../logic/economy.js';\n";
const calcN="const cqRfN = () => (S.cqRf && S.cqRf.d === todayKey()) ? S.cqRf.n : 0;";
const calcCost="const cqRfCost = () => refillPrice(cqRfN());";
const dataExport=", cqRfN, cqRfCost, CQ_TROPHY";
const logicEconomyImport="import { enemyProg } from './economy.js';";
const logicExport=", cqStReady, cqHot };";
const uiDataRef=", cqRar, cqRfCost, cqRfN, cqScore } from '../../data/conquest-data.js';";
const uiLogicRef=", cqTrack, cqTypeN } from '../../logic/conquest.js';";
for(const [name,src,needle] of [
 ['data→economy import',data,rmDataEconomy],
 ['old refill counter',data,calcN+'\n'],
 ['old refill price',data,calcCost+'\n'],
 ['data exports',data,dataExport],
 ['logic economy import',logic,logicEconomyImport],
 ['logic exports',logic,logicExport],
 ['UI data consumer',ui,uiDataRef],
 ['UI logic consumer',ui,uiLogicRef],
]){
 assert.equal(src.split(needle).length,2,'exact C3b1 virtual anchor required: '+name);
}
const ledger=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
const before=analyzeTree(DEV);
assert.equal(ledger.length,7);
assert.ok(ledger.includes('data/conquest-data.js -> logic/economy.js'));
assert.equal(before.modules,173);
assert.equal(before.cycles.length,2);
assert.equal(before.unresolved.length,0);
assert.equal(SPLIT.length,167);
assert.ok(importEdges(logic,'logic/conquest.js').some(e=>e.to==='logic/economy.js') &&
  importEdges(logic,'logic/conquest.js').some(e=>e.to==='core/state.js'),
  'logic/conquest already owns economy and state dependencies; no new import edges needed');

const d=data
 .replace(rmDataEconomy,'')
 .replace(calcN+'\n','')
 .replace(calcCost+'\n','')
 .replace(dataExport,', CQ_TROPHY');
const ui2=ui
 .replace(uiDataRef,", cqRar, cqScore } from '../../data/conquest-data.js';")
 .replace(uiLogicRef,", cqTrack, cqTypeN, cqRfN, cqRfCost } from '../../logic/conquest.js';");
const logic2=logic
 .replace(logicEconomyImport,"import { enemyProg, refillPrice, todayKey } from './economy.js';")
 .replace(logicExport,", cqStReady, cqRfN, cqRfCost, cqHot };");
assert.ok(!importEdges(d,'data/conquest-data.js').some(e=>e.to==='logic/economy.js'));
assert.deepEqual(
 importEdges(d,'data/conquest-data.js').filter(e=>e.kind==='static').map(e=>e.to),
 ['logic/conquest.js','ui/overlays/celebrate.js','core/state.js','data/chars.js','data/fx.js'],
 'only one data→runtime import removed in simulated candidate'
);
assert.ok(!d.includes('const cqRfN =')&&!d.includes('const cqRfCost ='));
const owners=['data/conquest-data.js','logic/conquest.js','ui/views/conq.js'];
const markers=out=>[...out.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
  .map(x=>x[1]).filter(x=>x!=='main.js');
async function bundle(files) {
 const plugin=files.size?[{name:'arch01c3b1-virtual-only',setup(build){
   build.onLoad({filter:/\.js$/},args=>{
    const rel=path.relative(SRC,args.path).split(path.sep).join('/');
    if(files.has(rel))return {contents:files.get(rel),loader:'js',resolveDir:path.dirname(args.path)};
   });
 }}]:[];
 const result=await esbuild.build({
   absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
   format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',
   target:'esnext',logLevel:'silent',
   logOverride:{'commonjs-variable-in-esm':'silent'},plugins:plugin,
 });
 return markers(result.outputFiles[0].text);
}
const original=SPLIT.map(([,name])=>name);
assert.deepEqual(await bundle(new Map()),original,
  'real production bundle must match 167 ESM markers');
function virtualGraph(files) {
 const all=new Map();
 function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
   const abs=path.join(dir,e.name);
   if(e.isDirectory())walk(abs);
   else if(e.isFile()&&e.name.endsWith('.js')){
    const rel=path.relative(SRC,abs).split(path.sep).join('/');
    all.set(rel,files.get(rel)??fs.readFileSync(abs,'utf8'));
   }
  }
 }
 walk(SRC);
 const g=Object.fromEntries([...all.keys()].sort().map(k=>[k,[]]));
 for(const [k,s] of all) for(const edge of importEdges(s,k).filter(x=>x.kind==='static')){
   if(all.has(edge.to))g[k].push(edge.to);
   else throw Error('Unresolved in virtual graph: '+k+'→'+edge.to);
 }
 return stronglyConnected(g);
}
const anchors=[
 ['before-week',"const cqWeek = () =>"],
 ['before-energy','function cqEn() {'],
 ['before-hot','const cqHot = () =>'],
 ['before-export','export { cqWeek,'],
];
const variants=[];
for(const [name,anchor] of anchors){
 assert.ok(logic2.includes(anchor),'missing exact insertion slot '+name);
 const moved=logic2.replace(anchor,calcN+'\n'+calcCost+'\n'+anchor);
 variants.push({name,files:new Map([
  [owners[0],d],[owners[1],moved],[owners[2],ui2],
 ])});
}
for(const variant of variants) {
 try{
  const current=await bundle(variant.files);
  const missing=original.filter(x=>!current.includes(x));
  const extra=current.filter(x=>!original.includes(x));
  const moved=original.filter((x,i)=>current.indexOf(x)!==i);
  const first=original.findIndex((x,i)=>current[i]!==x);
  const cycles=virtualGraph(variant.files);
  const result={
   name:variant.name,exact:!moved.length&&!missing.length&&!extra.length,
   moved:moved.length,missing,extra,
   first:first<0?'none':first+':'+original[first]+' -> '+current[first],
   preview:moved.slice(0,12),
   cycles:cycles.length,conquestScc:cycles.find(c=>c.includes('data/conquest-data.js'))?.length??0,
  };
  console.log('ARCH-01C3b1 virtual refill '+JSON.stringify(result));
 }catch(err){
  console.log('ARCH-01C3b1 virtual refill '+JSON.stringify({
   name:variant.name,error:String(err.message||err).slice(0,600),
  }));
 }
}
console.log('ARCH-01C3b1 virtual study done: four insertion slots, original data source untouched');
