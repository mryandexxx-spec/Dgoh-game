// ECON-01: executable acceptance for read-only F2P model (no save/DOM/game edits).
import assert from 'node:assert/strict';
import { RATES, TARGETS, SINKS, PROFILES, TEAMS, GOALS, HOURS,
  dailyBudget, sampleTargets, simulate, toMarkdown } from './simulate.mjs';

assert.equal(RATES.waterSeconds, 240);
assert.equal(RATES.candleSeconds, 300);
assert.equal(RATES.waterBattle, 6);
assert.equal(RATES.candleBattle, 8);
assert.equal(TARGETS.sevenStarShards, 330);
assert.equal(TARGETS.gearFragments, 792);
assert.equal(TARGETS.dp3ScrapFragments, 126);
assert.equal(TARGETS.dp7ScrapFragments, 367);
assert.equal(TARGETS.dp3BloodEcho, 32);
assert.equal(TARGETS.dp7BloodEcho, 44);
assert.equal(TARGETS.dp7LegacyThread, 56);
assert.equal(TARGETS.dp7AgeResonance, 15);
assert.equal(SINKS.sevenStar.sol, 45500, 'stars 1→7 pay current-star levels 1..6');
assert.equal(SINKS.gearXIII.sol, 1563260, 'includes hero levels 1→85 at CURRENT level cost');
assert.equal(SINKS.gearXIII.pl, 360);
assert.equal(SINKS.memory7.sol - SINKS.gearXIII.sol, 1450000);

const one = dailyBudget(PROFILES[0], 0, 0);
assert.equal(one.producedWater, 360);
assert.equal(one.producedCandle, 288);
assert.equal(one.waterRecovered, 360);
assert.equal(one.candleRecovered, 288);
assert.equal(one.waterAttempts, 60);
assert.equal(one.candleAttempts, 36);
assert.equal(one.lostWater, 0);
assert.equal(one.dailyCrystals, 70);
assert.equal(one.dailyCrystalNet, 70);
assert.equal(one.dailySol, 5000);
assert.equal(dailyBudget(PROFILES[0], 0, 1).dailyCrystalNet, 20);
assert.equal(dailyBudget(PROFILES[0], 0, 1).waterAttempts, 80);

const two = dailyBudget(PROFILES[1], 0, 0);
assert.equal(two.waterCap, 405);
assert.equal(two.waterRecovered, 360);
assert.equal(two.candleCap, 318);
assert.equal(two.candleRecovered, 288);

for (const profile of PROFILES) {
  for (const refills of [0, 1]) {
    const b0 = dailyBudget(profile, 0, refills);
    const b24 = dailyBudget(profile, 24, refills);
    const b36 = dailyBudget(profile, 36, refills);
    assert.ok(b0.waterRecovered <= b24.waterRecovered);
    assert.ok(b24.waterRecovered <= b36.waterRecovered);
    assert.ok(b0.candleRecovered <= b24.candleRecovered);
    assert.ok(b24.candleRecovered <= b36.candleRecovered);
    assert.ok(b0.dailyCrystalNet >= 0, 'modeled refill is self-funded by daily claims');
    assert.ok(b36.waterRecovered <= b36.producedWater);
    assert.ok(b36.candleRecovered <= b36.producedCandle);
  }
}
for (const team of TEAMS) {
  const a = sampleTargets(team, 12345);
  assert.deepEqual(a, sampleTargets(team, 12345));
  assert.ok(a.sevenStar.water > 0);
  assert.ok(a.gearXIII.water > a.sevenStar.water);
  assert.ok(a.memory3.water > a.gearXIII.water);
  assert.ok(a.memory7.water > a.memory3.water);
  assert.ok(a.memory7.candle > 0);
}
const model = simulate({ samples: 24, seed: 20261122 });
const replay = simulate({ samples: 24, seed: 20261122 });
assert.deepEqual(replay, model, 'reproducible seed and RNG');
assert.equal(model.rows.length, PROFILES.length * HOURS.length * 2 * TEAMS.length * GOALS.length);
const key = (profile, cap, refill, teams, goal) => model.rows.find(x =>
  x.profile === profile && x.capHours === cap && x.refills === refill &&
  x.teams === teams && x.goal === goal);
for (const row of model.rows) {
  assert.ok(Number.isFinite(row.p50Days) && row.p50Days > 0);
  assert.ok(row.p90Days >= row.p50Days);
  assert.ok(row.sinks.sol > 0 && row.dailySources.sol > 0);
  assert.equal(row.dailySources.cry - row.dailySinks.cry, row.dailyCrystalNet);
  if (row.goal === 'memory7' && row.accountLevel < 80) assert.equal(row.accountGateUnmodeled, true);
}
for (const profile of PROFILES) for (const teams of TEAMS) for (const goal of GOALS) {
  assert.ok(key(profile.id, 36, 0, teams, goal).p50Days <= key(profile.id, 24, 0, teams, goal).p50Days);
  assert.ok(key(profile.id, 6, 0, teams, goal).p50Days <= key(profile.id, 0, 0, teams, goal).p50Days);
  assert.ok(key(profile.id, 0, 1, teams, goal).p50Days <= key(profile.id, 0, 0, teams, goal).p50Days);
}
const md = toMarkdown(model);
assert.match(md, /ECON-01/);
assert.match(md, /CONDITIONAL/);
assert.match(md, /new-1-login/);
assert.match(md, /endgame-3-logins/);
assert.match(md, /50…300 crystals\/day/);
console.log('ECON-01 PASS: source parity, 330 shards, 792 gear fragments, memory costs,');
console.log(' four F2P profiles, 1/2/5 teams, deterministic p50/p90, energy caps, refills,');
console.log(' daily income/sinks, irreversible save-free analysis, and sensitivity monotonicity.');
