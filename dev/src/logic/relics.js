// logic/relics.js — строки 3078–3086 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { S } from '../core/state.js';
import { TIER_COL } from './gear.js';
import { MAX_GEAR } from './economy.js';
import { CH } from '../data/chars.js';
import { MEM_LORE } from '../data/memories.js';
import { unitPower, unitStats } from './battle/stats.js';

// ===== relics (after gear V) =====
const RELIC_MAX = 7, RELIC_AT = [0, 52, 56, 60, 65, 70, 75, 80], RELIC_CORES = [0, 10, 18, 30, 45, 65, 90, 125], RELIC_SOL = r => 40000 * r, RELIC_COL = '#ff6a3a';
const MEM = r => 'ДП' + r;   // уровень Другой памяти
const relicCap = () => RELIC_AT.reduce((m, l, r) => r && S.acc.lvl >= l ? r : m, 0);
const relicReady = p => p.stars >= 7 && p.gear >= MAX_GEAR && p.eq.every(Boolean);
const ringCol = p => p.relic ? RELIC_COL : TIER_COL[p.gear];
const unlockNeed = d => d && (d.legendary || d.conquest) ? 330 : 10;
const sideName = d => d.side === 'light' ? 'Светлый' : d.side === 'dark' ? 'Тёмный' : 'Машина';
const isLegend = id => !!(CH[id] && CH[id].legendary);
// вид экрана «Другой памяти» (E4): условия, шаги, стоимость, характеристики «сейчас → после»
// block: max — всё пробуждено, ready — не выполнены условия (checks), acc — следующий уровень с уровня аккаунта
function memView(def, p) {
  const rl = p.relic || 0, cap = relicCap(), rn = rl + 1, ready = relicReady(p);
  const checks = [
    { k: 'stars', ok: p.stars >= 7, have: p.stars, need: 7 },
    { k: 'gear', ok: p.gear >= MAX_GEAR, have: p.gear, need: MAX_GEAR },
    { k: 'eq', ok: p.eq.every(Boolean), have: p.eq.filter(Boolean).length, need: 6 },
    { k: 'acc', ok: S.acc.lvl >= RELIC_AT[1], have: S.acc.lvl, need: RELIC_AT[1] },
  ];
  const block = rl >= RELIC_MAX ? 'max' : !ready ? 'ready' : rn > cap ? 'acc' : null;
  const steps = RELIC_AT.slice(1).map((acc, j) => { const l = j + 1; return { l, acc, st: l <= rl ? 'got' : l === rn && ready ? 'next' : 'lock', lore: MEM_LORE[j] }; });
  const snap = q => { const s = unitStats(def, q); return { hp: s.maxHp, sh: s.maxShield, dmg: s.dmg, spd: s.spd, pow: unitPower(def, q) }; };
  return { rl, max: RELIC_MAX, cap, rn, ready, block, checks, steps, cost: rl < RELIC_MAX ? { core: RELIC_CORES[rn], sol: RELIC_SOL(rn) } : null,
    now: snap(p), after: rl < RELIC_MAX ? snap({ ...p, relic: rn }) : null };
}

export { RELIC_MAX, RELIC_AT, RELIC_CORES, RELIC_SOL, RELIC_COL, MEM, relicCap, relicReady, ringCol, unlockNeed, sideName, isLegend, memView };
