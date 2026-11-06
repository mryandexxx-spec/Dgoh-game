// ui/rewards.js — строки 3761–3778 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './overlays/sim.js'; // порядок исполнения
import { rwGrid } from './reward-tiles.js';
import { MOUSE_SVG } from './mouse.js';
import { grantShards } from './overlays/squad-select.js';
import { S } from '../core/state.js';
import { CH } from '../data/chars.js';
import { ACC_MAX, ACC_UPS, GEAR_CAP_AT, accNeed, accReward } from '../logic/account.js';
import { CANDLE_BASE, CMAX, MAX_LVL, ROMAN, RW_NAME, WATER_BASE, WMAX } from '../logic/economy.js';
import { RELIC_AT } from '../logic/relics.js';
import { amt } from '../core/format.js';
import { $ } from '../core/dom.js';
import { itemIcon } from './common.js';
import { ITEMS } from '../logic/gear.js';

// ===== rewards helper =====
function rewardWin(title, lines, o = {}) {
  const old = $('#rwwin'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'rwwin'; el.className = 'result won rwwin' + (o.cls ? ' ' + o.cls : '');
  el.innerHTML = `<div class="box" role="dialog" aria-modal="true"><div class="mousewrap">${MOUSE_SVG(false)}</div><h3>${title}</h3>${o.sub ? `<div style="color:var(--dust)">${o.sub}</div>` : ''}<ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><div class="acts" style="justify-content:center">${o.btns || ''}<button class="btn ${o.btns ? '' : 'go'}" data-rwok="1">${o.ok || 'Забрать'}</button></div></div>`;
  document.body.appendChild(el);
}
function addRes(k, q) { if (k === 'sol') S.solari += q; else if (k === 'pl') S.plast += q; else if (k === 'water') S.water += q; else S[k] = (S[k] || 0) + q; }
function giveRewards(list) {
  const out = [];
  for (const [k, q, id] of list) {
    if (k === 'shard') out.push(`+${amt('shard', q, 'shard:' + id)} ${CH[id].sn}${grantShards(id, q) ? ' — персонаж открыт!' : ''}`);
    else { addRes(k, q); out.push(`+${amt(k, q)} ${RW_NAME[k]}`); }
  }
  return out;
}
const rewardsHtml = list => rwGrid(list, { sm: 1 });
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
function fragLines(list) {
  const agg = {}; for (const [id, q] of list) agg[id] = (agg[id] || 0) + q;
  return Object.entries(agg).map(([id, q]) => `+${amt('frag', q, 'frag:' + id)} ${itemIcon(ITEMS[id], 18)} ${ITEMS[id].n}`);
}


export { rewardWin, addRes, giveRewards, rewardsHtml, accXP, fragLines };
