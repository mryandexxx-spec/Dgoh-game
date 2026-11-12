// BH9: owner-approved encounter direction, kept OFF the public JOURNEYS registry.
// Canonical fixed ally squads come solely from baron-legend-approved.js.
// Enemy squads below are the approved BH9 design proposal (11.11.2026).
// Five first-clear rewards total 330 shards, as in the existing Muad'Dib curve.
import { BARON_APPROVED_REQUIREMENTS, BARON_APPROVED_STAGES } from './baron-legend-approved.js';

const BH9_REWARD_SHARDS = Object.freeze([20, 40, 60, 90, 120]);
const BH9_ENEMY_SQUADS = Object.freeze([
  [['thufir', 'gurney', 'duncan', 'leto', 'paul']],
  [['leto', 'thufir', 'jessica', 'gurney', 'duncan']],
  [['leto', 'jessica', 'thufir', 'duncan', 'gurney']],
  // The first wave is a defensive screen. The second contains the approved
  // named-hero roster. No special NPCs or new combat actors are introduced.
  [['thufir', 'gurney', 'duncan', 'jessica', 'paul'], ['duncan', 'gurney', 'thufir', 'leto', 'paul']],
  [['paul', 'jessica', 'thufir', 'gurney', 'duncan'], ['leto', 'duncan', 'gurney', 'thufir', 'jessica']],
].map(waves => Object.freeze(waves.map(ids => Object.freeze([...ids])))));

const BARON_BH9_ENCOUNTERS = Object.freeze({
  id: 'baron_legend',
  requirements: BARON_APPROVED_REQUIREMENTS,
  stages: Object.freeze(BARON_APPROVED_STAGES.map((stage, index) => Object.freeze({
    title: stage.title,
    allies: stage.allies,
    waves: BH9_ENEMY_SQUADS[index],
    // Legacy consumer shape for pure validation. Final enemies are the
    // signature encounter, earlier waves are preparatory.
    enemies: BH9_ENEMY_SQUADS[index].at(-1),
    firstClearShards: BH9_REWARD_SHARDS[index],
  }))),
});

function validateBH9Encounters(config = BARON_BH9_ENCOUNTERS) {
  const errors = [];
  if (!config || config.id !== 'baron_legend' || !Array.isArray(config.stages) || config.stages.length !== 5) return ['Five Baron encounter stages required'];
  if (config.requirements !== BARON_APPROVED_REQUIREMENTS) errors.push('Non-canonical requirements');
  let sum = 0;
  config.stages.forEach((stage, i) => {
    const approved = BARON_APPROVED_STAGES[i];
    if (stage.title !== approved.title || !Array.isArray(stage.allies) || stage.allies.length !== 5 ||
        stage.allies.some((id, j) => id !== approved.allies[j])) errors.push('Changed approved allies: ' + i);
    const expectedWaves = BH9_ENEMY_SQUADS[i];
    if (!Array.isArray(stage.waves) || stage.waves.length !== expectedWaves.length ||
        stage.waves.some((wave, wi) => !Array.isArray(wave) || wave.length !== expectedWaves[wi].length ||
          wave.some((id, j) => id !== expectedWaves[wi][j]))) errors.push('Changed enemy waves: ' + i);
    if (!Number.isInteger(stage.firstClearShards) || stage.firstClearShards !== BH9_REWARD_SHARDS[i])
      errors.push('Changed shard reward: ' + i);
    else sum += stage.firstClearShards;
  });
  if (sum !== 330) errors.push('Legend unlock must total 330 shards');
  return errors;
}

export { BARON_BH9_ENCOUNTERS, BH9_REWARD_SHARDS, BH9_ENEMY_SQUADS, validateBH9Encounters };
