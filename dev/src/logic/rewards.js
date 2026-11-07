// logic/rewards.js — начисление наград без DOM (фаза 3a). Показ — ui/rewards; побочные эффекты UI — через rewardHooks.
import './skill-up.js'; // порядок исполнения
import { S } from '../core/state.js';
import { prog } from './progress.js';
import { RELIC_AT, unlockNeed } from './relics.js';
import { CH } from '../data/chars.js';
import { ACC_MAX, ACC_UPS, GEAR_CAP_AT, accNeed, accReward } from './account.js';
import { CANDLE_BASE, CMAX, MAX_LVL, ROMAN, WATER_BASE, WMAX } from './economy.js';
// UI подписывается при загрузке (ui/overlays/squad-select): тот же момент вызова, что был в монолите
const rewardHooks = { unlock: id => {}, shardConv: n => {} };
function addRes(k, q) { if (k === 'sol') S.solari += q; else if (k === 'pl') S.plast += q; else if (k === 'water') S.water += q; else S[k] = (S[k] || 0) + q; }
const RING_RATE = 10;   // 1 осколок героя на 7★ = 10 водяных колец
function grantShards(id, k) {
  const p = prog(id);
  if (p.stars >= 7) { const n = k * RING_RATE; S.wring = (S.wring || 0) + n; rewardHooks.shardConv(n); return false; }
  p.shards += k;
  const un = unlockNeed(CH[id]);
  if (p.stars === 0 && p.shards >= un) { p.shards -= un; p.stars = un > 10 ? 7 : 1; rewardHooks.unlock(id); return true; }
  return false;
}
// начислить список наград; вернуть записи для показа (порядок и побочные эффекты — как в прежнем giveRewards)
function applyRewards(list) {
  const out = [];
  for (const [k, q, id] of list) {
    if (k === 'shard') out.push({ k, q, id, unlocked: grantShards(id, q) });
    else { addRes(k, q); out.push({ k, q }); }
  }
  return out;
}
// опыт аккаунта: начисляет уровни и награды, кладёт открытия в ACC_UPS; возвращает достигнутые уровни
function accGain(n) {
  if (!n || S.acc.lvl >= ACC_MAX) return [];
  S.acc.xp += Math.round(n); const out = [];
  while (S.acc.lvl < ACC_MAX && S.acc.xp >= accNeed(S.acc.lvl)) {
    S.acc.xp -= accNeed(S.acc.lvl); S.acc.lvl++;
    const L = S.acc.lvl, rw = accReward(L), got = applyRewards(rw), un = [];
    if (L <= MAX_LVL) un.push(['hero', `Потолок уровня героев: ${L - 1} → ${L}`]);
    for (const [t, l] of Object.entries(GEAR_CAP_AT)) if (l === L) un.push(['gear', `Открыто снаряжение ${ROMAN[t]}`]);
    RELIC_AT.forEach((l, r) => { if (r && l === L) un.push(['gear', `Открыта Другая память ${r}`]); });
    if (L % 10 === 0) un.push(['energy', `Запас Воды ${WATER_BASE + 15 * (L / 10 - 1)} → ${WMAX()}, Свечей ${CANDLE_BASE + 10 * (L / 10 - 1)} → ${CMAX()}`]);
    ACC_UPS.push({ L, rw, un });
    out.push(L);
  }
  if (S.acc.lvl >= ACC_MAX) S.acc.xp = 0;
  return out;
}


export { rewardHooks, addRes, RING_RATE, grantShards, applyRewards, accGain };
