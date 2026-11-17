// ARCH-01C3a3: read-only virtual esbuild order diagnosis of cosmetic data→logic/stats.
// Fail-closed, never change source/SPLIT/baseline/golden/3D/camp in this phase.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const read=p=>fs.readFileSync(path.join(SRC,p),'utf8');
const names=SPLIT.map(([,name])=>name);
const data=read('data/cosmetics.js');
const predecessor="import '../logic/stats.js'; // порядок исполнения\n";
assert.ok(data.includes(predecessor),'the exact old order predecessor must exist before probing');
assert.ok(data.indexOf(predecessor)<data.indexOf("import { CH } from './chars.js'"),
  'historical stats import must remain first in cosmetic data before simulation');
const baseline=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.equal(baseline.length,8,'must run from merged C3a2, baseline 8');
assert.ok(baseline.includes('data/cosmetics.js -> logic/stats.js'));
const graph=analyzeTree(DEV);
assert.equal(graph.modules,173);
assert.equal(graph.cycles.length,2);
assert.equal(graph.unresolved.length,0);
assert.equal(SPLIT.length,167);
const clean=data.replace(predecessor,'');
assert.ok(clean.includes('const EMBLEMS = {') &&
  !clean.includes('logic/stats.js') &&
  !clean.includes('WORM_IMG'),
  'this stage must not alter visual catalog or recreate data→asset edge');

const owners=[
 ['ui/views/feats.js','../../logic/stats.js'],
 ['ui/overlays/profile.js','../../logic/stats.js'],
 ['ui/wiring.js','../logic/stats.js'],
 ['ui/hero-window.js','../logic/stats.js'],
 ['ui/portrait.js','../logic/stats.js'],
 ['ui/rewards.js','../logic/stats.js'],
 ['ui/views/trials.js','../../logic/stats.js'],
 ['ui/overlays/info.js','../../logic/stats.js'],
 ['ui/overlays/calendar.js','../../logic/stats.js'],
 ['ui/overlays/celebrate.js','../../logic/stats.js'],
 ['core/boot.js','../logic/stats.js'],
 ['ui/router.js','../logic/stats.js'],
];
const variants=[{name:'remove-only',files:new Map([['data/cosmetics.js',clean]])}];
// Non-additive UI-only candidate: feats already uses METRIC. Merely swap the
// two existing named imports to evaluate stats before the cosmetics catalog.
const feats=read('ui/views/feats.js');
const catalogImport="import { EMBLEMS, FRAMES, TITLES } from '../../data/cosmetics.js';";
const metricImport="import { METRIC } from '../../logic/stats.js';";
assert.ok(feats.includes(catalogImport+'\n'+metricImport),
  'original feats import order must match before testing a swap');
variants.push({name:'feats:swap-existing-metric-before-cosmetics',files:new Map([
 ['data/cosmetics.js',clean],
 ['ui/views/feats.js',feats.replace(catalogImport+'\n'+metricImport,
   metricImport+'\n'+catalogImport)],
])});
// Alternate UI-owned order import before the unchanged catalog import.
variants.push({name:'feats:side-effect-before-cosmetics',files:new Map([
 ['data/cosmetics.js',clean],
 ['ui/views/feats.js',feats.replace(catalogImport,
   "import '../../logic/stats.js'; // ARCH-01C3a3 virtual UI-owned predecessor\n"+catalogImport)],
])});
for(const [file,spec] of owners){
 const src=read(file),lines=src.split('\n');
 const first=lines.findIndex(x=>/^import /.test(x));
 const last=lines.findLastIndex(x=>/^import /.test(x));
 if(first<0||last<first)throw Error('candidate has no static imports: '+file);
 for(const placement of ['first','after-last']){
  const patch=lines.slice();
  patch.splice(placement==='first'?first:last+1,0,
   "import '"+spec+"'; // ARCH-01C3a3 virtual stats predecessor");
  variants.push({
   name:file+':'+placement,
   files:new Map([['data/cosmetics.js',clean],[file,patch.join('\n')]]),
  });
 }
}
const moduleNames=out=>[...out.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
 .map(x=>x[1]).filter(x=>x!=='main.js');
async function bundle(files){
 const plugin=files.size?[{
  name:'arch01c3a3-virtual-only',
  setup(build){
   build.onLoad({filter:/\.js$/},args=>{
    const rel=path.relative(SRC,args.path).split(path.sep).join('/');
    if(files.has(rel))return {
      contents:files.get(rel),loader:'js',resolveDir:path.dirname(args.path),
    };
   });
  },
 }]:[];
 const output=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
  format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',
  target:'esnext',logLevel:'silent',
  logOverride:{'commonjs-variable-in-esm':'silent'},plugins:plugin,
 });
 return moduleNames(output.outputFiles[0].text);
}
assert.deepEqual(await bundle(new Map()),names,
 'unchanged production build must be bit-for-bit identical in marker order');
const results=[];
for(const v of variants){
 try{
  const now=await bundle(v.files);
  const missing=names.filter(x=>!now.includes(x));
  const extra=now.filter(x=>!names.includes(x));
  const moved=names.filter((x,i)=>now.indexOf(x)!==i);
  const first=names.findIndex((x,i)=>now[i]!==x);
  const result={name:v.name,exact:moved.length===0&&!missing.length&&!extra.length,
   moved:moved.length,missing,extra,
   first:first===-1?'none':first+':'+names[first]+' -> '+now[first],
   preview:moved.slice(0,10)};
  results.push(result);
  console.log('ARCH-01C3a3 virtual stats '+JSON.stringify(result));
 }catch(e){
  const result={name:v.name,error:String(e.message).slice(0,350)};
  results.push(result);
  console.log('ARCH-01C3a3 virtual stats '+JSON.stringify(result));
 }
}
console.log('ARCH-01C3a3 result '+JSON.stringify({
 variants:results.length,exact:results.filter(x=>x.exact).length,
 best:results.filter(x=>Number.isFinite(x.moved)).sort((a,b)=>a.moved-b.moved).slice(0,5)
 .map(x=>({name:x.name,moved:x.moved})),
}));
console.log('ARCH-01C3a3 diagnostic only, no source/SPLIT/baseline/camp edits');
