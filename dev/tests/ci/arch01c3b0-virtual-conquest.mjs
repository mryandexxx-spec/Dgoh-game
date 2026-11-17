// ARCH-01C3b0: read-only, exact production esbuild virtual order matrix for
// Conquest's order-only data→ui/celebrate predecessor. NO production edits.
// The other three data→runtime imports are live (state/economy/cq), and must
// NOT be removed by this diagnostic until their APIs and SCC are redesigned.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(DEV, 'src');
const read = p => fs.readFileSync(path.join(SRC, p), 'utf8');
const original = SPLIT.map(([,name])=>name);
const data = read('data/conquest-data.js');
const sideEffectImport = "import '../ui/overlays/celebrate.js'; // порядок исполнения\n";
assert.equal(data.split(sideEffectImport).length, 2,
  'the historic Conquest→celebrate import must exist exactly once before the virtual probe');
const clean = data.replace(sideEffectImport, '');
const edges = importEdges(data, 'data/conquest-data.js').filter(x=>x.kind==='static');
assert.deepEqual(edges.map(e=>e.to), [
  'logic/conquest.js', 'ui/overlays/celebrate.js',
  'core/state.js', 'logic/economy.js', 'data/chars.js', 'data/fx.js',
], 'lock exact original Conquest dependency order');
assert.ok(clean.includes("import { cq } from '../logic/conquest.js';") &&
  clean.includes("import { NOTES, S } from '../core/state.js';") &&
  clean.includes("import { refillPrice, todayKey } from '../logic/economy.js';"),
  'do not simulate removing live named imports');
const liveUsage = [
 ['logic/conquest.js', ['cq'], ['const cqK', 'const cqScore', 'function cqBump']],
 ['core/state.js', ['NOTES','S'], ['NOTES.push(', 'S.cqRf']],
 ['logic/economy.js', ['refillPrice','todayKey'], ['refillPrice(cqRfN())', 'todayKey()']],
];
for(const [target,names,needles] of liveUsage) {
  assert.ok(edges.some(x=>x.to===target),'live edge missing: '+target);
  for (const needle of needles) assert.ok(data.includes(needle),
    'live dependency contract changed in '+target+': '+needle);
}
const ledger=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.equal(ledger.length,7,'Stage A from published v129, 7 original legacy imports');
for (const edge of edges.slice(0,4)) assert.ok(
  ledger.includes('data/conquest-data.js -> '+edge.to),'Conquest debt edge was not ledgered: '+edge.to
);
const graph=analyzeTree(DEV);
assert.equal(graph.modules,173,'v129 production module count must stay 173');
assert.equal(graph.cycles.length,2,'v129 has two unchanged SCCs');
assert.equal(graph.unresolved.length,0);
assert.equal(SPLIT.length,167);
const relevantScc=graph.cycles.find(g=>g.includes('data/conquest-data.js'));
assert.ok(relevantScc && relevantScc.includes('logic/conquest.js'),
  'Conquest data↔logic circular initialization must remain explicitly classified as risky');
console.log('ARCH-01C3b graph '+JSON.stringify({
  modules:graph.modules,staticImports:graph.staticImports,cycles:graph.cycles.length,
  conquestSccSize:relevantScc.length,conquestScc:relevantScc.slice(0,20),
  cyclicalConquestEdges:graph.cyclicalEdges.filter(e=>
    e.from==='data/conquest-data.js'||e.to==='data/conquest-data.js'
  ).map(e=>e.from+'->'+e.to),legacy:ledger.length,
  liveEdges:liveUsage.map(x=>x[0]),orderOnly:'ui/overlays/celebrate.js',
}));

