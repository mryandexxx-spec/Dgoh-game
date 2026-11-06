// ui/views/shop.js — строки 4020–4071 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { cqShopView } from './conq.js';
import './legend.js'; // порядок исполнения
import { RW_NAME } from '../rewards.js';
import { RES_INFO } from '../overlays/info.js';
import { $, getRes, prog } from '../../core/util.js';
import { S } from '../../core/state.js';
import { amt, ic } from '../../core/save.js';
import { FRAG_NEED, ITEMS, SHOP_FRAG, TIER_COL, gearPlan, itemIcon } from '../../logic/gear.js';
import { ROSTER_IDS, todayKey } from '../../logic/economy.js';
import { sRng } from '../../render2d/scenes.js';
import { portrait } from '../../render2d/figures.js';
import { ghash } from '../../data/looks.js';
import { CH } from '../../data/chars.js';

const SHOPS = {
  post: { n: 'Торговый пост', d: 'Обычный магазин Империума: солярии и кристаллы. Ассортимент осколков обновляется каждый день.' },
  sietch: { n: 'Лавка сиетча', d: 'Магазин рейда: зубы Шаи-Хулуда меняют на осколки, материалы и фрагменты редкого снаряжения.' },
  chron: { n: 'Лавка хроник', d: 'Магазин Хроник Дюны: ридулианские кристаллы меняют на осколки любых героев, материалы прокачки, Печати и Воду жизни.' },
  ring: { n: 'Водохранилище', d: 'Хранители воды племени: лишние осколки героев на 7★ становятся водяными кольцами, а кольца — осколками тех, кому ещё расти.' },
};
function buysToday() { if (S.buys.d !== todayKey()) S.buys = { d: todayKey(), n: {} }; return S.buys.n; }
const shopLeft = it => it.lim ? Math.max(0, it.lim - (buysToday()[it.key] || 0)) : -1;
function dailyHeroes(tag, n) { const r = sRng(ghash(todayKey() + tag)), pool = ROSTER_IDS.filter(id => !CH[id].legendary); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out; }
function shopItems(sk) {
  if (sk === 'post') return [
    { key: 'post:pl', kind: 'pl', qty: 5, cur: 'sol', price: 6000, lim: 3 }, { key: 'post:folio', kind: 'folio', qty: 3, cur: 'sol', price: 7500, lim: 3 },
    { key: 'post:water', kind: 'water', qty: 60, cur: 'sol', price: 9000, lim: 2 }, { key: 'post:sol', kind: 'sol', qty: 20000, cur: 'cry', price: 150, lim: 2 },
    { key: 'post:candle', kind: 'candle', qty: 60, cur: 'cry', price: 60, lim: 2 }, { key: 'post:seal', kind: 'seal', qty: 1, cur: 'cry', price: 400, lim: 1 },
    ...dailyHeroes('post', 4).map(id => ({ key: 'post:sh:' + id, kind: 'sh', id, qty: 5, cur: 'cry', price: 90, lim: 1 }))];
  if (sk === 'sietch') return [
    ...['paul', 'jessica', 'gurney', 'stilgar', 'chani', 'kynes', 'leto', 'duncan', 'thufir', 'fedaykin'].map(id => ({ key: 'sietch:sh:' + id, kind: 'sh', id, qty: 5, cur: 'teeth', price: 60, lim: 0 })),
    { key: 'sietch:pl', kind: 'pl', qty: 5, cur: 'teeth', price: 80, lim: 0 }, { key: 'sietch:sol', kind: 'sol', qty: 5000, cur: 'teeth', price: 50, lim: 0 },
    { key: 'sietch:folio', kind: 'folio', qty: 5, cur: 'teeth', price: 40, lim: 0 }, { key: 'sietch:seal', kind: 'seal', qty: 1, cur: 'teeth', price: 300, lim: 1 }, { key: 'sietch:core', kind: 'core', qty: 1, cur: 'teeth', price: 150, lim: 2 }];
  if (sk === 'ring') { const r = sRng(ghash(todayKey() + 'ring')), pool = ROSTER_IDS.filter(id => !CH[id].legendary && !CH[id].conquest && prog(id).stars < 7), hs = [];
    while (hs.length < 6 && pool.length) hs.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return [...hs.map(id => ({ key: 'ring:sh:' + id, kind: 'sh', id, qty: 5, cur: 'wring', price: 120, lim: 3 })),
      { key: 'ring:folio', kind: 'folio', qty: 5, cur: 'wring', price: 60, lim: 5 }, { key: 'ring:pl', kind: 'pl', qty: 10, cur: 'wring', price: 80, lim: 5 },
      { key: 'ring:core', kind: 'core', qty: 1, cur: 'wring', price: 150, lim: 3 }, { key: 'ring:seal', kind: 'seal', qty: 1, cur: 'wring', price: 400, lim: 1 }, { key: 'ring:wol', kind: 'wol', qty: 1, cur: 'wring', price: 2000, lim: 1 }]; }
  return [
    ...dailyHeroes('chron', 6).map(id => ({ key: 'chron:sh:' + id, kind: 'sh', id, qty: 5, cur: 'rid', price: 60, lim: 2 })),
    { key: 'chron:folio', kind: 'folio', qty: 5, cur: 'rid', price: 40, lim: 5 }, { key: 'chron:sol', kind: 'sol', qty: 10000, cur: 'rid', price: 50, lim: 3 },
    { key: 'chron:seal', kind: 'seal', qty: 1, cur: 'rid', price: 250, lim: 1 }, { key: 'chron:wol', kind: 'wol', qty: 1, cur: 'rid', price: 1500, lim: 1 }, { key: 'chron:core', kind: 'core', qty: 1, cur: 'rid', price: 120, lim: 3 }];
}
const findShopItem = key => shopItems(key.split(':')[0]).find(x => x.key === key);
function shopFragsHtml() {
  const need = new Map();
  for (const cid of S.squad) { const p = prog(cid); gearPlan(cid, p.gear).forEach((id, k) => { if (!p.eq[k] && ITEMS[id].t >= 6) need.set(id, (need.get(id) || []).concat(CH[cid].sn)); }); }
  return `<p class="chap" style="margin:22px 0 8px">Фрагменты снаряжения VI–XIII</p>` +
    (need.size ? `<div class="shop">${[...need].map(([id, who]) => { const it = ITEMS[id], have = S.inv[id] || 0;
      return `<div class="item">${itemIcon(it, 40)}<div class="t">${it.n}</div><div class="s">${who.join(', ')} · есть ${amt('frag', have + '/' + FRAG_NEED[it.t])}</div><button class="btn" data-fbuy="${id}:1" ${S.teeth >= SHOP_FRAG[it.t] ? '' : 'disabled'}>1 за ${amt('teeth', SHOP_FRAG[it.t])}</button></div>`; }).join('')}</div>`
      : `<p class="sub">Сейчас героям отряда не нужны предметы VI–XIII.</p>`);
}
function renderShop() {
  if (S.shopTab === 'jihad') return cqShopView();
  const sk = SHOPS[S.shopTab] ? S.shopTab : 'post', cur = { post: ['sol', 'cry'], sietch: ['teeth'], chron: ['rid'], ring: ['wring'] }[sk];
  const msLeft = new Date(new Date().setHours(24, 0, 0, 0)) - Date.now();
  $('#view').innerHTML = `<h2 class="lshide">Лавки</h2>
    <div class="ctabs">${Object.entries(SHOPS).map(([k, v]) => `<button class="ctab ${k === sk ? 'on' : ''}" data-shoptab="${k}">${v.n}<small>${{ post: ic('sol') + ic('cry'), sietch: ic('teeth'), chron: ic('rid'), ring: ic('wring') }[k]}</small></button>`).join('')}<button class="ctab" data-shoptab="jihad">Джихад<small>${ic('jt')}</small></button></div>
    <p class="sub">${SHOPS[sk].d} У вас: ${cur.map(c => amt(c, getRes(c))).join(' ')}. Лимиты обновятся через ${Math.floor(msLeft / 3.6e6)} ч ${Math.floor(msLeft % 3.6e6 / 6e4)} мин.</p>
    <div class="shop">${shopItems(sk).map(it => { const left = shopLeft(it), sold = left === 0, can = getRes(it.cur) >= it.price && !sold;
      const t = it.kind === 'sh' ? `${amt('shard', it.qty, 'shard:' + it.id)} ${CH[it.id].sn}` : `${amt(it.kind, it.qty)} ${RW_NAME[it.kind]}`;
      const sub = (it.kind === 'sh' ? (prog(it.id).stars ? `${prog(it.id).stars}★ · есть ${prog(it.id).shards}` : `закрыт · ${prog(it.id).shards}/10`) : RES_INFO[it.kind] ? RES_INFO[it.kind].n : 'материалы') + (it.lim ? ` · ${sold ? 'раскуплено' : `осталось ${left}`}` : '');
      return `<div class="item ${sold ? 'sold' : ''} ${it.kind === 'sh' ? 'side-' + CH[it.id].side : ''}">${it.kind === 'sh' ? portrait(CH[it.id], 44, prog(it.id).stars ? TIER_COL[prog(it.id).gear] : null) : `<span class="bigico sm">${ic(it.kind)}</span>`}<div class="t">${t}</div><div class="s">${sub}</div><button class="btn ${can ? '' : 'dim'}" data-buy="${it.key}" ${sold ? 'disabled' : ''}>${amt(it.cur, it.price)}</button></div>`; }).join('')}</div>
    ${sk === 'sietch' ? shopFragsHtml() : ''}`;
}


export { SHOPS, buysToday, shopLeft, dailyHeroes, shopItems, findShopItem, shopFragsHtml, renderShop };
