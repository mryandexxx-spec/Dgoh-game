// BH9.7 — accepted normal heroes, initial 0★/0 shards, farmed via the two approved events.
// Temporary procedural visuals (Chani/Paul pipeline). Final GLB/DGM art postponed.
const BARON_FUTURE_HEROES = Object.freeze([
  Object.freeze({ id: 'margot', name: 'Леди Марго Фенринг', shortName: 'Марго', playable: true, initiallyLocked: true, initialStars: 0, initialShards: 0, unlockEvent: 'margot_story', shardSources: Object.freeze(['margot_story']), npc: false }),
  Object.freeze({ id: 'yue', name: 'Доктор Веллингтон Юэ', shortName: 'Юэ', playable: true, initiallyLocked: true, initialStars: 0, initialShards: 0, unlockEvent: 'yue_story', shardSources: Object.freeze(['yue_story']), npc: false }),
]);

function validateFutureHeroRegistry(heroes = BARON_FUTURE_HEROES) {
  if (!Array.isArray(heroes) || heroes.length !== 2) return ['Exactly two upcoming heroes required'];
  const ids = new Set();
  const errors = [];
  for (const hero of heroes) {
    if (!hero || !['margot', 'yue'].includes(hero.id) || ids.has(hero.id)) errors.push('Invalid or duplicate hero ID');
    if (hero?.id) ids.add(hero.id);
    if (!hero || typeof hero.name !== 'string' || !hero.name || hero.playable !== true || hero.npc !== false || hero.initiallyLocked !== true) errors.push('Future hero must be permanently playable and initially locked');
    if (hero?.initialStars !== 0 || hero?.initialShards !== 0 || hero.unlockEvent !== hero.id + '_story' || !Array.isArray(hero.shardSources) || hero.shardSources.length !== 1 || hero.shardSources[0] !== hero.unlockEvent) errors.push('No unlock path or shards until a separate approved event');
    if (hero && ('basic' in hero || 'special' in hero || 'ult' in hero)) errors.push('Hero kit must stay in shared kit registry');
  }
  return errors;
}

export { BARON_FUTURE_HEROES, validateFutureHeroRegistry };
