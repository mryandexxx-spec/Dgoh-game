// ui/views/squad.js — экран «Персонажи» (ростер, пакет 4). Сетка строится один раз при входе;
// фильтр и сортировка (logic/roster.js) только переставляют готовые узлы и меняют hidden — без пересборки innerHTML.
import '../portrait.js'; // порядок исполнения
import { prog } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { SHARDS_NEXT } from '../../logic/economy.js';
import { unitPower } from '../../logic/battle/stats.js';
import { ROSTER_DEF, ROSTER_SIDES, ROSTER_SORTS, rosterMatch, rosterView } from '../../logic/roster.js';
import { CH, CHARS } from '../../data/chars.js';
import { FACTIONS, ROLES } from '../../data/fx.js';
import { fmt } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { ptRound, ptShards } from '../portrait.js';

function nextShards(p) { return SHARDS_NEXT[p.stars] ?? null; }
const canStar = id => { const p = prog(id), n = nextShards(p); return !!(p.stars && n && p.shards >= n); };

// выбранные фильтр и сортировка — настройка интерфейса, в localStorage (не в сохранении)
const RKEY = 'dune-roster';
let RO = (() => { try { const o = JSON.parse(localStorage.getItem(RKEY) || 'null'); if (o && typeof o === 'object') return { ...ROSTER_DEF, ...o }; } catch (e) {} return { ...ROSTER_DEF }; })();
const roSave = () => { try { localStorage.setItem(RKEY, JSON.stringify(RO)); } catch (e) {} };

// порядок героев на экране (и для листания в карточке героя)
function rosterList() { const v = rosterView(RO); return [...v.open, ...v.locked].map(id => CH[id]); }

const SIDE_N = { light: 'Светлые', dark: 'Тёмные', mach: 'Машины' };
const fName = f => f === 'all' ? 'Все' : SIDE_N[f] || (FACTIONS[f] && FACTIONS[f].n) || f;
const rName = r => r === 'all' ? 'Все' : ROLES[r] || r;
const heroes = () => CHARS.filter(c => !c.npc);

function renderSquad() {
  const all = heroes(), open = all.filter(c => prog(c.id).stars), lead = S.squad[0];
  const total = open.reduce((s, c) => s + unitPower(c, prog(c.id)), 0);
  const cnt = (f, r) => all.filter(c => rosterMatch(c, f, r)).length;
  const opt = (k, v, n, on, extra = '') => `<button class="ropt" data-${k}="${v}" aria-pressed="${on}">${extra}${n}<small>${k === 'rs' ? '' : k === 'rf' ? cnt(v, 'all') : cnt('all', v)}</small></button>`;
  const dot = c => `<i style="--c:var(--${c})"></i>`;
  let h = `<div class="ros">
  <div class="rhead"><span class="rpw"><b class="mono">${fmt(total)}</b><small>мощь · открыто ${open.length}/${all.length}</small></span><span class="rsp"></span>
    <button class="rdd${RO.f !== 'all' ? ' on' : ''}" data-rdd="f"><span class="lbl">Фракция:</span> <b id="rdd-f">${fName(RO.f)}</b></button>
    <button class="rdd${RO.r !== 'all' ? ' on' : ''}" data-rdd="r"><span class="lbl">Роль:</span> <b id="rdd-r">${rName(RO.r)}</b></button>
    <button class="rdd" data-rdd="s"><span class="lbl">Сорт.:</span> <b id="rdd-s">${ROSTER_SORTS[RO.s]}</b></button>
    <button class="rscrim" data-rdd="0" hidden aria-label="Закрыть"></button>
    <div class="rpop" id="rpop-f" hidden><h4>Сторона</h4><div class="ropts">${opt('rf', 'all', 'Все', RO.f === 'all')}${ROSTER_SIDES.map(s => opt('rf', s, SIDE_N[s], RO.f === s, dot(s))).join('')}</div>
      <h4>Фракция</h4><div class="ropts">${Object.entries(FACTIONS).map(([k, v]) => opt('rf', k, v.n, RO.f === k, dot(k))).join('')}</div></div>
    <div class="rpop" id="rpop-r" hidden><h4>Роль</h4><div class="ropts">${opt('rr', 'all', 'Все', RO.r === 'all')}${Object.entries(ROLES).map(([k, v]) => opt('rr', k, v, RO.r === k)).join('')}</div></div>
    <div class="rpop" id="rpop-s" hidden><h4>Сортировка открытых</h4><div class="ropts">${Object.entries(ROSTER_SORTS).map(([k, v]) => opt('rs', k, v, RO.s === k)).join('')}</div></div>
  </div><div class="rgrid" id="rgrid">`;
  for (const d of all) {
    const p = prog(d.id), inSq = S.squad.includes(d.id);
    h += `<button class="hc${p.stars ? '' : ' lockd'}" data-open="${d.id}" data-hc="${d.id}">${ptRound(d, p, { lead: d.id === lead })}<span class="nm">${inSq ? '<i class="sq"></i>' : ''}${d.n}</span>${ptShards(d, p)}</button>`;
  }
  h += `<div class="rdiv" id="rdiv">Не открыты · <span id="rdiv-n"></span></div><div class="rempty" id="rempty" hidden>Нет героев с такими условиями <button class="btn mini" data-rreset="1">Сбросить</button></div></div></div>`;
  $('#view').innerHTML = h;
  rosterApply();
}

