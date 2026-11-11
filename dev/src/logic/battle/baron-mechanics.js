// BH2 reusable battle mechanics for Baron; no hero ID checks.
// Status durations are held in the existing unit.fx map and decremented by decFx.
function canReceiveBuff(target, source) {
  return Boolean(target?.alive && (!target.fx?.isolation || !source || source === target));
}
function canApplyStatus(target, source, bad) {
  if (!target?.alive) return false;
  if (!bad && !canReceiveBuff(target, source)) return false;
  if (bad && target.fx?.debuffImmune) return false;
  return true;
}
function consumeForesight(target, damageType) {
  if (!target?.fx?.foresight || damageType === 'voice' || damageType === 'poison') return false;
  delete target.fx.foresight;
  return true;
}
function markHouseVictim(units, side) {
  const enemies = units.filter(u => u.alive && u.side !== side && !u.def?.boss);
  const target = enemies.slice().sort((a,b) => b.dmg - a.dmg || a.idx - b.idx)[0] || null;
  if (target) target.houseVictimSide = side;
  return target;
}
function markedDamageFactor(target, attacker, multiplier = 0.25) {
  return target?.houseVictimSide === attacker?.side && attacker.def?.f?.includes('hark') ? 1 + multiplier : 1;
}
function mayRevive(unit) { return Boolean(unit && !unit.noRev); }
function strongestAlly(units, actor, faction = 'hark') {
  return units.filter(u => u.alive && u.side === actor.side && u !== actor && u.def?.f?.includes(faction))
    .sort((a,b) => b.dmg - a.dmg || a.idx - b.idx)[0] || null;
}
// A support call must only issue direct hits: never recursively resolve the helper's
// abilities, special actions or its own assist triggers.
function orderedAssist(B, actor, target, helper, multiplier, hit) {
  if (!helper?.alive || !target?.alive || !actor?.alive || B.over || helper.side !== actor.side || helper === actor) return false;
  const basic = helper.def?.basic;
  if (!basic || !basic.dt || !Number.isFinite(multiplier) || multiplier <= 0) return false;
  const dt = basic.dt === 'laser' ? 'fast' : basic.dt;
  return hit(B, helper, target, dt, (basic.m || 1) * multiplier);
}
// Runs only for a hero explicitly declaring the recovered "Алчность" passive.
// The state belongs to the combat instance; never persists between fights.
function baronDeathTriggers(B, victim, ev) {
  if (!victim || !B?.units) return;
  const barons = B.units.filter(a => a.alive && a.side !== victim.side && a.def?.passive?.harkonnenGreed);
  const atreides = victim.def?.f?.includes('atr');
  if (atreides && barons.length) victim.noRev = true;
  for (const baron of barons) {
    const h = Math.min(baron.maxHp - baron.hp, Math.round(baron.maxHp * (baron.def.passive.healOnEnemyDeath ?? .5)));
    if (h > 0) { baron.hp += h; if (ev) ev(B, baron, '+' + h, 'heal'); }
    const turns = atreides ? 2 : 1;
    for (const ally of B.units) if (ally.alive && ally.side === baron.side && ally.def?.f?.includes('hark')) {
      ally.fx.attackUp = Math.max(ally.fx.attackUp || 0, turns);
    }
  }
  // The strongest initial enemy was marked by the *leader*, which may differ
  // from a living Baron with the passive. Trigger the mark reward once only.
  if (victim.houseVictimSide && !victim.houseVictimClaimed) {
    victim.houseVictimClaimed = true;
    for (const ally of B.units) if (ally.alive && ally.side === victim.houseVictimSide) {
      ally.fx.attackUp = Math.max(ally.fx.attackUp || 0, 2);
    }
  }
}
export { canReceiveBuff, canApplyStatus, consumeForesight, markHouseVictim, markedDamageFactor, mayRevive, strongestAlly, orderedAssist, baronDeathTriggers };
