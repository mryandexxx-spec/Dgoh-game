// ARCH-01C3b3 B1: exact source ownership/API/ESM graph, no new debt.
// Stage A real esbuild 3/8 virtual GO; runtime is verified separately on PWA and artifact.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { analyzeTree, importEdges } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const src=p=>fs.readFileSync('src/'+p,'utf8');
const data=src('data/conquest-data.js'),logic=src('logic/conquest.js'),ui=src('ui/views/conq.js');
const ledger=JSON.parse(fs.readFileSync('tools/arch-import-baseline.json','utf8')).legacy;
const expected=[
 'data/boss.js -> logic/battle/skills.js',
 'data/conquest-data.js -> ui/overlays/celebrate.js',
 'data/looks.js -> logic/battle/ai.js',
 'data/story.js -> assets/models.js'
];
assert.deepEqual(ledger,expected,'remove ONLY proven Conquest data→logic reverse edge');
const graph=analyzeTree(process.cwd());
assert.equal(graph.modules,173,'no new production modules');
assert.equal(graph.staticImports,999,'remove exactly one existing static import');
assert.equal(graph.unresolved.length,0);
assert.deepEqual(graph.cycles.map(c=>c.length),[106,9],'same ESM SCC sizes');
for(const p of ['data/conquest-data.js','logic/conquest.js','core/state.js','ui/views/conq.js','ui/overlays/celebrate.js'])
 assert.ok(graph.cycles[0].includes(p),'do not break existing Conquest init SCC: '+p);
assert.equal(SPLIT.length,167,'unchanged 167 historical module markers');
const staticEdges=p=>importEdges(src(p),p).filter(x=>x.kind==='static').map(x=>x.to);
assert.deepEqual(staticEdges('data/conquest-data.js'),[
 'ui/overlays/celebrate.js','data/chars.js','data/fx.js'
],'only blocked celebrate predecessor plus pure data remain');
assert.deepEqual(staticEdges('logic/conquest.js'),[
 'data/conquest-data.js','logic/stat-counters.js','core/state.js','logic/economy.js',
 'data/looks.js','data/chars.js','logic/progress.js','core/rng.js'
],'logic already imported pure data, no novel static imports');
assert.ok(!data.includes('from \'../logic/conquest.js\';')&&!data.includes('import \'../logic/conquest.js\';'));
assert.ok(data.includes("import '../ui/overlays/celebrate.js'; // порядок исполнения"));
assert.ok(src('data/story.js').includes("import '../assets/models.js'; // порядок исполнения"));
assert.ok(data.includes('const CQ_BMOD = {')&&data.includes('const CQ_GF = [')&&
 data.includes('const CQ_MODS = {')&&data.includes('const cqMod = m => CQ_MODS[m] || CQ_BMOD[m];')&&
 data.includes('function cqFeats(s)'),'boss data, static modifiers, feats and tables remain pure data');

const oldSelectors=[
 "const cqK = () => ({ easy: 1, normal: 1.25, hard: 1.5 })[cq().diff] || 1;",
 "const cqModD = m => { const x = cqMod(m); return typeof x.d === 'function' ? x.d(cqK()) : x.d; };",
 "const cqScore = () => { const C = cq(); return C.stars + (C.pts || 0); };"
];
for(const old of oldSelectors){
 assert.ok(logic.includes(old),'selector body must be byte-identical and owned by logic');
 assert.ok(!data.includes(old),'stateful selector cannot stay in data');
 assert.equal(logic.split(old).length,2,'selector must be defined only once: '+old);
}
const exp=p=>{
 const match=/^export \{ ([^\n]+) \};$/m.exec(src(p));
 return match?match[1].split(', '):[];
};
const dataNames=exp('data/conquest-data.js'),logicNames=exp('logic/conquest.js');
for(const name of ['cqK','cqModD','cqScore']){
 assert.ok(!dataNames.includes(name),'no compatible reexport from data: '+name);
 assert.ok(logicNames.includes(name),'new logic owner must export: '+name);
}
assert.ok(dataNames.includes('cqMod')&&dataNames.includes('cqFeats'));
for(const name of ['cqBump','cqRfN','cqRfCost'])assert.ok(logicNames.includes(name));
const globals=SPLIT.flatMap(([,p])=>exp(p));
assert.equal(globals.length,898,'frozen old public global named export count');
for(const name of ['cqK','cqModD','cqScore'])
 assert.equal(globals.filter(x=>x===name).length,1,'migrated selector must still have exactly one global export: '+name);
assert.ok(ui.includes("cqTypeN, cqRfN, cqRfCost, cqBump, cqK, cqModD, cqScore } from '../../logic/conquest.js'")&&
 ui.includes("CQ_TROPHY, cqFeats, cqMod, cqRar } from '../../data/conquest-data.js'"),
 'all three UI named imports must use existing logic module edge');
assert.ok(logic.includes("CQ_SECT, CQ_STA, cqFeats, cqMod, cqRar } from '../data/conquest-data.js'"),
 'logic imports pure cqMod rather than its old external score selector');

const names=new Set(['cqK','cqModD','cqScore']),consumers=[];
function scan(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,e.name);
  if(e.isDirectory()){scan(full);continue;}
  if(!e.name.endsWith('.js'))continue;
  const from=path.relative('src',full).split(path.sep).join('/');
  const ast=acorn.parse(fs.readFileSync(full,'utf8'),{sourceType:'module',ecmaVersion:'latest'});
  for(const n of ast.body.filter(x=>x.type==='ImportDeclaration')){
   if(!n.source.value.startsWith('.'))continue;
   const to=path.posix.normalize(path.posix.join(path.posix.dirname(from),n.source.value));
   if(to!=='logic/conquest.js'&&to!=='data/conquest-data.js')continue;
   for(const sym of n.specifiers.filter(x=>x.type==='ImportSpecifier')){
    if(names.has(sym.imported.name))consumers.push(from+':'+to+':'+sym.imported.name);
   }
  }
 }
}
scan('src');
assert.deepEqual(consumers.sort(),[
 'ui/views/conq.js:logic/conquest.js:cqK',
 'ui/views/conq.js:logic/conquest.js:cqModD',
 'ui/views/conq.js:logic/conquest.js:cqScore'
].sort(),'all original path-specific importers migrated, no stale data imports');
assert.ok(!data.includes('cq().diff')&&!data.includes('cq().stars'),'data must not read runtime Conquest state');
console.log('ARCH-01C3b3 B1 structural PASS: 5→4 forbidden / 0 new, 173 modules, 999 imports, 167 original ESM markers, 898 unique globals, SCC 106/9, exact 3 old selectors, all named importers migrated');
