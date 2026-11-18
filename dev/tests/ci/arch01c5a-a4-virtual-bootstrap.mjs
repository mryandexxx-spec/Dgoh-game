// ARCH-01C5a-A4: virtual Conquest bootstrap, never writes production src/SPLIT/ledger.
// All optional instrumentation is added equally to both bundles in memory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

export const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const read=f=>fs.readFileSync(path.join(SRC,f),'utf8');
export const MAIN_SHA='b3d65303130dbd385caaac299f1f2dfc0473cd8c';
const CONQ='data/conquest-data.js',VIEW='ui/views/conq.js',CELEBRATE='ui/overlays/celebrate.js';
const DEBT=["data/conquest-data.js -> ui/overlays/celebrate.js","data/story.js -> assets/models.js"];
const original=read(CONQ),view=read(VIEW);
const oldEdge="import '../ui/overlays/celebrate.js'; // порядок исполнения\n";
assert.equal(original.split(oldEdge).length,2,'Conquest predecessor must be unique in frozen v134');
const oldView="import { cq, cqAddDisk";
assert.equal(view.split(oldView).length,2,'Conquest view opening named import must be unique');
export const virtualPatch=new Map([
 [CONQ,original.replace(oldEdge,'')],
 [VIEW,view.replace(oldView,"import '../overlays/celebrate.js'; // ARCH-01C5a-A4 VIRTUAL ONLY\n"+oldView)],
]);
export const PROBE_MODULES=[
 'data/conquest-data.js','logic/conquest.js','ui/views/conq.js',
 'ui/overlays/celebrate.js','ui/notifications.js','ui/reward-tiles.js',
 'ui/overlays/squad-select.js','core/save.js','core/boot.js',
 'assets/models.js','render3d/base.js','render3d/scenes/baker.js',
 'data/story.js','ui/router.js','ui/events.js','boot.js','ui/hero-window.js',
];
const traceMarker=f=>';globalThis.__A4_MARK?.('+JSON.stringify(f)+');\n';
function instrumentSource(f,source){
 const wrap=(needle,label)=>{
  assert.equal(source.split(needle).length,2,'must instrument exactly one '+label);
  source=source.replace(needle,
    "globalThis.__A4_MARK?.("+JSON.stringify(label+':before')+");\\n"+
    needle+
    "\\nglobalThis.__A4_MARK?.("+JSON.stringify(label+':after')+");");
 };
 if(f==='assets/models.js')wrap('b3Pre(loadAssets3);','models:b3Pre');
 if(f==='ui/notifications.js')wrap('onPersist(notePoll);','notifications:onPersist');
 if(f==='core/boot.js')wrap('function start(data) {','core/boot:start');
 return source+traceMarker(f);
}

const STATIC=SPLIT.map(([,f])=>f);
assert.equal(STATIC.length,167);
assert.equal(new Set(STATIC).size,167);
function graphPatch(){
 const baseline=analyzeTree(DEV);
 assert.equal(baseline.modules,173);
 assert.equal(baseline.staticImports,1000);
 assert.equal(baseline.dynamicImports,0);
 assert.deepEqual(baseline.cycles.map(c=>c.length),[106,6]);
 const ledger=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
 assert.deepEqual(ledger,DEBT);
 const oldEdges=importEdges(read(CONQ),CONQ).filter(e=>e.kind==='static');
 const newEdges=importEdges(virtualPatch.get(CONQ),CONQ).filter(e=>e.kind==='static');
 assert.equal(oldEdges.length-newEdges.length,1);
 assert.ok(!newEdges.some(e=>e.to===CELEBRATE));
 const oldView=importEdges(read(VIEW),VIEW).filter(e=>e.kind==='static');
 const newView=importEdges(virtualPatch.get(VIEW),VIEW).filter(e=>e.kind==='static');
 assert.equal(newView.length-oldView.length,1);
 assert.equal(newView[0].to,CELEBRATE);
 const all={};
 const enumerate=(dir)=>{
  for(const d of fs.readdirSync(dir,{withFileTypes:true})){
   const f=path.join(dir,d.name);if(d.isDirectory())enumerate(f);
   else if(d.isFile()&&f.endsWith('.js')){
    const rel=path.relative(SRC,f).split(path.sep).join('/');
    all[rel]=importEdges(virtualPatch.get(rel)??read(rel),rel)
      .filter(e=>e.kind==='static').map(e=>e.to);
   }
  }
 };
 enumerate(SRC);
 const count=Object.values(all).reduce((n,a)=>n+a.length,0);
 assert.equal(count,1000);
 const debt=Object.entries(all).flatMap(([f,imports])=>f.startsWith('data/')?
  imports.filter(to=>!to.startsWith('data/')).map(to=>f+' -> '+to):[]);
 assert.deepEqual(debt,DEBT.slice(1));
 const scc=stronglyConnected(all);
 assert.deepEqual(scc.map(c=>c.length),[105,6]);
 const baseBig=baseline.cycles.find(c=>c.includes(CONQ));
 const nextBig=scc.find(c=>c.includes(CELEBRATE));
 assert.deepEqual(baseBig.filter(f=>!nextBig.includes(f)),[CONQ]);
 return{count,scc:scc.map(c=>c.length),dataDebts:debt,expelled:[CONQ]};
}

