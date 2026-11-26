// ui/views/shop.js — строки 4020–4071 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './legend.js'; // порядок исполнения
import { renderRecycler } from '../recycler-screen.js';
import { cqShopItems, cqRarTag } from './conq.js';
import { cq, cqWeek } from '../../logic/conquest.js';
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
import { marketOffers, jihadOffers, catalogPage, captureIntent, revalidateIntent } from './shop-catalog.js';
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
        return `<div class="item">${itemIcon(it, 40)}<div class="t">${it.n} · ${title}</div><div class="s">${who.join(', ')} · ${amt('frag', have + '/' + required)} · старых универсальных: ${legacy}</div><button class="btn" data-fbuy="${key}:1" ${S.teeth >= SHOP_FRAG[it.t] ? '' : 'disabled'}>1 за ${postAmount('teeth', SHOP_FRAG[it.t])}</button></div>`;
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

/* Shared daily market art screen. UI state is transient, never in the save. */
const MARKET_CURRENCIES={post:['sol','cry'],sietch:['teeth'],chron:['rid'],ring:['wring'],jihad:['jt']};
const MARKET_LABELS={sol:'Солярии',cry:'Камни су',teeth:'Зубы червя',rid:'Ридулианские кристаллы',wring:'Водяные кольца',jt:'Трофеи Джихада'};
const marketTab=()=>S.shopTab==='jihad'?'jihad':Object.prototype.hasOwnProperty.call(SHOPS,S.shopTab)?S.shopTab:'post';
const marketName=sk=>sk==='jihad'?'Джихад':SHOPS[sk].n;
let postUi = {tab:null,filter:'all',page:0,selected:null,quote:null,receipt:null,fragments:false,serial:0};
const postEpoch = () => marketTab()==='jihad'?'jihad:'+cq().wk+':'+cqWeek():marketTab()+':'+todayKey();
const postActive = () => view === 'shop';
function marketRows(sk){
  if(sk!=='jihad')return shopCatalog(sk);
  const C=cq();
  return jihadOffers(cqShopItems(),S.jt||0).map(it=>({...it,
    sold:it.left===0,affordable:it.left!==0&&it.balance>=it.price,
    owned:it.kind==='med'?(S.cqMed||0):Number(C.disks.some(x=>x.k===it.key.slice(2))),
    priceHtml:amt('jt',it.price)
  }));
}
function jihadQuoteCurrent(intent,item){
  if(marketTab()!=='jihad'||!item||cq().wk!==cqWeek())return false;
  const disk=item.key.startsWith('d:');
  return !!revalidateIntent(intent,jihadOffers([{...item,ico:disk?'disk':'med',lim:disk?1:0}],S.jt||0),postEpoch());
}
function syncMarketTab(sk){
  if(postUi.tab!==sk){clearPostTransient();postUi.tab=sk;postUi.page=0;postUi.filter='all';postUi.selected=null;}
}
const postSkin = name => assetUrl('ui/shop/'+name);
const POST_NAMES={pl:'Пласталь',folio:'Фолианты ментата',water:'Вода',sol:'Солярии',candle:'Огни Хроник',seal:'Печать Ландсраада',blood_echo:'Эхо крови'};
const postTitle = it => it.route==='cqjbuy'?it.n:it.kind === 'sh' ? CH[it.id].sn : POST_NAMES[it.kind] || RES_INFO[it.kind]?.n || RW_NAME[it.kind];
const postDescription = it => it.route==='cqjbuy'?it.d:it.kind==='pl'?'Материал снаряжения':it.kind==='sh'?it.subtitle:RES_INFO[it.kind]?.n || 'Материалы';
// Scope new artwork to the market. Existing gameplay resource IDs, global
// icons, formatting, price metadata and purchase intents are unchanged.
const POST_ART_RES=new Set(['ix_plate','holtz_conductor','wol','legacy_thread','age_resonance','teeth','rid','wring','jt']);
const postObjectSrc = k => postSkin('postrelease/'+k+'.webp');
const postObjectImg = (k,cls='') => {
  const src=postObjectSrc(k);
  if(!src)throw new Error('Missing shop artwork: '+k);
  return `<img ${cls?'class="'+cls+'" ':''}src="${src}" data-shop-art="${k}" alt="" draggable="false">`;
};
const postIcon = k => POST_ART_RES.has(k)?postObjectImg(k,'ico'):ic(k);
const postAmount = (k,n,key) => POST_ART_RES.has(k)
  ? `<span class="amt" data-info="${key||k}">${postIcon(k)}${typeof n==='number'?fmt(n):n}</span>`
  : amt(k,n,key);
