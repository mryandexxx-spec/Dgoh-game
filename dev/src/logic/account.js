// logic/account.js — строки 4966–5014 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../ui/wiring.js'; // порядок исполнения
import { giveRewards, rewardsHtml } from '../ui/rewards.js';
import { S } from '../core/state.js';
import { fmt, ic } from '../core/save.js';
import { MEM, RELIC_AT, RELIC_MAX, relicCap } from './relics.js';
import { CANDLE_BASE, CMAX, MAX_LVL, ROMAN, WATER_BASE, WMAX } from './economy.js';

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
const CINE_OFF = () => { try { return !!JSON.parse(localStorage.getItem('dune-cine-off') || 'false'); } catch (e) { return false; } };
function accXP(n) {
  if (!n || S.acc.lvl >= ACC_MAX) return [];
  S.acc.xp += Math.round(n); const out = [];
  while (S.acc.lvl < ACC_MAX && S.acc.xp >= accNeed(S.acc.lvl)) {
    S.acc.xp -= accNeed(S.acc.lvl); S.acc.lvl++;
    const L = S.acc.lvl, rw = accReward(L), got = giveRewards(rw), un = [];
    if (L <= MAX_LVL) un.push(['hero', `Потолок уровня героев: ${L - 1} → ${L}`]);
    for (const [t, l] of Object.entries(GEAR_CAP_AT)) if (l === L) un.push(['gear', `Открыто снаряжение ${ROMAN[t]}`]);
    RELIC_AT.forEach((l, r) => { if (r && l === L) un.push(['gear', `Открыта Другая память ${r}`]); });
    if (L % 10 === 0) un.push(['energy', `Запас Воды ${WATER_BASE + 15 * (L / 10 - 1)} → ${WMAX()}, Свечей ${CANDLE_BASE + 10 * (L / 10 - 1)} → ${CMAX()}`]);
    ACC_UPS.push({ L, rw, un });
    out.push(`<b class="acclv">Уровень аккаунта ${L}!</b>`);
  }
  if (S.acc.lvl >= ACC_MAX) S.acc.xp = 0;
  return out;
}
function accFill(s) {
  if (s.acc) return;
  const maxLvl = Math.max(1, ...Object.values(s.roster).map(r => r.lvl || 1)), maxGear = Math.max(1, ...Object.values(s.roster).map(r => r.gear || 1));
  s.acc = { lvl: Math.min(ACC_MAX, Math.max(maxLvl, GEAR_CAP_AT[maxGear] || 1)), xp: 0 };
}
const accBadge = () => `<span class="accb" title="Уровень аккаунта ${S.acc.lvl}" style="--p:${S.acc.lvl >= ACC_MAX ? 100 : Math.round(S.acc.xp / accNeed(S.acc.lvl) * 100)}%"><b>${S.acc.lvl}</b></span>`;
function accPanel() {
  const L = S.acc.lvl, max = L >= ACC_MAX, need = accNeed(L), pct = max ? 100 : S.acc.xp / need * 100;
  const nextG = Object.entries(GEAR_CAP_AT).find(([t, l]) => l > L);
  return `<div class="accp"><div class="accrow"><span class="acclvl">${L}</span><div style="flex:1;min-width:0"><b>Уровень аккаунта</b><div class="fbar"><i style="width:${pct}%"></i><b class="mono">${max ? 'максимум' : `${fmt(S.acc.xp)} / ${fmt(need)} опыта`}</b></div></div></div>
    <div class="acckv"><span>Потолок уровня героев</span><b>${heroCap()}</b><span>Потолок снаряжения</span><b>${ROMAN[gearCap()]}</b><span>Запас энергии</span><b>${ic('water')} ${WMAX()} · ${ic('candle')} ${CMAX()} <small style="color:var(--dust)">+15/+10 каждые 10 ур.</small></b>${nextG ? `<span>Снаряжение ${ROMAN[nextG[0]]}</span><b>с ур. ${nextG[1]}</b>` : ''}<span>Потолок Другой памяти</span><b>${MEM(relicCap())}${relicCap() < RELIC_MAX ? ` · ${MEM(relicCap() + 1)} с ур. ${RELIC_AT[relicCap() + 1]}` : ''}</b><span>Награда за ур. ${Math.min(ACC_MAX, L + 1)}</span><b>${rewardsHtml(accReward(Math.min(ACC_MAX, L + 1)))}</b></div>
    <p class="sub" style="margin:4px 0 0;font-size:11px">Опыт: 3 за каждую единицу Воды или Свечей в победе и симуляции, 15 за победу в испытании, 40 в путешествии легенды, 30 за атаку в рейде, 10 за дневное задание.</p></div>`;
}


export { ACC_MAX, accNeed, GEAR_CAP_AT, heroCap, gearCap, accReward, ACC_UPS, CINE_OFF, accXP, accFill, accBadge, accPanel };
