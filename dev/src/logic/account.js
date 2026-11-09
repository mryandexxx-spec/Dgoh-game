// logic/account.js — строки 4966–5014 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../ui/wiring.js'; // порядок исполнения
import { S } from '../core/state.js';
import { MAX_LVL } from './economy.js';

// ===================== account level =====================
const ACC_MAX = 85;
const accNeed = L => L < 40 ? 20 + 20 * (L - 1) : 800 + 50 * (L - 40);   // XP from L to L+1
const GEAR_CAP_AT = { 2: 3, 3: 6, 4: 9, 5: 12, 6: 16, 7: 20, 8: 25, 9: 30, 10: 35, 11: 40, 12: 45, 13: 50 };     // gear tier -> account level
const heroCap = () => Math.min(MAX_LVL, S.acc.lvl);
const gearCap = () => Object.entries(GEAR_CAP_AT).reduce((m, [t, l]) => S.acc.lvl >= l ? Math.max(m, +t) : m, 1);
const accReward = L => {
  const r = [['water', 40 + 2 * L], ['candle', 25 + L], ['cry', 15 + 5 * L]];
  if (L < 10) r.push(['sol', 1500 + 500 * L], ['pl', 2 + Math.floor(L / 3)]);       // ранние уровни: прокачка героев и сборка снаряжения
  else if (L < 20) r.push(['sol', 4000 + 400 * L], ['folio', 3 + Math.floor(L / 5)]);  // середина: умения
  else if (L < 30) r.push(['folio', 6], ['rid', 20 + L], ['pl', 6]);                 // хроники и снаряжение IV
  else if (L < 40) r.push(['seal', 1], ['rid', 40 + L], ['sol', 15000]);            // поздняя игра
  else r.push(['core', 3 + Math.floor(L / 10)], ['rid', 40 + L], ['sol', 20000 + 500 * (L - 40)]); // реликвии
  if (L % 5 === 0) r.push(['seal', 1], ['folio', 5]);
  if (L % 10 === 0) r.push(['wol', 1]);
  return r;
};
const ACC_UPS = [];
const CINE_OFF = () => { try { return !!JSON.parse(localStorage.getItem('dune-cine-off') || 'true'); } catch (e) { return true; } };
function accFill(s) {
  if (s.acc) return;
  const maxLvl = Math.max(1, ...Object.values(s.roster).map(r => r.lvl || 1)), maxGear = Math.max(1, ...Object.values(s.roster).map(r => r.gear || 1));
  s.acc = { lvl: Math.min(ACC_MAX, Math.max(maxLvl, GEAR_CAP_AT[maxGear] || 1)), xp: 0 };
}


export { ACC_MAX, accNeed, GEAR_CAP_AT, heroCap, gearCap, accReward, ACC_UPS, CINE_OFF, accFill };
