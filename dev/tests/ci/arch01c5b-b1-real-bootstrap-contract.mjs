// ARCH-01C5b-B1: real-source, independently pinned controlled ESM migration and single 3D preloader.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as acorn from 'acorn';
import * as esbuild from 'esbuild';
import {SPLIT} from '../../tools/split.config.mjs';
import {analyzeTree,importEdges,stronglyConnected} from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const read=p=>fs.readFileSync(path.join(SRC,p),'utf8');
const OLD=JSON.parse(fs.readFileSync(path.join(DEV,'tests/ci/arch01c5b-b1-v135-order.json'),'utf8'));
const PROPOSED=JSON.parse(fs.readFileSync(path.join(DEV,'tests/ci/arch01c5b-b1-proposed-order.json'),'utf8'));
const sha256=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const blob=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
assert.equal(OLD.length,167);assert.equal(PROPOSED.length,167);
assert.equal(sha256(OLD),'385d726d8a51d0b4b270dea36d1949e74ddeef360895d3ca536a285cdc621df3');
assert.equal(sha256(PROPOSED),'8dfc01f4eec407a2b09bfc116fe299ad6a346c834156fcf805a71ca3d1652695');
assert.deepEqual([...OLD].sort(),[...PROPOSED].sort());
assert.deepEqual(SPLIT.map(([,p])=>p),PROPOSED,'SPLIT must equal independent pre-source virtual CI receipt');
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy,[]);
const story='data/story.js',models='assets/models.js',root='boot.js';
const oldStoryEdge="import '../assets/models.js'; // порядок исполнения\n";
const rootImports="import { loadAssets3 } from './assets/models.js';\nimport { b3Pre } from './render3d/base.js'; // ARCH-01C5b-B1 application composition root\n";
const rootRegister="// ARCH-01C5b-B1: register exactly once before start() can first render 3D.\nb3Pre(loadAssets3);\n";
const modelsReplacement="// Registration is owned by the application composition root (boot.js).\n// Keep the historical named base import to preserve the independently reviewed ESM graph.";
assert.ok(!read(story).includes(oldStoryEdge),'no reverse Story→Models edge');
assert.equal(read(story).match(/^import /gm)?.length||0,0,'Story must remain a pure data module');
assert.equal(read(root).split(rootImports).length,2);
assert.equal(read(root).split(rootRegister).length,2);
assert.equal(read(models).split(modelsReplacement).length,2);
assert.ok(!read(models).includes('b3Pre(loadAssets3);'),'models must not silently double-register');
assert.ok(read(models).includes("import { b3Pre } from '../render3d/base.js';"),
  'existing predecessor remains temporarily to avoid unreviewed ESM change');
assert.ok(read('render3d/base.js').includes('B3_PRE.map(f => Promise.resolve().then(f))'),
 'first loadB3 still snapshots registered preprocessors');
const firstStart=read(root).indexOf('window.claude?.hot?.ready ?');
assert.ok(read(root).indexOf(rootRegister)>0&&read(root).indexOf(rootRegister)<firstStart,
  'registration must happen synchronously before hot-ready/start');
assert.ok(read('core/boot.js').includes('function start(data) {\n  set_S('),'start must still set save state first');
const parse=s=>acorn.parse(s,{sourceType:'module',ecmaVersion:'latest'});
const regs=(name)=>parse(read(name)).body.filter(n=>n.type==='ExpressionStatement'&&
 read(name).slice(n.start,n.end).trim()==='b3Pre(loadAssets3);');
