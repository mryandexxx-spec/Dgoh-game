import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CH, CHARS } from '../src/data/chars.js';
import { BARON_LEGEND_KIT } from '../src/data/baron-legend-kit.js';
import { STAGED_HERO_IDS, defaultStagedHero, stageBaronRoster, baronRosterGate, baronLegendPreview } from '../src/logic/baron-roster-integration.js';
import { BARON_APPROVED_STAGES } from '../src/data/baron-legend-approved.js';

assert.deepEqual(STAGED_HERO_IDS, ['baron_legend','margot','yue']);
assert.equal(CH.baron_legend, undefined, 'Unapproved legendary art must not appear in live roster');
assert.equal(CH.margot.id,'margot','Approved normal Margot kit is present');
assert.equal(CH.yue.id,'yue','Approved normal Yue kit is present');
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
// BH8: card/view-model is a read-only staging projection, never a public unlock.
const beforePreview = structuredClone(allReady);
const preview = baronLegendPreview(allReady);
assert.deepEqual(allReady, beforePreview, 'Preview must not mutate a save');
assert.equal(preview.id, 'baron_legend');
assert.equal(preview.public, false);
assert.equal(preview.playable, false);
assert.equal(preview.eventPlayable, false);
assert.equal(preview.portraitApproved, false);
assert.equal(preview.modelAsset, 'models/baron-legend-mobile.dgm');
assert.deepEqual(preview.actions.map(x=>x.slot), ['basic','special','ult','gl']);
assert.deepEqual(preview.actions.map(x=>x.name),
  ['Приказ Барона','Власть через страх','Глаза императора','Падение Атрейдесов']);
assert.deepEqual(preview.actions.map(x=>x.initialCooldown), [0,3,4,0]);
assert.equal(preview.actions[3].glKind, 'fall-of-atreides');
assert.equal(preview.requirements.completed, 10);
assert.equal(preview.requirements.ready, true);
assert.equal(preview.passive, 'Алчность');
assert.equal(preview.leader, 'Дом Харконненов');
assert.equal(CH.baron_legend, undefined, 'Preview must not publish the hero');
assert.equal(CH.margot.id,'margot');
assert.equal(CH.yue.id,'yue');
assert.deepEqual(baronLegendPreview({}).progress,
  {stars:0,shards:0,lvl:1,gear:1,relic:0});
// Ensure the actual shared hero card/scene, not a parallel mocked layout, is used.
const cardSource = readFileSync(new URL('../src/ui/hero-card.js', import.meta.url), 'utf8');
const stageSource = readFileSync(new URL('../src/render3d/scenes/hero.js', import.meta.url), 'utf8');
assert.match(cardSource, /function openDetail\(id, stagedPreview = null\)/);
assert.match(cardSource, /const d = stagedPreview \? \{ \.\.\.stagedPreview\.def, side: 'dark' \} : CH\[id\]/);
assert.match(cardSource, /const p = stagedPreview \? \{ \.\.\.stagedPreview\.progress, stars: 0, shards: 0 \} : prog\(id\)/);
assert.match(cardSource, /mountHeroStage\(id, near, stagedPreview \? \{ def: d, progress: p \} : null\)/);
assert.match(stageSource, /const p = staged\?\.progress \|\| prog\(id\), d = staged\?\.def \|\| CH\[id\]/);
assert.match(cardSource, /if \(!stagedPreview && !CH\[id\]\) return/);
assert.match(cardSource, /if \(!button\.matches\('\[data-close\],\[data-dback\],\[data-hcstat\]'\)\) button\.disabled = true/);
console.log('BH8 shared hero card/3D scene, locked staging entry and mutation guards: PASS');

console.log('BH8 read-only staged roster preview, 4 HUD slots and no public hero: PASS');

console.log('BH9.7 regular Margot/Yue roster plus separate staged Baron preview and safe event gate: PASS');
