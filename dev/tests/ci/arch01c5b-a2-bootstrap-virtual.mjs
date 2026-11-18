// ARCH-01C5b-A2: read-only composition-root and 3D bootstrap design probes.
// This test NEVER writes src/, the architecture baseline, SPLIT, goldens or release files.
// A passing result is diagnostic evidence, NOT approval to change ESM order or game source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { importEdges, analyzeTree, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(DEV, 'src');
const read = p => fs.readFileSync(path.join(SRC,p),'utf8');
const STORY = 'data/story.js', MODELS = 'assets/models.js';
const ROOT = 'boot.js', CORE = 'core/boot.js', ROUTER = 'ui/router.js';
const originalStory = read(STORY), originalModels = read(MODELS);
const debt = "import '../assets/models.js'; // порядок исполнения\n";
assert.equal(originalStory.split(debt).length,2,'one existing Story→Models order-only import');
assert.equal(originalModels.split('b3Pre(loadAssets3);').length,2,'one existing eager loader registration');
assert.ok(read('render3d/base.js').includes('B3_PRE.map(f => Promise.resolve().then(f))'),
  'loadB3 snapshots B3_PRE at first call; registration order is observable');
assert.ok(read(ROOT).includes('window.claude.hot.ready(start) : start('),
  'real root must still call start');
assert.ok(read(CORE).includes('function start(data) {\n  set_S('),
  'do not change first statement of start');
assert.ok(read('render3d/scenes/baker.js').includes('setTimeout(() => { bakePortraits(); }, 1200)'),
  'timer-based portrait baking is a separate early loadB3 path');
assert.ok(read('render3d/scenes/camp.js').includes('loadB3().then(ok => {'),
  'camp first-render path is another early loadB3 consumer');
const frozen = JSON.parse(fs.readFileSync(path.join(DEV,
  'tests/ci/arch01c5a-b1-approved-order.json'),'utf8'));
assert.deepEqual(SPLIT.map(([,p])=>p),frozen,'v135 pinned production module order');
assert.equal(frozen.length,167);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(DEV,
  'tools/arch-import-baseline.json'),'utf8')).legacy,
  ['data/story.js -> assets/models.js']);
const baseline = analyzeTree(DEV);
assert.equal(baseline.modules,173);
assert.equal(baseline.staticImports,1000);
assert.equal(baseline.dynamicImports,0);
assert.equal(baseline.unresolved.length,0);
assert.deepEqual(baseline.cycles.map(x=>x.length),[105,6]);

const files = [];
function visit(dir) {
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,e.name);
    if(e.isDirectory()) visit(full);
    else if(e.isFile()&&e.name.endsWith('.js')) files.push(path.relative(SRC,full).split(path.sep).join('/'));
  }
}
visit(SRC);
files.sort();
const originals=Object.fromEntries(files.map(p=>[p,read(p)]));
function graph(patches,synthetic) {
  const sources={...originals};
  for(const [p,c] of patches) sources[p]=c;
  if(synthetic) sources['ui/bootstrap/asset-bootstrap.js']=synthetic;
  const out={};
  for(const [p,c] of Object.entries(sources))
    out[p]=importEdges(c,p).filter(x=>x.kind==='static').map(x=>x.to);
  const unresolved=Object.entries(out).flatMap(([p,targets])=>targets.filter(t=>!(t in sources)).map(t=>p+' -> '+t));
  return {out,unresolved,cycles:stronglyConnected(out),
    imports:Object.values(out).reduce((n,a)=>n+a.length,0),
    forbidden:Object.entries(out).flatMap(([p,x])=>p.startsWith('data/')?
      x.filter(t=>!t.startsWith('data/')).map(t=>p+' -> '+t):[])};
}
const originalGraph=graph(new Map(),null);
assert.deepEqual(originalGraph.cycles,baseline.cycles);
const incoming = p=>Object.entries(originalGraph.out).filter(([,x])=>x.includes(p)).map(([n])=>n);
function firstDFS(target) {
  const visited=new Set();
  function walk(node,route) {
    if(node===target)return route;
    if(visited.has(node))return null;
    visited.add(node);
    for (const n of originalGraph.out[node]||[]) {
      const found=walk(n,[...route,n]);
      if(found)return found;
    }
    return null;
  }
  return walk('main.js',['main.js']);
}
for(const p of [STORY,MODELS,'render3d/scenes/baker.js','render3d/scenes/camp.js','render3d/base.js']){
  console.log('ARCH-01C5b-A2 first-DFS import path '+p+': '+JSON.stringify(firstDFS(p)));
  console.log('ARCH-01C5b-A2 incoming '+p+': '+JSON.stringify(incoming(p)));
}
const cleanStory=originalStory.replace(debt,'');
const removedRegister=originalModels.replace('b3Pre(loadAssets3);',
  '// ARCH-01C5b-A2 memory-only: registration moved to explicit bootstrap');
