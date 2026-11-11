// Run with: node dev/tests/baron-legend-contract.mjs (from repository root)
import assert from 'node:assert/strict';
import { validateBaronLegendConfig, baronRequirementsStatus, baronStageAvailable } from '../src/logic/baron-legend-contract.js';

// Synthetic fixtures only. These are NOT the approved event requirements or stage rosters.
const ids = ['baron', 'margot', 'yue', 'feyd', 'rabban', 'piter', 'trooper', 'shaddam', 'fenring', 'mohiam'];
const config = {
  requirements: ids.map(id => ({ id, stars: 7, gear: 13, relic: id === 'baron' ? 7 : 3 })),
  stages: Array.from({ length: 5 }, () => ({ allies: ids.slice(0, 5), enemies: ids.slice(5) })),
};
const roster = Object.fromEntries(config.requirements.map(r => [r.id, { stars: r.stars, gear: r.gear, relic: r.relic }]));
assert.deepEqual(validateBaronLegendConfig(config), []);
assert.deepEqual(baronRequirementsStatus(config.requirements, roster), { ready: true, completed: 10, total: 10, missing: [] });
assert.equal(baronStageAvailable(config, roster, {}, 0), true);
assert.equal(baronStageAvailable(config, roster, {}, 1), false);
assert.equal(baronStageAvailable(config, roster, { 0: true }, 1), true);
assert.equal(baronStageAvailable(config, roster, { 0: true }, 2), false);
assert.equal(baronStageAvailable(config, roster, { 0: true, 1: true, 2: true, 3: true }, 4), true);
assert.equal(baronStageAvailable(config, roster, {}, 5), false);
const incomplete = structuredClone(roster);
incomplete.baron.relic = 6;
assert.equal(baronRequirementsStatus(config.requirements, incomplete).ready, false);
assert.deepEqual(baronRequirementsStatus(config.requirements, incomplete).missing, ['baron']);
assert.equal(baronStageAvailable(config, incomplete, {}, 0), false);
assert.equal(baronStageAvailable(config, incomplete, {}, 0, true), true);
assert.notDeepEqual(validateBaronLegendConfig({ ...config, requirements: config.requirements.slice(1) }), []);
const invalid = structuredClone(config);
invalid.stages[2].allies[4] = invalid.stages[2].allies[0];
assert.ok(validateBaronLegendConfig(invalid).some(e => e.includes('five distinct')));
console.log('BH1 Baron contract: PASS');
