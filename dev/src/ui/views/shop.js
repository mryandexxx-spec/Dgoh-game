// ui/views/shop.js — строки 4020–4071 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './legend.js'; // порядок исполнения
import { renderRecycler } from '../recycler-screen.js';
import { cqShopView } from './conq.js';
import { RES_INFO } from '../overlays/info.js';
import { getRes, prog } from '../../logic/progress.js';
import { S, view } from '../../core/state.js';
import { FRAG_NEED, ITEMS, SHOP_FRAG, TIER_COL, gearPlan } from '../../logic/gear.js';
import { PARTS_BY_KIND, partFragId } from '../../data/gear-recipes.js';
import { ROSTER_IDS, RW_NAME, todayKey } from '../../logic/economy.js';
import { portrait } from '../../render2d/figures.js';
import { ghash } from '../../data/looks.js';
import { CH } from '../../data/chars.js';
import { amt, ic, fmt } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { sRng } from '../../core/rng.js';
import { itemIcon } from '../common.js';
import { marketOffers, catalogPage, captureIntent, revalidateIntent } from './shop-catalog.js';
import { assetUrl } from '../../assets/models.js';

const SHOPS = {
  post: { n: 'Торговый пост', d: 'Обычный магазин Империума: солярии и камни су. Ассортимент осколков обновляется каждый день.' },
  sietch: { n: 'Лавка сиетча', d: 'Магазин рейда: зубы Шаи-Хулуда меняют на осколки, материалы и фрагменты редкого снаряжения.' },
  chron: { n: 'Лавка хроник', d: 'Магазин Хроник Дюны: ридулианские кристаллы меняют на осколки любых героев, материалы прокачки, Печати и Воду жизни.' },
  ring: { n: 'Водохранилище', d: 'Хранители воды племени: лишние осколки героев на 7★ становятся водяными кольцами, а кольца — осколками тех, кому ещё расти.' },
};
function buysToday() {
  const next = todayKey.dayLedgerSelect(S.buys, todayKey());
  if (!next) return null; // never charge for an untrackable daily limit
  S.buys = next;
  return next.n;
}
// Pure stock display reads the active OR archived count for this local day.
const shopLeft = it => {
  if (!it.lim) return -1;
  const n = todayKey.dayLedgerRead(S.buys, todayKey());
  return n ? Math.max(0, it.lim - (n[it.key] || 0)) : 0;
};
// BH9.7 event-exclusive shards must not leak into rotating shops.
// Keep legacy shop RNG pools stable as characters are registered in CHARS.
const STORY_EXCLUSIVE_HEROES = new Set(['margot', 'yue']);
const shopHeroPool = () => ROSTER_IDS.filter(id => !STORY_EXCLUSIVE_HEROES.has(id));
function dailyHeroes(tag, n) { const r = sRng(ghash(todayKey() + tag)), pool = shopHeroPool().filter(id => !CH[id].legendary); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); return out; }
function shopItems(sk) {
  if (sk === 'post') return [
    { key: 'post:pl', kind: 'pl', qty: 5, cur: 'sol', price: 6000, lim: 3 }, { key: 'post:folio', kind: 'folio', qty: 3, cur: 'sol', price: 7500, lim: 3 },
    { key: 'post:water', kind: 'water', qty: 60, cur: 'sol', price: 9000, lim: 2 }, { key: 'post:sol', kind: 'sol', qty: 20000, cur: 'cry', price: 150, lim: 2 },
    { key: 'post:candle', kind: 'candle', qty: 60, cur: 'cry', price: 60, lim: 2 }, { key: 'post:seal', kind: 'seal', qty: 1, cur: 'cry', price: 400, lim: 1 }, { key: 'post:blood_echo', kind: 'blood_echo', qty: 5, cur: 'cry', price: 80, lim: 2 },
    ...dailyHeroes('post', 4).map(id => ({ key: 'post:sh:' + id, kind: 'sh', id, qty: 5, cur: 'cry', price: 90, lim: 1 }))];
  if (sk === 'sietch') return [
    ...['paul', 'jessica', 'gurney', 'stilgar', 'chani', 'kynes', 'leto', 'duncan', 'thufir', 'fedaykin'].map(id => ({ key: 'sietch:sh:' + id, kind: 'sh', id, qty: 5, cur: 'teeth', price: 60, lim: 0 })),
    { key: 'sietch:pl', kind: 'pl', qty: 5, cur: 'teeth', price: 80, lim: 0 }, { key: 'sietch:sol', kind: 'sol', qty: 5000, cur: 'teeth', price: 50, lim: 0 },
    { key: 'sietch:folio', kind: 'folio', qty: 5, cur: 'teeth', price: 40, lim: 0 }, { key: 'sietch:seal', kind: 'seal', qty: 1, cur: 'teeth', price: 300, lim: 1 }, { key: 'sietch:ix_plate', kind: 'ix_plate', qty: 3, cur: 'teeth', price: 150, lim: 2 }, { key: 'sietch:holtz_conductor', kind: 'holtz_conductor', qty: 2, cur: 'teeth', price: 280, lim: 2 }];
  if (sk === 'ring') { const r = sRng(ghash(todayKey() + 'ring')), pool = shopHeroPool().filter(id => !CH[id].legendary && !CH[id].conquest && prog(id).stars < 7), hs = [];
    while (hs.length < 6 && pool.length) hs.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return [...hs.map(id => ({ key: 'ring:sh:' + id, kind: 'sh', id, qty: 5, cur: 'wring', price: 120, lim: 3 })),
      { key: 'ring:folio', kind: 'folio', qty: 5, cur: 'wring', price: 60, lim: 5 }, { key: 'ring:pl', kind: 'pl', qty: 10, cur: 'wring', price: 80, lim: 5 },
      { key: 'ring:ix_plate', kind: 'ix_plate', qty: 3, cur: 'wring', price: 250, lim: 2 }, { key: 'ring:seal', kind: 'seal', qty: 1, cur: 'wring', price: 400, lim: 1 }, { key: 'ring:wol', kind: 'wol', qty: 1, cur: 'wring', price: 2000, lim: 1 }]; }
  return [
    ...dailyHeroes('chron', 6).map(id => ({ key: 'chron:sh:' + id, kind: 'sh', id, qty: 5, cur: 'rid', price: 60, lim: 2 })),
    { key: 'chron:folio', kind: 'folio', qty: 5, cur: 'rid', price: 40, lim: 5 }, { key: 'chron:sol', kind: 'sol', qty: 10000, cur: 'rid', price: 50, lim: 3 },
    { key: 'chron:seal', kind: 'seal', qty: 1, cur: 'rid', price: 250, lim: 1 }, { key: 'chron:wol', kind: 'wol', qty: 1, cur: 'rid', price: 1500, lim: 1 }, { key: 'chron:blood_echo', kind: 'blood_echo', qty: 5, cur: 'rid', price: 160, lim: 3 }, { key: 'chron:legacy_thread', kind: 'legacy_thread', qty: 3, cur: 'rid', price: 220, lim: 2 }, { key: 'chron:age_resonance', kind: 'age_resonance', qty: 2, cur: 'rid', price: 350, lim: 1 }];
}
const findShopItem = key => shopItems(key.split(':')[0]).find(x => x.key === key);
function shopFragsHtml() {
  const need = new Map();
  for (const cid of S.squad) {
    const p = prog(cid);
    gearPlan(cid, p.gear).forEach((id, k) => {
      if (!p.eq[k] && ITEMS[id].t >= 6)
        need.set(id, (need.get(id) || []).concat(CH[cid].sn));
    });
  }
  return `<p class="chap" style="margin:22px 0 8px">Фрагменты компонентов снаряжения VI–XIII</p>` +
    (need.size ? `<div class="shop">${[...need].flatMap(([id, who]) => {
      const it = ITEMS[id], names = PARTS_BY_KIND[it.kind] || [];
      return names.map((part, index) => {
        const key = partFragId(it, part), required = index ? Math.floor(FRAG_NEED[it.t] / 2) : Math.ceil(FRAG_NEED[it.t] / 2);
        const have = S.inv[key] || 0, legacy = S.inv[id] || 0;
        const title = {core:'Сердечник',lens:'Линза',frame:'Каркас',fitting:'Крепление',lining:'Подкладка',seal:'Печать'}[part] || part;
        return `<div class="item">${itemIcon(it, 40)}<div class="t">${it.n} · ${title}</div><div class="s">${who.join(', ')} · ${amt('frag', have + '/' + required)} · старых универсальных: ${legacy}</div><button class="btn" data-fbuy="${key}:1" ${S.teeth >= SHOP_FRAG[it.t] ? '' : 'disabled'}>1 за ${amt('teeth', SHOP_FRAG[it.t])}</button></div>`;
      });
    }).join('')}</div>`
      : `<p class="sub">Сейчас героям отряда не нужны предметы VI–XIII.</p>`);
}
// The live catalog is a read-only projection of the actual daily offers.
// Keep the presentation and purchase route separate; the existing writer
// resolves the offer again when the player commits a purchase.
function shopCatalog(sk) {
  if (!Object.prototype.hasOwnProperty.call(SHOPS, sk)) return [];
  return marketOffers(shopItems(sk), shopLeft, getRes).map(it => {
    const hero = it.kind === 'sh', p = hero ? prog(it.id) : null, sold = it.left === 0;
    const title = hero ? `${amt('shard', it.qty, 'shard:' + it.id)} ${CH[it.id].sn}` : `${amt(it.kind, it.qty)} ${RW_NAME[it.kind]}`;
    const subtitle = (hero ? (p.stars ? `${p.stars}★ · есть ${p.shards}` : `закрыт · ${p.shards}/10`) : RES_INFO[it.kind] ? RES_INFO[it.kind].n : 'материалы') + (it.limit ? ` · ${sold ? 'раскуплено' : `осталось ${it.left}`}` : '');
    return {
      ...it, title, subtitle, sold, affordable: it.balance >= it.price && !sold,
      owned: hero ? p.shards : getRes(it.kind),
      side: hero ? CH[it.id].side : null,
      art: hero ? portrait(CH[it.id], 44, p.stars ? TIER_COL[p.gear] : null) : `<span class="bigico sm">${ic(it.kind)}</span>`,
      priceHtml: amt(it.cur, it.price),
    };
  });
}

