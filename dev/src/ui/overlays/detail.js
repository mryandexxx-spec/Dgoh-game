// ui/overlays/detail.js — строки 3365–3549 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../views/squad.js'; // порядок исполнения
import { renderNotes } from '../notifications.js';
import { fxText } from '../fx-text.js';
import { itemSourceRows, set_INFO_ON_CLOSE, set_INFO_BACK, set_infoKey } from './info.js';
import { recipeFor, craftRequirements } from '../../logic/gear-crafting.js';
import { gearBonus } from '../../data/gear-bonuses.js';
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
  const p = prog(cid), it = ITEMS[gearPlan(cid, p.gear)[k]];
  const need = FRAG_NEED[it.t], recipe = recipeFor(it.id);
  const have = Math.min(need, (S.inv[it.id] || 0) +
    (S.gearOwned?.[it.id] || 0) * need +
    (recipe?.parts || []).reduce((sum, part) => sum +
      ((S.gearParts?.[part.id] || 0) ? part.materials[0].count :
        (S.inv[part.materials[0].id] || 0)), 0));
  const r = craftRequirements(it.id, S.inv, S.gearParts || {}, { sol: S.solari, pl: S.plast }, S.gearOwned || {});
  if (p.eq[k]) return { it, st: 'eq', have, need, recipe: r };
  if (r?.ready) return { it, st: 'ready', have, need, recipe: r };
  if (have >= need || r?.needs.some(n => (S.gearParts || {})[n.id])) return { it, st: 'frags', have, need, recipe: r };
  return { it, st: have ? 'part' : 'none', have, need, recipe: r };
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
const pct = n => (n * 100).toFixed(2).replace(/0+$/, '').replace(/[.]$/, '') + '%';
const statNames = { hp: 'Здоровье', shield: 'Щит', dmg: 'Урон', spd: 'Скорость', crit: 'Крит. шанс' };
function itemBonusHtml(it) {
  const bonus = gearBonus(it.kind) || {};
  return Object.entries(bonus).filter(([,v]) => v > 0).map(([k,v]) =>
    `<div><span>${statNames[k]}</span><b>+${k === 'spd' ? v.toFixed(2) : pct(v)}</b></div>`).join('');
}
function openItem(cid, k, partId = null) {
  itemCtx = { cid, k, partId };
  const p = prog(cid), s = slotState(cid, k), it = s.it;
  const recipe = recipeFor(it.id), needs = craftRequirements(it.id, S.inv, S.gearParts || {},
    { sol: S.solari, pl: S.plast }, S.gearOwned || {}), part = partId ? recipe.parts?.find(x => x.id === partId) : null;
  const top = !!$('#overlay .csheet'), host = top ? '#overlay2' : '#overlay';
  if (top) { set_infoKey(null); heroHold(true); set_INFO_ON_CLOSE(() => heroHold(false)); }
  const haveFrag = S.inv[it.id] || 0, complete = S.gearOwned?.[it.id] || 0;
  const pieces = (S.gearParts || {});
  const requirements = part
    ? `<div class="e3mat"><b>Фрагменты ${part.name.toLowerCase()}</b><span class="${haveFrag + (S.inv[part.materials[0].id] || 0) >= part.materials[0].count ? 'okc' : 'lackc'}">${(S.inv[part.materials[0].id] || 0) + haveFrag}/${part.materials[0].count}</span></div>`
    : recipe.parts
      ? recipe.parts.map(x => `<button class="e3mat" data-gearpart="${x.id}"><span>${x.name}</span><span class="${pieces[x.id] ? 'okc' : 'lackc'}">${pieces[x.id] || 0}/1</span><b>›</b></button>`).join('')
      : `<div class="e3mat"><b>Фрагменты</b><span class="${haveFrag >= s.need ? 'okc' : 'lackc'}">${haveFrag}/${s.need}</span></div>`;
  const cost = part ? part.cost : recipe.cost;
  const affordable = part ? haveFrag + (S.inv[part.materials[0].id] || 0) >= part.materials[0].count && S.solari >= cost.sol && S.plast >= cost.pl : needs.ready;
  const action = s.st === 'eq' && !part ? '<button class="btn" disabled>Надето</button>'
    : part ? `<button class="btn ${affordable ? 'buy' : 'lack'}" data-buildpart="${part.id}" ${affordable ? '' : 'disabled'}>Создать компонент</button>`
    : `<button class="btn ${affordable ? 'buy' : 'lack'}" data-craft="1" ${affordable && p.stars ? '' : 'disabled'}>${p.stars ? (complete ? 'Надеть готовое' : 'Создать и надеть') : 'Герой не открыт'}</button>`;
  const rows = itemSourceRows(it, part ? part.materials[0].id : null, part ? 'fragment' : 'complete');
  $(host).innerHTML = `<div class="detail${top ? ' info-layer' : ''}" ${top ? 'data-iclose' : 'data-close'}="1"><div class="sheet isheet e3sheet" role="dialog" aria-modal="true" aria-labelledby="it-name">
    <div class="e3crumb"><button class="btn mini back" data-iback="${cid}">‹ ${CH[cid].sn}</button>${part ? `<button class="btn mini" data-gearroot="1">› ${it.n}</button><span>› ${part.name}</span>` : '<span>› Снаряжение</span>'}</div>
    <div class="ihead">${itemIcon(it, 58)}<div><h3 id="it-name">${part ? part.name : it.n}</h3>
      <div style="color:${TIER_COL[it.t]};font-size:12px">${TIER_NAME[it.t]} · уровень ${ROMAN[it.t]}</div>
      <small>Ячейка ${k + 1} · ${part ? 'компонент рецепта' : 'индивидуальные бонусы снаряжения'}</small></div></div>
    <div class="e3grid"><div class="e3left">
      ${part ? '' : `<p class="chap">Характеристики</p><div class="e3stats">${itemBonusHtml(it)}</div>`}
      <p class="chap">Рецепт</p><div class="e3materials">${!part && complete ? `<div class="e3mat"><b>Готовых предметов</b><span class="okc">${complete}</span></div>` : ''}${requirements}</div>
      <div class="e3cost"><span>${complete && !part ? 'Готовый предмет · установка бесплатна' : 'Сборка'}</span>${complete && !part ? '' : `<b class="${S.solari < cost.sol ? 'lackc' : ''}">${amt('sol', cost.sol)}</b><b class="${S.plast < cost.pl ? 'lackc' : ''}">${amt('pl', cost.pl)}</b>`}</div>
      <div class="acts">${action}<button class="btn" data-gearfind="1">Найти</button></div>
    </div><div class="e3right"><p class="chap">Можно получить в</p>
      <div class="srcs">${rows.join('') || '<p class="sub">Источников готового предмета нет — требуется сборка.</p>'}</div>
    </div></div></div></div>`;
  document.querySelectorAll(host + ' canvas[data-scene]').forEach(sceneThumb);
}

function closeOverlay() { DETAIL_BACK = null; $('#overlay').innerHTML = ''; if (typeof renderNotes === 'function') setTimeout(renderNotes, 0); }

function set_DETAIL_BACK(v) { return DETAIL_BACK = v; }
function set_SQ_LP(v) { return SQ_LP = v; }
export { SK_NAME, costHtml, abilityHtml, slotState, slotBtn, DETAIL_BACK, SQ_LP, SKI, skIcon, lvlCost, lvlAffordMax, itemCtx, openItem, closeOverlay, set_DETAIL_BACK, set_SQ_LP };
