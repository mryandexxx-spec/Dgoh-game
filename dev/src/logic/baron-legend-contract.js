// BH1 — pure validator for the future Baron legendary journey.
// Kept independent of runtime data until the approved exact teams and requirements are recovered.
const BARON_LEGEND_ID = 'baron_legend';
const BARON_LEGEND_REQUIREMENT_COUNT = 10;
const BARON_LEGEND_STAGE_COUNT = 5;
const BARON_LEGEND_YOUNG_ID = 'baron';

function validateBaronLegendConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') return ['Missing legend configuration'];
  const req = config.requirements;
  const stages = config.stages;
  if (!Array.isArray(req) || req.length !== BARON_LEGEND_REQUIREMENT_COUNT) errors.push('Expected exactly 10 requirements');
  if (!Array.isArray(stages) || stages.length !== BARON_LEGEND_STAGE_COUNT) errors.push('Expected exactly five stages');
  if (Array.isArray(req)) {
    const ids = new Set();
    for (const r of req) {
      if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id)) { errors.push('Requirement IDs must be unique and nonempty'); continue; }
      ids.add(r.id);
      if (!Number.isInteger(r.stars) || r.stars < 0 || r.stars > 7) errors.push('Invalid stars for ' + r.id);
      if (!Number.isInteger(r.gear) || r.gear < 1 || r.gear > 13) errors.push('Invalid gear for ' + r.id);
      if (!Number.isInteger(r.relic) || r.relic < 0 || r.relic > 7) errors.push('Invalid relic for ' + r.id);
    }
    const young = req.find(r => r && r.id === BARON_LEGEND_YOUNG_ID);
    if (!young || young.relic !== 7) errors.push('Young Baron must require relic level 7');
    if (ids.has(BARON_LEGEND_ID)) errors.push('Legend cannot require itself');
  }
  if (Array.isArray(stages)) {
    for (const [i, s] of stages.entries()) {
      if (!s || !Array.isArray(s.allies) || s.allies.length !== 5 || new Set(s.allies).size !== 5 || s.allies.some(id => typeof id !== 'string' || !id)) {
        errors.push('Stage ' + (i + 1) + ' must have five distinct fixed allies');
      }
      if (!s || !Array.isArray(s.enemies) || s.enemies.length < 1 || s.enemies.length > 5 || s.enemies.some(id => typeof id !== 'string' || !id)) errors.push('Stage ' + (i + 1) + ' must have one to five enemy IDs');
    }
  }
  return errors;
}

function baronRequirementsStatus(requirements, roster) {
  if (!Array.isArray(requirements) || requirements.length !== BARON_LEGEND_REQUIREMENT_COUNT) return { ready: false, completed: 0, total: BARON_LEGEND_REQUIREMENT_COUNT, missing: [] };
  const missing = [];
  for (const r of requirements) {
    const p = roster?.[r.id] || {};
    if ((p.stars || 0) < r.stars || (p.gear || 0) < r.gear || (p.relic || 0) < r.relic) missing.push(r.id);
  }
  return { ready: missing.length === 0, completed: requirements.length - missing.length, total: requirements.length, missing };
}

// The first stage requires all ten prerequisites; later stages additionally require the previous win.
// Already unlocked legends retain access, preserving the existing Muad'Dib grandfathering policy.
function baronStageAvailable(config, roster, completed, stageIndex, alreadyUnlocked = false) {
  if (validateBaronLegendConfig(config).length) return false;
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= BARON_LEGEND_STAGE_COUNT) return false;
  if (!alreadyUnlocked && !baronRequirementsStatus(config.requirements, roster).ready) return false;
  return stageIndex === 0 || Boolean(completed?.[stageIndex - 1]);
}

export { BARON_LEGEND_ID, BARON_LEGEND_REQUIREMENT_COUNT, BARON_LEGEND_STAGE_COUNT, validateBaronLegendConfig, baronRequirementsStatus, baronStageAvailable };
