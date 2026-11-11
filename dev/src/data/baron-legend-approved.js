// BH1: historical OWNER-APPROVED requirements and fixed allied squads, recovered from
// the 26-page "Разработка легенды Харконненов(2).pdf" (pp. 9–13).
// Enemy line-ups, rewards and numeric battle balance are NOT approved yet.
// Do not expose this as a playable JOURNEYS entry until those fields are completed.
const BARON_APPROVED_REQUIREMENTS = Object.freeze([
  ['baron', 7], ['feyd', 5], ['rabban', 5], ['piter', 5],
  ['margot', 4], ['fenring', 4], ['shaddam', 4], ['mohiam', 4],
  ['yue', 3], ['legion', 2],
].map(([id, relic]) => Object.freeze({ id, stars: 7, gear: 13, relic })));

const BARON_APPROVED_STAGES = Object.freeze([
  { title: 'Тайный союз', allies: ['baron', 'piter', 'feyd', 'rabban', 'margot'] },
  { title: 'Печать императора', allies: ['shaddam', 'fenring', 'margot', 'mohiam', 'legion'] },
  { title: 'Цена предательства', allies: ['yue', 'piter', 'baron', 'mohiam', 'fenring'] },
  { title: 'Ночь над Арракином', allies: ['baron', 'feyd', 'rabban', 'piter', 'legion'] },
  { title: 'Триумф Барона', allies: ['baron', 'feyd', 'rabban', 'shaddam', 'fenring'] },
].map(stage => Object.freeze({ title: stage.title, allies: Object.freeze(stage.allies) })));

const EXPECTED_RELICS = Object.freeze({ baron: 7, feyd: 5, rabban: 5, piter: 5, margot: 4, fenring: 4, shaddam: 4, mohiam: 4, yue: 3, legion: 2 });

function validateBaronApprovedData(requirements = BARON_APPROVED_REQUIREMENTS, stages = BARON_APPROVED_STAGES) {
  const errors = [];
  if (!Array.isArray(requirements) || requirements.length !== 10) return ['Exactly ten canonical requirements'];
  const ids = requirements.map(x => x?.id);
  if (new Set(ids).size !== 10 || ids.some(id => !Object.hasOwn(EXPECTED_RELICS, id))) errors.push('Canonical requirement IDs differ');
  for (const r of requirements) if (!r || r.stars !== 7 || r.gear !== 13 || r.relic !== EXPECTED_RELICS[r.id]) errors.push('Wrong prerequisite for ' + r?.id);
  if (!Array.isArray(stages) || stages.length !== 5) return [...errors, 'Exactly five story squads'];
  for (const [i, stage] of stages.entries()) {
    const expected = BARON_APPROVED_STAGES[i];
    if (!stage || stage.title !== expected.title || !Array.isArray(stage.allies) ||
        stage.allies.length !== 5 || stage.allies.some((id,j) => id !== expected.allies[j])) errors.push('Unapproved story team at stage ' + (i+1));
  }
  if (stages.flatMap(s => s?.allies || []).some(id => !Object.hasOwn(EXPECTED_RELICS,id))) errors.push('Story team contains non-required hero');
  if (new Set(stages.flatMap(s => s?.allies || [])).size !== 10) errors.push('Every required hero must appear at least once');
  return errors;
}

export { BARON_APPROVED_REQUIREMENTS, BARON_APPROVED_STAGES, validateBaronApprovedData };
