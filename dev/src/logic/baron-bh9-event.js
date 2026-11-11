// BH9.2 isolated event screen model and launch contract.
// No public UI route is registered until Margot/Yue and balance are approved.
import { BARON_BH9_ENCOUNTERS, validateBH9Encounters } from '../data/baron-legend-encounters.js';
import { BH9_SCENES, BH9_STORY_DESERT, baronBH9EnemyProgress, validateBH9Balance } from '../data/baron-bh9-balance.js';
import { baronRequirementsStatus, baronStageAvailable } from './baron-legend-contract.js';
import { baronLegendProgress } from './baron-legend-progress.js';
import { CH } from '../data/chars.js';

function baronBH9EventModel(save, heroDefinitions = CH) {
  const configOk = validateBH9Encounters().length === 0 && validateBH9Balance().length === 0;
  const requirements = baronRequirementsStatus(BARON_BH9_ENCOUNTERS.requirements, save?.roster);
  const completed = baronLegendProgress(save);
  const heroUnlocked = (save?.roster?.baron_legend?.stars || 0) >= 7;
  const stages = BARON_BH9_ENCOUNTERS.stages.map((stage, index) => {
    const missingKits = stage.allies.filter(id => !heroDefinitions?.[id]);
    const sequential = index === 0 || completed[index - 1] === true;
    const victory = completed[index] === true;
    const requirementsReady = requirements.ready || heroUnlocked;
    return {
      index, title: stage.title, allies: [...stage.allies],
      enemies: stage.waves.map(w => [...w]),
      rewardShards: stage.firstClearShards, completed: victory,
      waves: stage.waves.length,
      missingKits,
      gated: !requirementsReady,
      available: configOk && sequential && requirementsReady && !missingKits.length,
      // Even an unlocked legend must not bypass missing future hero kits.
      lockReason: !configOk ? 'config' : !requirementsReady ? 'requirements' :
        !sequential ? 'sequence' : missingKits.length ? 'hero-kit' : null,
    };
  });
  return { id:'baron_legend', title:'Восхождение Барона',
    configurationReady: configOk, requirements, unlocked: heroUnlocked,
    completedStages: stages.filter(s => s.completed).length, totalStages: stages.length, stages };
}

// The game UI can consume this only after separate release approval.
// Do not call public launch() yet: its journey reward branch is Muad'Dib-only.
function baronBH9LaunchPlan(save, stageIndex, heroDefinitions = CH) {
  const model = baronBH9EventModel(save, heroDefinitions);
  const stage = model.stages[stageIndex];
  if (!stage) return { ok:false, reason:'stage' };
  if (!stage.available) return { ok:false, reason:stage.lockReason };
  if (!baronStageAvailable(BARON_BH9_ENCOUNTERS, save.roster, baronLegendProgress(save),
      stageIndex, model.unlocked)) return { ok:false, reason:'locked' };
  const enemyWaves = baronBH9EnemyProgress(stageIndex);
  if (!enemyWaves) return { ok:false, reason:'balance' };
  // Fixed squad; unlike Muad'Dib, there is no squad selector.
  return { ok:true, id:'baron_legend', stageIndex, title:stage.title,
    squad:[...stage.allies], waves:enemyWaves, scene:BH9_SCENES[stageIndex],
    desert:BH9_STORY_DESERT[stageIndex], firstClearShards:stage.rewardShards,
    // All fields are serializable and independent of DOM and Babylon.
  };
}

export { baronBH9EventModel, baronBH9LaunchPlan };
