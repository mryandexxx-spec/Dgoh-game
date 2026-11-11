// Pure BH1 progress state machine. Not imported by live runtime until approved encounter data exist.
import { validateBaronLegendConfig, baronStageAvailable, BARON_LEGEND_STAGE_COUNT } from './baron-legend-contract.js';

function baronLegendProgress(save) {
  const stages = save?.journeys?.baron_legend;
  return stages && typeof stages === 'object' && !Array.isArray(stages) ? stages : {};
}

function baronLegendWin(config, save, roster, stageIndex, alreadyUnlocked = false) {
  if (validateBaronLegendConfig(config).length) return { ok: false, reason: 'config' };
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= BARON_LEGEND_STAGE_COUNT) return { ok: false, reason: 'stage' };
  const current = baronLegendProgress(save);
  if (!baronStageAvailable(config, roster, current, stageIndex, alreadyUnlocked)) return { ok: false, reason: 'locked' };
  return { ok: true, firstClear: current[stageIndex] !== true, stageIndex };
}

// Accepts exactly one validated win. Never trusts a caller-provided full progress object,
// preventing a single stage outcome from marking other stages complete.
function commitBaronLegendWin(save, outcome) {
  if (!save || typeof save !== 'object' || !outcome?.ok || !outcome.firstClear) return false;
  const i = outcome.stageIndex;
  if (!Number.isInteger(i) || i < 0 || i >= BARON_LEGEND_STAGE_COUNT) return false;
  const previous = baronLegendProgress(save);
  if (previous[i] === true || (i > 0 && previous[i - 1] !== true)) return false;
  save.journeys ??= {};
  save.journeys.baron_legend = { ...previous, [i]: true };
  return true;
}

export { baronLegendProgress, baronLegendWin, commitBaronLegendWin };
