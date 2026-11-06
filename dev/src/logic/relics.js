// logic/relics.js — строки 3078–3086 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { S } from '../core/state.js';
import { TIER_COL } from './gear.js';
import { MAX_GEAR } from './economy.js';
import { CH } from '../data/chars.js';

// ===== relics (after gear V) =====
const RELIC_MAX = 7, RELIC_AT = [0, 52, 56, 60, 65, 70, 75, 80], RELIC_CORES = [0, 10, 18, 30, 45, 65, 90, 125], RELIC_SOL = r => 40000 * r, RELIC_COL = '#ff6a3a';
const MEM = r => 'ДП' + r;   // уровень Другой памяти
const relicCap = () => RELIC_AT.reduce((m, l, r) => r && S.acc.lvl >= l ? r : m, 0);
const relicReady = p => p.stars >= 7 && p.gear >= MAX_GEAR && p.eq.every(Boolean);
const ringCol = p => p.relic ? RELIC_COL : TIER_COL[p.gear];
const unlockNeed = d => d && (d.legendary || d.conquest) ? 330 : 10;
const sideName = d => d.side === 'light' ? 'Светлый' : d.side === 'dark' ? 'Тёмный' : 'Машина';
const isLegend = id => !!(CH[id] && CH[id].legendary);

export { RELIC_MAX, RELIC_AT, RELIC_CORES, RELIC_SOL, RELIC_COL, MEM, relicCap, relicReady, ringCol, unlockNeed, sideName, isLegend };
