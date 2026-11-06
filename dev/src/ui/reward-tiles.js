// ui/reward-tiles.js — строки 5164–5199 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './overlays/battle-settings.js'; // порядок исполнения
import { SHCONV, SHCONV_T, set_SHCONV } from './overlays/squad-select.js';
import { prog } from '../logic/progress.js';
import { ITEMS, TIER_COL } from '../logic/gear.js';
import { portrait } from '../render2d/figures.js';
import { CH } from '../data/chars.js';
import { RW_NAME } from '../logic/economy.js';
import { fmt, ic } from '../core/format.js';
import { itemIcon } from './common.js';

// ===================== reward tiles (one look everywhere) =====================
const RW_TITLE = { wring: 'Вод. кольца', core: 'Др. память', sol: 'Солярии', pl: 'Пласталь', cry: 'Кристаллы', folio: 'Фолианты', seal: 'Печать', wol: 'Вода жизни', teeth: 'Зубы червя', water: 'Вода', candle: 'Свечи', rid: 'Ридулиан' };
const RW_RARE = { wring: 'rare', core: 'epic', seal: 'epic', wol: 'leg', rid: 'rare', folio: 'rare', cry: 'rare' };
function rwTile(k, q, id, o = {}) {
  const qs = typeof q === 'number' ? fmt(q) : q, sm = o.sm ? ' sm' : '';
  if (k === 'shard' && CH[id]) { const d = CH[id], p = prog(id);
    return `<div class="rwt rk-shard${sm} ${o.unlock ? 'unl' : ''}" data-info="shard:${id}" style="--d:${o.i || 0}"><span class="rwa">${portrait(d, o.sm ? 34 : 54, p.stars ? TIER_COL[p.gear] : null)}<span class="rwbadge">${ic('shard')}</span></span><b class="rwq">×${qs}</b><span class="rwc">${d.sn}</span>${o.unlock ? '<span class="rwnew">Открыт!</span>' : ''}</div>`; }
  if (k === 'frag' && ITEMS[id]) { const it = ITEMS[id];
    return `<div class="rwt rk-frag t${it.t}${sm}" data-info="frag:${id}" style="--d:${o.i || 0}"><span class="rwa">${itemIcon(it, o.sm ? 30 : 46)}<span class="rwbadge">${ic('frag')}</span></span><b class="rwq">×${qs}</b><span class="rwc">${it.n}</span></div>`; }
  return `<div class="rwt rk-res r-${RW_RARE[k] || 'com'}${sm}" data-info="${k}" style="--d:${o.i || 0}"><span class="rwa"><span class="rwmed">${ic(k)}</span></span><b class="rwq">${qs}</b><span class="rwc">${RW_TITLE[k] || RW_NAME[k] || k}</span></div>`;
}
const rwGrid = (list, o = {}) => `<div class="rwgrid${o.sm ? ' sm' : ''}">${list.map(([k, q, id], i) => rwTile(k, q, id, { ...o, i })).join('')}</div>`;
// turn "+<amt> caption" result lines into tiles, keep other lines as text
function tileize(root) {
  for (const ul of root.querySelectorAll('ul')) {
    if (ul.dataset.tiled) continue; ul.dataset.tiled = 1;
    const tiles = [];
    for (const li of [...ul.children]) {
      const amts = [...li.querySelectorAll('.amt[data-info]')], txt = li.textContent.trim();
      if (!amts.length || !txt.startsWith('+')) continue;
      const unlock = /открыт|присоединяется/i.test(txt);
      for (const a of amts) { const [kind, id] = a.dataset.info.split(':'), q = a.textContent.replace(/[^\d≈–\-.,\s]/g, '').trim().replace(/\s+/g, ' '); if (kind === 'shard' && !id) continue; tiles.push([kind, q || a.textContent.trim(), id, unlock && kind === 'shard']); }
      li.remove();
    }
    if (!tiles.length) continue;
    const g = document.createElement('div'); g.className = 'rwgrid';
    g.innerHTML = tiles.map(([k, q, id, u], i) => rwTile(k, q, id, { i, unlock: u })).join('');
    ul.parentNode.insertBefore(g, ul); if (!ul.children.length) ul.remove();
  }
  if (SHCONV > 0 && (root.matches && root.matches('.result') || root.querySelector && root.querySelector('.result .box'))) {
    const g = root.querySelector('.rwgrid'); if (g) { const n = SHCONV; set_SHCONV(0); clearTimeout(SHCONV_T);
      g.insertAdjacentHTML('beforeend', rwTile('wring', n, null, { i: g.children.length }));
      g.insertAdjacentHTML('afterend', '<p class="sub rwconv">Осколки героев на 7★ обменены на водяные кольца</p>'); } }
}
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { const r = n.matches && n.matches('.result, .detail') ? n : n.querySelector && n.querySelector('.result .box, .mgrid'); if (r) tileize(n); } }).observe(document.body, { childList: true, subtree: true });


export { RW_TITLE, RW_RARE, rwTile, rwGrid, tileize };
