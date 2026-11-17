// ARCH-01C2b: production-source regression for a single state → logic boundary.
// The whole 210-mission rule is exercised separately on real PWA and artifact bundles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const read = name => fs.readFileSync('src/' + name, 'utf8');
const imports = name => importEdges(read(name), name).map(e => e.to);
const baseline = JSON.parse(fs.readFileSync('tools/arch-import-baseline.json', 'utf8')).legacy;
const campaigns = read('data/campaigns.js'), gates = read('logic/campaign-gates.js');
const boot = read('core/boot.js');

assert.equal(baseline.length, 4, 'ARCH-01C3b3 additionally removes Conquest→logic/conquest; earlier invariants unchanged');
assert.ok(!baseline.includes('data/campaigns.js -> core/state.js'),
  'campaign data may never import live state again');
assert.ok(!baseline.includes('data/campaigns.js -> core/rng.js') &&
  baseline.includes('data/story.js -> assets/models.js'),
  'C2c/C2d are out of scope; preserve both their existing predecessor edges');
assert.ok(!imports('data/campaigns.js').includes('core/state.js'),
  'data cannot hold a direct reverse state dependency');
assert.ok(!imports('data/campaigns.js').includes('core/rng.js') &&
  imports('data/campaigns.js').includes('data/seeded-rng.js') &&
  imports('data/campaigns.js').includes('data/campaign-energy.js'),
  'seeded NODES and pure campaign prices stay connected');
assert.deepEqual(imports('logic/campaign-gates.js'),
  ['data/campaigns.js', 'core/state.js'], 'logic owns the state-dependent selector');

assert.ok(campaigns.includes('function bindNodeOpenRuntime(rule)') &&
  campaigns.includes("if (nodeOpenRuntime) throw new Error('Campaign nodeOpen runtime already initialized');"),
  'old callable API must reject double registration');
assert.ok(campaigns.includes("if (!nodeOpenRuntime) throw new Error('Campaign nodeOpen runtime not initialized');"),
  'an unregistered adapter must not silently open a mission');
assert.ok(campaigns.includes('return nodeOpenRuntime(i);'),
  'old exported nodeOpen must delegate to the logic owner');
assert.ok(campaigns.includes('export { bindNodeOpenRuntime, S0, ') &&
  campaigns.includes('chapNodes, nodeOpen, nodeTitle, nodeEn, nodeCost'),
  'legacy named exports must stay available to all existing UI consumers');

const oldRule = "function nodeOpenRule(i) { const n = NODES[i], prev = i - 1; return (prev < 0 || NODES[prev].camp !== n.camp) ? true : !!S.cleared[prev]; }";
assert.ok(gates.includes(oldRule),
  'rule formula must remain exactly byte-for-byte identical to v127');
assert.ok(gates.includes('bindNodeOpenRuntime(nodeOpenRule);'),
  'logic module must register the untouched rule exactly once');
assert.ok(!gates.includes('const result = nodeOpenRule('),
  'never eagerly evaluate a save-dependent unlock during ESM init');
const pre = "import '../logic/journey-gates.js';", now = "import '../logic/campaign-gates.js';";
assert.ok(boot.indexOf(pre) >= 0 && boot.indexOf(now) > boot.indexOf(pre) &&
  boot.indexOf(now) < boot.indexOf('function start('),
  'composition root must wire campaign gate after journey gate, before start');
assert.ok(read('ui/views/camp.js').includes('nodeCost, nodeEn, nodeOpen } from') &&
  read('ui/views/campaign20.js').includes('nodeOpen, nodeCost, nodeEn } from') &&
  read('ui/events.js').includes('NODES, campNodes, nodeOpen } from') &&
  read('ui/battle/battle-ui.js').includes('nodeOpen, nodeTitle } from'),
  'existing UI call sites remain on legacy data interface, without rewiring the camp');

assert.equal(SPLIT.filter(([, name]) => name === 'logic/campaign-gates.js').length, 1,
  'one new logic module, no duplicate ESM registration');
assert.equal(SPLIT.length, 167, '165 original C2b markers plus exactly one pure RNG module');
const graph = analyzeTree(process.cwd());
assert.equal(graph.modules, 173, 'one RNG data module added on top of merged C2b 171');
assert.equal(graph.unresolved.length, 0);
assert.ok(graph.cycles.length <= 2, 'new runtime owner must not create another ESM SCC');
console.log('ARCH-01C2b campaign state boundary: PASS; 12 legacy imports, unchanged open formula and UI APIs');
