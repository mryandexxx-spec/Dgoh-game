// ui/overlays/info.js — строки 3550–3667 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { detailCid, openDetail } from '../hero-card.js';
import { itemCtx, openItem } from './detail.js';
import { renderNotes } from '../notifications.js';
import { SPOT_ICONS } from '../views/lobby.js';
import { SHOPS, shopItems, shopLeft } from '../views/shop.js';
import { crefillCost, crefillN } from './sim.js';
import { nextShards } from '../views/squad.js';
import { enGet, getRes, prog } from '../../logic/progress.js';
import { S, tickWater } from '../../core/state.js';
import { CRAFT, FRAG_NEED, ITEMS, NODE_ITEMS, RAID_FRAGS, SHOP_FRAG, TIER_COL, TIER_NAME, gearPlan, nodeChance } from '../../logic/gear.js';
import { unlockNeed } from '../../logic/relics.js';
import { CANDLE_REFILL, CMAX, CRY_3STAR, CRY_JOURNEY, CRY_WIN, REFILL_AMT, REFILL_MAX, ROMAN, ROSTER_IDS, STAR_COST, WATER_SEC, WMAX, refillCost, refillN } from '../../logic/economy.js';
import { JOURNEYS } from '../../data/journeys.js';
import { NODES, NODE_SCENES, nodeCost, nodeEn, nodeOpen, nodeTitle } from '../../data/campaigns.js';
import { BIOS } from '../../data/story.js';
import { sceneThumb } from '../../render2d/scenes.js';
import { figureSVG, portrait } from '../../render2d/figures.js';
import { CH } from '../../data/chars.js';
import { FACTIONS, ROLES } from '../../data/fx.js';
import { amt, fmt, ic } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { itemIcon, starStr, thumb } from '../common.js';
import { RING_RATE } from '../../logic/rewards.js';

