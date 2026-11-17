// ARCH-01C3a2: read-only esbuild probe for moving WORM_IMG SVG composition to UI.
// Tests use the REAL production bundle options; no src, baseline, SPLIT or goldens modified.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree } from '../../tools/arch-init-graph.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const read=p=>fs.readFileSync(path.join(SRC,p),'utf8');
const original=SPLIT.map(([,name])=>name);
const cosmetics=read('data/cosmetics.js');
const importModels="import { WORM_IMG } from '../assets/models.js';\n";
const patch=cosmetics.split('\n').find(x=>x.startsWith("if (typeof WORM_IMG !== 'undefined') { EMBLEMS.worm.svg"));
assert.ok(patch && patch.includes('WORM_IMG.ava') &&
  patch.includes("EMBLEMS.worm.bg = ['#a8784a', '#2a1608'];"),
  'must retain original eager worm asset and colors byte-for-byte');
assert.ok(cosmetics.includes(importModels));
const clean=cosmetics.replace(importModels,'').replace(patch+'\n','');
const graph=analyzeTree(DEV);
const legacy=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.equal(graph.modules,173,'must start on C3a1 verified branch');
assert.equal(graph.cycles.length,2);
assert.equal(legacy.length,9);
assert.ok(legacy.includes('data/cosmetics.js -> assets/models.js'));
assert.ok(clean.includes('const EMBLEMS = {') &&
  clean.includes("worm: { n: 'Пасть Шаи-Хулуда'"),
  'the data table must stay intact and preserve procedural SVG fallback');

const sites=[
 {file:'ui/overlays/profile.js',spec:'../../assets/models.js',
  after:"import { EMBLEMS, FRAMES, TITLES, unlocked } from '../../data/cosmetics.js';"},
 {file:'ui/overlays/profile.js',spec:'../../assets/models.js',
  after:"import { $ } from '../../core/dom.js';"},
 {file:'ui/views/feats.js',spec:'../../assets/models.js',
  after:"import { EMBLEMS, FRAMES, TITLES } from '../../data/cosmetics.js';"},
 {file:'ui/wiring.js',spec:'../assets/models.js',
  after:"import { unlocked } from '../data/cosmetics.js';"},
 {file:'ui/wiring.js',spec:'../assets/models.js',
  after:"import { $ } from '../core/dom.js';"},
 {file:'ui/overlays/profile.js',spec:'../../assets/models.js',
  after:"import { figureSVG } from '../../render2d/figures.js';"},
];
function markers(s){
  return [...s.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m=>m[1]).filter(x=>x!=='main.js');
}
async function bundle(patched){
  const plugins=patched.size?[{
    name:'arch01c3a2-virtual-only',
    setup(build){
      build.onLoad({filter:/\.js$/},args=>{
        const rel=path.relative(SRC,args.path).split(path.sep).join('/');
        if(!patched.has(rel))return;
        return {contents:patched.get(rel),loader:'js',resolveDir:path.dirname(args.path)};
      });
    },
  }]:[];
  const out=await esbuild.build({
    absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
    format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',
    target:'esnext',logLevel:'silent',
    logOverride:{'commonjs-variable-in-esm':'silent'},plugins,
  });
  return markers(out.outputFiles[0].text);
}
const actual=await bundle(new Map());
assert.deepEqual(actual,original,'actual production esbuild must match 167 SPLIT markers');
const variants=[{name:'remove-only',patches:new Map([['data/cosmetics.js',clean]])}];
for(const [i,site] of sites.entries()){
 const old=read(site.file);
 assert.ok(old.includes(site.after),'site anchor missing in '+site.file);
 const importLine="import { WORM_IMG } from '"+site.spec+"'; // ARCH-01C3a2 virtual image owner";
 const revised=old.replace(site.after,site.after+'\n'+importLine)
  .replace('\n// =====================', '\n'+patch+'\n\n// =====================');
 assert.ok(revised.includes(patch)&&revised.includes(importLine),
   'candidate must include exact old patch and named model import');
 variants.push({name:site.file+'#'+i,patches:new Map([
   ['data/cosmetics.js',clean],[site.file,revised],
 ])});
}
for(const item of variants){
 try{
  const now=await bundle(item.patches);
  const missing=original.filter(x=>!now.includes(x));
  const extra=now.filter(x=>!original.includes(x));
  const moved=original.filter((x,i)=>now.indexOf(x)!==i);
  const first=original.findIndex((x,i)=>now[i]!==x);
  console.log('ARCH-01C3a2 virtual worm image '+JSON.stringify({
    scenario:item.name,moved:moved.length,missing,extra,
    first:first<0?'none':first+':'+original[first]+' -> '+now[first],
    preview:moved.slice(0,12),
  }));
 }catch(e){
  console.log('ARCH-01C3a2 virtual worm image '+JSON.stringify({
    scenario:item.name,error:String(e.message).slice(0,500),
  }));
 }
}
console.log('ARCH-01C3a2 read-only: original worm patch unchanged, no production source or 3D/lobby changes');