const postArt = (it,large=false) => {
  if(it.route==='cqjbuy')return postObjectImg(it.kind==='disk'?'disk-'+it.key.slice(2):it.key==='med3'?'med3':'med');
  if(it.kind==='sh')return portrait(CH[it.id],large?130:44, null);
  if(POST_ART_RES.has(it.kind))return postObjectImg(it.kind);
  const name = ['pl','folio','seal','blood_echo'].includes(it.kind) ? postSkin(it.kind+'.png') : null;
  return name ? `<img src="${name}" alt="" draggable="false">` : ic(it.kind);
};
function postMakeQuote(key) {
  if(!postActive())return null;
  const item=marketRows(marketTab()).find(it=>it.key===key);
  const intent=captureIntent(item,postEpoch());
  if(!intent)return null;
  return {intent,token:String(++postUi.serial)};
}
function takePostQuote(key,token,route='buy') {
  const quote=postUi.quote;
  if(!postActive() || !quote || quote.token!==token || quote.intent.key!==key || quote.intent.route!==route)return null;
  postUi.quote=null;
  return quote.intent;
}
function postQuoteCurrent(intent,item) {
  return !!item && !!revalidateIntent(intent,marketOffers([item],shopLeft,getRes),postEpoch());
}
function clearPostTransient() { postUi.quote=null; postUi.receipt=null; postUi.fragments=false; }
function postPurchaseReceipt(item) {
  if(postActive())postUi.receipt={...item};
}
function shopPostAction(d) {
  if(!postActive())return false;
  if((postUi.quote||postUi.receipt||postUi.fragments) && d.postclose===undefined) return false;
  if(d.postfrags!==undefined && marketTab()==='sietch'){
    postUi.fragments=true;
  } else if(d.postfilter!==undefined && (marketTab()==='jihad'?['all','med','disks']:['all','resources','shards']).includes(d.postfilter)){
    postUi.filter=d.postfilter;postUi.page=0;postUi.selected=null;
  } else if(d.postpage!==undefined && ['-1','1'].includes(d.postpage)){
    postUi.page+=Number(d.postpage);postUi.selected=null;
  } else if(d.postselect!==undefined && marketRows(marketTab()).some(it=>it.key===d.postselect)){
    postUi.selected=d.postselect;
  } else if(d.postquote!==undefined){
    postUi.quote=postMakeQuote(d.postquote);
  } else if(d.postclose!==undefined){
    clearPostTransient();
  } else return false;
  renderShop();return true;
}
function renderPostArt(msLeft,sk) {
  syncMarketTab(sk);
  const rows=marketRows(sk);
  const pg=catalogPage(rows,postUi);postUi.page=pg.index;postUi.selected=pg.selected;
  const it=pg.visible.find(o=>o.key===pg.selected);
  const vars=[['plate','atrium-plate.jpeg'],['pedestal','pedestal.png'],['shadow','shadow.png'],['reward','reward-stage.png'],['primary','button-primary.png'],...['844','667'].flatMap(size=>[['a','normal'],['a','selected'],['a','disabled'],['c','normal'],['c','pressed'],['c','disabled']].map(([p,state])=>[p+size+state,p+'3-'+size+'-'+state+'.png']))].map(([k,n])=>`--${k}:url('${postSkin(n)}')`).join(';');
  const wallet=MARKET_CURRENCIES[sk].map(c=>`<button class="sa-wallet" data-info="${c}">${postIcon(c)}<span>${MARKET_LABELS[c]}<b>${fmt(getRes(c))}</b></span></button>`).join('');
  const tabs=[['post','Торговый пост'],['sietch','Лавка сиетча'],['chron','Хроники'],['ring','Водохранилище'],['jihad','Джихад']];
  const feature=it?`<div class="sa-feature"><small>${sk==='post'?'КООАМ':marketName(sk).toUpperCase()} / ЛОТ ${String(rows.findIndex(o=>o.key===it.key)+1).padStart(2,"0")}</small><div class="sa-title"><h2>${postTitle(it)}</h2><b>×${fmt(it.qty)}</b></div><p>${it.rar?cqRarTag(it.key.slice(2))+' ':''}${postDescription(it)}</p></div><div class="sa-object"><div class="sa-pedestal"></div><div class="sa-hero">${postArt(it,true)}</div></div><div class="sa-foot"><div class="sa-stock"><span>Лимит ${it.left===-1?'∞':it.left+'/'+it.limit}</span><span>У вас: ${fmt(it.owned)}</span></div><button class="sa-buy" data-postquote="${it.key}" ${it.affordable?'':'disabled'}>${it.sold?'Раскуплено':it.affordable?'›  Приобрести':'Недостаточно средств'}<span>${postAmount(it.cur,it.price)}</span></button></div>`:'<p>Нет предложений</p>';
  const cards=pg.visible.map(o=>`<button class="sa-card ${o.sold?'sold':!o.affordable?'poor':''} ${postTitle(o).length>15?'long':''} ${o.qty>=1000?'bigqty':''}" aria-pressed="${o.key===pg.selected}" data-postselect="${o.key}"><span class="sa-art">${postArt(o)}</span><span class="sa-limit">${o.rar?cqRarTag(o.key.slice(2)):o.left===-1?'∞':o.left===0?'Нет':'Ост. '+o.left}</span><b class="sa-qty">×${fmt(o.qty)}</b><span class="sa-name">${postTitle(o)}</span><span class="sa-price">${postAmount(o.cur,o.price)}</span></button>`).join('');
  const quote=postUi.quote, q=quote&&revalidateIntent(quote.intent,rows,postEpoch());
  if(quote&&!q)postUi.quote=null;
  const receipt=postUi.receipt;
  const modal=postUi.fragments?`<div class="sa-modal"><section class="sa-dialog sa-fragments" role="dialog" aria-modal="true" aria-label="Фрагменты снаряжения"><header><h2>Фрагменты снаряжения</h2><button data-postclose="1" aria-label="Закрыть">×</button></header><div class="sa-frag-scroll">${shopFragsHtml()}</div></section></div>`:receipt?`<div class="sa-modal"><section class="sa-dialog" role="dialog" aria-modal="true" aria-label="Покупка завершена"><small>НАГРАДА ПОЛУЧЕНА</small><h2>Покупка завершена</h2><div class="sa-reward">${postArt(receipt,true)}</div><b>${postTitle(receipt)} ×${fmt(receipt.qty)}</b><button class="sa-buy" data-postclose="1">Продолжить</button></section></div>`:q?`<div class="sa-modal"><section class="sa-dialog" role="dialog" aria-modal="true" aria-label="Подтверждение покупки"><small>${marketName(sk).toUpperCase()}</small><h2>Подтвердите покупку</h2><div class="sa-quote-art">${postArt(q,true)}<b>${postTitle(q)} ×${fmt(q.qty)}</b></div><div class="sa-stock"><span>Стоимость</span>${postAmount(q.cur,q.price)}</div><div class="sa-stock"><span>После покупки</span>${postAmount(q.cur,q.balance-q.price)}</div><div class="sa-actions"><button data-postclose="1">Отмена</button><button class="sa-buy" ${q.route==='cqjbuy'?'data-cqjbuy':'data-buy'}="${q.key}" data-shopquote="${quote.token}">Подтвердить</button></div></section></div>`:'';
  $('#view').innerHTML=`<section class="shop-art" data-market="${sk}" style="${vars}"><header class="sa-header" ${modal?'inert':''}><button class="sa-back" data-v="lobby" aria-label="В лагерь">‹</button><h1>Атриум</h1><span class="sa-subtitle">${marketName(sk)}</span><div class="sa-wallets">${wallet}</div></header><nav class="sa-nav" aria-label="Лавки" ${modal?'inert':''}>${tabs.map(([k,n])=>`<button data-shoptab="${k}" ${k===sk?'aria-current="page"':''}>${n}</button>`).join('')}</nav><div class="sa-layout" ${modal?'inert':''}><section class="sa-stage" aria-label="Выбранный товар">${feature}</section><section class="sa-catalog"><div class="sa-cat-head"><strong>ЛОТЫ&nbsp; ${pg.count}</strong><div class="sa-filters">${sk==='sietch'?'<button class="sa-frags-btn" data-postfrags="1">Фрагменты</button>':''}${(sk==='jihad'?[['all','Все'],['med','Аптечки'],['disks','Диски']]:[['all','Все'],['resources','Ресурсы'],['shards','Осколки']]).map(([k,n])=>`<button data-postfilter="${k}" aria-pressed="${postUi.filter===k}">${n}</button>`).join('')}</div></div><div class="sa-grid">${cards}</div><div class="sa-cat-foot"><span>Обновление ${sk==='jihad'?Math.floor(msLeft/86400000)+' д '+Math.floor(msLeft%86400000/3600000)+' ч':Math.floor(msLeft/3600000)+' ч '+Math.floor(msLeft%3600000/60000)+' мин'}</span><div class="sa-pager" role="group" aria-label="Страницы каталога"><button data-postpage="-1" aria-label="Предыдущая страница" ${pg.index===0?'disabled':''}>‹</button><span aria-live="polite" aria-label="Страница ${pg.index+1} из ${pg.pages}">${pg.index+1}/${pg.pages}</span><button data-postpage="1" aria-label="Следующая страница" ${pg.index+1>=pg.pages?'disabled':''}>›</button></div><button class="sa-ix" data-ixenter="1">Утилизатор Икса</button></div></section></div>${modal}</section>`;
}

function renderShop() {
  const sk=marketTab();
  const stamp=todayKey.clock.snapshot();
  let end=stamp.nextMidnight;
  if(sk==='jihad'){const weekEnd=new Date(cq().wk);weekEnd.setDate(weekEnd.getDate()+7);end=weekEnd.getTime();}
  return renderPostArt(Math.max(0,end-stamp.now),sk);
}


export { SHOPS, buysToday, shopLeft, dailyHeroes, shopItems, findShopItem, shopFragsHtml, shopCatalog, renderShop, renderRecycler, shopPostAction, takePostQuote, postQuoteCurrent, postPurchaseReceipt, clearPostTransient, jihadQuoteCurrent, marketRows };
