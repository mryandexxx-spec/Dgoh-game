// ui/views/squad.js — строки 3330–3364 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './camp.js'; // порядок исполнения
import { $, prog, squadPower, starStr } from '../../core/util.js';
import { S, filter } from '../../core/state.js';
import { TIER_COL } from '../../logic/gear.js';
import { ringCol, sideName, unlockNeed } from '../../logic/relics.js';
import { ROMAN, SHARDS_NEXT } from '../../logic/economy.js';
import { portrait } from '../../render2d/figures.js';
import { unitPower } from '../../logic/battle/stats.js';
import { CH, CHARS } from '../../data/chars.js';
import { FACTIONS, ROLES } from '../../data/fx.js';
import { fmt } from '../../core/format.js';

function nextShards(p) { return SHARDS_NEXT[p.stars] ?? null; }
const canStar = id => { const p = prog(id), n = nextShards(p); return !!(p.stars && n && p.shards >= n); };
function rosterList() {
  return CHARS.filter(c => !c.npc && (filter === 'all' || (filter === 'light' || filter === 'dark' ? c.side === filter : c.f.includes(filter)))).sort((a, b) => (prog(b.id).stars > 0) - (prog(a.id).stars > 0) || unitPower(b, prog(b.id)) - unitPower(a, prog(a.id)));
}
function renderSquad() {
  const sp = squadPower();
  let html = `<h2>Отряд</h2><p class="sub">Пять бойцов, первый — лидер: его лидерка действует весь бой на союзников своей фракции. Мощь отряда: <b class="mono">${fmt(sp)}</b>.</p><div class="slots">`;
  for (let i = 0; i < 5; i++) {
    const id = S.squad[i];
    if (id) {
      const d = CH[id], p = prog(id);
      html += `<button class="slot filled ${i === 0 ? 'lead' : ''}" data-open="${id}"><span class="lab">${i === 0 ? 'Лидер' : 'Слот ' + (i + 1)}</span>${portrait(d, 46, TIER_COL[p.gear])}<span class="nm">${d.sn}</span><span class="stars" style="font-size:10px">${'★'.repeat(p.stars)}</span></button>`;
    } else html += `<div class="slot"><span class="lab">${i === 0 ? 'Лидер' : 'Пусто'}</span></div>`;
  }
  html += `</div><div class="filters">`;
  html += [['all', 'Все', ''], ['light', 'Светлые', '--fc:var(--light)'], ['dark', 'Тёмные', '--fc:var(--dark)'], ...Object.entries(FACTIONS).map(([k, v]) => [k, v.n, `--fc:var(--${k})`])].map(([k, n, st]) => `<button data-filter="${k}" style="${st}" aria-pressed="${filter === k}">${n}</button>`).join('');
  html += `</div><div class="roster">`;
  const list = rosterList();
  for (const d of list) {
    const p = prog(d.id), locked = p.stars === 0, need = locked ? unlockNeed(d) : nextShards(p), cs = canStar(d.id), eqN = p.eq.filter(Boolean).length;
    html += `<button class="rc side-${d.side} ${d.legendary ? 'legend' : ''} ${locked ? 'lockd' : ''} ${S.squad.includes(d.id) ? 'insq' : ''} ${cs ? 'canstar' : ''}" data-open="${d.id}">${d.legendary ? `<span class="lgrib">${d.conquest ? 'Джихад' : 'Легенда'}</span>` : ''}${cs ? '<span class="csbadge">★ Повысить</span>' : ''}
      <span class="rctop">${portrait(d, 58, p.stars ? ringCol(p) : null)}${locked ? '' : `<span class="rclv"><b>${p.lvl}</b><small>ур.</small></span>${p.relic ? `<span class="rcrel">ДП${p.relic}</span>` : ''}`}</span>
      <span class="nm">${d.n}</span>
      <span class="rl"><span class="sidetag ${d.side}">${sideName(d)}</span> ${ROLES[d.role]}${d.leader ? ' · лидер' : ''}${d.prof ? ' · ' + d.prof : ''}</span>
      ${locked ? `<span class="row"><span>Закрыт${d.legendary ? ' · откроется на 7★' : ''}</span><span class="mono">${p.shards}/${need}</span></span>` :
        `<span class="row"><span class="stars" style="font-size:11px">${starStr(p.stars)}</span><span class="mono">${fmt(unitPower(d, p))}</span></span>
         <span class="row geq" style="--tc:${TIER_COL[p.gear]}"><span>Снаряж. ${ROMAN[p.gear]}</span><span class="gpips" title="Надето ${eqN} из 6">${p.eq.map(e => `<i class="${e ? 'on' : ''}"></i>`).join('')}<b class="mono">${eqN}/6</b></span></span>`}
      ${need ? `<span class="shbar" title="Осколки ${p.shards}/${need}"><i style="width:${Math.min(100, p.shards / need * 100)}%"></i></span>` : ''}
    </button>`;
  }
  html += `</div>`;
  $('#view').innerHTML = html;
}


export { nextShards, canStar, rosterList, renderSquad };
