// BH1 staging registry — permanent playable heroes awaiting approved battle kits.
// Deliberately NOT merged into CHARS until each hero has a complete balanced kit.
// Their unlock events are separate future releases, not Baron-legend rewards.
const BARON_FUTURE_HEROES = Object.freeze([
  Object.freeze({ id: 'margot', name: 'Леди Марго Фенринг', shortName: 'Марго', playable: true, initiallyLocked: true, initialStars: 0, initialShards: 0, unlockEvent: null, shardSources: Object.freeze([]), npc: false }),
  Object.freeze({ id: 'yue', name: 'Доктор Веллингтон Юэ', shortName: 'Юэ', playable: true, initiallyLocked: true, initialStars: 0, initialShards: 0, unlockEvent: null, shardSources: Object.freeze([]), npc: false }),
]);

function validateFutureHeroRegistry(heroes = BARON_FUTURE_HEROES) {
  if (!Array.isArray(heroes) || heroes.length !== 2) return ['Exactly two upcoming heroes required'];
  const ids = new Set();
  const errors = [];
  for (const hero of heroes) {
    if (!hero || !['margot', 'yue'].includes(hero.id) || ids.has(hero.id)) errors.push('Invalid or duplicate hero ID');
    if (hero?.id) ids.add(hero.id);
    if (!hero || typeof hero.name !== 'string' || !hero.name || hero.playable !== true || hero.npc !== false || hero.initiallyLocked !== true) errors.push('Future hero must be permanently playable and initially locked');
    if (hero?.initialStars !== 0 || hero?.initialShards !== 0 || hero.unlockEvent !== null || !Array.isArray(hero.shardSources) || hero.shardSources.length !== 0) errors.push('No unlock path or shards until a separate approved event');
    if (hero && ('basic' in hero || 'special' in hero || 'ult' in hero)) errors.push('Do not invent abilities before owner approval');
  }
  return errors;
}

export { BARON_FUTURE_HEROES, validateFutureHeroRegistry };
