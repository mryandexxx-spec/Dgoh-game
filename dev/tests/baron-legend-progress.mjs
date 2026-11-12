import assert from 'node:assert/strict';
import { baronLegendProgress, baronLegendWin, commitBaronLegendWin } from '../src/logic/baron-legend-progress.js';

// Only synthetic fixtures; no claims about approved characters or rewards.
const ids = ['baron', 'margot', 'yue', 'feyd', 'rabban', 'piter', 'trooper', 'shaddam', 'fenring', 'mohiam'];
const config = {
  requirements: ids.map(id => ({ id, stars: 7, gear: 13, relic: id === 'baron' ? 7 : 3 })),
  stages: Array.from({ length: 5 }, () => ({ allies: ids.slice(0, 5), enemies: ids.slice(5) })),
};
const roster = Object.fromEntries(config.requirements.map(r => [r.id, { stars: r.stars, gear: r.gear, relic: r.relic }]));
const save = { journeys: { muaddib: { 0: true, 1: true } } };
assert.deepEqual(baronLegendProgress(save), {});
assert.deepEqual(baronLegendWin(config, save, roster, 2), { ok: false, reason: 'locked' });
const first = baronLegendWin(config, save, roster, 0);
assert.equal(first.firstClear, true);
assert.deepEqual(save.journeys.muaddib, { 0: true, 1: true });
assert.equal(commitBaronLegendWin(save, first), true);
assert.equal(commitBaronLegendWin(save, first), false);
assert.equal(baronLegendWin(config, save, roster, 0).firstClear, false);
assert.equal(baronLegendWin(config, save, roster, 1).firstClear, true);
assert.equal(commitBaronLegendWin(save, baronLegendWin(config, save, roster, 1)), true);
assert.deepEqual(baronLegendProgress(save), { 0: true, 1: true });
assert.deepEqual(save.journeys.muaddib, { 0: true, 1: true });
const badRoster = structuredClone(roster);
badRoster.baron.relic = 6;
assert.deepEqual(baronLegendWin(config, { journeys: {} }, badRoster, 0), { ok: false, reason: 'locked' });
assert.equal(baronLegendWin(config, { journeys: {} }, badRoster, 0, true).firstClear, true);
assert.deepEqual(baronLegendWin({ requirements: [], stages: [] }, save, roster, 0), { ok: false, reason: 'config' });
assert.equal(commitBaronLegendWin(save, { ok: true, firstClear: true, stageIndex: 4 }), false);
assert.equal(commitBaronLegendWin(save, { ok: true, firstClear: true, stageIndex: -1 }), false);
assert.equal(commitBaronLegendWin(save, { ok: true, firstClear: true, stageIndex: 0, progress: { 0: true, 4: true } }), false);
assert.deepEqual(baronLegendProgress(save), { 0: true, 1: true });
console.log('BH1 stage results and replay guards: PASS');