assert.equal(regs(root).length,1,'root must contain exactly one eager top-level preloader');
assert.equal(regs(models).length,0,'model module must have zero eager preloader calls');
assert.equal(read('ui/notifications.js').split('onPersist(notePoll);').length,2);
assert.equal(read('ui/overlays/squad-select.js').split('rewardHooks.unlock = id => celebQueue').length,2);
assert.ok(read('render3d/scenes/baker.js').includes('set_figureSVG('));
assert.ok(read('render3d/scenes/camp.js').includes('loadB3().then(ok => {'));
assert.ok(read('render3d/scenes/baker.js').includes('setTimeout(() => { bakePortraits(); }, 1200)'));
assert.equal(blob(read('render3d/scenes/camp.js')),'83d05b1a76509c511286bbc2d3f4f020f61d84bb','protected Camp file stays byte-identical');
const restored=new Map([
 [story,read(story).replace(/^\/\/ data\/story\.js[^\n]*\n/,m=>m+oldStoryEdge)],
 [models,read(models).replace(modelsReplacement,'b3Pre(loadAssets3);')],
 [root,read(root).replace(rootImports,'').replace(rootRegister,'')],
]);
assert.equal(blob(restored.get(story)),'1806238e46cee9ef22ff4e966120047777f11cc1','exact original v135 Story reconstructed');
assert.equal(blob(restored.get(models)),'16504dc4a0efba89dcd325546a9d016ec9fdaa38','exact original v135 Models reconstructed');
assert.equal(blob(restored.get(root)),'f6820015f4f2f7ef83fb3a6e8c95fa1f9290d78b','exact original v135 Boot reconstructed');
const paths=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){let p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&e.name.endsWith('.js'))paths.push(path.relative(SRC,p).split(path.sep).join('/'));}}
walk(SRC);
paths.sort();
assert.equal(paths.length,173);
function graph(historical) {
 const out={};
 for(const p of paths)out[p]=importEdges(historical?(restored.get(p)??read(p)):read(p),p)
  .filter(e=>e.kind==='static').map(e=>e.to);
 return {out,cycles:stronglyConnected(out),count:Object.values(out).reduce((n,ar)=>n+ar.length,0),
  violations:Object.entries(out).flatMap(([p,ar])=>p.startsWith('data/')?
   ar.filter(q=>!q.startsWith('data/')).map(q=>p+' -> '+q):[])};
}
const historical=graph(true),real=graph(false),current=analyzeTree(DEV);
assert.equal(historical.count,1000);assert.deepEqual(historical.cycles.map(c=>c.length),[105,6]);
assert.deepEqual(historical.violations,['data/story.js -> assets/models.js']);
assert.equal(real.count,1001);assert.deepEqual(real.cycles.map(c=>c.length),[60,11,6,3]);
assert.deepEqual(real.violations,[],'all data→* reverse edges removed from actual source');
assert.equal(current.modules,173);assert.equal(current.staticImports,1001);
assert.deepEqual(current.cycles,real.cycles);assert.equal(current.unresolved.length,0);
assert.equal(current.dynamicImports,0);
const marks=text=>[...text.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m=>m[1]).filter(s=>s!=='main.js');
async function order(historicalMode){
 const plugin={name:'arch01c5b-b1-v135-reconstruction-only',setup(build){
  build.onLoad({filter:/\.js$/},a=>{
   let p=path.relative(SRC,a.path).split(path.sep).join('/');
   if(historicalMode&&restored.has(p))return {contents:restored.get(p),loader:'js',resolveDir:path.dirname(a.path)};
  });
 }};
 const result=await esbuild.build({absWorkingDir:DEV,entryPoints:['src/main.js'],
  bundle:true,format:'esm',write:false,treeShaking:false,charset:'utf8',legalComments:'none',
  target:'esnext',logLevel:'silent',logOverride:{'commonjs-variable-in-esm':'silent'},plugins:[plugin]});
 return marks(result.outputFiles[0].text);
}
const prior=await order(true),candidate=await order(false);
assert.deepEqual(prior,OLD,'independently restored exact v135 order must match baseline snapshot');
assert.deepEqual(candidate,PROPOSED,'real code must match pre-source approved proposal, no SPLIT tuning');
const moved=OLD.filter((p,i)=>candidate[i]!==p);
assert.equal(moved.length,62);assert.equal(OLD[20],'data/looks.js');assert.equal(candidate[20],story);
for(const [p,i] of [[story,20],[models,71],['render3d/base.js',54],[root,166]])assert.equal(candidate.indexOf(p),i);
const names=SPLIT.flatMap(([,p])=>{let m=/^export \{ ([^\n]+) \};$/m.exec(read(p));return m?m[1].split(', '):[];});
assert.equal(names.length,898,'all existing named exports unchanged');
const esmHash=sha256(candidate);assert.equal(esmHash,sha256(PROPOSED));
console.log('ARCH-01C5b-B1 REAL SOURCE CONTRACT PASS: modules=173, imports=1000→1001, forbidden=1→0, SCC [105,6]→[60,11,6,3], 167 ESM names, 62 independently frozen moves, 898 exports, exact original SHA-1 source reconstruction, no Camp edits, single root b3Pre before start');
