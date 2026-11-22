// ECON-01: offline, read-only F2P economy simulator. NOT an in-game mechanic.
// Source fingerprints fail closed when gameplay formulas change; never write saves.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BATTLE_WATER, CANDLE_COST } from '../../src/data/campaign-energy.js';
import { MEM_COSTS, SCRAP, SIGNAL_NODES } from '../../src/data/memory-scrap.js';

const root = new URL('../../src/', import.meta.url);
const source = path => readFileSync(new URL(path, root), 'utf8');
const econ = source('logic/economy.js');
const gear = source('logic/gear.js');
const daily = source('logic/daily.js');
const rules = source('logic/relics.js');
const account = source('logic/account-rules.js');

function numberConst(text, name) {
  const match = text.match(new RegExp('\\b' + name + '\\s*=\\s*(\\d+(?:\\.\\d+)?)\\b'));
  assert.ok(match, 'Source constant missing: ' + name);
  return Number(match[1]);
}
function numericArray(text, name) {
  const match = text.match(new RegExp('\\b' + name + '\\s*=\\s*(\\[[\\d,\\s]+\\])'));
  assert.ok(match, 'Source array missing: ' + name);
  return JSON.parse(match[1]);
}
function sourceGuard() {
  // Guard assumptions NOT representable by a primitive constant. No silent model drift.
  assert.match(econ, /const refillPrice = n => 50 \* 2 \*\* Math\.floor\(n \/ 3\)/);
  assert.match(econ, /const STAR_COST = s => s \* s \* 500/);
  assert.match(econ, /const LVL_COST = l => l \* 40 \+ \(l >= 30 \? \(l - 29\) \*\* 2 \* 15 : 0\)/);
  assert.match(econ, /function rollShards\(n, ch\)/);
  assert.match(econ, /r < \(ch \? \.4 : \.5\) \? 0 : r < \(ch \? \.78 : \.8\) \? 1 : 2/);
  assert.match(econ, /const REFILL_AMT = 120, REFILL_MAX = 15/);
  assert.match(econ, /sol: ch \? 300 \+ L \* 60 : 400 \+ L \* 110/);
  assert.match(econ, /pl: 1 \+ \(st === 3 \? 1 : 0\) \+ \(L >= 14 \? 1 : 0\)/);
  assert.match(gear, /const CRAFT = t => \(\{ sol: 300 \* t \+ 40 \* t \* t, pl: Math\.ceil\(t \* \.6\) \}\)/);
  assert.match(gear, /const GEAR_UP_SOL = g => 800 \* g \+ 150 \* g \* g/);
  assert.match(gear, /const COMPONENT_DROP_RATE = \.18/);
  assert.match(gear, /for \(let t = 1; t <= 13; t\+\+\)/);
  assert.match(gear, /return kinds\.slice\(0, 6\)/);
  assert.match(daily, /\{ k: 'login'.*rw: \[\['cry', 20\]\]/);
  assert.match(daily, /\{ k: 'water'.*rw: \[\['cry', 30\], \['sol', 2000\]\]/);
  assert.match(daily, /\{ k: 'camp'.*rw: \[\['folio', 3\], \['sol', 3000\]\]/);
  assert.match(daily, /\{ k: 'chron'.*rw: \[\['rid', 20\], \['cry', 20\]\]/);
  assert.match(daily, /const CHEST_NEED = 7, CHEST_RW = \[\['seal', 1\], \['cry', '50–300'\]/);
  assert.match(rules, /const RELIC_MAX = 7, RELIC_AT = \[0, 52, 56, 60, 65, 70, 75, 80\]/);
  assert.match(account, /13: 50/); // XIII gate
}
sourceGuard();

export const RATES = Object.freeze({
  waterSeconds: numberConst(econ, 'WATER_SEC'),
  candleSeconds: numberConst(econ, 'CANDLE_SEC'),
  waterBase: numberConst(econ, 'WATER_BASE'),
  candleBase: numberConst(econ, 'CANDLE_BASE'),
  waterPerTenLevels: 15, candlePerTenLevels: 10,
  waterBattle: BATTLE_WATER, candleBattle: CANDLE_COST,
  fragmentChance: .18, refillWater: numberConst(econ, 'REFILL_AMT'),
  shards: numericArray(econ, 'SHARDS_NEXT'),
  fragments: numericArray(gear, 'FRAG_NEED'),
});
assert.deepEqual(RATES.shards, [10, 15, 25, 30, 65, 85, 100]);
assert.equal(RATES.waterBattle, 6);
assert.equal(RATES.candleBattle, 8);
assert.equal(SCRAP.ix_plate.threshold, 24);
assert.equal(SCRAP.holtz_conductor.threshold, 48);
assert.equal(SCRAP.tleilax_matrix.threshold, 72);
assert.equal(SCRAP.null_cell.threshold, 120);

export const PROFILES = Object.freeze([
  { id: 'new-1-login', account: 1, nodeLevel: 5, visits: 1 },
  { id: 'casual-2-logins', account: 35, nodeLevel: 35, visits: 2 },
  { id: 'active-4-logins', account: 60, nodeLevel: 60, visits: 4 },
  { id: 'endgame-3-logins', account: 85, nodeLevel: 70, visits: 3 },
]);
export const TEAMS = Object.freeze([1, 2, 5]); // one team = five heroes
export const GOALS = Object.freeze(['sevenStar', 'gearXIII', 'memory3', 'memory7']);
export const HOURS = Object.freeze([0, 6, 8]); // zero = CURRENT; others HYPOTHETICAL

// Spend all energy at evenly spaced login visits. No timers or browser state.
// Generated energy beyond cap is LOST; account rank bonuses are retained.
export function dailyBudget(profile, capHours = 0, refillCount = 0) {
  assert.ok(PROFILES.some(p => p.id === profile.id), 'unknown F2P profile');
  assert.ok(HOURS.includes(capHours) && [0, 1].includes(refillCount), 'unsupported sensitivity');
  const step = Math.floor(profile.account / 10);
  const waterCap = (capHours ? capHours * 3600 / RATES.waterSeconds : RATES.waterBase) + 15 * step;
  const candleCap = (capHours ? capHours * 3600 / RATES.candleSeconds : RATES.candleBase) + 10 * step;
  const producedWater = 86400 / RATES.waterSeconds;
  const producedCandle = 86400 / RATES.candleSeconds;
  const waterRecovered = Math.min(producedWater, waterCap * profile.visits);
  const candleRecovered = Math.min(producedCandle, candleCap * profile.visits);
  const waterSpent = waterRecovered + refillCount * RATES.refillWater;
  const waterAttempts = Math.floor(waterSpent / RATES.waterBattle);
  const candleAttempts = Math.floor(candleRecovered / RATES.candleBattle);
  // Only daily quests reachable without purchases, upgrades or raid participation;
  // rewards are optional and require a successful claim. No daily chest assumed.
  const waterQuest = waterSpent >= 120;
  const campQuest = waterAttempts >= 8;
  const chronQuest = candleAttempts >= 3;
  const dailyCrystals = 20 + (waterQuest ? 30 : 0) + (chronQuest ? 20 : 0);
  const dailySol = (waterQuest ? 2000 : 0) + (campQuest ? 3000 : 0);
  const crystalCost = refillCount ? 50 : 0; // source refillPrice(0)
  return { waterCap, candleCap, producedWater, producedCandle,
    waterRecovered, candleRecovered, lostWater: producedWater - waterRecovered,
    lostCandle: producedCandle - candleRecovered,
    waterSpent, waterAttempts, candleAttempts, dailyCrystals, crystalCost,
    dailyCrystalNet: dailyCrystals - crystalCost, dailySol,
    // At a fixed farm-node level, 3-star regular L/D and C missions.
    dailyMissionSol: waterAttempts * (400 + profile.nodeLevel * 110) +
      candleAttempts * (300 + profile.nodeLevel * 60),
    dailyMissionPl: waterAttempts * (1 + 1 + (profile.nodeLevel >= 14 ? 1 : 0)) +
      candleAttempts * (1 + 1 + (profile.nodeLevel >= 14 ? 1 : 0)),
  };
}

function rng32(seed) {
  let x = seed >>> 0;
  return () => { x = (Math.imul(1664525, x) + 1013904223) >>> 0; return (x + .5) / 4294967296; };
}
function geometric(rng, p) { return 1 + Math.floor(Math.log1p(-rng()) / Math.log1p(-p)); }
function fragmentAttempts(rng, count) {
  let n = 0;
  for (let i = 0; i < count; i++) n += geometric(rng, RATES.fragmentChance);
  return n;
}
function shardAttempts(rng, total) {
  let got = 0, tries = 0;
  while (got < total) {
    const r = rng();
    got += r < .5 ? 0 : r < .8 ? 1 : 2; // primary L/D shard only
    tries++;
  }
  return tries;
}
function signalAttempts(rng, count, chance) {
  let tries = 0, missed = 0, obtained = 0;
  const pity = Math.ceil(2 / chance);
  while (obtained < count) {
    tries++;
    if (rng() < chance || missed >= pity) { obtained++; missed = 0; }
    else missed++;
  }
  return tries;
}
function scrapFragments(level) {
  const totals = {};
  for (let r = 1; r <= level; r++) for (const [k, n] of Object.entries(MEM_COSTS[r])) {
    if (SCRAP[k]) totals[k] = (totals[k] || 0) + n;
  }
  const bestTier = { ix_plate: 5, holtz_conductor: 9, tleilax_matrix: 12, null_cell: 13 };
  let required = 0;
  for (const [key, amount] of Object.entries(totals)) {
    const recipe = SCRAP[key], points = recipe.base[bestTier[key]];
    // optimistic, targetable dedicated "mask" fragments, with no starting carry
    assert.equal(recipe.threshold % points, 0, 'review scrap carry and recipe');
    required += amount * recipe.threshold / points;
  }
  return required;
}
export const TARGETS = Object.freeze({
  sevenStarShards: 10 + RATES.shards.slice(1).reduce((a, n) => a + n, 0),
  gearFragments: 6 * RATES.fragments.slice(1).reduce((a, n) => a + n, 0),
  dp3ScrapFragments: scrapFragments(3),
  dp7ScrapFragments: scrapFragments(7),
  dp3BloodEcho: MEM_COSTS.slice(1, 4).reduce((a, r) => a + (r.blood_echo || 0), 0),
  dp7BloodEcho: MEM_COSTS.slice(1).reduce((a, r) => a + (r.blood_echo || 0), 0),
  dp7LegacyThread: MEM_COSTS.slice(1).reduce((a, r) => a + (r.legacy_thread || 0), 0),
  dp7AgeResonance: MEM_COSTS.slice(1).reduce((a, r) => a + (r.age_resonance || 0), 0),
});
function relicSol(level) { return MEM_COSTS.slice(1, level + 1).reduce((s, x) => s + x.sol, 0); }
const gearCraftSol = RATES.fragments.slice(1).reduce((sum, _, tier) => {
  const t = tier + 1;
  return sum + 6 * (300 * t + 40 * t * t);
}, 0);
const gearUpSol = Array.from({ length: 12 }, (_, i) => i + 1)
  .reduce((sum, g) => sum + 800 * g + 150 * g * g, 0);
const levelSol = Array.from({ length: 84 }, (_, i) => i + 2)
  .reduce((sum, l) => sum + l * 40 + (l >= 30 ? (l - 29) ** 2 * 15 : 0), 0);
const starSol = [2, 3, 4, 5, 6, 7].reduce((sum, s) => sum + s * s * 500, 0);
const gearPl = RATES.fragments.slice(1).reduce((sum, _, i) => sum + 6 * Math.ceil((i + 1) * .6), 0);
export const SINKS = Object.freeze({
  sevenStar: { sol: starSol, pl: 0 },
  gearXIII: { sol: starSol + levelSol + gearCraftSol + gearUpSol, pl: gearPl },
  memory3: { sol: starSol + levelSol + gearCraftSol + gearUpSol + relicSol(3), pl: gearPl },
  memory7: { sol: starSol + levelSol + gearCraftSol + gearUpSol + relicSol(7), pl: gearPl },
});
export const GATES = Object.freeze({ sevenStar: 1, gearXIII: 50, memory3: 60, memory7: 80 });
assert.equal(TARGETS.sevenStarShards, 330);
assert.equal(TARGETS.dp3BloodEcho, 32);
assert.equal(TARGETS.dp7LegacyThread, 56);
assert.equal(TARGETS.dp7AgeResonance, 15);
assert.equal(relicSol(7), 1450000);
assert.equal(SIGNAL_NODES.blood_echo.chance, .35);
assert.equal(SIGNAL_NODES.legacy_thread.chance, .28);
assert.equal(SIGNAL_NODES.age_resonance.chance, .18);

// Monte Carlo samples FARM ATTEMPTS, not full PWA playthroughs.
// Exclusive dedicated target node, no bonus sources, failures, stage unlocks,
// item overlap or starting stock: these are conditional lower-bound estimates.
export function sampleTargets(teamCount, seed) {
  assert.ok(TEAMS.includes(teamCount));
  const r = rng32(seed), heroes = teamCount * 5;
  const shards = shardAttempts(r, TARGETS.sevenStarShards * heroes);
  const gear = fragmentAttempts(r, TARGETS.gearFragments * heroes);
  const scrap3 = fragmentAttempts(r, TARGETS.dp3ScrapFragments * heroes);
  const scrap7Extra = fragmentAttempts(r, (TARGETS.dp7ScrapFragments - TARGETS.dp3ScrapFragments) * heroes);
  const blood3 = signalAttempts(r, TARGETS.dp3BloodEcho * heroes, SIGNAL_NODES.blood_echo.chance);
  const blood7Extra = signalAttempts(r, (TARGETS.dp7BloodEcho - TARGETS.dp3BloodEcho) * heroes, SIGNAL_NODES.blood_echo.chance);
  const legacy = signalAttempts(r, TARGETS.dp7LegacyThread * heroes, SIGNAL_NODES.legacy_thread.chance);
  const age = signalAttempts(r, TARGETS.dp7AgeResonance * heroes, SIGNAL_NODES.age_resonance.chance);
  return {
    sevenStar: { water: shards, candle: 0 },
    gearXIII: { water: shards + gear, candle: 0 },
    memory3: { water: shards + gear + scrap3 + blood3, candle: 0 },
    memory7: { water: shards + gear + scrap3 + scrap7Extra + blood3 + blood7Extra, candle: legacy + age },
  };
}
function daysToGoal(target, budget) {
  if (!budget.waterAttempts || (target.candle && !budget.candleAttempts)) return Infinity;
  return Math.max(1, Math.ceil(target.water / budget.waterAttempts), Math.ceil(target.candle / (budget.candleAttempts || 1)));
}
function percentile(sorted, fraction) { return sorted[Math.ceil(sorted.length * fraction) - 1]; }
export function simulate({ samples = 128, seed = 2401 } = {}) {
  assert.ok(Number.isInteger(samples) && samples >= 8 && samples <= 4096);
  assert.ok(Number.isSafeInteger(seed));
  const output = { seed, samples, rates: RATES, targets: TARGETS, sinksPerHero: SINKS, profiles: PROFILES,
    assumptions: ['all desired nodes unlocked', '3-star win with no failures', 'six items in each tier',
      'one focused target per attempt, 18% fragment chance', 'all equipment farmable with Water',
      'recycler uses mask fragments at indicated tiers with no starting carry',
      'only reliable free daily claims, no chest, raid or shop rewards', 'evenly spaced visits with full spend',
      'no account-XP timeline, event/raid reward, starting stock, extra drops or lucky complete equipment'],
    rows: [] };
  const series = new Map();
  for (const team of TEAMS) {
    series.set(team, Array.from({ length: samples }, (_, i) => sampleTargets(team, (seed + i * 2654435761 + team * 1013904223) >>> 0)));
  }
  for (const profile of PROFILES) for (const capHours of HOURS) for (const refills of [0, 1]) {
    const budget = dailyBudget(profile, capHours, refills);
    for (const teams of TEAMS) for (const goal of GOALS) {
      const turns = series.get(teams).map(sample => daysToGoal(sample[goal], budget)).sort((a, b) => a - b);
      const p50Days = percentile(turns, .50), p90Days = percentile(turns, .90);
      const spent = SINKS[goal];
      output.rows.push({ profile: profile.id, teams, heroes: teams * 5, goal, capHours, refills,
        gateLevel: GATES[goal], accountLevel: profile.account,
        accountGateUnmodeled: profile.account < GATES[goal],
        p50Days, p90Days, ...budget,
        sinks: { sol: spent.sol * teams * 5, pl: spent.pl * teams * 5 },
        dailySources: { sol: budget.dailyMissionSol + budget.dailySol,
          pl: budget.dailyMissionPl, cry: budget.dailyCrystals },
        dailySinks: { cry: budget.crystalCost },
        potentialSolBalanceP50: (budget.dailyMissionSol + budget.dailySol) * p50Days - spent.sol * teams * 5,
        potentialPlBalanceP50: budget.dailyMissionPl * p50Days - spent.pl * teams * 5,
      });
    }
  }
  return output;
}
export function toMarkdown(result) {
  const lines = [
    '# ECON-01: source-bound F2P model (NOT player telemetry)',
    '',
    'Fixed seed ' + result.seed + ', Monte Carlo ' + result.samples + ' samples. Days are CONDITIONAL farming lower bounds (account gates/failed battles/availability are not modeled).',
    '',
    '| Profile | Cap | Refills/day | Water attempts/day | Lost Water/day | 5 heroes 7★ p50/p90 | XIII p50/p90 | DP3 p50/p90 | DP7 p50/p90 |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const p of PROFILES) for (const h of HOURS) for (const f of [0, 1]) {
    const rows = GOALS.map(g => result.rows.find(row => row.profile === p.id && row.capHours === h && row.refills === f && row.teams === 1 && row.goal === g));
    lines.push('| ' + p.id + ' | ' + (h ? h + 'h hypothetical' : 'current') + ' | ' + f + ' | ' + rows[0].waterAttempts +
      ' | ' + rows[0].lostWater + ' | ' + rows.map(r => r.p50Days + '/' + r.p90Days + (r.accountGateUnmodeled ? '*' : '')).join(' | ') + ' |');
  }
  lines.push('', '*Gate not yet reached by profile. Figures cannot be interpreted as a full time-to-unlock forecast.*',
    'Sources/sinks (sol, pl, cry), 1/2/5 teams and assumptions are in --json output.',
    'Hypothetical flexible-daily 7-claim chest: +50…300 crystals/day IF reachable; not included in base forecasts or a proposal to change rewards.');
  return lines.join('\n');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL('file://' + process.argv[1]))) {
  const output = simulate({ samples: process.argv.includes('--quick') ? 24 : 128 });
  console.log(process.argv.includes('--json') ? JSON.stringify(output, null, 2) : toMarkdown(output));
}
