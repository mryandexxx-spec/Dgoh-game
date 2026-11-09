// logic/battle/stats.js — строки 228–245 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { STAR_MULT } from '../../data/boss.js';
import { SK_KEYS, autoSk } from './skills.js';
import { BASE } from '../../data/fx.js';
import { gearBonus } from '../../data/gear-bonuses.js';
// Поздний модуль gear.js регистрирует детерминированный план ячеек.
let getEquippedPlan = null;
function setGearStatProvider(fn) { getEquippedPlan = fn; }

function unitStats(def, p) {
  const b = BASE[def.role];
  const rl = p.relic || 0;
  // Общая прибавка от уровня снаряжения сохранена. Вместо прежних
  // +7%/6 ко всем статам каждая надетая ячейка даёт свой профиль.
  const base = (1 + 0.07 * (p.lvl - 1)) * STAR_MULT[p.stars] *
    (1 + 0.07 * (p.gear - 1)) * (def.pow || 1) * (1 + 0.08 * rl) * (p.pow || 1);
  const bonus = { hp: 0, shield: 0, dmg: 0, spd: 0, crit: 0 };
  if (Array.isArray(p.eq)) {
    const plan = getEquippedPlan ? getEquippedPlan(def.id, p.gear) : [];
    for (let k = 0; k < Math.min(6, p.eq.length); k++) {
      if (!p.eq[k]) continue;
      const m = /^([a-z]+)\d+$/.exec(plan[k] || '');
      const w = m && gearBonus(m[1]);
      if (!w) continue;
      for (const key of Object.keys(bonus)) bonus[key] += w[key];
    }
  }
  return {
    maxHp: Math.round(b.hp * base * (1 + bonus.hp)),
    maxShield: def.noShield ? 0 : Math.round(b.sh * base * (1 + bonus.shield)),
    spd: Math.round(b.spd + (p.stars - 1) * 2 + (p.gear - 1) * 1.2 + (p.lvl - 1) * 0.5 + rl * 3 + bonus.spd),
    dmg: Math.round(b.dmg * base * (1 + bonus.dmg)),
    arm: b.arm, pot: b.pot, ten: b.ten, crit: b.crit + bonus.crit,
    eva: (def.noShield ? .12 : .05) + (def.eva || 0),
  };
}

function unitPower(def, p) {
  const s = unitStats(def, p), sk = p.sk || autoSk(p.lvl);
  const sum = SK_KEYS.reduce((a, k) => a + (k === 'leader' && !def.leader ? 0 : (sk[k] || 1) - 1), 0);
  return Math.round((s.maxHp + s.maxShield + s.dmg * 6 + s.spd * 10) / 10 * (1 + sum * .012));
}


export { unitStats, unitPower, setGearStatProvider };
