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
  if (o.sim) {
    const sim = o.sim, focus = sim.focus;
    const f = focus ? `<section class="ge2-focus" role="status" aria-label="Прогресс искомого предмета">
      <div class="ge2-eyebrow">Искомый ${focus.kind === 'part' ? 'фрагмент рецепта' : focus.kind === 'shard' ? 'осколок' : 'предмет'}</div>
      <div class="ge2-focus-name">${focus.icon || ''}<div><b>${focus.name}</b><small>${focus.breadcrumb || ''}</small></div></div>
      <div class="ge2-progress"><span>Собрано ${Math.min(focus.need, focus.owned + focus.legacy)} / ${focus.need}</span><strong>${focus.remaining ? 'Осталось ' + focus.remaining : 'Достаточно для сборки'}</strong></div>
      <div class="ge2-meter"><i style="width:${focus.need ? Math.min(100, (focus.owned + focus.legacy) / focus.need * 100) : 100}%"></i></div>
      <div class="ge2-metrics"><div><b>+${focus.gained}</b><small>за запуск</small></div><div><b>${focus.owned}</b><small>в запасе</small></div><div><b>${focus.need}</b><small>нужно</small></div></div>
      ${focus.legacy ? `<div class="ge2-legacy">Старые универсальные: ${focus.legacy} (общий запас на оба компонента)</div>` : ''}
    </section>` : '<section class="ge2-focus ge2-empty"><b>Симуляция завершена</b><span>Все полученные награды — справа</span></section>';
    const tiles = sim.tiles.map(t => `<div class="ge2-tile" title="${t.label}">
      <div class="ge2-icon">${t.icon}</div><b>${t.amount}</b><small>${t.label}</small></div>`).join('');
    const el = document.createElement('div'); el.id = 'rwwin'; el.className = 'result won rwwin ge2-result';
    el.innerHTML = `<div class="box ge2-box" role="dialog" aria-modal="true" aria-labelledby="ge2-title">
      <header class="ge2-head"><div><h3 id="ge2-title">${title}</h3><div class="ge2-sub">${sim.mission} · потрачено ${sim.spent}</div></div><span class="ge2-spent">${sim.spent}</span></header>
      <div class="ge2-main">${f}<section class="ge2-other"><h4>Остальные награды</h4><div class="ge2-tiles" aria-label="Награды симуляции">${tiles || '<p>Других наград нет</p>'}</div></section></div>
      <footer class="ge2-actions"><span class="ge2-return">${focus?.kind === 'part' ? 'После «Готово» вернуться к компоненту' : 'Награды добавлены в запас'}</span>
      <div>${o.btns || ''}<button class="btn" data-rwok="1">${o.ok || 'Готово'}</button></div></footer>
    </div>`;
    document.body.appendChild(el);
    return;
  }
  const focus = o.focusItem && ITEMS[o.focusItem];
  const focusHtml = focus ? `<div class="e3reward-focus" role="status">
    ${itemIcon(focus, 26)} <span>Искомый предмет: <b>${focus.n}</b></span>
    <span class="mono">В запасе ${(o.inv || {})[focus.id] || 0}</span></div>` : '';
  const rewardLines = lines.map(l => focus && l.includes(focus.n)
    ? `<li class="e3reward-hit">${l}</li>` : `<li>${l}</li>`).join('');
  const el = document.createElement('div'); el.id = 'rwwin'; el.className = 'result won rwwin' + (o.cls ? ' ' + o.cls : '');
  el.innerHTML = `<div class="box" role="dialog" aria-modal="true"><div class="mousewrap">${MOUSE_SVG(false)}</div><h3>${title}</h3>${focusHtml}${o.sub ? `<div style="color:var(--dust)">${o.sub}</div>` : ''}<ul>${rewardLines}</ul><div class="acts" style="justify-content:center">${o.btns || ''}<button class="btn ${o.btns ? '' : 'go'}" data-rwok="1">${o.ok || 'Забрать'}</button></div></div>`;
  document.body.appendChild(el);
}

function giveRewards(list) {
  return applyRewards(list).map(r => r.k === 'shard' ? `+${amt('shard', r.q, 'shard:' + r.id)} ${CH[r.id].sn}${r.unlocked ? ' — персонаж открыт!' : ''}` : `+${amt(r.k, r.q)} ${RW_NAME[r.k]}`);
}
const rewardsHtml = list => rwGrid(list, { sm: 1 });
function accXP(n) { return accGain(n).map(L => `<b class="acclv">Уровень аккаунта ${L}!</b>`); }
function fragLines(list) {
  const agg = {};
  for (const [id,q] of list) agg[id] = (agg[id] || 0) + q;
  const partNames = {core:'Сердечник',lens:'Линза',frame:'Каркас',fitting:'Крепление',lining:'Подкладка',seal:'Печать'};
  return Object.entries(agg).map(([id,q]) => {
    const complete = id.startsWith('gear:');
    const parts = id.startsWith('frag:') ? id.split(':') : null;
    const item = ITEMS[complete ? id.slice(5) : parts ? parts[1] : id];
    if (!item) return '';
    const title = complete ? 'Готовое снаряжение: ' + item.n
      : parts ? 'Фрагменты «' + (partNames[parts[2]] || parts[2]) + '» — ' + item.n
      : 'Универсальные фрагменты: ' + item.n;
    return `+${amt('frag',q,'frag:' + item.id)} ${itemIcon(item,18)} ${title}`;
  }).filter(Boolean);
}


export { rewardWin, giveRewards, rewardsHtml, accXP, fragLines };
