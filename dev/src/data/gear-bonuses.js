// E3: специализация снаряжения. Показатели — относительные веса вклада
// одной надетой ячейки, а не дополнительные абсолютные статы.
// В боевой формуле прежние +7% за 6 ячеек должны быть ЗАМЕНЕНЫ
// этим вкладом, иначе произойдёт двойное усиление.
const KIND_WEIGHTS = Object.freeze({
  mask:    { hp: 1.45, shield: 0.85, dmg: 0.55, crit: 0 },
  boots:   { hp: 0.95, shield: 0.65, dmg: 0.65, spd: 1 },
  belt:    { hp: 1.25, shield: 1.20, dmg: 0.55 },
  knife:   { hp: 0.45, shield: 0.40, dmg: 1.80, crit: 1 },
  cloak:   { hp: 1.25, shield: 1.40, dmg: 0.50 },
  ring:    { hp: 0.75, shield: 0.85, dmg: 1.35, crit: 0.5 },
  vial:    { hp: 1.60, shield: 0.70, dmg: 0.45 },
  scope:   { hp: 0.50, shield: 0.70, dmg: 1.55, crit: 1 },
  plate:   { hp: 1.65, shield: 1.65, dmg: 0.35 },
  pad:     { hp: 0.70, shield: 0.75, dmg: 1.20, spd: 0.5 },
  emitter: { hp: 0.90, shield: 1.80, dmg: 0.55 },
  compass: { hp: 0.70, shield: 0.60, dmg: 1.15, spd: 1 },
});
const SLOT_SHARE = 0.07 / 6;
function gearBonus(kind) {
  const w = KIND_WEIGHTS[kind];
  if (!w) return null;
  return { hp: SLOT_SHARE * w.hp, shield: SLOT_SHARE * w.shield,
    dmg: SLOT_SHARE * w.dmg, spd: (w.spd || 0) * 0.25,
    crit: (w.crit || 0) * 0.001 };
}
export { KIND_WEIGHTS, SLOT_SHARE, gearBonus };
