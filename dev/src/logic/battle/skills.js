// logic/battle/skills.js — строки 184–213 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { ev, log } from './engine.js';
import '../../data/chars.js'; // порядок исполнения

const SK_UPS = {
  'duncan:basic': { 6: 'Кровотечение на 2 хода (заряды суммируются).' },
  'duncan:special': { 3: '+ Защита↑ на 2 хода.', 6: 'Защита↑ и Контратака на 2 хода — всем союзникам.' },
  'duncan:ult': { 4: '+ Контратака на 2 хода.', 6: 'Удар трижды (эффекты — один раз).', 7: 'Убитых этим ударом нельзя воскресить; все враги — Крит. урон↓ на 2 хода.' },
  'duncan:passive': { 4: 'Начинает бой с Провокацией на 2 хода.', 6: 'Когда здоровье Пола или Муад\'Диба в отряде впервые падает ниже 50%, Дункан получает Провокацию, Защиту↑ и Контратаку на 2 хода.', 7: '«Гхола»: после первой гибели возвращается со 100% здоровья, щита и шкалы хода, получает Провокацию, Защиту↑ и Контратаку на 2 хода, а Пол/Муад\'Диб не может быть целью врагов, пока Дункан жив.' },
};
// фиксированный множитель урона по уровням (вместо общего роста силы)
const SK_MLV = { 'duncan:basic': [.9, .95, 1, 1.05, 1.1, 1.1] };
function abFor(u, key) {
  const ab = u.def[key]; if (!ab || u.def.id !== 'duncan') return ab;
  const l = skLv(u, key), a = { ...ab, fx: (ab.fx || []).map(f => f.slice()) };
  if (key === 'basic') { a.m = SK_MLV['duncan:basic'][Math.min(6, l) - 1]; a.flatM = true; if (l >= 6) a.fx.push(['bleed', 2, 't']); }
  if (key === 'special') { if (l >= 6) a.fx = [['taunt', 2, 'self'], ['defUp', 2, 'allies'], ['counter', 2, 'allies']]; else if (l >= 3) a.fx.push(['defUp', 2, 'self']); }
  if (key === 'ult') { if (l >= 4) a.fx.push(['counter', 2, 'self']); if (l >= 6) a.hits = 3; if (l >= 7) { a.noRev = true; a.fx.push(['critDown', 2, 'enemies']); } }
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

export { SK_UPS, SK_MLV, abFor, dunBuff, dunGuard, dunShielded, SK_KEYS, skMax, autoSk, skLv, skMult, pasMult, leadBonus };
