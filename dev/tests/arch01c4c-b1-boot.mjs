// ARCH-01C4c B1: real bundled PWA and standalone HTML cold/warm bootstrap VM gate.
// Called once per generated HTML by tests/run.mjs, alongside immutable golden suites.
import assert from 'node:assert/strict';
import { loadGame } from './lib/load.mjs';
const html = process.argv[2] || 'dist/pwa/index.html';
const expression = 'JSON.stringify({' +
  'gear:MAX_GEAR,cine:CINE_OFF(),looks:LOOK,skin:SKINS[0],ol:OL,fem:[...FEM].sort(),' +
  'hash:ghash("arrakis"),sigil:sigil("atr",12,12,"#fff"),' +
  'boss:CH.worm===WORM,raid:RAID_TIERS.map(t=>t.hp),' +
  'api:[typeof aiPlan,typeof computeIntents,typeof createBattle,typeof unitStats,typeof newSave],' +
  'saveKeys:Object.keys(newSave()).sort()' +
  '})';
function snapshot(seed) {
  const game = loadGame(html,{seed});
  const run = x => game.run(x);
  const first = JSON.parse(run(expression));
  const warm = JSON.parse(run(expression));
  assert.deepEqual(warm,first,'warm VM must preserve AI/graphics/save/boss initialization');
  assert.equal(first.gear,13,'original equipment cap');
  assert.equal(typeof first.cine,'boolean','cinematic preference is initialized before AI');
  assert.equal(first.boss,true,'Shai-Hulud remains registered by identity');
  assert.deepEqual(first.raid,[150000,450000,1400000],'three historical raid tiers');
  assert.deepEqual(first.api,['function','function','function','function','function'],
    'AI, intents, combat engine, stats and saves available after cold boot');
  assert.ok(Object.keys(first.looks).length>=6);
  assert.ok(first.saveKeys.length>10,'save schema must remain populated');
  assert.equal(typeof first.hash,'number');
  assert.ok(first.sigil.includes('<path'),'original heraldry SVG generation remains available');
  return first;
}
for(const seed of [77,101]) {
  const cold=snapshot(seed);
  assert.deepEqual(snapshot(seed),cold,'second independent cold boot must reproduce the same initialization');
}
console.log('ARCH-01C4c B1 real cold/warm PASS: '+html+'; seeds 77/101, exact graphics/AI/raid/save signature across reboots');
