// ARCH-01C4a Stage B1: owner-approved narrow boss→skills predecessor removal.
// Production source graph only. Reconstruct old one-edge graph in memory to
// prove that precisely the historically diagnosed SCC 9→6 shrinks, with no
// module repositioning, names, values, source order or other debt modified.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const read = p => fs.readFileSync('src/'+p, 'utf8');
const boss = read('data/boss.js');
const stats = read('logic/battle/stats.js');
const skills = read('logic/battle/skills.js');
const looks = read('data/looks.js');
const ai = read('logic/battle/ai.js');
const frozen = JSON.parse(fs.readFileSync('tools/arch-import-baseline.json','utf8')).legacy;
assert.deepEqual(frozen,[
 'data/conquest-data.js -> ui/overlays/celebrate.js',
 'data/looks.js -> logic/battle/ai.js',
 'data/story.js -> assets/models.js'
], 'remove only the proven boss→skills reverse dependency, preserve three known order-critical debts');
const edges = p => importEdges(read(p),p).filter(e=>e.kind==='static').map(e=>e.to);
assert.deepEqual(edges('data/boss.js'), ['data/chars.js'],
  'no data→logic predecessor nor new data import; original named CH dependency retained');
assert.deepEqual(edges('logic/battle/stats.js'),[
 'logic/battle/skills.js','data/boss.js','data/fx.js','data/gear-bonuses.js'
], 'move only existing skills import ahead of boss, never introduce new import edges');
assert.ok(boss.includes("import { CH } from './chars.js';"));
assert.ok(!boss.includes("import '../logic/battle/skills.js';"));
assert.ok(stats.includes("import { SK_KEYS, autoSk } from './skills.js';\nimport { STAR_MULT } from '../../data/boss.js';"));
assert.ok(skills.includes("import { ev, log } from './engine.js';"));
assert.ok(boss.includes("CH.worm = WORM;"), 'Shai-Hulud registration side effect must remain');
assert.ok(boss.includes("const WORM = { id: 'worm'"));
assert.ok(boss.includes("const RAID_TIERS = ["));
assert.ok(boss.includes("const STAR_MULT = [0, 1, 1.12, 1.25, 1.4, 1.6, 1.8, 2.05];"));
assert.ok(boss.includes("export { WORM, PHASES, MOVES, RAID_TIERS, phaseOf, STAR_MULT };"));
assert.ok(stats.includes('function unitStats(def, p) {'));
assert.ok(stats.includes('function unitPower(def, p) {'));
assert.ok(stats.includes('export { unitStats, unitPower, setGearStatProvider };'));
assert.ok(looks.includes("import '../logic/battle/ai.js'; // порядок исполнения"),'C4a looks→ai remains NO-GO; do not touch');
assert.ok(ai.includes("if (typeof module !== 'undefined') module.exports"),'AI CJS adapter retained');
assert.ok(read('data/conquest-data.js').includes("import '../ui/overlays/celebrate.js'; // порядок исполнения"),'C3b0 blocked predecessor kept');
assert.ok(read('data/story.js').includes("import '../assets/models.js'; // порядок исполнения"),'C2d blocked predecessor kept');
assert.ok(!read('data/conquest-data.js').includes("from '../logic/conquest.js'"),'no Conquest regression');

const graph=analyzeTree(process.cwd());
assert.equal(graph.modules,173);
assert.equal(graph.staticImports,998,'exactly one predecessor edge removed from 999');
assert.equal(graph.unresolved.length,0,'no unresolved import');
assert.deepEqual(graph.cycles.map(c=>c.length),[106,6],
 'C4a intentionally reduced only the legacy 9-member battle SCC to six');
assert.equal(SPLIT.length,167);
const names=SPLIT.map(([,p])=>p);
assert.equal(new Set(names).size,167,'every historical ESM marker unique');
assert.ok(names.indexOf('logic/battle/skills.js')<names.indexOf('data/boss.js'));
assert.ok(names.indexOf('logic/battle/ai.js')<names.indexOf('data/looks.js'));
assert.ok(names.indexOf('data/boss.js')<names.indexOf('logic/battle/stats.js'));

const files=new Map();
function visit(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,item.name);
  if(item.isDirectory())visit(full);
  else if(item.isFile()&&item.name.endsWith('.js')){
   const p=path.relative('src',full).split(path.sep).join('/');
   files.set(p,fs.readFileSync(full,'utf8'));
  }
 }
}
visit('src');
assert.equal(files.size,173);
const g=Object.fromEntries([...files.keys()].sort().map(p=>[p,[]]));
for(const [p,s] of files)
 for(const e of importEdges(s,p).filter(e=>e.kind==='static')){
  assert.ok(g[e.to],'all edges resolve to real production module: '+p+' -> '+e.to);
  g[p].push(e.to);
 }
assert.deepEqual(stronglyConnected(g),graph.cycles,'independent imported graph matches AST read');
assert.ok(!g['data/boss.js'].includes('logic/battle/skills.js'));
const oldGraph=Object.fromEntries(Object.entries(g).map(([p,v])=>[p,[...v]]));
oldGraph['data/boss.js'].unshift('logic/battle/skills.js');
const historical=stronglyConnected(oldGraph);
assert.deepEqual(historical.map(c=>c.length),[106,9],
 'one restored historical predecessor must recreate v132 SCC, no other graph changes');
assert.deepEqual(graph.cycles[0],historical[0],'full 106-member Conquest SCC must be byte-for-byte unchanged');
assert.ok(graph.cycles[1].every(p=>historical[1].includes(p)),
 'the 6 remaining battle SCC members must be a subset of the old nine');
const exactlySeparated=historical[1].filter(p=>!graph.cycles[1].includes(p));
assert.equal(exactlySeparated.length,3,'exactly three modules leave the nine-member battle SCC');
assert.ok(historical[1].includes('data/boss.js'),'old boss member belonged to historical battle SCC');
const symbols=SPLIT.flatMap(([,p])=>{
 const m=/^export \{ ([^\n]+) \};$/m.exec(read(p));
 return m?m[1].split(', '):[];
});
assert.equal(symbols.length,898,'all globally available named exports are frozen');
for(const p of ['WORM','CH','STAR_MULT','unitStats','unitPower','SK_KEYS','autoSk'])
 assert.ok(symbols.includes(p),'old named global remains exported: '+p);
console.log('ARCH-01C4a B1 structural PASS: legacy 4→3 / 0 new, 173 modules, 998 imports, 167 ESM markers, 898 named exports, 106 SCC exactly unchanged, battle SCC 9→6, separated modules '+JSON.stringify(exactlySeparated));
