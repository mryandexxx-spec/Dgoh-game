// ARCH-01C3a1: read-only ESM simulation of data/cosmetics unlocked() into logic.
// Run this BEFORE modifying production source, SPLIT or AST baseline.
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
const cosmetics=read('data/cosmetics.js'),boot=read('core/boot.js');
const original=SPLIT.map(([,name])=>name);
const oldUnlock="const unlocked = (kind, id) => FREE[kind].includes(id) || !!S.unlocks[kind][id] || (kind === 'ava' && id.startsWith('hero:') && CH[id.slice(5)] && prog(id.slice(5)).stars > 0);";
const bootAnchor="import '../logic/campaign-gates.js'; // ARCH-01C2b: register campaign unlock rules before start()";
for(const s of ["import { prog } from '../logic/progress.js';","import { S } from '../core/state.js';",oldUnlock,"export { EMBLEMS, FRAMES, TITLES, FREE, unlocked };"])
  assert.ok(cosmetics.includes(s),'old cosmetic contract changed: '+s.slice(0,70));
assert.ok(boot.includes(bootAnchor),'must compose from existing boot root');
const replacement=[
  '// ARCH-01C3a1: old public selector remains callable after logic registration.',
  'let cosmeticUnlockRule=null;',
  'function bindCosmeticUnlockRule(rule){',
  "  if (cosmeticUnlockRule) throw new Error('Cosmetics unlocked rule already initialized');",
  '  cosmeticUnlockRule=rule;',
  '}',
  'function unlocked(kind,id){',
  "  if (!cosmeticUnlockRule) throw new Error('Cosmetics unlocked rule not initialized');",
  '  return cosmeticUnlockRule(kind,id);',
  '}',
].join('\n');
const rule=[
  "import { FREE, bindCosmeticUnlockRule } from '../data/cosmetics.js';",
  "import { CH } from '../data/chars.js';",
  "import { S } from '../core/state.js';",
  "import { prog } from './progress.js';",
  "const unlockedRule = (kind, id) => FREE[kind].includes(id) || !!S.unlocks[kind][id] || (kind === 'ava' && id.startsWith('hero:') && CH[id.slice(5)] && prog(id.slice(5)).stars > 0);",
  'bindCosmeticUnlockRule(unlockedRule);',
].join('\n');
const newCosmetics=cosmetics
  .replace("import { prog } from '../logic/progress.js';\n",'')
  .replace("import { S } from '../core/state.js';\n",'')
  .replace(oldUnlock,replacement)
  .replace('export { EMBLEMS, FRAMES, TITLES, FREE, unlocked };',
    'export { EMBLEMS, FRAMES, TITLES, FREE, unlocked, bindCosmeticUnlockRule };');
const sites=[
  {name:'core/boot.js:after-campaign-gates',file:'core/boot.js',after:bootAnchor,spec:'../logic/cosmetics-unlocks.js'},
  {name:'ui/overlays/profile.js:after-data',file:'ui/overlays/profile.js',after:"import { EMBLEMS, FRAMES, TITLES, unlocked } from '../../data/cosmetics.js';",spec:'../../logic/cosmetics-unlocks.js'},
  {name:'ui/wiring.js:after-data',file:'ui/wiring.js',after:"import { unlocked } from '../data/cosmetics.js';",spec:'../logic/cosmetics-unlocks.js'},
  {name:'ui/views/feats.js:after-data',file:'ui/views/feats.js',after:"import { EMBLEMS, FRAMES, TITLES } from '../../data/cosmetics.js';",spec:'../../logic/cosmetics-unlocks.js'},
  {name:'ui/overlays/profile.js:after-last-import',file:'ui/overlays/profile.js',after:"import { $ } from '../../core/dom.js';",spec:'../../logic/cosmetics-unlocks.js'},
  {name:'ui/wiring.js:after-last-import',file:'ui/wiring.js',after:"import { $ } from '../core/dom.js';",spec:'../logic/cosmetics-unlocks.js'},
];
function patchedAt(site){
  const file=read(site.file);
  assert.ok(file.includes(site.after),'registration anchor missing: '+site.name);
  const importLine="import '"+site.spec+"'; // ARCH-01C3a1 virtual registration";
  return new Map([
    ['data/cosmetics.js',newCosmetics],
    [site.file,file.replace(site.after,site.after+'\n'+importLine)],
  ]);
}
function markers(src){
  return [...src.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m=>m[1]).filter(x=>x!=='main.js');
}
async function build(site=null){
  const patched=site?patchedAt(site):new Map();
  const plugins=site?[{
    name:'arch01c3a1-virtual-only',
    setup(b){
      b.onResolve({filter:/cosmetics-unlocks\.js$/},
        ()=>({path:'cosmetics-unlocks',namespace:'arch-c3a1'}));
      b.onLoad({filter:/.*/,namespace:'arch-c3a1'},
        ()=>({contents:rule,loader:'js',resolveDir:path.join(SRC,'logic')}));
      b.onLoad({filter:/\.js$/},args=>{
        const rel=path.relative(SRC,args.path).split(path.sep).join('/');
        if(patched.has(rel))return {contents:patched.get(rel),loader:'js',resolveDir:path.dirname(args.path)};
      });
    },
  }]:[];
  const output=await esbuild.build({
    absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
    format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',
    target:'esnext',logLevel:'silent',plugins,
    logOverride:{'commonjs-variable-in-esm':'silent'},
  });
  return markers(output.outputFiles[0].text);
}
const g=analyzeTree(DEV);
assert.equal(g.modules,172,'must start from merged ARCH-01C2c');
assert.equal(g.unresolved.length,0);
const baseline=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.equal(baseline.length,11,'must start with exactly 11 legacy data reverse imports');
for(const e of ['data/cosmetics.js -> logic/progress.js','data/cosmetics.js -> core/state.js'])
  assert.ok(baseline.includes(e),'candidate missing '+e);
const actual=await build();
assert.deepEqual(actual,original,'current production order must equal all 166 SPLIT markers');
for(const site of sites){
  const next=await build(site);
  const missing=original.filter(x=>!next.includes(x));
  const extra=next.filter(x=>!original.includes(x));
  const changed=original.filter((x,i)=>next.indexOf(x)!==i);
  const first=original.findIndex((x,i)=>next[i]!==x);
  console.log('ARCH-01C3a1 virtual unlock extraction '+JSON.stringify({
    site:site.name,original:original.length,observed:next.length,
    moved:changed.length,missing,extra,
    first:first<0?'none':first+':'+original[first]+' -> '+next[first],
    preview:changed.slice(0,14),
  }));
}
console.log('ARCH-01C3a1 read-only matrix: no src/SPLIT/baseline/golden touched; stats/model predecessors unchanged');
