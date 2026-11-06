// logic/battle/stats.js — строки 228–245 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { STAR_MULT } from '../../data/boss.js';
import { SK_KEYS, autoSk } from './skills.js';
import { BASE } from '../../data/fx.js';

function unitStats(def, p) {
  const b = BASE[def.role];
  const rl = p.relic || 0, mult = (1 + 0.07 * (p.lvl - 1)) * STAR_MULT[p.stars] * (1 + 0.07 * (p.gear - 1 + (p.eq ? p.eq.filter(Boolean).length / 6 : 0))) * (def.pow || 1) * (1 + 0.08 * rl) * (p.pow || 1);
  return {
    maxHp: Math.round(b.hp * mult),
    maxShield: def.noShield ? 0 : Math.round(b.sh * mult),
    spd: Math.round(b.spd + (p.stars - 1) * 2 + (p.gear - 1) * 1.2 + (p.lvl - 1) * 0.5 + rl * 3),
    dmg: Math.round(b.dmg * mult),
    arm: b.arm, pot: b.pot, ten: b.ten, crit: b.crit,
    eva: (def.noShield ? .12 : .05) + (def.eva || 0),
  };
}
function unitPower(def, p) {
  const s = unitStats(def, p), sk = p.sk || autoSk(p.lvl);
  const sum = SK_KEYS.reduce((a, k) => a + (k === 'leader' && !def.leader ? 0 : (sk[k] || 1) - 1), 0);
  return Math.round((s.maxHp + s.maxShield + s.dmg * 6 + s.spd * 10) / 10 * (1 + sum * .012));
}


export { unitStats, unitPower };