function marked(out){
 return [...out.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
  .map(x=>x[1]).filter(x=>x!=='main.js');
}
async function bundle(files){
 const plugins=files.size?[{
  name:'arch01c3b0-read-only-in-memory',
  setup(build) {
    build.onLoad({filter:/\.js$/},args=>{
      const rel=path.relative(SRC,args.path).split(path.sep).join('/');
      if (files.has(rel)) return {
        contents:files.get(rel),loader:'js',resolveDir:path.dirname(args.path)
      };
    });
  },
 }]:[];
 const built=await esbuild.build({
   absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
   format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',
   target:'esnext',logLevel:'silent',
   logOverride:{'commonjs-variable-in-esm':'silent'},plugins,
 });
 return marked(built.outputFiles[0].text);
}
const actual=await bundle(new Map());
assert.deepEqual(actual,original,'production esbuild must exactly match all 167 SPLIT markers before virtual trials');
const baseFiles=()=>new Map([['data/conquest-data.js',clean]]);
const variants=[{name:'remove-only',files:baseFiles()}];
const owners=[
 'ui/views/conq.js','boot.js','ui/events.js','ui/notifications.js',
 'ui/reward-tiles.js','ui/views/feats.js','ui/overlays/profile.js',
 'ui/wiring.js','ui/views/lobby.js','ui/mouse.js',
 'ui/views/shop.js','ui/views/raid.js','ui/views/daily.js',
 'ui/overlays/info.js','ui/overlays/levelup.js'
];
const importLine=file=>{
 const rel=path.posix.relative(path.posix.dirname(file),'ui/overlays/celebrate.js');
 return "import '"+(rel.startsWith('.')?rel:'./'+rel)+"'; // ARCH-01C3b0 virtual UI predecessor";
};
for(const file of owners){
 const text=read(file),lines=text.split('\n');
 const first=lines.findIndex(line=>/^import /.test(line));
 const last=lines.findLastIndex(line=>/^import /.test(line));
 assert.ok(first>=0&&last>=first,'UI candidate has no imports: '+file);
 for (const position of ['first','after-last']){
   const replacement=lines.slice();
   replacement.splice(position==='first'?first:last+1,0,importLine(file));
   const files=baseFiles();files.set(file,replacement.join('\n'));
   variants.push({name:file+':'+position,files});
 }
}
// More precise UI composition: insert directly before/after existing named
// import of conquest-data and the eager entrypoint import of Conquest UI.
const ui='ui/views/conq.js',uiSrc=read(ui);
const dataImport="import { CQ_CHESTS, CQ_DIFF, CQ_DISKS, CQ_DMAX, CQ_EN, CQ_ICON, CQ_LAST, CQ_LAYERS, CQ_LFAC, CQ_LMAX, CQ_MED, CQ_RF, CQ_SECT, CQ_STA, CQ_TROPHY, cqBump, cqFeats, cqK, cqMod, cqModD, cqRar, cqRfCost, cqRfN, cqScore } from '../../data/conquest-data.js';";
assert.ok(uiSrc.includes(dataImport),'actual UI Conquest named import anchor must be present');
for (const position of ['before-data','after-data']){
 const revised=uiSrc.replace(dataImport,
    (position==='before-data'?importLine(ui)+'\n':'')+
    dataImport+(position==='after-data'?'\n'+importLine(ui):''));
 const files=baseFiles();files.set(ui,revised);
 variants.push({name:ui+':'+position,files});
}
const entry='boot.js',entrySrc=read(entry),entryImport="import './ui/views/conq.js'; // порядок исполнения";
assert.ok(entrySrc.includes(entryImport));
for(const position of ['before-entry','after-entry']){
 const revised=entrySrc.replace(entryImport,
  (position==='before-entry'?importLine(entry)+'\n':'')+
  entryImport+(position==='after-entry'?'\n'+importLine(entry):''));
 const files=baseFiles();files.set(entry,revised);
 variants.push({name:entry+':'+position,files});
}
let exact=0;
const ordered=[];
for(const variant of variants){
 try{
  const now=await bundle(variant.files);
  const missing=original.filter(x=>!now.includes(x));
  const extra=now.filter(x=>!original.includes(x));
  const moved=original.filter((x,i)=>now.indexOf(x)!==i);
  const first=original.findIndex((x,i)=>now[i]!==x);
  const item={
    name:variant.name,exact:moved.length===0 && !missing.length && !extra.length,
    moved:moved.length,missing,extra,
    first:first<0?'none':first+':'+original[first]+' -> '+now[first],
    preview:moved.slice(0,8),
  };
  if(item.exact) exact++;
  ordered.push(item);
  console.log('ARCH-01C3b virtual celebrate '+JSON.stringify(item));
 }catch(err){
  const item={name:variant.name,exact:false,error:String(err.message||err).slice(0,450)};
  ordered.push(item);
  console.log('ARCH-01C3b virtual celebrate '+JSON.stringify(item));
 }
}
console.log('ARCH-01C3b virtual RESULT '+JSON.stringify({
 variants:variants.length,exact,baseline:ledger.length,
 best:ordered.filter(x=>typeof x.moved==='number').sort((a,b)=>a.moved-b.moved)
  .slice(0,10).map(x=>({name:x.name,moved:x.moved})),
 note:'Virtual esbuild marker parity is NECESSARY, not enough for runtime TDZ/celebration acceptance',
}));