// перестановка узлов по rosterView: append переносит существующие узлы, скрытые — hidden
function rosterApply() {
  const g = $('#rgrid'); if (!g) return;
  const v = rosterView(RO), show = new Set([...v.open, ...v.locked]), nodes = {};
  for (const el of g.querySelectorAll('[data-hc]')) { nodes[el.dataset.hc] = el; el.hidden = !show.has(el.dataset.hc); }
  const div = $('#rdiv'), emp = $('#rempty');
  g.append(...v.open.map(id => nodes[id]), div, ...v.locked.map(id => nodes[id]), emp);
  div.hidden = !v.locked.length || !v.open.length; $('#rdiv-n').textContent = v.locked.length;
  emp.hidden = show.size > 0;
}

function rosterPop(k) {
  for (const x of ['f', 'r', 's']) { const p = $('#rpop-' + x); if (p) p.hidden = x !== k; }
  for (const b of document.querySelectorAll('.rdd')) b.classList.toggle('open', b.dataset.rdd === k);
  const sc = document.querySelector('.rscrim'); if (sc) sc.hidden = !['f', 'r', 's'].includes(k);
}

function rosterSet(k, v) {
  RO = { ...RO, [k]: v }; roSave();
  const pk = { f: 'rf', r: 'rr', s: 'rs' }[k];
  for (const b of document.querySelectorAll(`[data-${pk}]`)) b.setAttribute('aria-pressed', b.dataset[pk] === v);
  const lb = $('#rdd-' + k); if (lb) lb.textContent = k === 'f' ? fName(v) : k === 'r' ? rName(v) : ROSTER_SORTS[v];
  for (const b of document.querySelectorAll('.rdd')) b.classList.toggle('on', (b.dataset.rdd === 'f' && RO.f !== 'all') || (b.dataset.rdd === 'r' && RO.r !== 'all'));
  rosterApply();
}

// клики экрана; true — обработано
function rosterClick(d) {
  if (d.rdd !== undefined) { const open = document.querySelector(`.rdd.open[data-rdd="${d.rdd}"]`); rosterPop(open ? null : d.rdd); return true; }
  if (d.rf) { rosterSet('f', d.rf); rosterPop(null); return true; }
  if (d.rr) { rosterSet('r', d.rr); rosterPop(null); return true; }
  if (d.rs) { rosterSet('s', d.rs); rosterPop(null); return true; }
  if (d.rreset) { rosterSet('f', 'all'); rosterSet('r', 'all'); return true; }
  return false;
}

export { nextShards, canStar, rosterList, renderSquad, rosterClick };
