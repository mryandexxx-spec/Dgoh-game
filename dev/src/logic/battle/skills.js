// logic/battle/skills.js — строки 184–213 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { ev, log } from './engine.js';
import { SK_MLV, SK_MODS } from '../../data/skill-ups.js';

// уровни-апгрейды — из data/skill-ups.js (SK_MLV, SK_MODS); без записей способность возвращается как есть
function abFor(u, key) {
  const ab = u.def[key], id = u.def.id + ':' + key, mods = SK_MODS[id], ml = SK_MLV[id];
  if (!ab || (!mods && !ml)) return ab;
  const l = skLv(u, key), a = { ...ab, fx: (ab.fx || []).map(f => f.slice()) };
  if (ml) { a.m = ml[Math.min(ml.length, l) - 1]; a.flatM = true; }
  if (mods) for (const lv of Object.keys(mods).map(Number).sort((x, y) => x - y)) {
    if (l < lv) break;
    const m = mods[lv];
    if (m.fx) a.fx = m.fx.map(f => f.slice());
    if (m.addFx) for (const f of m.addFx) a.fx.push(f.slice());
    for (const k in m) if (k !== 'fx' && k !== 'addFx') a[k] = m[k];
  }
  return a;
}
function dunBuff(B, d, why) { for (const k of ['taunt', 'defUp', 'counter']) d.fx[k] = Math.max(d.fx[k] || 0, 2); ev(B, d, 'Провокация', 'buff'); log(B, `${d.def.sn}: ${why} (Провокация, Защита↑, Контратака).`, 'ctrl'); }
function dunGuard(B, t) {
  if (!t.alive || t.dgDone || (t.def.id !== 'paul' && t.def.id !== 'muaddib') || t.hp / t.maxHp >= .5) return;
  t.dgDone = true; const d = B.units.find(x => x.alive && x.side === t.side && x.def.id === 'duncan' && skLv(x, 'passive') >= 6);
  if (d) dunBuff(B, d, `закрывает собой ${t.def.id === 'paul' ? 'Пола' : 'Муад\'Диба'}`);
}
const dunShielded = (B, x) => (x.def.id === 'paul' || x.def.id === 'muaddib') && B.units.some(d => d.alive && d.side === x.side && d.dunProtect);
const SK_KEYS = ['basic', 'special', 'ult', 'passive', 'leader'];
const skMax = (def, k) => def.z7 && def.z7.includes(k) ? 7 : 6;
const autoSk = lvl => { const v = Math.min(6, 1 + Math.floor((lvl || 1) / 5)); return { basic: v, special: v, ult: v, passive: v, leader: v }; };
const skLv = (u, k) => (u.sk && u.sk[k]) || 1;
const skMult = l => 1 + .06 * (l - 1) + (l >= 7 ? .15 : 0);
const pasMult = l => 1 + .02 * (l - 1) + (l >= 7 ? .08 : 0);
const leadBonus = l => .015 * (l - 1) + (l >= 7 ? .045 : 0);

export { abFor, dunBuff, dunGuard, dunShielded, SK_KEYS, skMax, autoSk, skLv, skMult, pasMult, leadBonus };