const insertImports=(p,spec)=> {
  const lines=read(p).split('\n');
  const at=lines.findLastIndex(l=>/^import /.test(l));
  assert.ok(at>=0,'imports in '+p);
  lines.splice(at+1,0,spec);
  return lines.join('\n');
};
const newImportRoot="import { loadAssets3 } from './assets/models.js';\nimport { b3Pre } from './render3d/base.js'; // A2 virtual only";
const newImportCore="import { loadAssets3 } from '../assets/models.js';\nimport { b3Pre } from '../render3d/base.js'; // A2 virtual only";
const newImportRouter="import { loadAssets3 } from '../assets/models.js';\nimport { b3Pre } from '../render3d/base.js'; // A2 virtual only";
function callBefore(s,needle) {
  const i=s.indexOf(needle);
  assert.ok(i>=0,'bootstrap anchor not found: '+needle);
  return s.slice(0,i)+'b3Pre(loadAssets3); // ARCH-01C5b-A2 virtual eager registration\n'+s.slice(i);
}
const bootstrapSource = [
  "import { loadAssets3 } from '../../assets/models.js';",
  "import { b3Pre } from '../../render3d/base.js';",
  "b3Pre(loadAssets3); // ARCH-01C5b-A2 synthetic UI composition module",
  "export {};",
  "",
].join('\n');
const scenarios=[
 {name:'remove-only-negative-control',patches:new Map([[STORY,cleanStory]]),register:'assets/models.js'},
 {name:'ui-router-order-only-A1-reference',patches:new Map([
    [STORY,cleanStory],
    [ROUTER,"import '../assets/models.js'; // A2 virtual side-effect\n"+read(ROUTER)],
  ]),register:'assets/models.js'},
 {name:'root-boot-explicit-registration',patches:new Map([
    [STORY,cleanStory],[MODELS,removedRegister],
    [ROOT,callBefore(insertImports(ROOT,newImportRoot),'window.claude?.hot?.snapshot')],
  ]),register:ROOT},
 {name:'core-boot-explicit-registration',patches:new Map([
    [STORY,cleanStory],[MODELS,removedRegister],
    [CORE,callBefore(insertImports(CORE,newImportCore),'export { splashOff, start };')],
  ]),register:CORE},
 {name:'ui-router-explicit-registration',patches:new Map([
    [STORY,cleanStory],[MODELS,removedRegister],
    [ROUTER,callBefore(insertImports(ROUTER,newImportRouter),'let storyViewRenderer = null;')],
  ]),register:ROUTER},
 {name:'synthetic-ui-bootstrap-from-root',patches:new Map([
    [STORY,cleanStory],[MODELS,removedRegister],
    [ROOT,"import './ui/bootstrap/asset-bootstrap.js'; // A2 virtual only\n"+read(ROOT)],
  ]),synthetic:bootstrapSource,register:'ui/bootstrap/asset-bootstrap.js'},
];
const marks=s=>[...s.matchAll(/^\/\/ (?:src\/(.+\.js)|arch-a2:.*?\/src\/(.+\.js))$/gm)]
  .map(m=>m[1]||m[2]).filter(x=>x!=='main.js');
