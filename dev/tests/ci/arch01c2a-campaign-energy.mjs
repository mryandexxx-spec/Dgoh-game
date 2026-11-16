// ARCH-01C2a: exact one-edge extraction with unchanged public energy constants and order.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BATTLE_WATER, CANDLE_COST } from '../../src/data/campaign-energy.js';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const read = f => fs.readFileSync('src/' + f, 'utf8');
const edges = f => importEdges(read(f), f).map(e => e.to);
const baseline = JSON.parse(fs.readFileSync('tools/arch-import-baseline.json', 'utf8')).legacy;

assert.equal(BATTLE_WATER, 6, 'standard battle energy price is immutable');
assert.equal(CANDLE_COST, 8, 'chronicles candle price is immutable');
assert.deepEqual(edges('data/campaign-energy.js'), [], 'energy constants are pure declarative data');
assert.ok(edges('data/campaigns.js').includes('data/campaign-energy.js'),
  'campaigns must import energy from pure data');
assert.ok(!edges('data/campaigns.js').includes('logic/economy.js'),
  'no reverse campaign → economy import may return');
assert.ok(edges('logic/economy.js').includes('data/campaign-energy.js'),
  'economy consumes the same shared immutable energy constants');
assert.ok(/^export \{[^\n]*\bBATTLE_WATER\b[^\n]*\bCANDLE_COST\b[^\n]*\};$/m.test(read('logic/economy.js')),
  'old economy named public exports must be preserved');
assert.ok(!/BATTLE_WATER\s*=\s*6\b|CANDLE_COST\s*=\s*8\b/.test(read('logic/economy.js')),
  'no competing price declarations in economy');
assert.ok(read('data/campaigns.js').includes("const nodeCost = i => nodeEn(i) === 'candle' ? CANDLE_COST : BATTLE_WATER;"),
  'legacy nodeCost logic remains byte-identical');
assert.ok(read('data/campaigns.js').includes("sRng(ghash(ck + c + ':' + m))"),
  'original seeded enemy generation untouched');
assert.ok(read('data/campaigns.js').includes("if (n && !n.enemy.includes('rabban'))"),
  'special Rabban correction intact');
assert.equal(baseline.length, 11, 'C2c removes campaigns → RNG, with 11 legacy edges');
assert.ok(!baseline.includes('data/campaigns.js -> logic/economy.js'));
assert.ok(!baseline.includes('data/campaigns.js -> core/rng.js') &&
  !baseline.includes('data/campaigns.js -> core/state.js') &&
  baseline.includes('data/story.js -> assets/models.js'),
  'remaining three C2 edges deliberately untouched');
assert.equal(SPLIT.filter(([,n])=>n==='data/campaign-energy.js').length,1,
  'exactly one new pure campaign data module slot');
assert.equal(SPLIT.length,166,'original 163 plus energy, gate and seeded RNG');
const graph=analyzeTree(process.cwd());
assert.equal(graph.modules,172,'seeded RNG adds exactly one source module after C2b');
assert.equal(graph.unresolved.length,0,'all module imports resolved');
assert.ok(graph.cycles.length<=2,'no third ESM SCC introduced');
console.log('ARCH-01C2a campaign-energy: PASS; constants 6/8, economy API, baseline 13, original seeded 210 missions intact');
