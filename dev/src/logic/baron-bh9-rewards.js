// BH9: pure staged reward transaction. NOT wired to live battle/reward/UI paths.
// A real battle adapter must only call this after a verified A-side victory.
import { BARON_BH9_ENCOUNTERS, validateBH9Encounters } from '../data/baron-legend-encounters.js';
import { baronLegendWin, commitBaronLegendWin } from './baron-legend-progress.js';

const BH9_TOTAL_SHARDS = 330;

function awardBaronBH9FirstClear(save, stageIndex, battleWon, config = BARON_BH9_ENCOUNTERS) {
  if (!battleWon) return { ok: false, reason: 'battle' };
  if (validateBH9Encounters(config).length) return { ok: false, reason: 'config' };
  const hero = save?.roster?.baron_legend;
  if (!hero || !Number.isInteger(hero.shards) || hero.shards < 0 ||
      !Number.isInteger(hero.stars) || hero.stars < 0 || hero.stars > 7)
    return { ok: false, reason: 'roster' };
  const outcome = baronLegendWin(config, save, save.roster, stageIndex, hero.stars === 7);
  if (!outcome.ok) return outcome;
  if (!outcome.firstClear) return { ok: true, firstClear: false, shardsGranted: 0, unlocked: hero.stars === 7 };
  const grant = config.stages[stageIndex].firstClearShards;
  // Apply progress and reward synchronously without awaiting UI hooks or saves.
  // Replaying the same stage cannot mint shards twice.
  if (!commitBaronLegendWin(save, outcome)) return { ok: false, reason: 'concurrent' };
  const total = hero.shards + grant;
  if (hero.stars === 0 && total >= BH9_TOTAL_SHARDS) {
    hero.stars = 7;
    hero.shards = total - BH9_TOTAL_SHARDS;
  } else if (hero.stars < 7) hero.shards = total;
  // The public save persistence is intentionally NOT invoked here: the
  // adapter that eventually releases BH9 must commit the entire save once.
  return { ok: true, firstClear: true, shardsGranted: grant, unlocked: hero.stars === 7 };
}

export { BH9_TOTAL_SHARDS, awardBaronBH9FirstClear };