async function bundle(patches=new Map(),synthetic=null) {
  const plugin={name:'arch01c5b-a2-virtual-only',setup(b) {
    if(synthetic) {
      b.onResolve({filter:/^\.\/ui\/bootstrap\/asset-bootstrap\.js$/},args=>({
        path:path.join(SRC,'ui/bootstrap/asset-bootstrap.js'),namespace:'arch-a2'}));
      b.onResolve({filter:/^\.\./,namespace:'arch-a2'},args=>({
        path:path.resolve(path.dirname(args.importer),args.path),namespace:'file'}));
      b.onLoad({filter:/.*/,namespace:'arch-a2'},()=>({
        contents:synthetic,loader:'js',resolveDir:path.join(SRC,'ui/bootstrap')}));
    }
    b.onLoad({filter:/\.js$/},args=>{
      const p=path.relative(SRC,args.path).split(path.sep).join('/');
      if(patches.has(p))return{contents:patches.get(p),loader:'js',resolveDir:path.dirname(args.path)};
    });
  }};
  const x=await esbuild.build({
    absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',
    treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',logLevel:'silent',
    metafile:true,logOverride:{'commonjs-variable-in-esm':'silent'},plugins:[plugin],
  });
  return {order:marks(x.outputFiles[0].text),inputs:Object.keys(x.metafile.inputs).length};
}
const ref=await bundle();
assert.deepEqual(ref.order,frozen,'real build must still preserve complete old 167 marker order');
const oldBase=frozen.indexOf('render3d/base.js');
assert.ok(oldBase>=0);
console.log('ARCH-01C5b-A2 BASE '+JSON.stringify({modules:baseline.modules,imports:baseline.staticImports,
  cycles:baseline.cycles.map(c=>c.length),esm:frozen.length,
  earlyOrder:Object.fromEntries([STORY,MODELS,'render3d/scenes/baker.js',
    'render3d/scenes/camp.js','render3d/base.js','boot.js','core/boot.js']
    .map(n=>[n,frozen.indexOf(n)]))}));
for(const s of scenarios) {
  const g=graph(s.patches,s.synthetic);
  assert.deepEqual(g.unresolved,[],'no unresolved static imports '+s.name);
  assert.deepEqual(g.forbidden,[],'no hidden reverse data edges in virtual design '+s.name);
  const count=[...s.patches.values(),s.synthetic||''].join('\n').match(/b3Pre\(loadAssets3\);/g)||[];
  // The original registration is retained only in the first two scenarios.
  assert.equal((s.patches.has(MODELS)?0:1) + count.filter(Boolean).length -
    (s.patches.has(MODELS)?0:0),s.patches.has(MODELS)?1:1,
    'virtual source must not silently duplicate model registration '+s.name);
  const built=await bundle(s.patches,s.synthetic);
  const missing=frozen.filter(n=>!built.order.includes(n));
  const shifted=frozen.filter((n,i)=>built.order.indexOf(n)!==i);
  const first=frozen.findIndex((n,i)=>built.order[i]!==n);
  const added=built.order.filter(n=>!frozen.includes(n));
  const bi=built.order.indexOf('render3d/base.js'),mi=built.order.indexOf(MODELS),
        ri=built.order.indexOf(s.register),boot=built.order.indexOf(ROOT);
  assert.ok(bi>=0&&mi>=0&&ri>=0&&boot>=0,'required modules in virtual build');
  const regBeforeStart=ri<=boot;
  // Marker order is necessary, NOT sufficient, for registration execution and TDZ safety.
  const label={name:s.name,moduleCount:Object.keys(g.out).length,imports:g.imports,
    scc:g.cycles.map(c=>c.length),oldMarkers:frozen.length,newMarkers:built.order.length,
    missing,added,shifted:shifted.length,first,
    firstOld:first<0?null:frozen[first],firstNew:first<0?null:built.order[first],
    baseIndex:bi,modelsIndex:mi,registrationOwnerIndex:ri,bootIndex:boot,
    registrationOwnerBeforeBoot:regBeforeStart,baseBeforeOwner:bi<ri};
  console.log('ARCH-01C5b-A2 VIRTUAL '+JSON.stringify(label));
}
console.log('ARCH-01C5b-A2 FINAL: read-only virtual scenarios completed; no gameplay code or approved baseline changed. Runtime/browser proof, TDZ, WebKit and ESM rebaseline remain separate GO gates.');
