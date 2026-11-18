// ARCH-01C5b-B1 preflight. READ-ONLY production-esbuild candidate before real source edits.
// Freeze the independently observed 167-marker candidate before touching SPLIT or src.
// This is evidence, NOT an automatic exception to check-bundle.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src'),read=p=>fs.readFileSync(path.join(SRC,p),'utf8');
const old=JSON.parse(fs.readFileSync(path.join(DEV,'tests/ci/arch01c5a-b1-approved-order.json'),'utf8'));
assert.deepEqual(SPLIT.map(([,p])=>p),old);
assert.equal(old.length,167);
const story='data/story.js',models='assets/models.js',boot='boot.js';
const line="import '../assets/models.js'; // порядок исполнения\n";
assert.equal(read(story).split(line).length,2);
assert.equal(read(models).split('b3Pre(loadAssets3);').length,2);
const st=read(story).replace(line,'');
const mo=read(models).replace('b3Pre(loadAssets3);','// Explicit bootstrap migrated to boot.js (virtual only).');
let bt=read(boot);
const last=bt.split('\n').findLastIndex(x=>/^import /.test(x));
const ls=bt.split('\n');
ls.splice(last+1,0,"import { loadAssets3 } from './assets/models.js';","import { b3Pre } from './render3d/base.js'; // explicit B1 bootstrap");
bt=ls.join('\n').replace('window.claude?.hot?.snapshot?.(', 'b3Pre(loadAssets3); // exactly once before start()\nwindow.claude?.hot?.snapshot?.(');
const patches=new Map([[story,st],[models,mo],[boot,bt]]);
const marks=s=>[...s.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(x=>x[1]).filter(x=>x!=='main.js');
async function bundle(virtual) {
 const plugin={name:'b1-order-preflight',setup(build){build.onLoad({filter:/\.js$/},a=>{
  const p=path.relative(SRC,a.path).split(path.sep).join('/');
  if(virtual&&patches.has(p))return{contents:patches.get(p),loader:'js',resolveDir:path.dirname(a.path)};
 });}};
 const res=await esbuild.build({absWorkingDir:DEV,entryPoints:['src/main.js'],
  bundle:true,write:false,format:'esm',treeShaking:false,charset:'utf8',
  legalComments:'none',target:'esnext',logLevel:'silent',
  logOverride:{'commonjs-variable-in-esm':'silent'},plugins:[plugin]});
 return marks(res.outputFiles[0].text);
}
const original=await bundle(false),future=await bundle(true);
assert.deepEqual(original,old);
assert.equal(future.length,167);
assert.deepEqual([...future].sort(),[...old].sort());
const moved=old.flatMap((p,i)=>future[i]===p?[]:[{name:p,from:i,to:future.indexOf(p)}]);
assert.equal(moved.length,62);
assert.equal(old[20],'data/looks.js');
assert.equal(future[20],'data/story.js');
assert.equal(future.indexOf('render3d/base.js'),54);
assert.equal(future.indexOf('assets/models.js'),71);
assert.equal(future.indexOf('boot.js'),166);
const graph=analyzeTree(DEV);
assert.equal(graph.modules,173);
assert.equal(graph.staticImports,1000);
assert.deepEqual(graph.cycles.map(c=>c.length),[105,6]);
const graphData={};const files=[];
function visit(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())visit(p);else if(e.name.endsWith('.js'))files.push(path.relative(SRC,p).split(path.sep).join('/'));}}
visit(SRC);
for(const f of files)graphData[f]=importEdges(patches.get(f)??read(f),f).filter(x=>x.kind==='static').map(x=>x.to);
assert.equal(Object.values(graphData).reduce((n,a)=>n+a.length,0),1001);
assert.deepEqual(stronglyConnected(graphData).map(c=>c.length),[60,11,6,3]);
assert.deepEqual(Object.entries(graphData).flatMap(([p,targets])=>p.startsWith('data/')?
 targets.filter(q=>!q.startsWith('data/')).map(q=>p+' -> '+q):[]),[]);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
console.log('ARCH-01C5b-B1 PREFLIGHT old_sha256='+hash(old)+' future_sha256='+hash(future));
console.log('ARCH-01C5b-B1 PROPOSED-FROZEN-ORDER '+JSON.stringify(future));
console.log('ARCH-01C5b-B1 PROPOSED-EXACT-MOVES '+JSON.stringify(moved));
console.log('ARCH-01C5b-B1 VIRTUAL: PASS 173 modules, 1001 imports, SCC [60,11,6,3], 167 markers, 62 exact moved names, no forbidden data imports. NO REAL SRC MODIFIED.');