function markers(text){
 return [...text.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m=>m[1]).filter(f=>f!=='main.js');
}
export async function makeBundles({instrument=true}={}){
 const compile=async candidate=>{
  const plugin={name:'ARCH01C5a-A4-virtual-source-in-memory',setup(build){
   build.onLoad({filter:/\.js$/},args=>{
    const f=path.relative(SRC,args.path).split(path.sep).join('/');
    const patch=candidate?virtualPatch.get(f):null;
    const instrumented=instrument&&PROBE_MODULES.includes(f);
    if(patch!==undefined||instrumented){
     const source=patch??read(f);
     return{contents:instrumented?instrumentSource(f,source):source,
       loader:'js',resolveDir:path.dirname(args.path)};
    }
   });
  }};
  const result=await esbuild.build({
   absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
   format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',
   target:'esnext',logLevel:'silent',
   logOverride:{'commonjs-variable-in-esm':'silent'},
   plugins:[plugin],
  });
  return{code:result.outputFiles[0].text,order:markers(result.outputFiles[0].text)};
 };
 const [base,virtual]=await Promise.all([compile(false),compile(true)]);
 assert.deepEqual(base.order,STATIC,'baseline real esbuild must match frozen v134 167 ESM markers');
 assert.equal(virtual.order.length,167);
 assert.deepEqual([...virtual.order].sort(),[...STATIC].sort(),'virtual build may not omit modules');
 const moved=STATIC.filter((f,i)=>virtual.order[i]!==f);
 const first=STATIC.findIndex((f,i)=>virtual.order[i]!==f);
 assert.equal(moved.length,47,'frozen best v134 candidate shifted 47 ESM marker slots');
 assert.equal(first,118,'first mismatch of A2 is index 118');
 if(!instrument)assert.ok(!base.code.includes('__A4_MARK'));
 return{base,virtual,order:{moved:moved.length,first,expected:STATIC[first],
   actual:virtual.order[first]},topology:graphPatch(),instrument};
}
// Resolve exactly the *build-generated* model asset URL mapping from the verified
// production build. No fake or empty model map can be used in a browser probe.
export function fillAssetMap(code,verifiedUnmin){
 // esbuild can convert a module-scoped "const ASSET" into "var ASSET".
 // Extract the quoted JSON.parse argument by a quote-aware scanner and copy it
 // from the *actually validated PWA build*, not a guessed asset map.
 function assetExpression(text){
  const match=/\\b(?:var|const|let)\\s+ASSET\\s*=\\s*JSON\\.parse\\(/.exec(text);
  assert.ok(match,'verified or virtual bundle must contain the model ASSET declaration');
  const at=text.indexOf('JSON.parse(',match.index);
  let i=at+'JSON.parse('.length;
  const quote=text[i];
  assert.ok(quote==='"'||quote==="'","model map must be a string literal");
  let escaped=false;
  for(i++;i<text.length;i++){
   const c=text[i];
   if(escaped){escaped=false;continue;}
   if(c==='\\\\'){escaped=true;continue;}
   if(c===quote)break;
  }
  assert.ok(i<text.length && text[i+1]===')','model map must have one valid JSON.parse literal');
  return text.slice(at,i+2);
 }
 const source=assetExpression(verifiedUnmin);
 const target=assetExpression(code);
 assert.ok(source.length>target.length*2,'validated asset map must not be placeholder');
 assert.ok(target.includes('__ASSET_MAP__'),'virtual ASSET expression must carry original placeholder');
 assert.equal(code.split(target).length,2,'virtual ASSET expression must be unique');
 const result=code.replace(target,source);
 assert.ok(!result.includes('__ASSET_MAP__'),'all model placeholders must be replaced');
 return result;
}

export async function validateA4(){
 const r=await makeBundles();
 console.log('ARCH-01C5a-A4 STATIC '+JSON.stringify({
  main:MAIN_SHA,modules:173,imports:r.topology.count,
  esmBaseline:r.base.order.length,esmVirtual:r.virtual.order.length,
  virtualMoved:r.order.moved,firstMismatch:r.order.first,
  firstOld:r.order.expected,firstNew:r.order.actual,
  sccVirtual:r.topology.scc,expelled:r.topology.expelled,
  remainingDebts:r.topology.dataDebts,strictGo:false,
  sourceWrites:0,approval:'A4 diagnosis only, no B1 or release',
 }));
}
