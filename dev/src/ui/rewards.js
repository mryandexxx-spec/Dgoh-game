// ui/rewards.js — строки 3761–3778 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { rwGrid } from './reward-tiles.js';
import { MOUSE_SVG } from './mouse.js';
import { grantShards } from './overlays/squad-select.js';
import './overlays/sim.js'; // порядок исполнения
import { $ } from '../core/util.js';
import { S } from '../core/state.js';
import { amt } from '../core/save.js';
import { CH } from '../data/chars.js';

// ===== rewards helper =====
function rewardWin(title, lines, o = {}) {
  const old = $('#rwwin'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'rwwin'; el.className = 'result won rwwin' + (o.cls ? ' ' + o.cls : '');
  el.innerHTML = `<div class="box" role="dialog" aria-modal="true"><div class="mousewrap">${MOUSE_SVG(false)}</div><h3>${title}</h3>${o.sub ? `<div style="color:var(--dust)">${o.sub}</div>` : ''}<ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><div class="acts" style="justify-content:center">${o.btns || ''}<button class="btn ${o.btns ? '' : 'go'}" data-rwok="1">${o.ok || 'Забрать'}</button></div></div>`;
  document.body.appendChild(el);
}
function addRes(k, q) { if (k === 'sol') S.solari += q; else if (k === 'pl') S.plast += q; else if (k === 'water') S.water += q; else S[k] = (S[k] || 0) + q; }
const RW_NAME = { wring: 'водяных колец', jt: 'трофеев Джихада', core: 'Другой памяти', rid: 'ридулианских кристаллов', candle: 'Свечей хроник', sol: 'соляриев', cry: 'кристаллов', folio: 'фолиантов', seal: 'Печать Ландсраада', wol: 'Вода жизни', pl: 'пластали', teeth: 'зубов червя', water: 'Воды' };
function giveRewards(list) {
  const out = [];
  for (const [k, q, id] of list) {
    if (k === 'shard') out.push(`+${amt('shard', q, 'shard:' + id)} ${CH[id].sn}${grantShards(id, q) ? ' — персонаж открыт!' : ''}`);
    else { addRes(k, q); out.push(`+${amt(k, q)} ${RW_NAME[k]}`); }
  }
  return out;
}
const rewardsHtml = list => rwGrid(list, { sm: 1 });

export { rewardWin, addRes, RW_NAME, giveRewards, rewardsHtml };
