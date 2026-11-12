// Owner's recovered legendary Baron skill CONTRACT, not yet an executable CHARS kit.
// Source: original 26-page conversation PDF, pp. 1–4 and 9–10.
// Keep user-specified effects separate from assistant-suggested *unapproved* numbers.
const BARON_LEGEND_ABILITIES = Object.freeze({
  gl: Object.freeze({
    name: 'Падение Атрейдесов', kind: 'fall-of-atreides',
    oncePerBattle: true, requiresCharge: true, targets: 'enemies',
    effects: Object.freeze(['area-damage', 'armor-down', 'bonus-damage-vs-atreides', 'self-heal-per-kill']),
    animation: 'levitating-chair-army-strike',
  }),
  basic: Object.freeze({
    name: 'Приказ Барона', cooldown: 0, target: 'enemy',
    order: 'strongest-harkonnen', orderedAttackMultiplier: 1,
    feydBonusBasicMultiplier: 1.5, feydCanAttackTwice: true,
    bonusDamageVsHorror: 0.5, selfHealStaggered: 0.3,
    effects: Object.freeze(['target-damage-down','nonrecursive-assist']),
  }),
  special: Object.freeze({
    name: 'Власть через страх', cooldown: 3, initialCooldown: 3,
    target: 'enemies', effects: Object.freeze(['horror','harkonnen-attack-up']),
    animation: 'baron-rises-dark-aura',
  }),
  powerful: Object.freeze({
    name: 'Глаза императора', cooldown: 4, initialCooldown: 4,
    target: 'enemy', damageMultiplier: 2,
    effects: Object.freeze(['harkonnen-attack-up-2','harkonnen-defense-up-2',
      'harkonnen-debuff-immunity','harkonnen-foresight-1','enemy-leader-isolation']),
    animation: 'sardaukar-projectiles',
  }),
  passive: Object.freeze({
    name: 'Алчность', healOnEnemyDeath: 0.5, allyAttackUpOnKillTurns: 1,
    doubleBonusOnAtreidesKill: true, preventRevivalOfKilledAtreides: true,
    horrorTriggerDefenseTurns: 2, horrorTriggerAttackUpTurns: 2,
    healthPerStartingHarkonnen: 0.1, feydTeamCritDamage: 0.2,
    rabbanDoublesHorrorIntensity: true,
  }),
  leader: Object.freeze({
    name: 'Дом Харконненов', targetFaction: 'hark',
    effects: Object.freeze(['attack-up','max-health-up','damage-vs-debuffed',
      'bonus-vs-horror','protection-vs-horror','attack-up-vs-low-health',
      'mark-strongest-enemy','team-buff-on-marked-kill']),
  }),
});
const BARON_SKILL_KEYS = Object.freeze(['gl','basic','special','powerful','passive','leader']);
function validateBaronAbilities(abilities=BARON_LEGEND_ABILITIES) {
  if (!abilities || typeof abilities !== 'object' || Object.keys(abilities).length !== BARON_SKILL_KEYS.length ||
      BARON_SKILL_KEYS.some(key => !abilities[key] || typeof abilities[key].name !== 'string')) return ['Exactly six recovered Baron skills required'];
  const errors=[];
  if (abilities.gl.kind !== 'fall-of-atreides' || !abilities.gl.oncePerBattle) errors.push('Legendary ultimate mismatch');
  if (abilities.basic.feydBonusBasicMultiplier !== 1.5 || abilities.basic.bonusDamageVsHorror !== 0.5 || abilities.basic.selfHealStaggered !== 0.3) errors.push('Baron order mismatch');
  if (abilities.special.cooldown !== 3 || abilities.special.initialCooldown !== 3 || !abilities.special.effects.includes('horror')) errors.push('Fear through power mismatch');
  if (abilities.powerful.cooldown !== 4 || abilities.powerful.initialCooldown !== 4 || abilities.powerful.damageMultiplier !== 2 || !abilities.powerful.effects.includes('enemy-leader-isolation')) errors.push('Emperor eyes mismatch');
  if (abilities.passive.healOnEnemyDeath !== 0.5 || abilities.passive.healthPerStartingHarkonnen !== .1 || !abilities.passive.preventRevivalOfKilledAtreides) errors.push('Greed mismatch');
  if (!abilities.leader.effects.includes('mark-strongest-enemy')) errors.push('House of Harkonnen mismatch');
  return errors;
}
export { BARON_LEGEND_ABILITIES, BARON_SKILL_KEYS, validateBaronAbilities };
