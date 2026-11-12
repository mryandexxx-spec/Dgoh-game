import assert from 'node:assert/strict';
import { BARON_APPROVED_REQUIREMENTS as req, BARON_APPROVED_STAGES as stages, validateBaronApprovedData as validate } from '../src/data/baron-legend-approved.js';
import { baronRequirementsStatus } from '../src/logic/baron-legend-contract.js';
assert.deepEqual(validate(), []);
assert.equal(req.length, 10);
assert.equal(stages.length, 5);
assert.deepEqual(Object.fromEntries(req.map(r => [r.id, r.relic])), {
  baron: 7, feyd: 5, rabban: 5, piter: 5, margot: 4,
  fenring: 4, shaddam: 4, mohiam: 4, yue: 3, legion: 2,
});
assert.deepEqual(stages.map(s => s.allies), [
  ['baron','piter','feyd','rabban','margot'],
  ['shaddam','fenring','margot','mohiam','legion'],
  ['yue','piter','baron','mohiam','fenring'],
  ['baron','feyd','rabban','piter','legion'],
  ['baron','feyd','rabban','shaddam','fenring'],
]);
const roster = Object.fromEntries(req.map(r => [r.id, {stars:7,gear:13,relic:r.relic}]));
assert.equal(baronRequirementsStatus(req, roster).ready, true);
roster.yue.stars = 0;
assert.equal(baronRequirementsStatus(req, roster).ready, false);
assert.deepEqual(baronRequirementsStatus(req, roster).missing, ['yue']);
assert.ok(validate(req.map(r => r.id === 'yue' ? {...r,relic:5} : r),stages).length);
assert.ok(validate(req,stages.map((s,i) => i===4 ? {...s, allies:[...s.allies.slice(0,4),'trooper']} : s)).length);
assert.ok(validate(req,stages.map((s,i) => i===0 ? {...s, allies:[...s.allies].reverse()} : s)).length);
assert.equal(Object.isFrozen(req), true);
assert.equal(Object.isFrozen(stages[0].allies), true);
console.log('BH1 recovered canonical prerequisites and five squads: PASS');