/* First live art screen: post only. UI state is transient, never in the save. */
let postUi = {filter:'all',page:0,selected:null,quote:null,receipt:null,serial:0};
const postEpoch = () => 'post:' + todayKey();
const postActive = () => view === 'shop' && (!S.shopTab || S.shopTab === 'post');
const postSkin = name => assetUrl('ui/shop/'+name);
const postTitle = it => it.kind === 'sh' ? CH[it.id].sn : RW_NAME[it.kind];
const postArt = (it,large=false) => {
  if(it.kind==='sh')return portrait(CH[it.id],large?130:44, null);
  const name = ['pl','folio','seal','blood_echo'].includes(it.kind) ? postSkin(it.kind+'.png') : null;
  return name ? `<img src="${name}" alt="" draggable="false">` : ic(it.kind);
};
function postMakeQuote(key) {
  if(!postActive())return null;
  const item=shopCatalog('post').find(it=>it.key===key);
  const intent=captureIntent(item,postEpoch());
  if(!intent)return null;
  return {intent,token:String(++postUi.serial)};
}
function takePostQuote(key,token) {
  const quote=postUi.quote;
  if(!postActive() || !quote || quote.token!==token || quote.intent.key!==key)return null;
  postUi.quote=null;
  return quote.intent;
}
function postQuoteCurrent(intent,item) {
  return !!item && !!revalidateIntent(intent,marketOffers([item],shopLeft,getRes),postEpoch());
}
function postPurchaseReceipt(item) {
  if(postActive())postUi.receipt={...item};
}
function shopPostAction(d) {
  if(!postActive())return false;
  if(d.postfilter!==undefined && ['all','resources','shards'].includes(d.postfilter)){
    postUi.filter=d.postfilter;postUi.page=0;postUi.selected=null;
  } else if(d.postpage!==undefined && ['-1','1'].includes(d.postpage)){
    postUi.page+=Number(d.postpage);postUi.selected=null;
  } else if(d.postselect!==undefined && shopCatalog('post').some(it=>it.key===d.postselect)){
    postUi.selected=d.postselect;
  } else if(d.postquote!==undefined){
    postUi.quote=postMakeQuote(d.postquote);
  } else if(d.postclose!==undefined){
    postUi.quote=null;postUi.receipt=null;
  } else return false;
  renderShop();return true;
}
function renderPostArt(msLeft) {
  const rows=shopCatalog('post');
  const pg=catalogPage(rows,postUi);postUi.page=pg.index;postUi.selected=pg.selected;
  const it=pg.visible.find(o=>o.key===pg.selected);
  const vars=[['plate','atrium-plate.jpeg'],['pedestal','pedestal.png'],['shadow','shadow.png'],['reward','reward-stage.png'],...['844','667'].flatMap(size=>[['a','normal'],['a','selected'],['a','disabled'],['c','normal'],['c','pressed'],['c','disabled']].map(([p,state])=>[p+size+state,p+'3-'+size+'-'+state+'.png']))].map(([k,n])=>`--${k}:url('${postSkin(n)}')`).join(';');
  const wallet=['sol','cry'].map(c=>`<button class="sa-wallet" data-info="${c}">${ic(c)}<span>${c==='sol'?'Солярии':'Камни су'}<b>${fmt(getRes(c))}</b></span></button>`).join('');
  const tabs=[['post','Торговый пост'],['sietch','Лавка сиетча'],['chron','Хроники'],['ring','Водохранилище'],['jihad','Джихад']];
  const feature=it?`<div class="sa-feature"><small>ВЫБРАННЫЙ ТОВАР</small><div class="sa-title"><h2>${postTitle(it)}</h2><b>×${fmt(it.qty)}</b></div><p>${it.subtitle}</p></div><div class="sa-object"><div class="sa-pedestal"></div><div class="sa-hero">${postArt(it,true)}</div></div><div class="sa-foot"><div class="sa-stock"><span>В наличии: ${it.left===-1?'∞':it.left}</span><span>У вас: ${fmt(it.owned)}</span></div><button class="sa-buy" data-postquote="${it.key}" ${it.affordable?'':'disabled'}>${it.sold?'Раскуплено':it.affordable?'Купить':'Недостаточно средств'}<span>${it.priceHtml}</span></button></div>`:'<p>Нет предложений</p>';
  const cards=pg.visible.map(o=>`<button class="sa-card ${o.sold?'sold':!o.affordable?'poor':''} ${postTitle(o).length>15?'long':''} ${o.qty>=1000?'bigqty':''}" aria-pressed="${o.key===pg.selected}" data-postselect="${o.key}"><span class="sa-art">${postArt(o)}</span><span class="sa-limit">${o.left===-1?'∞':o.left===0?'Нет':o.left+' шт.'}</span><b class="sa-qty">×${fmt(o.qty)}</b><span class="sa-name">${postTitle(o)}</span><span class="sa-price">${o.priceHtml}</span></button>`).join('');
  const quote=postUi.quote, q=quote&&revalidateIntent(quote.intent,rows,postEpoch());
  if(quote&&!q)postUi.quote=null;
  const receipt=postUi.receipt;
  const modal=receipt?`<div class="sa-modal"><section class="sa-dialog" role="dialog" aria-modal="true" aria-label="Покупка завершена"><small>НАГРАДА ПОЛУЧЕНА</small><h2>Покупка завершена</h2><div class="sa-reward">${postArt(receipt,true)}</div><b>${postTitle(receipt)} ×${fmt(receipt.qty)}</b><button class="sa-buy" data-postclose="1">Забрать</button></section></div>`:q?`<div class="sa-modal"><section class="sa-dialog" role="dialog" aria-modal="true" aria-label="Подтверждение покупки"><small>ТОРГОВЫЙ ПОСТ</small><h2>Подтвердите покупку</h2><div class="sa-quote-art">${postArt(q,true)}<b>${postTitle(q)} ×${fmt(q.qty)}</b></div><div class="sa-stock"><span>Стоимость</span>${amt(q.cur,q.price)}</div><div class="sa-stock"><span>После покупки</span>${amt(q.cur,q.balance-q.price)}</div><div class="sa-actions"><button data-postclose="1">Отмена</button><button class="sa-buy" data-buy="${q.key}" data-shopquote="${quote.token}">Купить</button></div></section></div>`:'';
  $('#view').innerHTML=`<section class="shop-art" style="${vars}"><header class="sa-header"><button class="sa-back" data-v="lobby" aria-label="В лагерь">‹</button><h1>Атриум</h1><span class="sa-subtitle">Торговый пост</span><div class="sa-wallets">${wallet}</div></header><nav class="sa-nav" aria-label="Лавки">${tabs.map(([k,n])=>`<button data-shoptab="${k}" ${k==='post'?'aria-current="page"':''}>${n}</button>`).join('')}</nav><div class="sa-layout"><section class="sa-stage" aria-label="Выбранный товар">${feature}</section><section class="sa-catalog"><div class="sa-cat-head"><strong>Ассортимент</strong><div class="sa-filters">${[['all','Все'],['resources','Ресурсы'],['shards','Осколки']].map(([k,n])=>`<button data-postfilter="${k}" aria-pressed="${postUi.filter===k}">${n}</button>`).join('')}</div></div><div class="sa-grid">${cards}</div><div class="sa-cat-foot"><span>Обновление ${Math.max(0,Math.floor(msLeft/3.6e6))} ч ${Math.max(0,Math.floor(msLeft%3.6e6/6e4))} мин</span><div class="sa-pager"><button data-postpage="-1" aria-label="Предыдущая страница" ${pg.index===0?'disabled':''}>‹</button><span>${pg.index+1}/${pg.pages}</span><button data-postpage="1" aria-label="Следующая страница" ${pg.index+1>=pg.pages?'disabled':''}>›</button></div><button class="sa-ix" data-ixenter="1">Утилизатор Икса</button></div></section></div>${modal}</section>`;
}

