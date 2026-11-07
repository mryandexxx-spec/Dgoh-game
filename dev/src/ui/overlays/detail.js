// ui/overlays/detail.js — строки 3365–3549 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../views/squad.js'; // порядок исполнения
import { renderNotes } from '../notifications.js';
import { fxText } from '../fx-text.js';
import { itemSourceRows, set_INFO_ON_CLOSE, set_infoKey } from './info.js';
import { heroHold } from '../../render3d/scenes/hero.js';
import { prog } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { CRAFT, FRAG_NEED, ITEMS, TIER_COL, TIER_NAME, gearPlan } from '../../logic/gear.js';
import { LVL_COST, ROMAN } from '../../logic/economy.js';
import { sceneThumb } from '../../render2d/scenes.js';
import { CH } from '../../data/chars.js';
import { DT } from '../../data/fx.js';
import { amt, fmt } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { itemIcon, skillSvg } from '../common.js';

const SK_NAME = { basic: 'базовая', special: 'особая', ult: 'мощная', passive: 'пассивная', leader: 'лидерка' };
const costHtml = (c, hv) => { const f = (k, need, have) => hv ? `<span class="${have < need ? 'lackc' : 'okc'}">${amt(k, fmt(have) + '/' + fmt(need))}</span>` : amt(k, need);
  return [c.folio && f('folio', c.folio, S.folio), c.seal && f('seal', c.seal, S.seal), c.wol && f('wol', c.wol, S.wol), f('sol', c.sol, S.solari)].filter(Boolean).join(' '); };
function abilityHtml(ab, kind) {
  const meta = [kind];
  if (ab.cd) meta.push(`перезарядка ${ab.cd}`);
  if (ab.spice) meta.push(`${ab.spice} Пряности`);
  if (ab.dt) meta.push(DT[ab.dt]);
  return `<div class="ab"><h4>${ab.n}<span class="tag">${meta.join(' · ')}</span></h4><p>${fxText(ab.d)}</p></div>`;
}
function slotState(cid, k) {
  const p = prog(cid), it = ITEMS[gearPlan(cid, p.gear)[k]], have = S.inv[it.id] || 0, need = FRAG_NEED[it.t], c = CRAFT(it.t);
  if (p.eq[k]) return { it, st: 'eq', have, need };
  if (have >= need) return { it, st: S.solari >= c.sol && S.plast >= c.pl ? 'ready' : 'frags', have, need };
  return { it, st: have ? 'part' : 'none', have, need };
}
function slotBtn(cid, k) {
  const s = slotState(cid, k);
  const badge = s.st === 'eq' ? '<span class="sb ok">✓</span>' : s.st === 'ready' ? '<span class="sb go">+</span>' : '';
  return `<button class="gslot ${s.st}" data-slot="${cid}:${k}" aria-label="${s.it.n}: ${s.st === 'eq' ? 'надет' : `фрагменты ${s.have} из ${s.need}`}">
    ${itemIcon(s.it, 0)}${badge}
    ${s.st !== 'eq' ? `<span class="gprog"><i style="width:${Math.min(100, s.have / s.need * 100)}%"></i></span>` : ''}
  </button>`;
}
let DETAIL_BACK = null, SQ_LP = 0;
const SKI = { passive: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>', leader: '<path d="M4 18h16l-1.5-9-4 3.5L12 6l-2.5 6.5-4-3.5z" fill="currentColor"/><rect x="4" y="19" width="16" height="2" rx="1" fill="currentColor"/>' };
function skIcon(d, k) { return skillSvg(d, k); }
function lvlCost(from, to) { let c = 0; for (let l = from; l < to; l++) c += LVL_COST(l); return c; }
function lvlAffordMax(p, cap) { let l = p.lvl, sol = S.solari; while (l < cap && sol >= LVL_COST(l)) { sol -= LVL_COST(l); l++; } return l; }
let itemCtx = null;
function openItem(cid, k) {
  itemCtx = { cid, k };
  const p = prog(cid), s = slotState(cid, k), it = s.it, c = CRAFT(it.t);
  let craft;
  if (s.st === 'eq') craft = `<button class="btn" disabled>Надето</button>`;
  else if (s.have >= s.need) craft = `<button class="btn go" data-craft="1" ${S.solari >= c.sol && S.plast >= c.pl && p.stars ? '' : 'disabled'}>${p.stars ? 'Собрать и надеть' : 'Персонаж не открыт'}<small>${amt('frag', s.need)} ${amt('sol', c.sol)} ${amt('pl', c.pl)}</small></button>`;
  else craft = `<button class="btn" disabled>Не хватает ${s.need - s.have}<small>${amt('frag', s.have + '/' + s.need)}</small></button>`;
  const rows = itemSourceRows(it);
  // v73: над карточкой героя — слоем в #overlay2 (карточка и её 3D остаются под окном, кадр на паузе); без карточки — как раньше, в #overlay
  const top = !!$('#overlay .csheet'), host = top ? '#overlay2' : '#overlay';
  if (top) { set_infoKey(null); heroHold(true); set_INFO_ON_CLOSE(() => heroHold(false)); }
  $(host).innerHTML = `<div class="detail${top ? ' info-layer' : ''}" ${top ? 'data-iclose' : 'data-close'}="1"><div class="sheet isheet" role="dialog" aria-modal="true" aria-labelledby="it-name">
    <button class="btn mini back" data-iback="${cid}">← ${CH[cid].sn}</button>
    <div class="ihead">${itemIcon(it, 72)}<div><h3 id="it-name">${it.n}</h3>
      <div style="color:${TIER_COL[it.t]};font-size:12px;text-transform:uppercase;letter-spacing:.12em">${TIER_NAME[it.t]} · уровень ${ROMAN[it.t]}</div>
      <div style="color:var(--dust);font-size:12px">Ячейка ${k + 1} · даёт 1/6 прибавки снаряжения ${ROMAN[p.gear]} (≈+1,2% ко всем характеристикам)</div></div></div>
    <div class="fbar"><span>Фрагменты</span><div class="gprog big"><i style="width:${Math.min(100, s.have / s.need * 100)}%"></i></div><b class="mono">${amt('frag', s.have + '/' + s.need)}</b></div>
    <div class="acts" style="margin-top:8px">${craft}</div>
    <p class="chap" style="margin-top:18px">Где найти</p>
    <div class="srcs">${rows.join('') || '<p class="sub">Источников пока нет.</p>'}</div>
  </div></div>`;
  document.querySelectorAll(host + ' canvas[data-scene]').forEach(sceneThumb);
}
function closeOverlay() { DETAIL_BACK = null; $('#overlay').innerHTML = ''; if (typeof renderNotes === 'function') setTimeout(renderNotes, 0); }

function set_DETAIL_BACK(v) { return DETAIL_BACK = v; }
function set_SQ_LP(v) { return SQ_LP = v; }
export { SK_NAME, costHtml, abilityHtml, slotState, slotBtn, DETAIL_BACK, SQ_LP, SKI, skIcon, lvlCost, lvlAffordMax, itemCtx, openItem, closeOverlay, set_DETAIL_BACK, set_SQ_LP };
