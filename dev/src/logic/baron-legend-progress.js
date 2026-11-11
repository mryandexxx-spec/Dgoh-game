// Independent BH1 battle-result state machine. No player resources or legacy journey data are mutated.
// Only call with a validated, owner-approved configuration (not test fixtures).
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
  // Replays may occur, but cannot grant a second first-clear payout.
  if (current[stageIndex]) return { ok: true, firstClear: false, progress: current };
  return { ok: true, firstClear: true, progress: { ...current, [stageIndex]: true } };
}

function commitBaronLegendWin(save, outcome) {
  if (!outcome?.ok || !outcome.firstClear || !save || typeof save !== 'object') return false;
  save.journeys ??= {};
  const previous = baronLegendProgress(save);
  for (const [key, completed] of Object.entries(outcome.progress || {})) {
    if (!completed || !/^[0-4]$/.test(key) || Number(key) >= BARON_LEGEND_STAGE_COUNT) return false;
  }
  // Must never overwrite an existing completed stage from a concurrent/repeated call.
  const merged = { ...previous };
  for (const key of Object.keys(outcome.progress)) if (outcome.progress[key]) merged[key] = true;
  if (Object.keys(merged).length === Object.keys(previous).length) return false;
  save.journeys.baron_legend = merged;
  return true;
}

export { baronLegendProgress, baronLegendWin, commitBaronLegendWin };
