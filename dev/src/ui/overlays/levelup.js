// ui/overlays/levelup.js — строки 5020–5036 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../fx-text.js'; // порядок исполнения
import { rwGrid } from '../reward-tiles.js';
import { ACC_UPS } from '../../logic/account.js';
import { renderRes } from '../common.js';
import { $ } from '../../core/util.js';
import { BT } from '../../core/state.js';
import { MAX_LVL } from '../../logic/economy.js';
import { ic } from '../../core/format.js';

// ===================== level-up window =====================
function showLevelUp() {
  if (!ACC_UPS.length || $('#lvlup') || (BT && BT.B)) return;
  const ups = ACC_UPS.splice(0), last = ups[ups.length - 1], from = ups[0].L - 1;
  const agg = {}; for (const u of ups) for (const [k, q] of u.rw) agg[k] = (agg[k] || 0) + q;
  const un0 = ups.flatMap(u => u.un), hs = un0.filter(x => x[0] === 'hero'), un = [...(hs.length ? [['hero', `Потолок уровня героев: ${from} → ${Math.min(MAX_LVL, last.L)}`]] : []), ...un0.filter(x => x[0] !== 'hero')], ico = { hero: ic('shard'), gear: ic('pl'), energy: ic('water') };
  const el = document.createElement('div'); el.id = 'lvlup'; el.className = 'lvlup';
  el.innerHTML = `<div class="lvbox" role="dialog" aria-modal="true" aria-labelledby="lv-h">
    <div class="lvrays"></div>${Array.from({ length: 22 }, (_, i) => `<i class="lvsp" style="--a:${i * 360 / 22}deg;--d:${(i % 5) * .08}s"></i>`).join('')}
    <div class="lvbadge"><span class="lvold">${from}</span><span class="lvnew">${last.L}</span></div>
    <h3 id="lv-h">Уровень аккаунта ${last.L}!</h3><p class="sub" style="margin:0">${ups.length > 1 ? `Сразу +${ups.length} уровня. ` : ''}Ваш Малый Дом набирает силу.</p>
    ${un.length ? `<div class="lvun">${un.map(([k, t]) => `<div class="lvu">${ico[k] || ''}<span>${t}</span></div>`).join('')}</div>` : ''}
    <p class="chap" style="margin:10px 0 4px">Награда</p>${rwGrid(Object.entries(agg))}
    <div class="acts" style="justify-content:center"><button class="btn go" data-lvclose="1">Отлично!</button></div></div>`;
  document.body.appendChild(el); renderRes();
}


export { showLevelUp };
