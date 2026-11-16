// ARCH-01B3: account rules are pure; legacy UI boot order is unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const root='src';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const rules=read('logic/account-rules.js');
const facade=read('logic/account.js');
const cine=read('logic/cinematic-preference.js');
const fx=read('ui/fx-text.js');
const wiring=read('ui/wiring.js');
const first=from=>importEdges(read(from),from);

const expectedRules=['core/state.js','logic/economy.js'];
assert.deepEqual(first('logic/account-rules.js').map(e=>e.to),expectedRules,
  'account rules must depend only on state and economy');
assert.deepEqual(first('logic/account.js').map(e=>e.to),['logic/account-rules.js'],
  'old account module must be pure export adapter');
assert.ok(!/from\s+['"][^'"]*ui\//.test(rules+facade),
  'account layer must never import UI');
assert.ok(facade.includes('const __accountLegacyAdapter = true;'),
  'compatibility adapter must preserve old module slot in unminified bundle');
assert.ok(rules.includes('const ACC_MAX = 85;') &&
  rules.includes('function accFill(s)') &&
  rules.includes("const accNeed = L => L < 40 ? 20 + 20 * (L - 1)"),
  'account formulas and save migration code must remain intact');
assert.deepEqual(first('logic/cinematic-preference.js'),[],
  'early cinematic setting must have no imports or runtime dependencies');
const functionSource=text=>text.match(/^const CINE_OFF = .*;$/m)?.[0];
assert.ok(functionSource(rules));
assert.equal(functionSource(cine),functionSource(rules),
  'CINE_OFF formula must agree in early and main account modules');

const fxEdges=first('ui/fx-text.js').map(e=>e.to);
assert.deepEqual(fxEdges,['ui/wiring.js','logic/account.js'],
  'UI must initialize wiring then old account adapter before effect text');
assert.ok(!wiring.includes("from '../logic/account.js'"),
  'metaFill must use pure account rules instead of the old cycle');
assert.ok(wiring.includes("from '../logic/account-rules.js'"),
  'metaFill must retain accFill import');

function jsFiles(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    return e.isDirectory()?jsFiles(p):e.isFile()&&e.name.endsWith('.js')?[p]:[];
  });
}
const imports=[];
for(const filename of jsFiles(root)){
  const from=path.relative(root,filename).split(path.sep).join('/');
  imports.push(...first(from));
}
const incoming=dest=>imports.filter(e=>e.to===dest&&e.kind==='static').map(e=>e.from).sort();
assert.deepEqual(incoming('logic/account.js'),['ui/fx-text.js'],
  'no early importer may trigger the account adapter');
assert.deepEqual(incoming('logic/account-rules.js'),[
  'logic/account.js','logic/rewards.js','ui/events.js','ui/hero-card.js',
  'ui/overlays/levelup.js','ui/overlays/profile.js','ui/wiring.js',
].sort(), 'all named account consumers must use pure rules');
assert.deepEqual(incoming('logic/cinematic-preference.js'),[
  'render3d/scenes/arena.js','ui/overlays/battle-settings.js',
].sort(), 'early cinematic setting must be isolated from account');

const newModules=new Set(['logic/account-rules.js','logic/cinematic-preference.js','data/gear-cap.js','logic/journey-gates.js','data/campaign-energy.js','logic/campaign-gates.js','data/seeded-rng.js']);
assert.equal(SPLIT.length,166,'expected 159 original modules + 7 additive modules');
assert.equal(SPLIT[0][1],'data/gear-cap.js');
assert.equal(SPLIT[1][1],'logic/cinematic-preference.js',
  'the previously first module must retain its relative position');
const names=SPLIT.filter(([,name])=>!newModules.has(name)).map(([,name])=>name);
assert.equal(names.length,159,'no old module can disappear');
let hash=2166136261;
for(const c of names.join('\n'))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
assert.equal(hash.toString(16).padStart(8,'0'),'0fb6fa0c',
  'original 159 module order must be byte-identical to published v124');
assert.equal(SPLIT.findIndex(([,name])=>name==='logic/account-rules.js')+1,
  SPLIT.findIndex(([,name])=>name==='logic/rewards.js'),
  'pure account rules must precede first early consumer');

const graph=analyzeTree(process.cwd());
// The historical large SCC still exists through data → logic imports (ARCH-01C).
// Do not pretend that removing one forbidden direct edge removes the whole SCC.
assert.equal(graph.cycles.length,2,
  'ARCH-01B3 must not introduce any new cyclic component');
assert.ok(!graph.cyclicalEdges.some(e=>e.from==='logic/account.js' && e.to.startsWith('ui/')),
  'account adapter must have no forbidden outgoing edge to UI');
assert.equal(graph.unresolved.length,0,'no unresolved local imports');
console.log('ARCH-01B3 account bootstrap: PASS; legacy 159 order locked, no account UI edge');
