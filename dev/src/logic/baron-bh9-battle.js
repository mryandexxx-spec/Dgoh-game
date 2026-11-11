// BH9 isolated battle adapter. The player cannot enter it through the public UI.
// No temporary NPC substitutes: Margot/Yue require their eventual playable kits.
// The same battle engine and wave lifecycle used by existing modes is reused.
import { BARON_BH9_ENCOUNTERS, validateBH9Encounters } from '../data/baron-legend-encounters.js';
import { baronBH9EnemyProgress } from '../data/baron-bh9-balance.js';
import { CH } from '../data/chars.js';
import { createBattle } from './battle/engine.js';
import { baronStageAvailable } from './baron-legend-contract.js';
import { baronLegendProgress } from './baron-legend-progress.js';
import { awardBaronBH9FirstClear } from './baron-bh9-rewards.js';

const BH9_REQUIRED_LEVEL = 85;
const BH9_REQUIRED_GEAR = 13;

// This is a TEST-ONLY capability until Margot/Yue receive approved playable
// definitions and the event UI is approved. Never synthesize definitions here.
function prepareBaronBH9Battle(save, stageIndex, { heroDefs = {}, enemyProgress = null, seed = 1 } = {}) {
  if (validateBH9Encounters().length) return { ok: false, reason: 'config' };
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= BARON_BH9_ENCOUNTERS.stages.length)
    return { ok: false, reason: 'stage' };
  if (!baronStageAvailable(BARON_BH9_ENCOUNTERS, save?.roster, baronLegendProgress(save),
    stageIndex, (save?.roster?.baron_legend?.stars || 0) >= 7))
    return { ok: false, reason: 'locked' };

  const stage = BARON_BH9_ENCOUNTERS.stages[stageIndex];
  const missing = stage.allies.filter(id => !CH[id] && !heroDefs[id]);
  if (missing.length) return { ok: false, reason: 'hero-kit', missing };

  // Default: isolated playtest profile. Explicit overrides are for test harnesses.
  // The production UI has no route to this adapter until the character kits exist.
  const tuning = enemyProgress ?? baronBH9EnemyProgress(stageIndex);
  if (!Array.isArray(tuning) || tuning.length !== stage.waves.length ||
    tuning.some((wave, i) => !Array.isArray(wave) || wave.length !== stage.waves[i].length ||
      wave.some((p, j) => !p || p.id !== stage.waves[i][j] ||
        !Number.isInteger(p.lvl) || p.lvl < 1 || p.lvl > BH9_REQUIRED_LEVEL ||
        !Number.isInteger(p.stars) || p.stars < 1 || p.stars > 7 ||
        !Number.isInteger(p.gear) || p.gear < 1 || p.gear > BH9_REQUIRED_GEAR ||
        !Number.isInteger(p.relic) || p.relic < 0 || p.relic > 7)))
    return { ok: false, reason: 'balance' };

  const squad = stage.allies.map(id => ({ id, ...save.roster[id] }));
  const waves = tuning.map(w => w.map(p => ({ ...p })));
  const battle = createBattle(squad, waves[0], {
    seed, extraHeroDefs: heroDefs, waves: waves.slice(1),
  });
  return { ok: true, battle, stageIndex, title: stage.title, waves: stage.waves.length,
    allyIds: [...stage.allies], rewardShards: stage.firstClearShards };
}

// Reward only after the real battle engine reports victory AND no waves remain.
// Callers must persist the entire save transaction after this returns.
function finishBaronBH9Battle(save, prepared) {
  if (!prepared?.ok || !prepared.battle || prepared.battle.over !== 'A' ||
      prepared.battle.wavePending || prepared.battle.wave?.remaining?.length)
    return { ok: false, reason: 'battle' };
  return awardBaronBH9FirstClear(save, prepared.stageIndex, true);
}

export { prepareBaronBH9Battle, finishBaronBH9Battle };
