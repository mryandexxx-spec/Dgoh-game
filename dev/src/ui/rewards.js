// ui/rewards.js — строки 3761–3778 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './overlays/sim.js'; // порядок исполнения
import { rwGrid } from './reward-tiles.js';
import { MOUSE_SVG } from './mouse.js';
import { CH } from '../data/chars.js';
import { RW_NAME } from '../logic/economy.js';
import { amt } from '../core/format.js';
import { $ } from '../core/dom.js';
import { itemIcon } from './common.js';
import { ITEMS } from '../logic/gear.js';
import { accGain, applyRewards } from '../logic/rewards.js';

// ===== rewards helper =====
function rewardWin(title, lines, o = {}) {
  const old = $('#rwwin'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'rwwin'; el.className = 'result won rwwin' + (o.cls ? ' ' + o.cls : '');
  el.innerHTML = `<div class="box" role="dialog" aria-modal="true"><div class="mousewrap">${MOUSE_SVG(false)}</div><h3>${title}</h3>${o.sub ? `<div style="color:var(--dust)">${o.sub}</div>` : ''}<ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><div class="acts" style="justify-content:center">${o.btns || ''}<button class="btn ${o.btns ? '' : 'go'}" data-rwok="1">${o.ok || 'Забрать'}</button></div></div>`;
  document.body.appendChild(el);
}
function giveRewards(list) {
  return applyRewards(list).map(r => r.k === 'shard' ? `+${amt('shard', r.q, 'shard:' + r.id)} ${CH[r.id].sn}${r.unlocked ? ' — персонаж открыт!' : ''}` : `+${amt(r.k, r.q)} ${RW_NAME[r.k]}`);
}
const rewardsHtml = list => rwGrid(list, { sm: 1 });
function accXP(n) { return accGain(n).map(L => `<b class="acclv">Уровень аккаунта ${L}!</b>`); }
function fragLines(list) {
  const agg = {}; for (const [id, q] of list) agg[id] = (agg[id] || 0) + q;
  return Object.entries(agg).map(([id, q]) => `+${amt('frag', q, 'frag:' + id)} ${itemIcon(ITEMS[id], 18)} ${ITEMS[id].n}`);
}


export { rewardWin, giveRewards, rewardsHtml, accXP, fragLines };
