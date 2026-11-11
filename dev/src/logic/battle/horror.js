// BH2: shared modifiers for the recovered "Ужас" status.
// The 20% baseline is the original assistant's *proposed* balance (PDF pp. 6–7);
// keep it configurable until the owner approves final numbers.
// "Страх" remains a separate skip-turn effect and is never checked here.
const HORROR_BASE_PENALTY = 0.20;
function horrorPenalty(unit, base = HORROR_BASE_PENALTY) {
  if (!unit?.fx?.horror) return 0;
  const stacks = unit.horrorStrength === 2 ? 2 : 1; // Rabban's proposed double intensity, not double duration.
  return Math.min(0.9, Math.max(0, base) * stacks);
}
function horrorDamageFactor(unit, base) { return 1 - horrorPenalty(unit, base); }
function horrorSpeedFactor(unit, base) { return 1 - horrorPenalty(unit, base); }
export { HORROR_BASE_PENALTY, horrorPenalty, horrorDamageFactor, horrorSpeedFactor };
