// BH9.2 — provisional encounter balance, ISOLATED from public JOURNEYS.
// Values are an initial tuning pass, NOT the final owner-approved difficulty.
// Enemy squads and wave counts are approved in baron-legend-encounters.js.
import { BARON_BH9_ENCOUNTERS } from './baron-legend-encounters.js';

// stage 1 -> 5; wave 1 -> 2. The second wave is the stronger named command.
const BH9_BALANCE_PROFILES = Object.freeze([
  Object.freeze([{ lvl: 80, stars: 7, gear: 13, relic: 2, pow: 1.00 }]),
  Object.freeze([{ lvl: 82, stars: 7, gear: 13, relic: 3, pow: 1.04 }]),
  Object.freeze([{ lvl: 84, stars: 7, gear: 13, relic: 4, pow: 1.08 }]),
  Object.freeze([{ lvl: 84, stars: 7, gear: 13, relic: 4, pow: 1.06 },
                 { lvl: 85, stars: 7, gear: 13, relic: 5, pow: 1.13 }]),
  Object.freeze([{ lvl: 85, stars: 7, gear: 13, relic: 5, pow: 1.10 },
                 { lvl: 85, stars: 7, gear: 13, relic: 6, pow: 1.19 }]),
].map(stage => Object.freeze(stage.map(w => Object.freeze({ ...w })))));

const BH9_SCENES = Object.freeze(['palace', 'palace', 'palace', 'dawn', 'palace']);
const BH9_STORY_DESERT = Object.freeze([false, false, false, true, false]);

function validateBH9Balance() {
  const errors = [];
  if (BH9_BALANCE_PROFILES.length !== BARON_BH9_ENCOUNTERS.stages.length) return ['Stage balance count mismatch'];
  for (let i = 0; i < BH9_BALANCE_PROFILES.length; i++) {
    const profiles = BH9_BALANCE_PROFILES[i];
    if (profiles.length !== BARON_BH9_ENCOUNTERS.stages[i].waves.length) errors.push('Wave profile count mismatch at ' + i);
    for (const p of profiles) {
      if (!Number.isInteger(p.lvl) || p.lvl < 70 || p.lvl > 85 || p.stars !== 7 || p.gear !== 13 ||
          !Number.isInteger(p.relic) || p.relic < 0 || p.relic > 7 ||
          !Number.isFinite(p.pow) || p.pow < 0.8 || p.pow > 1.5)
        errors.push('Unsafe balance values at ' + i);
    }
    if (i && profiles.at(-1).pow < BH9_BALANCE_PROFILES[i - 1].at(-1).pow)
      errors.push('Decreasing final-wave power at ' + i);
  }
  return errors;
}

// Clones are intentional: the engine may attach runtime state to enemy entries.
function baronBH9EnemyProgress(stageIndex) {
  if (validateBH9Balance().length || !Number.isInteger(stageIndex) || stageIndex < 0 ||
      stageIndex >= BARON_BH9_ENCOUNTERS.stages.length) return null;
  return BARON_BH9_ENCOUNTERS.stages[stageIndex].waves.map((ids, waveIndex) =>
    ids.map(id => ({ id, ...BH9_BALANCE_PROFILES[stageIndex][waveIndex] })));
}

export { BH9_BALANCE_PROFILES, BH9_SCENES, BH9_STORY_DESERT, validateBH9Balance, baronBH9EnemyProgress };
