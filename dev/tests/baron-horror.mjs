import assert from 'node:assert/strict';
import { FX } from '../src/data/fx.js';
import { horrorPenalty, horrorDamageFactor, horrorSpeedFactor } from '../src/logic/battle/horror.js';
import { nextActor, previewOrder } from '../src/logic/battle/engine.js';
assert.equal(FX.horror.bad, true);
assert.equal(FX.horror.once, undefined);
assert.equal(FX.fear.once, true); // existing Fear retains one-turn skip semantics
const clean = { fx: {} }, horror = { fx: { horror: 2 } };
assert.equal(horrorPenalty(clean), 0);
assert.equal(horrorPenalty(horror), .2);
assert.equal(horrorDamageFactor(horror), .8);
assert.equal(horrorSpeedFactor(horror), .8);
assert.equal(horrorPenalty({ ...horror, horrorStrength: 2 }), .4);
assert.equal(horrorSpeedFactor({ ...horror, horrorStrength: 2 }), .6);
assert.equal(horrorDamageFactor(horror, 0), 1);
// Deterministic test of scheduler and preview: Horror changes effective TM gain, not base stats.
const a = { uid: 'a', alive: true, spd: 100, tm: 0, fx: {horror:2} };
const b = { uid: 'b', alive: true, spd: 90, tm: 0, fx: {} };
const B = {units:[a,b]};
assert.equal(previewOrder(B,1)[0], b);
assert.equal(a.tm, 0); // previews must not mutate live combatants
assert.equal(nextActor(B), b);
assert.equal(b.tm, 1000);
assert.ok(a.tm > 0 && a.tm < 1000);
console.log('BH2 Horror semantics, damage and turn meter: PASS');
