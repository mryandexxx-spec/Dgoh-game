import assert from 'node:assert/strict';
import { CH, CHARS } from '../src/data/chars.js';
import { BARON_LEGEND_KIT } from '../src/data/baron-legend-kit.js';
import { STAGED_HERO_IDS, defaultStagedHero, stageBaronRoster, baronRosterGate } from '../src/logic/baron-roster-integration.js';
import { BARON_APPROVED_STAGES } from '../src/data/baron-legend-approved.js';

assert.deepEqual(STAGED_HERO_IDS, ['baron_legend','margot','yue']);
assert.equal(CH.baron_legend, undefined, 'Unapproved legendary art must not appear in live roster');
assert.equal(CH.margot, undefined, 'Unapproved Margot kit must not appear in live roster');
assert.equal(CH.yue, undefined, 'Unapproved Yue kit must not appear in live roster');
assert.equal(CH.baron.id, 'baron');
assert.equal(CH.baron.legendary, undefined);
assert.equal(CH.muaddib.gl.kind, 'prophecy');
assert.deepEqual(CHARS.some(c => c.id === BARON_LEGEND_KIT.id), false);

const sample = { roster: { baron: { stars: 7, gear: 13, relic: 7, shards: 12 } }, journeys: { muaddib: {0:true} } };
const saved = structuredClone(sample);
assert.equal(stageBaronRoster(sample), sample);
assert.deepEqual(sample.roster.baron, saved.roster.baron);
assert.deepEqual(sample.journeys.muaddib, saved.journeys.muaddib);
for (const id of STAGED_HERO_IDS) {
  const hero = sample.roster[id];
  assert.deepEqual([hero.stars,hero.shards,hero.lvl,hero.gear],[0,0,1,1]);
  assert.equal(hero.sk.basic,1);
  assert.equal(hero.eq.length,6);
}
assert.deepEqual(sample.journeys.baron_legend, {});
const once = structuredClone(sample);
stageBaronRoster(sample);
assert.deepEqual(sample,once, 'Migration is idempotent');
// Preserve future players' legitimate data when separate event eventually ships.
sample.roster.margot.stars=3;sample.roster.margot.shards=41;
sample.journeys.baron_legend['0']=true;
stageBaronRoster(sample);
assert.deepEqual([sample.roster.margot.stars,sample.roster.margot.shards],[3,41]);
assert.equal(sample.journeys.baron_legend['0'],true);
const gate=baronRosterGate(sample);
assert.equal(gate.ready,false);
assert.equal(gate.total,10);
assert.equal(gate.completed,1);
assert.deepEqual(gate.futureLocked,['yue']);
assert.deepEqual(gate.availableStages.map(s=>s.allies), BARON_APPROVED_STAGES.map(s=>s.allies));
assert.ok(gate.availableStages.every(s => !s.readyForBattle && s.requiresEncounterDesign));
// A full roster does not bypass absent approved enemy/reward configurations.
for (const id of STAGED_HERO_IDS) assert.equal(defaultStagedHero().stars,0);
const allReady = structuredClone(sample);
for (const r of (await import('../src/data/baron-legend-approved.js')).BARON_APPROVED_REQUIREMENTS) {
  allReady.roster[r.id]={stars:7,gear:13,relic:r.relic,shards:0};
}
assert.equal(baronRosterGate(allReady).ready,true);
assert.ok(baronRosterGate(allReady).availableStages.every(s=>!s.readyForBattle));
console.log('BH4 staged roster migration, locked future heroes and safe event gate: PASS');
