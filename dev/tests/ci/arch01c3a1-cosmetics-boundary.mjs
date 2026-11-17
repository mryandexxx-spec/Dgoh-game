// ARCH-01C3a1: mandatory AST contract for cosmetic entitlement state boundary.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const read=p=>fs.readFileSync('src/'+p,'utf8');
const imports=p=>importEdges(read(p),p).map(x=>x.to);
const legacy=JSON.parse(fs.readFileSync('tools/arch-import-baseline.json','utf8')).legacy;
const cosmetics=read('data/cosmetics.js'),logic=read('logic/cosmetics-unlocks.js');
const wiring=read('ui/wiring.js'),profile=read('ui/overlays/profile.js');

assert.equal(legacy.length,6,'C3a3 additionally removes the cosmetics→stats order-only edge');
for(const e of ['data/cosmetics.js -> core/state.js','data/cosmetics.js -> logic/progress.js',
  'data/cosmetics.js -> logic/stats.js']){
  assert.ok(!legacy.includes(e),'removed edge must not remain in legacy baseline');
}
assert.ok(legacy.includes('data/story.js -> assets/models.js'),
  'blocked C2d model bootstrap predecessor must remain untouched');
assert.deepEqual(imports('data/cosmetics.js'),['data/chars.js'],
  'C3a3 makes cosmetic data depend only on data; stats order lives in feats UI');
assert.ok(imports('logic/cosmetics-unlocks.js').includes('core/state.js') &&
  imports('logic/cosmetics-unlocks.js').includes('logic/progress.js') &&
  imports('logic/cosmetics-unlocks.js').includes('data/cosmetics.js'),
  'real live eligibility belongs to logic');
const oldRule="const unlockedRule = (kind, id) => FREE[kind].includes(id) || !!S.unlocks[kind][id] || (kind === 'ava' && id.startsWith('hero:') && CH[id.slice(5)] && prog(id.slice(5)).stars > 0);";
assert.ok(logic.includes(oldRule),'original short-circuit formula must be byte-identical');
assert.ok(logic.includes('bindCosmeticUnlockRule(unlockedRule);'),
  'registration must bind the function reference only, not evaluate S or prog');
assert.ok(cosmetics.includes('function bindCosmeticUnlockRule(rule)') &&
  cosmetics.includes("if (cosmeticUnlockRule) throw new Error('Cosmetics unlocked rule already initialized');"),
  'duplicate registration must be rejected');
assert.ok(cosmetics.includes("if (!cosmeticUnlockRule) throw new Error('Cosmetics unlocked rule not initialized');") &&
  cosmetics.includes('return cosmeticUnlockRule(kind, id);'),
  'unbound calls must fail, not grant anything');
assert.ok(cosmetics.includes('export { EMBLEMS, FRAMES, TITLES, FREE, unlocked, bindCosmeticUnlockRule };'),
  'all old named public cosmetic exports retained');
assert.ok(profile.includes("if (typeof WORM_IMG !== 'undefined')") &&
  profile.includes('EMBLEMS.worm.svg = ') && profile.includes('WORM_IMG.ava') &&
  profile.includes("EMBLEMS.worm.bg = ['#a8784a', '#2a1608']"),
  'same exact worm SVG URL/background now belongs to UI, not data');
const dataImport="import { unlocked } from '../data/cosmetics.js';";
const ruleImport="import '../logic/cosmetics-unlocks.js';";
assert.ok(wiring.includes(dataImport) && wiring.includes(ruleImport) &&
  wiring.indexOf(ruleImport)>wiring.indexOf(dataImport),
  'late UI wiring must register cosmetics after the original data import');
assert.ok(profile.includes("import { EMBLEMS, FRAMES, TITLES, unlocked } from '../../data/cosmetics.js';"),
  'existing profile must use unchanged named data API');
assert.ok(!read('core/boot.js').includes("import '../logic/cosmetics-unlocks.js'"),
  'too-early core/boot registration moves five historical ESM modules');
assert.equal(SPLIT.length,167,'166 original markers plus exactly one additive cosmetic logic module');
assert.equal(SPLIT.filter(([,m])=>m==='logic/cosmetics-unlocks.js').length,1);
const graph=analyzeTree(process.cwd());
assert.equal(graph.modules,173,'only one new source module added');
assert.equal(graph.unresolved.length,0);
assert.ok(graph.cycles.length<=2,'cannot introduce a third ESM SCC');
console.log('ARCH-01C3a1 cosmetic boundary: PASS; 6 legacy, old API, SVG retained by UI');