// ===== info popups =====
function campRow(i, note) {
  const n = NODES[i], open = nodeOpen(i), three = S.cleared[i] === 3, en = nodeEn(i), c = nodeCost(i);
  const simB = kk => `<button class="btn mini ${enGet(en) >= kk * c ? '' : 'lack'}" data-xsim="${i}:${kk}">×${kk}<small>${amt(en, kk * c)}</small></button>`;
  return `<div class="src">${thumb(NODE_SCENES[i], (n.c + 1) + '-' + (n.m + 1))}<div class="srct"><b>${nodeTitle(i)}</b><span>${note} · ${amt(en, c)} за бой${S.cleared[i] ? ' · ' + starStr(S.cleared[i], 3) : ''}</span></div>
    <div class="srca">${!open ? `<span class="lockd">Сначала пройдите предыдущую миссию</span>` : `<button class="btn go mini ${enGet(en) >= c ? '' : 'lack'}" data-node="${i}">В бой</button>${three ? [1, 5, 10].map(simB).join('') : '<span class="lockd">симуляция после 3★</span>'}`}</div></div>`;
}
const pickSrc = list => { const sc = i => S.cleared[i] === 3 ? 0 : nodeOpen(i) ? 1 : 2 + i / 1000; return list.slice().sort((a, b) => sc(a) - sc(b)).slice(0, 5); };
const goLeg = (k, label) => `<button class="btn mini" data-jkey="${k}">${label}</button>`;
const navRow = (icon, title, text, btns) => `<div class="src"><div class="srci">${icon}</div><div class="srct"><b>${title}</b><span>${text}</span></div>${btns ? `<div class="srca">${btns}</div>` : ''}</div>`;
const wormIco = () => `<svg viewBox="0 0 24 24" style="color:var(--worm)">${SPOT_ICONS.worm}</svg>`;
const go = (v, label) => `<button class="btn mini" data-goto="${v}">${label}</button>`;
function itemSourceRows(it) {
  const rows = pickSrc(NODES.map((n, i) => i).filter(i => NODE_ITEMS[i].includes(it.id))).map(i => campRow(i, `шанс ≈${Math.round(nodeChance(i) * 100)}% за бой`));
  if (SHOP_FRAG[it.t]) rows.push(navRow(ic('teeth'), 'Лавка сиетча', `${amt('teeth', SHOP_FRAG[it.t])} за фрагмент · у вас ${amt('teeth', S.teeth)}`,
    [1, 5].map(q => `<button class="btn mini" data-fbuy="${it.id}:${q}" ${S.teeth >= q * SHOP_FRAG[it.t] ? '' : 'disabled'}>Купить ${q}<small>${amt('teeth', q * SHOP_FRAG[it.t])}</small></button>`).join('')));
  const raidT = RAID_FRAGS.map((r, t) => r.tiers.includes(it.t) ? t : -1).filter(t => t >= 0);
  if (raidT.length) rows.push(navRow(wormIco(), 'Рейд «Шаи-Хулуд»', `Случайные фрагменты ${raidT.map(t => 'Т' + (t + 1)).join(', ')} в награде за урон`, go('raid', 'К рейду')));
  return rows;
}
let infoKey = null;
const RES_INFO = {
  wring: { n: 'Водяные кольца', n2: 'водяных колец', d: 'Фрименская мера воды: кольца отмечают, сколько воды племени принадлежит владельцу. Каждый осколок героя, уже поднятого до 7★, превращается в 10 колец. Валюта Водохранилища в Лавках: осколки героев, Печати, Вода жизни, Другая память.' },
  jt: { n: 'Трофеи Джихада', n2: 'трофеев Джихада', d: 'Знаки побед в Джихаде: даются за первую победу на каждой точке (10 / 20 / 40 за бой, элиту и босса, × множитель сложности) и на шкале наград. Тратятся в магазине Джихада (Лавки) на аптечки и редкие диски.' },
  candle: { n: 'Свечи хроник', n2: 'Свечей хроник', d: 'Энергия для Хроник Дюны: бой стоит 8 Свечей. Восстанавливается сама: +1 каждые 30 секунд до 120. Пополнение за кристаллы добавляет 100 Свечей; цена удваивается после каждого третьего пополнения, не больше 15 в день.' },
  rid: { n: 'Ридулианские кристаллы', n2: 'ридулианских кристаллов', d: 'Кристаллы-летописи, на которых в империи хранят записи. Валюта Лавки хроник: осколки любых героев, фолианты, Печати и даже Вода жизни.' },
  folio: { n: 'Фолианты ментата', n2: 'фолиантов', d: 'Записи ментатов о приёмах боя. Нужны для повышения умений до уровней 2–5: 1, 2, 4 и 6 фолиантов за уровень плюс солярии.' },
  seal: { n: 'Печать Ландсраада', n2: 'Печать Ландсраада', d: 'Редкая печать Высокого совета. Нужна для повышения умения до 6-го уровня — одна печать за умение. Печатей всегда немного: выбирайте, кого усиливать первым.' },
  wol: { n: 'Вода жизни', n2: 'Вода жизни', d: 'Очень редкий яд-откровение фрименов. Открывает 7-й уровень у одного-двух особых умений каждого героя. Добывается только за убийство червя на Т2–Т3 и за ярусы путешествия «Вода жизни» и «Буря над Арракином».' },
  water: { n: 'Вода', d: 'Энергия для боёв и симуляций кампании: каждый бой стоит 6 Воды. Восстанавливается сама: +1 каждые 20 секунд до 150 (+15 каждые 10 уровней аккаунта). Пополнение за кристаллы добавляет 120 Воды, в том числе сверх лимита: первые три пополнения в день — по 50 кристаллов, затем цена удваивается после каждого третьего; не больше 15 в день, в полночь цена сбрасывается.' },
  sol: { n: 'Солярии', n2: 'соляриев', d: 'Основная валюта Империума. Тратятся на уровни, повышение звёзд, сборку предметов и повышение уровня снаряжения.' },
  pl: { n: 'Пласталь', n2: 'пластали', d: 'Материал для сборки предметов снаряжения: от 1 до 8 единиц за предмет в зависимости от уровня (I–XIII).' },
  teeth: { n: 'Зубы червя', d: 'Трофеи рейда «Шаи-Хулуд». Валюта Лавки сиетча: осколки героев, фрагменты редкого снаряжения, материалы.' },
  cry: { n: 'Кристаллы пряности', d: 'Редкая валюта. Тратится на пополнение Воды и Свечей: 50 за пополнение, цена удваивается после каждого третьего (50 → 100 → 200 → 400 → 800), не больше 15 пополнений каждого вида в день; в полночь цена сбрасывается.' },
  shard: { n: 'Осколки персонажей', d: '10 осколков открывают обычного персонажа (легенды и герои Джихада открываются сразу на 7★ за 330), дальше осколки повышают звёзды: 15, 25, 30, 65, 85 и 100 до 7★. У каждого героя свои осколки; где их искать, видно в карточке героя по кнопке «Найти осколки».' },
  core: { n: 'Другая память', n2: 'Другой памяти', d: 'Голоса предков, пробуждённые пряностью. Нужна, чтобы открывать уровни Другой памяти (ДП1–ДП7) — усиление героев сверх снаряжения XIII. Требуется 7★ и полное снаряжение XIII; уровни открываются с уровнем аккаунта 52, 56, 60, 65, 70, 75 и 80. Каждый уровень: +8% ко всем характеристикам и +3 скорости.' },
  frag: { n: 'Фрагменты снаряжения', d: 'Из фрагментов собираются предметы для шести ячеек снаряжения. Уровней снаряжения 13; чем выше уровень предмета, тем больше фрагментов нужно — от 2 на уровне I до 25 на уровне XIII. После XIII героя усиливает Другая память.' },
};
function openInfo(key, keepScroll) {
  infoKey = key;
  const [kind, id] = key.split(':');
  let head = '', body = '', rows = [];
  if (kind === 'bio' && id && CH[id]) {
    const d = CH[id], p = prog(id);
    head = `<div class="ihead"><span class="biofig">${figureSVG(d, true)}</span><div><h3>${d.n}</h3><div class="crole">${d.f.map(f => FACTIONS[f].n).join(' · ')} · ${ROLES[d.role]}${d.prof ? ' · ' + d.prof : ''}${d.leader ? ' · лидер' : ''}</div><div class="stars" style="margin-top:4px">${p.stars ? starStr(p.stars) : '<span class="lockd">не открыт</span>'}</div></div></div>`;
    body = `<p class="biotext">${BIOS[id] || ''}</p>`;
    const app = NODES.map((n, i) => n.dlg && n.dlg.some(l => l[0] === id) ? i : -1).filter(i => i >= 0);
    if (app.length) rows = [navRow(ic('folio'), 'В сюжете кампаний', `Появляется в диалогах: ${app.slice(0, 8).map(i => nodeTitle(i)).join('; ')}${app.length > 8 ? ' и других' : ''}.`, go('camp', 'К кампаниям'))];
    rows.push(navRow(ic('shard'), 'Сторона', d.side === 'light' ? 'Светлая сторона: воюет в светлой кампании и в Хрониках.' : d.side === 'dark' ? 'Тёмная сторона: воюет в тёмной кампании и в Хрониках.' : 'Мыслящие машины: Хроники, рейд, испытания и Джихад.', ''));
    rows.push(navRow(ic('shard'), 'Осколки', p.stars ? `${amt('shard', p.shards)} в запасе` : `${amt('shard', p.shards + '/' + unlockNeed(d))} до открытия`, `<button class="btn mini" data-iswitch="shard:${id}">Найти осколки</button>`));
  } else if (kind === 'shard' && id && CH[id]) {
    const d = CH[id], p = prog(id), need = p.stars ? nextShards(p) : unlockNeed(d);
    head = `<div class="ihead">${portrait(d, 72, p.stars ? TIER_COL[p.gear] : null)}<div><h3>Осколки: ${d.n}</h3><div class="crole">${p.stars ? starStr(p.stars) : 'Персонаж не открыт'}</div></div></div>`;
    body = `<div class="fbar"><span>${p.stars ? (need ? `До ${p.stars + 1}★` : `Максимум звёзд · новые осколки → ${amt('wring', RING_RATE)} за штуку`) : 'До открытия'}</span><div class="gprog big"><i style="width:${need ? Math.min(100, p.shards / need * 100) : 100}%"></i></div><b class="mono">${amt('shard', need ? p.shards + '/' + need : p.shards)}</b></div>
      <div class="acts" style="margin-top:8px">${p.stars && need ? `<button class="btn ${p.shards >= need ? 'go' : ''}" data-star="${id}" ${p.shards >= need ? '' : 'disabled'}>Повысить до ${p.stars + 1}★<small>${amt('shard', need)} ${amt('sol', STAR_COST(p.stars))}</small></button>` : ''}${p.stars ? `<button class="btn" data-ishow="${id}">Карточка героя</button>` : ''}</div>`;
    pickSrc(NODES.map((n, i) => n.drops.includes(id) ? i : -1).filter(i => i >= 0)).forEach(i => { const k = NODES[i].drops.indexOf(id), ch = NODES[i].camp === 'C'; rows.push(campRow(i, k === 0 ? `шанс ${ch ? 60 : 50}% · до 2 осколков` : 'шанс 30% · 1 осколок')); });
    for (const sk of Object.keys(SHOPS)) for (const it of shopItems(sk)) if (it.kind === 'sh' && it.id === id) { const left = shopLeft(it);
      rows.push(navRow(ic(it.cur), SHOPS[sk].n, `${it.qty} осколков за ${amt(it.cur, it.price)} · у вас ${amt(it.cur, getRes(it.cur))}${it.lim ? ` · осталось сегодня ${left}` : ''}`, `<button class="btn mini" data-buy="${it.key}" ${getRes(it.cur) >= it.price && left !== 0 ? '' : 'disabled'}>Купить ${it.qty}<small>${amt(it.cur, it.price)}</small></button><button class="btn mini" data-shoptab="${sk}">В лавку</button>`)); }
    if (d.legendary && JOURNEYS[d.id]) rows.push(navRow(ic('shard'), `Путешествие «${JOURNEYS[d.id].t}»`, 'Первое прохождение каждого из пяти ярусов: 20, 40, 60, 90 и 120 осколков. Легенда открывается сразу на 7★, когда собраны все 330.', goLeg(d.id, 'К путешествию')));
    if (d.conquest || ['robot', 'cymek'].includes(d.id)) rows.push(navRow(ic('shard'), 'Джихад', d.conquest ? 'Осколки Эразма — только в сундуках шкалы наград Джихада: до 140 за неделю на сложном уровне. Открывается сразу на 7★ (330 осколков).' : 'Осколки в сундуках Джихада и за бои в секторе «Коррин».', go('conq', 'К Джихаду')));
  } else if (kind === 'need' && id) {
    const en = id, cost = +(key.split(':')[2] || 0), have = enGet(en), cand = en === 'candle', n = cand ? crefillN() : refillN(), c = cand ? crefillCost() : refillCost(), amtN = cand ? CANDLE_REFILL : REFILL_AMT, R = RES_INFO[en];
    tickWater();
    head = `<div class="ihead"><span class="bigico">${ic(en)}</span><div><h3>Не хватает ${cand ? 'Свечей' : 'Воды'}</h3><div class="mono" style="font-size:15px">Нужно ${cost} · у вас ${have}/${cand ? CMAX() : WMAX()}</div></div></div>`;
    body = `<p class="sub" style="margin:12px 0 0">Запас восстанавливается сам, но можно пополнить его прямо сейчас за кристаллы пряности. Цена удваивается после каждого третьего пополнения и сбрасывается в полночь; не больше ${REFILL_MAX} пополнений в день.</p>
      <div class="kv" style="margin-top:10px"><span>Пополнений сегодня</span><div>${n} из ${REFILL_MAX}</div><span>Следующее</span><div>${n >= REFILL_MAX ? 'лимит исчерпан' : `+${amtN} за ${amt('cry', c)}`}</div><span>Кристаллы</span><div>${amt('cry', S.cry)}</div></div>
      <div class="acts" style="margin-top:10px">${n >= REFILL_MAX ? '<span class="lockd">Возвращайтесь завтра — лимит обновится в полночь</span>' : `<button class="btn ${S.cry >= c ? 'go' : 'lack'}" data-refill="${cand ? 'candle' : '1'}">Пополнить +${amtN}<small>${amt('cry', c)}</small></button>`}${have >= cost ? '<span class="qok">✓ Теперь хватает</span>' : ''}</div>`;
    rows = [navRow(ic('cry'), 'Кристаллы пряности', `У вас ${amt('cry', S.cry)}.`, `<button class="btn mini" data-iswitch="cry">Где взять</button>`)];
  } else if (kind === 'frag' && id && ITEMS[id]) {
    const it = ITEMS[id], have = S.inv[id] || 0, who = [];
    for (const cid of ROSTER_IDS) { const p = prog(cid); if (!p.stars) continue; gearPlan(cid, p.gear).forEach((x, k) => { if (x === id && !p.eq[k]) who.push(cid); }); }
    head = `<div class="ihead">${itemIcon(it, 72)}<div><h3>${it.n}</h3><div style="color:${TIER_COL[it.t]};font-size:12px;text-transform:uppercase;letter-spacing:.12em">${TIER_NAME[it.t]} · уровень ${ROMAN[it.t]}</div></div></div>`;
    body = `<div class="fbar"><span>Фрагменты</span><div class="gprog big"><i style="width:${Math.min(100, have / FRAG_NEED[it.t] * 100)}%"></i></div><b class="mono">${amt('frag', have + '/' + FRAG_NEED[it.t])}</b></div>
      <p class="sub" style="margin:10px 0 0">Предмет собирается из ${FRAG_NEED[it.t]} фрагментов, ${amt('sol', CRAFT(it.t).sol)} и ${amt('pl', CRAFT(it.t).pl)}. Сборка — в карточке героя, по ячейке снаряжения.</p>
      ${who.length ? `<div class="cdrow" style="margin-top:10px"><span class="lbl">Нужен героям</span><div class="cdenemy">${who.slice(0, 8).map(c => `<button class="whob" data-ishow="${c}">${portrait(CH[c], 40, TIER_COL[prog(c).gear])}<span>${CH[c].sn}</span></button>`).join('')}</div></div>` : ''}`;
    rows = itemSourceRows(it);
  } else {
    const R = RES_INFO[kind]; if (!R) return;
    const bal = { core: S.core || 0, water: `${S.water}/${WMAX()}`, sol: S.solari, pl: S.plast, teeth: S.teeth, cry: S.cry, folio: S.folio, seal: S.seal, wol: S.wol, candle: `${S.candle}/${CMAX()}`, rid: S.rid }[kind];
    head = `<div class="ihead"><span class="bigico">${ic(kind)}</span><div><h3>${R.n}</h3>${bal !== undefined ? `<div class="mono" style="font-size:15px">У вас: ${typeof bal === 'number' ? fmt(bal) : bal}</div>` : ''}</div></div>`;
    body = `<p class="sub" style="margin:12px 0 0">${R.d}</p>`;
    if (kind === 'candle') {
      tickWater(); const c = crefillCost(), lim = crefillN() >= REFILL_MAX;
      body += `<div class="kv" style="margin-top:10px"><span>Пополнений сегодня</span><div>${crefillN()} из ${REFILL_MAX}</div></div><div class="acts" style="margin-top:10px">${lim ? '<span class="lockd">Лимит на сегодня исчерпан</span>' : `<button class="btn ${S.cry >= c ? 'go' : 'lack'}" data-refill="candle">Пополнить +${CANDLE_REFILL}<small>${amt('cry', c)}</small></button>`}</div>`;
      rows = [navRow(ic('candle'), 'Куда тратить', 'Бои и симуляции Хроник Дюны.', `<button class="btn mini" data-ctab="C">К хроникам</button>`)];
    }
    if (kind === 'core') rows = [navRow(wormIco(), 'Рейд', 'За убийство червя: 5 на Т1, 12 на Т2, 25 на Т3; без убийства — по доле урона.', go('raid', 'К рейду')), navRow(ic('shard'), 'Джихад', 'Бои с боссами секторов и сундуки шкалы наград.', go('conq', 'К Джихаду')), navRow(ic('water'), 'Кампания', 'Миссии от 30 уровня: шанс 25%, финал главы — гарантированно.', go('camp', 'К кампании')), navRow(ic('teeth'), 'Лавки', 'Лавка сиетча и Лавка хроник — по несколько в день.', go('shop', 'В лавку'))];
    if (kind === 'rid') rows = [navRow(ic('candle'), 'Хроники Дюны', '8–15 за каждую победу и симуляцию.', `<button class="btn mini" data-ctab="C">К хроникам</button>`), navRow(ic('rid'), 'Где тратить', 'Лавка хроник.', `<button class="btn mini" data-shoptab="chron">В лавку хроник</button>`)];
    if (kind === 'water') {
      tickWater();
      const next = S.water < WMAX() ? Math.ceil(WATER_SEC - (Date.now() - S.waterTs) / 1000) : null, c = refillCost();
      body += `<div class="kv" style="margin-top:10px"><span>Восстановление</span><div>${next ? `+1 через ${next} с, до полной — ${Math.ceil((WMAX() - S.water) * WATER_SEC / 60)} мин` : 'запас полон'}</div><span>Пополнений сегодня</span><div>${refillN()} из ${REFILL_MAX}</div></div>
        <div class="acts" style="margin-top:10px">${refillN() >= REFILL_MAX ? '<span class="lockd">Лимит на сегодня исчерпан</span>' : `<button class="btn ${S.cry >= c ? 'go' : 'lack'}" data-refill="1">Пополнить +${REFILL_AMT}<small>${amt('cry', c)}</small></button>`}</div>`;
      rows = [navRow(ic('cry'), 'Кристаллы пряности', `У вас ${amt('cry', S.cry)}. Где взять — в описании кристаллов.`, `<button class="btn mini" data-iswitch="cry">Подробнее</button>`), navRow(ic('water'), 'Куда тратить', 'Бои и симуляции кампании.', go('camp', 'К кампании'))];
    }
    if (kind === 'folio') rows = [navRow(ic('water'), 'Кампания', '1–2 за каждую победу и симуляцию.', go('camp', 'К кампании')), navRow(wormIco(), 'Рейд', 'До 40 за рейд в зависимости от урона.', go('raid', 'К рейду')), navRow(ic('teeth'), 'Лавка сиетча', '5 фолиантов за 40 зубов.', go('shop', 'В лавку'))];
    if (kind === 'seal') rows = [navRow(ic('water'), 'Кампания', 'Одна печать за первое прохождение каждого узла на 3★. С узла 4 — шанс 4% за любую победу и симуляцию.', go('camp', 'К кампании')), navRow(wormIco(), 'Рейд', 'За убийство червя: 2 на Т1, 3 на Т2, 5 на Т3. Без убийства — меньше.', go('raid', 'К рейду')), navRow(ic('shard'), 'Путешествие', 'Одна печать за первое прохождение каждого яруса.', go('legend', 'К путешествию')), navRow(ic('teeth'), 'Лавка сиетча', 'Одна печать в день за 300 зубов.', go('shop', 'В лавку'))];
    if (kind === 'wol') rows = [navRow(wormIco(), 'Рейд', 'Убийство червя: 1 на Т2, 2 на Т3.', go('raid', 'К рейду')), navRow(ic('shard'), 'Путешествие', 'По одной за первое прохождение ярусов 3 и 5.', go('legend', 'К путешествию'))];
    if (kind === 'sol') rows = [navRow(ic('water'), 'Кампания', '500–3 250 за победу, в том числе в симуляциях.', go('camp', 'К кампании')), navRow(wormIco(), 'Рейд', 'До 60 000 за рейд в зависимости от урона.', go('raid', 'К рейду')), navRow(ic('teeth'), 'Лавка сиетча', '5 000 за 50 зубов червя.', go('shop', 'В лавку')), navRow(ic('shard'), 'Путешествие', '2 000 за повторное прохождение яруса.', go('legend', 'К путешествию'))];
    if (kind === 'pl') rows = [navRow(ic('water'), 'Кампания', '1–3 за победу.', go('camp', 'К кампании')), navRow(wormIco(), 'Рейд', 'До 30 за рейд.', go('raid', 'К рейду')), navRow(ic('teeth'), 'Лавка сиетча', '5 пластали за 80 зубов.', go('shop', 'В лавку'))];
    if (kind === 'teeth') rows = [navRow(wormIco(), 'Рейд «Шаи-Хулуд»', 'До 1 500 зубов за рейд плюс бонус за убийство червя.', go('raid', 'К рейду')), navRow(ic('teeth'), 'Где тратить', 'Лавка сиетча: осколки героев, фрагменты III–V, материалы.', go('shop', 'В лавку'))];
    if (kind === 'cry') rows = [navRow(ic('water'), 'Кампания', `+${CRY_WIN} за каждую победу и симуляцию, +${CRY_3STAR} за первое прохождение узла на 3★.`, go('camp', 'К кампании')), navRow(wormIco(), 'Рейд', 'До 300 за рейд плюс бонус за убийство червя.', go('raid', 'К рейду')), navRow(ic('shard'), 'Путешествие', `+${CRY_JOURNEY} за первое прохождение яруса.`, go('legend', 'К путешествию')), navRow(ic('water'), 'Где тратить', `Пополнение Воды: +${REFILL_AMT} за ${refillCost()} кристаллов.`, `<button class="btn mini" data-iswitch="water">Пополнить Воду</button>`)];
    if (kind === 'shard') rows = [navRow(ic('shard'), 'Персонажи', 'Откройте карточку героя и нажмите «Найти осколки».', go('squad', 'К персонажам'))];
    if (kind === 'frag') rows = [navRow(ic('frag'), 'Снаряжение', 'Откройте карточку героя и нажмите на ячейку снаряжения.', go('squad', 'К персонажам'))];
  }
  const prev = $('#overlay2 .sheet') ? $('#overlay2 .sheet').scrollTop : 0;
  $('#overlay2').innerHTML = `<div class="detail info-layer" data-iclose="1"><div class="sheet infosheet" role="dialog" aria-modal="true">
    ${head}${body}
    ${rows.length ? `<p class="chap" style="margin-top:18px">${kind === 'bio' ? 'Подробнее' : kind === 'shard' && id || kind === 'frag' && id ? 'Где найти' : 'Где взять'}</p><div class="srcs">${rows.join('')}</div>` : ''}
    <div class="acts"><button class="btn" data-iclose="1" style="margin-left:auto">Закрыть</button></div>
  </div></div>`;
  document.querySelectorAll('#overlay2 canvas[data-scene]').forEach(sceneThumb);
  if (keepScroll) $('#overlay2 .sheet').scrollTop = prev;
}
function closeInfo(silent) {
  infoKey = null; $('#overlay2').innerHTML = ''; if (typeof renderNotes === 'function') setTimeout(renderNotes, 0);
  if (!silent) { if ($('#overlay .csheet') && detailCid) openDetail(detailCid); else if ($('#overlay .isheet') && itemCtx) openItem(itemCtx.cid, itemCtx.k); }
}

function set_infoKey(v) { return infoKey = v; }
export { campRow, pickSrc, goLeg, navRow, wormIco, go, itemSourceRows, infoKey, RES_INFO, openInfo, closeInfo, set_infoKey };
