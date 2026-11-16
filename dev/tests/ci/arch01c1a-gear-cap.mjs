// ARCH-01C1a: regression guards for the first one-edge data-layer cleanup.
// No game source, save, or golden fixture changes are required by this test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MAX_GEAR } from '../../src/data/gear-cap.js';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const read = f => fs.readFileSync('src/' + f, 'utf8');
const edges = f => importEdges(read(f), f).map(e => e.to);
const legacy = JSON.parse(fs.readFileSync('tools/arch-import-baseline.json', 'utf8')).legacy;

assert.equal(MAX_GEAR, 13, 'gear XIII cap must not change');
assert.deepEqual(edges('data/gear-cap.js'), [], 'cap belongs to pure data only');
assert.ok(edges('data/journeys.js').includes('data/gear-cap.js'),
  'journey requirements must use the data cap');
assert.ok(!edges('data/journeys.js').includes('logic/economy.js'),
  'removed reverse import must remain absent');
assert.ok(edges('logic/economy.js').includes('data/gear-cap.js'),
  'economy must use the same gear cap as journeys');
assert.ok(edges('logic/economy.js').includes('data/journeys.js'),
  'the pre-existing economy predecessor must stay in place');
assert.ok(/^export \{[^\n]*\bMAX_GEAR\b[^\n]*\};$/m.test(read('logic/economy.js')),
  'the old economy MAX_GEAR export is part of the public API');
assert.ok(!/\bMAX_GEAR\s*=\s*13\b/.test(read('logic/economy.js')),
  'MAX_GEAR must have a single source of truth');
// C1b relocates the gate owner to logic, but these C1a economic prerequisites stay strict.
const gateOwner = read('logic/journey-gates.js');
assert.ok(gateOwner.includes('p.stars >= 7 && p.gear >= MAX_GEAR'),
  'Muad-Dib 7-star and gear XIII gate must not change');
assert.ok(gateOwner.includes('!!prog(k).stars ||'),
  'already unlocked legends must stay grandfathered');
assert.equal(legacy.length, 13, 'ARCH-01C2a extends C1b reduction, exact new baseline is 13');
assert.ok(!legacy.includes('data/journeys.js -> logic/economy.js'),
  'removed reverse edge cannot stay in baseline');
const slot = SPLIT.filter(([,name]) => name === 'data/gear-cap.js');
assert.equal(slot.length, 1, 'new data module must be registered exactly once');
assert.equal(SPLIT[1][1], 'data/gear-cap.js',
  'actual esbuild placement of the new pure module must stay at index zero');
assert.equal(SPLIT.length, 164, '161 original modules plus gear cap, journey rules and campaign energy');
const graph = analyzeTree(process.cwd());
assert.equal(graph.modules, 170, 'gear cap, journey gates and campaign energy are the three additive modules');
assert.equal(graph.unresolved.length, 0, 'no broken relative imports');
assert.ok(!graph.cycles.some(component => component.includes('data/gear-cap.js')),
  'the pure cap must not introduce an ESM cycle');
assert.ok(graph.cycles.length <= 2, 'no new cyclic ESM components allowed');
console.log('ARCH-01C1a gear cap: PASS; MAX_GEAR 13, baseline 16, old API and 161 module-order contract guarded');