function renderShop() {
  if (S.shopTab !== 'post' && S.shopTab) { postUi.quote=null; postUi.receipt=null; }
  if (S.shopTab === 'jihad') return cqShopView();
  const sk = SHOPS[S.shopTab] ? S.shopTab : 'post', cur = { post: ['sol', 'cry'], sietch: ['teeth'], chron: ['rid'], ring: ['wring'] }[sk];
  const msLeft = new Date(new Date().setHours(24, 0, 0, 0)) - Date.now();
  if (sk === 'post') return renderPostArt(msLeft);
  $('#view').innerHTML = `<h2 class="lshide">Лавки</h2>
    <div class="panel" style="display:flex;align-items:center;gap:12px;margin:4px 0 10px;padding:8px 12px"><span class="bigico sm">${ic('ix_plate')}</span><div style="flex:1"><b>Утилизатор Икса</b><div class="sub" style="margin:0">Отдельная мастерская переработки снаряжения в артефакты Другой памяти</div></div><button class="btn go" data-ixenter="1">В мастерскую</button></div>
    <div class="ctabs">${Object.entries(SHOPS).map(([k, v]) => `<button class="ctab ${k === sk ? 'on' : ''}" data-shoptab="${k}">${v.n}<small>${{ post: ic('sol') + ic('cry'), sietch: ic('teeth'), chron: ic('rid'), ring: ic('wring') }[k]}</small></button>`).join('')}<button class="ctab" data-shoptab="jihad">Джихад<small>${ic('jt')}</small></button></div>
    <p class="sub">${SHOPS[sk].d} У вас: ${cur.map(c => amt(c, getRes(c))).join(' ')}. Лимиты обновятся через ${Math.floor(msLeft / 3.6e6)} ч ${Math.floor(msLeft % 3.6e6 / 6e4)} мин.</p>
    <div class="shop">${shopCatalog(sk).map(it => `<div class="item ${it.sold ? 'sold' : ''} ${it.side ? 'side-' + it.side : ''}">${it.art}<div class="t">${it.title}</div><div class="s">${it.subtitle}</div><button class="btn ${it.affordable ? '' : 'dim'}" data-buy="${it.key}" ${it.sold ? 'disabled' : ''}>${it.priceHtml}</button></div>`).join('')}</div>
    ${sk === 'sietch' ? shopFragsHtml() : ''}`;
}


export { SHOPS, buysToday, shopLeft, dailyHeroes, shopItems, findShopItem, shopFragsHtml, shopCatalog, renderShop, renderRecycler, shopPostAction, takePostQuote, postQuoteCurrent, postPurchaseReceipt };
