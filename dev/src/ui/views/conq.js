// ui/views/conq.js — строки 5531–5728 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { cq, cqAddDisk, cqCanClaim, cqCanOn, cqChest, cqDiskOn, cqDiskPick, cqEn, cqEnSpend, cqEnTxt, cqFoes, cqGoods, cqLayout, cqLive, cqNode, cqNodeDisks, cqOpen, cqStCan, cqStReady, cqSta, cqStaCol, cqStaPen, cqStaSet, cqStatic, cqSyncTrack, cqTrack, cqTypeN } from '../../logic/conquest.js';
import { CQ_CHESTS, CQ_DIFF, CQ_DISKS, CQ_DMAX, CQ_EN, CQ_ICON, CQ_LAST, CQ_LAYERS, CQ_LFAC, CQ_LMAX, CQ_MED, CQ_RF, CQ_SECT, CQ_STA, CQ_TROPHY, cqBump, cqFeats, cqK, cqMod, cqModD, cqRar, cqRfCost, cqRfN, cqScore } from '../../data/conquest-data.js';
import { MOUSE_SVG } from '../mouse.js';
import { statInc } from '../../logic/stats.js';
import { leaveBattle } from '../battle/battle-ui.js';
import { SHOPS } from './shop.js';
import { openSquadSel } from '../overlays/squad-select.js';
import { giveRewards } from '../rewards.js';
import { openInfo } from '../overlays/info.js';
import { render } from '../router.js';
import { renderRes, starStr, toast } from '../common.js';
import { getRes, prog, unlockedIds } from '../../logic/progress.js';
import { S, set_view, view } from '../../core/state.js';
import { persist } from '../../core/save.js';
import { TIER_COL } from '../../logic/gear.js';
import { MEM, RELIC_COL, ringCol } from '../../logic/relics.js';
import { REFILL_MAX, ROMAN, RW_NAME, todayKey } from '../../logic/economy.js';
import { portrait } from '../../render2d/figures.js';
import { ghash } from '../../data/looks.js';
import { computeIntents } from '../../logic/battle/ai.js';
import { unitPower } from '../../logic/battle/stats.js';
import { CH } from '../../data/chars.js';
import { amt, fmt, ic } from '../../core/format.js';
import { $, isLandPhone } from '../../core/dom.js';
import { sRng } from '../../core/rng.js';
import { addRes, grantShards } from '../../logic/rewards.js';

// ---- battle hooks ----
function cqApply(B, cfg) {
  const C = cq(), A = B.units.slice(0, cfg.squad.length), E = B.units.filter(u => u.side === 'B').slice(0, cfg.cq.idx.length), st = C.foe[cfg.cq.key];
  for (const k of cqDiskOn()) if (CQ_DISKS[k]) CQ_DISKS[k].f(A, B);
  for (const u of A) { const p = cqStaPen(cqSta(u.def.id)); if (p.dmg > 0) { u.dmgBonus -= p.dmg; u.spd = Math.round(u.spd * (1 - p.spd)); } u.hp = u.maxHp; }   // full HP every node; stamina weakens
  for (const m of cfg.cq.mods) if (cqMod(m)) cqMod(m).f(E, cqK());
  if (st) E.forEach((u, j) => { const r = st[cfg.cq.idx[j]]; if (r) { u.hp = Math.max(1, Math.round(u.maxHp * r.h)); if (u.maxShield) u.shield = Math.round(u.maxShield * r.s); } });
  computeIntents(B);
}
function cqFinish(B, cfg, won) {
  const C = cq(), a = cqNode(cfg.cq.key), mine = B.units.slice(0, cfg.squad.length), E = B.units.filter(u => u.side === 'B').slice(0, cfg.cq.idx.length);
  const loss = cqDiskOn().includes('stam') ? CQ_STA.loss / 2 : CQ_STA.loss;
  if (won) for (const u of mine) cqStaSet(u.def.id, cqSta(u.def.id) - loss);
  C.squad = C.squad.filter(id => cqSta(id) >= CQ_STA.min);
  let html, lines = [];
  { const k = E.filter(u => !u.alive).length; if (k) cqBump('kill', a.s, k); }
  if (won) {
    delete C.foe[a.key];
    const surv = mine.filter(u => u.alive).length, st = surv === mine.length ? 3 : surv >= Math.ceil(mine.length / 2) ? 2 : 1, prev = C.done[a.key] || 0;
    if (st > prev) { C.stars += st - prev; C.done[a.key] = st; }
    const m = (CQ_DIFF[C.diff] || CQ_DIFF.easy).mult, sol = Math.round((1500 + a.lvl * 40) * m);
    if (!prev) {
      S.solari += sol; lines.push(`+${amt('sol', sol)} соляриев`);
      { const tr = (CQ_TROPHY[a.type] || 0) * m; if (tr) { S.jt = (S.jt || 0) + tr; lines.push(`+${amt('jt', tr)} трофеев Джихада`); } }
      if (a.type === 'boss' || a.type === 'elite') { const c = (a.type === 'boss' ? 2 : 1) * m; const key = a.type === 'boss' ? 'legacy_thread' : 'blood_echo'; S[key] = (S[key] || 0) + c; lines.push(`+${amt(key, c)} сигналов памяти`); }
      if (a.s === 4 && Math.random() < .5) { const id = Math.random() < .5 ? 'robot' : 'cymek', q = m; lines.push(`+${amt('shard', q, 'shard:' + id)} ${CH[id].sn}${grantShards(id, q) ? ' — персонаж открыт!' : ''}`); }
      if (a.type === 'boss') { if (a.s < 4) { C.open = Math.max(C.open, a.s + 1); C.sec = a.s + 1; lines.push(`Открыт сектор ${a.s + 2}: ${CQ_SECT[a.s + 1].n}`); } else lines.push('Джихад завершён! Эразм признаёт силу вашего Дома.'); }
    } else lines.push('Повторная победа: звёзды улучшены, награда за точку уже получена.');
    const fac = CQ_LFAC[a.s], few = mine.length <= 3, flaw = surv === mine.length, sq = mine.map(u => u.def);
    cqBump('win', a.s); if (flaw) cqBump('flaw', a.s); if (few) cqBump('few', a.s);
    for (const f of ['atr', 'hark', 'frem']) if (sq.every(d => d.f.includes(f))) cqBump('only:' + f, a.s);
    if (sq.filter(d => d.f.includes(fac[0])).length >= fac[1]) cqBump('fac', a.s);
    if (a.type === 'elite' && flaw) cqBump('eliteflaw', a.s);
    if (a.type === 'boss') { if (!prev) cqBump('boss', a.s, Object.keys(C.done).filter(k => k.endsWith(`-${CQ_LAST}-0`)).length, true); if (cfg.cq.fresh) cqBump('boss1', a.s); if (flaw) cqBump('bossflaw', a.s); }
    lines.push(`Очки Джихада: ${cqScore()} (звёзды ${C.stars} + подвиги ${C.pts || 0})`);
    html = `<h3>Победа</h3><div class="stars">${starStr(st, 3)}</div><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
  } else {
    const all = cqFoes(a), st = C.foe[a.key] || all.map(() => ({ h: 1, s: 1 }));
    E.forEach((u, j) => { st[cfg.cq.idx[j]] = { h: u.alive && u.hp > 0 ? Math.max(.01, u.hp / u.maxHp) : 0, s: u.maxShield ? Math.max(0, u.shield) / u.maxShield : 1 }; });
    C.foe[a.key] = st;
    const down = st.filter(x => x.h <= 0).length;
    html = `<h3>Поражение</h3><ul><li>Враги точки не восстанавливаются: повержено ${down} из ${st.length}, раны остальных сохранены до следующего захода.</li><li>Выносливость тратится только за победу — участники её не потеряли.</li></ul>`;
  }
  cqSyncTrack(); persist();
  return { html, btns: `<button class="btn go" data-cqback="1">К карте Джихада</button>` };
}

// ---- view ----
function cqFoeCard(p, k, r, lead) {
  const dead = r && r.h <= 0, d = CH[p.id];
  return `<div class="cden ${dead ? 'dead' : ''}">${portrait(d, 46, p.relic ? RELIC_COL : TIER_COL[p.gear])}<span>${d.sn}${lead ? ' · лидер' : ''}</span><span class="mono cdst">ур. ${p.lvl} · сн. ${ROMAN[p.gear]}${p.relic ? ' · ' + MEM(p.relic) : ''}</span><span class="mono cdpw">мощь ${fmt(unitPower(d, p))}</span>${dead ? '<span class="cqdead">повержен</span>' : r ? `<span class="cqfb"><i style="width:${Math.round(r.h * 100)}%"></i></span>${CH[p.id] && r.s < 1 ? `<span class="cqfb sh"><i style="width:${Math.round(r.s * 100)}%"></i></span>` : ''}<span class="mono cqfp">${Math.round(r.h * 100)}% ОЗ</span>` : ''}</div>`;
}
function cqDetail(a) {
  const C = cq(), op = cqOpen(a), dn = C.done[a.key] || 0, m = CQ_DIFF[C.diff].mult;
  let body = '', acts = '';
  if (a.type === 'cache') {
    if (!op && !dn) body = `<p class="lockd">Доберитесь до тайника по карте — после этого лавка будет доступна до конца недели.</p>`;
    else {
      const got = C.buy[a.key] || [];
      body = `<p class="sub" style="margin:0 0 6px">Контрабандисты торгуют редким товаром. Каждый лот — один раз; заглядывать можно в любое время, пока идёт Джихад.</p><div class="cqgoods">${cqGoods(a.key).map((g, k) => { const sold = got.includes(k), [ck, cn] = g.cost, can = !sold && getRes(ck) >= cn;
        return `<div class="cqgood ${sold ? 'sold' : ''}">${g.rw ? `<div class="cqgrw">${g.rw.map(r => amt(r[0], r[1], r[2] ? 'shard:' + r[2] : undefined) + (r[2] ? ' ' + CH[r[2]].sn : '')).join(' ')}</div>` : `<div class="cqgrw">${cqI(g.ico)}</div>`}<b>${g.n}</b>${g.d ? `<p>${g.d}</p>` : ''}${sold ? '<span class="qok">✓ куплено</span>' : `<button class="btn mini ${can ? 'go' : ''}" data-cqbuy="${a.key}:${k}" ${can ? '' : 'disabled'}>${amt(ck, cn)}</button>`}</div>`; }).join('')}</div>`;
    }
  } else if (a.type === 'disk') {
    if (dn) body = '<span class="qok">✓ Диск из этого тайника уже получен</span>';
    else if (!op) body = `<p class="lockd">${C.pick ? 'Сначала выберите стартовый диск' : 'Пройдите соседнюю точку слева'}</p>`;
    else { const ks = cqNodeDisks(a); body = ks.length ? `<p class="sub" style="margin:0 0 6px">Выберите один диск из трёх. Если надето уже ${CQ_DMAX} (или ${CQ_LMAX} легендарных), новый ляжет в запас.</p><div class="cqdiffs">${ks.map(k => cqDiskCard(k, `<button class="btn go" data-cqnd="${a.key}:${k}">Взять</button>`)).join('')}</div>` : `<p class="sub">Все диски уже собраны.</p><button class="btn go" data-cqnd="${a.key}:">Дальше</button>`; }
  } else {
    const { all, st } = cqLive(a), pw = all.reduce((x, p, k) => x + (st && st[k] && st[k].h <= 0 ? 0 : unitPower(CH[p.id], p)), 0), left = st ? st.filter(x => x.h > 0).length : all.length;
    body = `<div class="cdrow"><span class="lbl">Противник${st ? ` · осталось ${left} из ${all.length}` : ''}</span><div class="cdenemy">${all.map((p, k) => cqFoeCard(p, k, st && st[k], k === 0 && CH[p.id].leader)).join('')}</div></div>
      <div class="cdrow"><span class="lbl">Условия</span><div class="cdtags"><span class="power">мощь врага ${fmt(pw)}</span>${CQ_SECT[a.s].desert ? '<span class="tag desert">Пустыня · червь</span>' : ''}${a.type === 'boss' ? '' : a.mods.map(k => `<span class="tag mod">${cqMod(k).n}: ${cqModD(k)}</span>`).join('') || '<span class="tag">без модификаторов</span>'}</div></div>
      ${a.type === 'boss' ? `<div class="cdrow"><span class="lbl">Синергия отряда</span><p class="cqsyn">${CQ_SECT[a.s].syn}. Босс сражается сыгранной командой своей фракции, и Джихад усиливает её:</p><div class="cqbm">${a.mods.map(k => `<div class="cqbmi"><b>${cqMod(k).n}</b><span>${cqModD(k)}</span></div>`).join('')}</div></div><div class="cdrow"><span class="lbl">Подвиги босса</span><div class="cdtags">${cqFeats(a.s).filter(F => F.boss).map(F => `<span class="tag ${C.fd[F.key] ? 'cqok' : ''}">${C.fd[F.key] ? '✓ ' : ''}${F.n} · +${F.pts} оч.</span>`).join('')}</div></div>` : ''}
      <div class="cdrow"><span class="lbl">Награда</span><div class="cdtags">${amt('sol', Math.round((1500 + a.lvl * 40) * m))}${a.type === 'boss' ? ' ' + amt('legacy_thread', 2 * m) + ' · открывает следующий сектор' : a.type === 'elite' ? ' ' + amt('blood_echo', m) : ''} ${amt('jt', (CQ_TROPHY[a.type] || 0) * m)} за первую победу · до 3 звёзд</div></div>`;
    acts = dn === 3 ? '<span class="qok">✓ Пройдено на 3★</span>' : op ? `<button class="btn go" data-cqgo="${a.key}">${dn ? 'Улучшить результат' : st ? 'Продолжить бой' : 'В бой'}<small>−${CQ_EN.fight} Решимости · −${CQ_STA.loss}% выносливости за победу</small></button>` : `<span class="lockd">${C.pick ? 'Сначала выберите диск' : 'Пройдите соседнюю точку слева'}</span>`;
  }
  return `<div class="cdetail cqdet"><div class="cdinfo"><div class="cdrow"><span class="lbl">${cqTypeN(a.type)} · шаг ${a.L + 1}/${CQ_LAYERS.length}</span></div>${body}${acts ? `<div class="acts">${acts}</div>` : ''}</div></div>`;
}
function renderConq() {
  cqSyncTrack(); const C = cq(), L = S.acc.lvl, msLeft = (() => { const d = new Date(C.wk); d.setDate(d.getDate() + 7); return d - Date.now(); })(), dd = Math.floor(msLeft / 8.64e7), hh = Math.floor(msLeft % 8.64e7 / 3.6e6);
  let html = `<h2 class="lshide">Джихад</h2><p class="sub">Еженедельная священная война: пять секторов с ветвящимися картами. Бои идут за <b>Решимость</b>; каждый бой отнимает у участников 10% <b>выносливости</b> — уставшие бьют слабее и медленнее, но восстанавливаются со временем. Здоровье героев полное на каждой новой точке, а раненые враги не лечатся между заходами. Звёзды двигают шкалу наград; главный приз — <b>Эразм</b>, чьи осколки есть только здесь. Сброс через ${dd} д ${hh} ч.</p>`;
  if (L < CQ_DIFF.easy.acc) { $('#view').innerHTML = html + `<div class="panel"><p class="lockd">Джихад откроется с ${CQ_DIFF.easy.acc} уровня аккаунта.</p></div>`; return; }
  if (!C.diff) {
    html += `<div class="cqdiffs">${Object.entries(CQ_DIFF).map(([k, D]) => { const ok = L >= D.acc; return `<div class="cqdiff d-${k} ${ok ? '' : 'locked'}"><h3>${D.n}</h3><span class="mono">враги ур. ${D.lvl[0]}–${D.lvl[1]}${D.relic[1] ? ` · Другая память до ${D.relic[1]}` : ''}</span><p>Награды ×${D.mult}. Эразм: до ${D.er.reduce((a, b) => a + b, 0)} осколков за неделю.</p><button class="btn ${ok ? 'go' : ''}" data-cqdiff="${k}" ${ok ? '' : 'disabled'}>${ok ? 'Выбрать' : `С ур. аккаунта ${D.acc}`}</button></div>`; }).join('')}</div><p class="sub">Сложность выбирается один раз на неделю.</p>`;
    $('#view').innerHTML = html; return;
  }
  const s = Math.min(C.sec ?? 0, C.open), nodes = cqLayout(s), SE = CQ_SECT[s], en = cqEn(), nOn = cqDiskOn().length;
  html += `<div class="cqbar"><span class="tag">${CQ_DIFF[C.diff].n}</span><span class="cqst mono" title="Очки Джихада: звёзды за бои + подвиги">◆ ${cqScore()}</span>
    <button class="cqitem cqres" data-cqres="1" title="Решимость: описание и пополнение">${cqI('res')}<b>${en}/${CQ_EN.max}</b><span>Решимость · ${cqEnTxt()}</span></button>
    <button class="cqitem" data-cqdisks="1" title="Управление дисками">${cqI('disk')}<b>${nOn}/${CQ_DMAX}</b><span>Диски${C.disks.length > nOn ? ` · в запасе ${C.disks.length - nOn}` : ''}</span></button>
    <button class="cqitem" data-cqfw="g">${cqI('boss')}<b>${cqFeats(null).filter(F => C.fd[F.key]).length}/9</b><span>Общие подвиги</span></button>
    <button class="cqitem" data-cqfw="${s}">${cqI('elite')}<b>${cqFeats(s).filter(F => C.fd[F.key]).length}/6</b><span>Подвиги сектора</span></button>
    <span class="cqitem" title="Аптечки: +${CQ_MED}% выносливости одному герою">${cqI('med')}<b>${S.cqMed || 0}</b><span>Аптечки</span></span>
    <button class="cqitem" data-shoptab="jihad" title="Магазин Джихада">${ic('jt')}<b>${fmt(S.jt || 0)}</b><span>Трофеи · магазин</span></button></div>`;
  if (C.pick) html += `<div class="panel cqpick"><h3>Выберите стартовый диск</h3><p class="sub" style="margin:0 0 8px">Диск действует на ваших героев до конца недели. Надеть можно до ${CQ_DMAX} дисков. Редкость: <b class="cqrar r-c">обычные</b> дают характеристики, <b class="cqrar r-r">редкие</b> — новую механику отряду, <b class="cqrar r-l">легендарные</b> — уникальное умение (надеть не больше ${CQ_LMAX}). Новые диски — в тайниках после каждых 4 боёв и в магазине Джихада.</p><div class="cqdiffs">${C.pick.map(k => cqDiskCard(k, `<button class="btn go" data-cqdisk="${k}">Взять</button>`)).join('')}</div></div>`;
  html += `<div class="ctabs">${CQ_SECT.map((x, k) => `<button class="ctab ${k === s ? 'on' : ''}" data-cqsec="${k}" ${k <= C.open ? '' : 'disabled'}>${k + 1}. ${x.n}<small>${C.done[`${k}-${CQ_LAST}-0`] ? 'зачищен' : k <= C.open ? 'открыт' : 'закрыт'}</small></button>`).join('')}</div>
    <p class="sub">${SE.d}</p>`;
  const LS = isLandPhone(), CW = LS ? 72 : 88, H0 = LS ? 210 : 280, W0 = 60 + CQ_LAST * CW + 60, px = a => 46 + a.L * CW, py = a => 22 + a.y * (H0 - 44);
  const lines = nodes.flatMap(a => a.next.map(k => { const b = nodes.find(x => x.key === k), on = C.done[a.key]; return `<line x1="${px(a)}" y1="${py(a)}" x2="${px(b)}" y2="${py(b)}" class="${on ? 'on' : ''}"/>`; })).join('');
  if (!C.sel || !nodes.some(a => a.key === C.sel)) C.sel = (nodes.find(a => cqOpen(a) && !C.done[a.key]) || nodes[0]).key;
  const btns = nodes.map(a => { const op = cqOpen(a), dn = C.done[a.key] || 0, hurt = a.fight && !dn && C.foe[a.key];
    return `<button class="cqn t-${a.type} ${dn ? 'done' : op ? 'open' : 'locked'} ${hurt ? 'hurt' : ''} ${a.key === C.sel ? 'sel' : ''}" data-cqnode="${a.key}" style="left:${px(a)}px;top:${py(a)}px" aria-label="${cqTypeN(a.type)}">${cqI(a.type)}${dn && a.fight ? `<span class="cqns">${'★'.repeat(dn)}</span>` : ''}</button>`; }).join('');
  html += `<div class="cqmap" id="cqmap"><div class="cqtrack" style="width:${W0}px;height:${H0}px"><svg class="cqlines" width="${W0}" height="${H0}">${lines}</svg>${btns}</div></div>`;
  const a = cqNode(C.sel);
  html += cqDetail(a);
  const tired = unlockedIds().map(id => [id, cqSta(id)]).filter(x => x[1] < 100).sort((x, y) => x[1] - y[1]);
  html += `<p class="chap">Выносливость героев</p>${tired.length ? `<div class="cqheroes">${tired.map(([id, v]) => { const p = cqStaPen(v); return `<div class="cqh ${v < CQ_STA.min ? 'dead' : ''}">${portrait(CH[id], 40, ringCol(prog(id)))}<span class="cqhn">${CH[id].sn}</span><span class="cqhp"><i style="width:${v}%;background:${cqStaCol(v)}"></i></span><span class="mono">${v}%${p.dmg > 0 ? ` · урон −${Math.round(p.dmg * 100)}%, скор. −${Math.round(p.spd * 100)}%` : ''}</span><button class="btn mini ${S.cqMed ? 'go' : ''}" data-cqmed="${id}" ${S.cqMed ? '' : 'disabled'}>Аптечка +${CQ_MED}%</button></div>`; }).join('')}</div><p class="sub" style="margin-top:6px">+1% каждые ${CQ_STA.regenMin} мин; выносливость тратится только за победу. Герои с 0% в бой не идут. Аптечки — в магазине Джихада (Лавки) за трофеи.</p>` : '<p class="sub">Все герои полны сил.</p>'}`;
  { const sc = cqScore(), T = cqTrack(), segs = CQ_CHESTS.map((at, i) => T.filter(x => (x.kind === 'st' ? Math.floor(x.i / 4) : x.i) === i));
    html += `<p class="chap">Шкала наград · очки ${sc} / ${CQ_CHESTS[6]}</p><p class="sub" style="margin:0 0 8px">Очки = звёзды за бои + награды за подвиги. Достигнутые награды подсвечиваются — нажмите, чтобы забрать; сундуки открываются так же — нажмите на сундук, чтобы посмотреть, что в нём.</p><div class="cqtrk"><div class="cqtbar"><i style="width:${Math.min(100, sc / CQ_CHESTS[6] * 100)}%"></i></div><div class="cqsegs">${segs.map(seg => `<div class="cqseg">${seg.map(x => {
      if (x.kind === 'st') { const rr = cqStatic(x.i), ok = !!C.tk['s' + x.i]; const av = !ok && cqStCan(x.i); return `<${av ? 'button' : 'div'} class="cqst1 ${ok ? 'got' : av ? 'ready' : ''}"${av ? ` data-cqst="${x.i}"` : ''}><span class="mono">${x.at}</span>${rr.map(r => amt(r[0], r[1], r[2] ? 'shard:' + r[2] : undefined)).join('')}${ok ? '<i>✓</i>' : av ? '<em>забрать</em>' : ''}</${av ? 'button' : 'div'}>`; }
      const rw = cqChest(x.i), er = rw.fix.find(r => r[2] === 'erasmus'), can = cqCanClaim(x.i), got = C.tk['c' + x.i];
      return `<button class="cqchest ${got ? 'got' : can ? 'ready' : ''} ${er ? 'big' : ''}" data-cqchest="${x.i}"><span class="mono">◆${x.at}</span><svg viewBox="0 0 24 24"><path d="M3 10h18v10H3z" fill="${er ? '#6a2a8a' : '#7a4a22'}"/><path d="M3 10c0-4 4-6 9-6s9 2 9 6z" fill="${er ? '#9a4ac0' : '#a8642a'}"/><rect x="10" y="9" width="4" height="5" rx="1" fill="#f0c860"/></svg>${er ? `<span class="cqer">${portrait(CH.erasmus, 22)}×${er[1]}</span>` : ''}<span class="cqcs">${got ? '✓ открыт' : can ? 'открыть!' : 'состав'}</span></button>`; }).join('')}</div>`).join('')}</div></div>`; }
  $('#view').innerHTML = html;
  const mp = $('#cqmap'); if (mp) mp.scrollLeft = Math.max(0, px(a) - mp.clientWidth / 2);
}
function cqDiskWin() {
  const C = cq(), on = C.disks.filter(x => x.on), off = C.disks.filter(x => !x.on), en = cqEn();
  const RO = { l: 0, r: 1, c: 2 }, srt = a => a.slice().sort((p, q) => RO[CQ_DISKS[p.k].r] - RO[CQ_DISKS[q.k].r]);
  const card = (x, eq) => { const ok = cqCanOn(x.k), why = !ok && cqDiskOn().length < CQ_DMAX ? `<small>легендарных уже ${CQ_LMAX}</small>` : '';
    return `<div class="cqdk r-${CQ_DISKS[x.k].r} ${eq ? 'on' : ''}">${cqI('disk')}<div>${cqRarTag(x.k)}<b>${CQ_DISKS[x.k].n}</b><p>${CQ_DISKS[x.k].d}</p></div>${eq ? `<button class="btn mini" data-cqdoff="${x.k}" ${en >= CQ_EN.unequip ? '' : 'disabled'}>Снять<small>−${CQ_EN.unequip} Решимости</small></button>` : `<button class="btn mini ${ok ? 'go' : ''}" data-cqdon="${x.k}" ${ok ? '' : 'disabled'}>Надеть${why}</button>`}</div>`; };
  $('#overlay').innerHTML = `<div class="result" data-close="1"><div class="box cqdbox" role="dialog" aria-modal="true" aria-label="Диски"><h3>Диски</h3><p class="sub" style="margin:0">Надетые диски действуют на всех ваших героев во всех боях Джихада. Надеть — бесплатно (до ${CQ_DMAX}, из них легендарных — до ${CQ_LMAX}), снять — ${CQ_EN.unequip} Решимости (у вас ${en}).</p>
    <div class="cqdcols"><section><p class="chap">Надетые · ${on.length}/${CQ_DMAX}</p>${srt(on).map(x => card(x, 1)).join('') || '<p class="lockd">Ничего не надето</p>'}</section><section><p class="chap">В запасе · ${off.length}</p>${srt(off).map(x => card(x, 0)).join('') || '<p class="lockd">Запас пуст</p>'}</section></div>
    <div class="acts" style="justify-content:center"><button class="btn go" data-close="1">Закрыть</button></div></div></div>`;
}
function cqResWin(need) {
  const en = cqEn(), n = cqRfN(), c = cqRfCost(), lim = n >= REFILL_MAX;
  $('#overlay').innerHTML = `<div class="result" data-close="1"><div class="box cqcbox" role="dialog" aria-modal="true" aria-label="Решимость"><h3>${need && en < need ? 'Не хватает Решимости' : 'Решимость'}</h3>
    <div class="cqresh">${cqI('res')}<b class="mono">${en} / ${CQ_EN.max}</b>${need ? `<span>нужно ${need}</span>` : ''}</div>
    <p class="sub" style="margin:0">Энергия Джихада. Бой стоит ${CQ_EN.fight} Решимости, снятие диска — ${CQ_EN.unequip}. Восстанавливается сама: +1 каждые ${CQ_EN.sec / 60} мин (${cqEnTxt()}). Каждую неделю запас снова полон. Пополнить можно за кристаллы пряности — по тем же правилам, что Воду: цена удваивается после каждого третьего пополнения и сбрасывается в полночь, не больше ${REFILL_MAX} в день; запас может превысить максимум.</p>
    <div class="kv"><span>Пополнений сегодня</span><div>${n} из ${REFILL_MAX}</div><span>Кристаллы</span><div>${amt('cry', S.cry)}</div></div>
    <div class="acts" style="justify-content:center">${lim ? '<span class="lockd">Лимит на сегодня исчерпан</span>' : `<button class="btn ${S.cry >= c ? 'go' : 'lack'}" data-cqrf="${need || 0}">Пополнить +${CQ_RF.amt}<small>${amt('cry', c)}</small></button>`}${need && en >= need ? '<span class="qok">✓ Теперь хватает</span>' : ''}<button class="btn" data-close="1">Закрыть</button></div></div></div>`;
}
// ---- магазин Джихада (вкладка в Лавках) ----
const CQ_PRICE = { c: 150, r: 220, l: 480 };    // цена диска в трофеях Джихада
function cqShopItems() {
  const C = cq(), b = (S.cqShop && S.cqShop.wk === C.wk) ? S.cqShop.b : {}, own = new Set(C.disks.map(x => x.k)), r = sRng(ghash(C.wk + 'jshop'));
  const disks = [];        // ассортимент недели: 3 редких + 2 легендарных
  for (const [q, n] of [['r', 3], ['l', 2]]) { const pool = Object.keys(CQ_DISKS).filter(k => CQ_DISKS[k].r === q); for (let i = 0; i < n && pool.length; i++) disks.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); }
  const mark = () => { if (!S.cqShop || S.cqShop.wk !== C.wk) S.cqShop = { wk: C.wk, b: {} }; return S.cqShop.b; };
  return [
    { key: 'med', n: 'Аптечка', d: `+${CQ_MED}% выносливости одному герою. Применяется на карте Джихада.`, ico: 'med', price: 30, buy: () => { S.cqMed = (S.cqMed || 0) + 1; return 'Аптечка в запасе'; } },
    { key: 'med3', n: 'Набор из 3 аптечек', d: `Три аптечки по +${CQ_MED}% выносливости.`, ico: 'med', price: 80, buy: () => { S.cqMed = (S.cqMed || 0) + 3; return '+3 аптечки'; } },
    ...disks.map(k => ({ key: 'd:' + k, n: CQ_DISKS[k].n, d: CQ_DISKS[k].d, ico: 'disk', rar: CQ_DISKS[k].r, price: CQ_PRICE[CQ_DISKS[k].r], sold: !!b['d:' + k] || own.has(k), lim: 1,
      buy: () => { mark()['d:' + k] = 1; if (!C.diff) { C.diff = 'easy'; } cqAddDisk(k); return `Диск «${CQ_DISKS[k].n}» — ${C.disks.find(x => x.k === k).on ? 'надет' : 'в запасе'}`; } })),
  ];
}
function cqShopView() {
  const msLeft = (() => { const d = new Date(cq().wk); d.setDate(d.getDate() + 7); return d - Date.now(); })();
  $('#view').innerHTML = `<h2 class="lshide">Лавки</h2>
    <div class="ctabs">${Object.entries(SHOPS).map(([k, v]) => `<button class="ctab" data-shoptab="${k}">${v.n}<small>${{ post: ic('sol') + ic('cry'), sietch: ic('teeth'), chron: ic('rid'), ring: ic('wring') }[k] || ''}</small></button>`).join('')}<button class="ctab on" data-shoptab="jihad">Джихад<small>${ic('jt')}</small></button></div>
    <p class="sub">Трофеи Джихада — за первую победу на каждой точке и на шкале наград. Здесь продаются редкие и легендарные диски; они действуют до конца недели Джихада, ассортимент обновится через ${Math.floor(msLeft / 8.64e7)} д ${Math.floor(msLeft % 8.64e7 / 3.6e6)} ч. У вас: ${amt('jt', S.jt || 0)} · аптечек ${S.cqMed || 0}.</p>
    <div class="shop">${cqShopItems().map(it => { const can = !it.sold && (S.jt || 0) >= it.price;
      return `<div class="item ${it.sold ? 'sold' : ''} ${it.rar ? 'cqsh r-' + it.rar : ''}"><span class="bigico sm cqshico">${cqI(it.ico)}</span>${it.rar ? cqRarTag(it.key.slice(2)) : ''}<div class="t">${it.n}</div><div class="s">${it.d}${it.lim ? ` · ${it.sold ? 'есть / куплено' : 'один на неделю'}` : ''}</div><button class="btn ${can ? '' : 'dim'}" data-cqjbuy="${it.key}" ${it.sold ? 'disabled' : ''}>${amt('jt', it.price)}</button></div>`; }).join('')}</div>`;
}
function cqChestWin(i) {
  const C = cq(), rw = cqChest(i), can = cqCanClaim(i), got = C.tk['c' + i], sc = cqScore(), li = l => l.map(r => `<li>${cqRwHtml(r)}</li>`).join('');
  $('#overlay').innerHTML = `<div class="result" data-close="1"><div class="box cqcbox" role="dialog" aria-modal="true" aria-label="Сундук"><h3>Сундук ${i + 1} · ◆${CQ_CHESTS[i]}</h3>
    <p class="chap">Гарантированно</p><ul class="cqrw">${li(rw.fix)}</ul><p class="chap">И одна награда на выбор судьбы</p><ul class="cqrw any">${li(rw.any)}</ul>
    <p class="sub" style="margin:0">${got ? 'Сундук уже открыт.' : can ? 'Порог достигнут — сундук можно открыть.' : `Нужно ещё ${CQ_CHESTS[i] - sc} очков Джихада.`}</p>
    <div class="acts" style="justify-content:center">${can ? `<button class="btn go" data-cqopen="${i}">Открыть</button>` : ''}<button class="btn" data-close="1">Закрыть</button></div></div></div>`;
}
function cqFeatWin(s) {
  const C = cq(), L = cqFeats(s), row = F => { const v = C.fp[F.key] || 0, ok = !!C.fd[F.key];
    return `<div class="cqft ${ok ? 'ok' : ''}"><div class="cqftn"><b>${F.n}</b><span class="cqftp">+${F.pts} оч.</span></div><p>${F.d}</p><div class="cqftb"><span class="fbar"><i style="width:${v / F.need * 100}%"></i></span><span class="mono">${ok ? '✓ выполнен' : `${v} / ${F.need}`}</span></div></div>`; };
  const title = s === null ? 'Общие подвиги' : `Подвиги сектора: ${CQ_SECT[s].n}`, sub = s === null ? 'Засчитываются в любом секторе Джихада. Каждый даёт 15 очков шкалы наград.' : `Засчитываются только в этом секторе. Обычные — ${s < 3 ? 3 : 5} очков, подвиги босса — ${s < 2 ? 1 : s < 4 ? 2 : 3}.`;
  $('#overlay').innerHTML = `<div class="result" data-close="1"><div class="box cqdbox" role="dialog" aria-modal="true" aria-label="${title}"><h3>${title}</h3><p class="sub" style="margin:0">${sub}</p>
    ${s === null ? `<div class="cqfts">${L.map(row).join('')}</div>` : `<p class="chap">Сектор</p><div class="cqfts">${L.filter(F => !F.boss).map(row).join('')}</div><p class="chap">Босс сектора</p><div class="cqfts">${L.filter(F => F.boss).map(row).join('')}</div>`}
    <div class="acts" style="justify-content:center"><button class="btn go" data-close="1">Закрыть</button></div></div></div>`;
}
function cqClick(d) {
  if (d.cqdiff) { const C = cq(); if (C.diff || S.acc.lvl < CQ_DIFF[d.cqdiff].acc) return true; C.diff = d.cqdiff; C.pick = cqDiskPick('start'); persist(); render(); return true; }
  if (d.cqdisk) { const C = cq(); if (!C.pick || !C.pick.includes(d.cqdisk)) return true; cqAddDisk(d.cqdisk); C.pick = null; persist(); toast(`${cqRar(d.cqdisk).n} диск «${CQ_DISKS[d.cqdisk].n}» установлен`); render(); return true; }
  if (d.cqnd !== undefined) { const [key, k] = d.cqnd.split(':'), C = cq(), a = cqNode(key); if (!a || a.type !== 'disk' || C.done[key] || !cqOpen(a)) return true;
    if (k) { if (!cqNodeDisks(a).includes(k)) return true; cqAddDisk(k); toast(`${cqRar(k).n} диск «${CQ_DISKS[k].n}» ${C.disks.find(x => x.k === k).on ? 'надет' : 'отправлен в запас'}`); }
    C.done[key] = 1; persist(); render(); return true; }
  if (d.cqsec !== undefined) { const C = cq(); C.sec = Math.min(+d.cqsec, C.open); C.sel = null; persist(); render(); return true; }
  if (d.cqnode) { const C = cq(), a = cqNode(d.cqnode); C.sel = d.cqnode; if (a && a.type === 'cache' && !C.done[a.key] && cqOpen(a)) { C.done[a.key] = 1; persist(); } render(); return true; }
  if (d.cqgo) { const a = cqNode(d.cqgo); if (!a || !cqOpen(a)) return true; if (cqEn() < CQ_EN.fight) { cqResWin(CQ_EN.fight); return true; } openSquadSel('conq', d.cqgo); return true; }
  if (d.cqbuy) { const [key, k] = d.cqbuy.split(':'), C = cq(), a = cqNode(key); if (!a || a.type !== 'cache' || !C.done[key]) return true; const got = (C.buy[key] ??= []); if (got.includes(+k)) return true;
    const g = cqGoods(key)[+k], [ck, cn] = g.cost; if (getRes(ck) < cn) { openInfo(ck); return true; }
    addRes(ck, -cn); got.push(+k); const out = g.rw ? giveRewards(g.rw) : [g.use()]; persist(); toast(out.join(' · ')); render(); return true; }
  if (d.cqdisks) { cqDiskWin(); return true; }
  if (d.cqdon) { const C = cq(), x = C.disks.find(y => y.k === d.cqdon); if (!x || x.on || !cqCanOn(x.k)) return true; x.on = 1; persist(); render(); cqDiskWin(); return true; }
  if (d.cqdoff) { const C = cq(), x = C.disks.find(y => y.k === d.cqdoff); if (!x || !x.on) return true; if (!cqEnSpend(CQ_EN.unequip)) { toast(`Нужно ${CQ_EN.unequip} Решимости`); return true; } x.on = 0; persist(); render(); cqDiskWin(); return true; }
  if (d.cqmed) { const id = d.cqmed; if (!S.cqMed || cqSta(id) >= 100) return true; S.cqMed--; cqStaSet(id, cqSta(id) + CQ_MED); persist(); toast(`${CH[id].sn}: выносливость ${cqSta(id)}%`); render(); return true; }
  if (d.cqres) { cqResWin(0); return true; }
  if (d.cqrf) { const c = cqRfCost(); if (cqRfN() >= REFILL_MAX) return true; if (S.cry < c) { openInfo('cry'); return true; } S.cry -= c; cqEn(); cq().en += CQ_RF.amt; S.cqRf = { d: todayKey(), n: cqRfN() + 1 }; persist(); toast(`+${CQ_RF.amt} Решимости`); if (view === 'conq') render(); cqResWin(+d.cqrf || 0); return true; }
  if (d.cqjbuy) { const it = cqShopItems().find(x => x.key === d.cqjbuy); if (!it || it.sold) return true; if ((S.jt || 0) < it.price) { toast('Не хватает трофеев Джихада'); return true; }
    S.jt -= it.price; const msg = it.buy(); persist(); toast(msg); render(); return true; }
  if (d.cqst !== undefined) { const j = +d.cqst; if (!cqStCan(j)) return true; const rr = cqStatic(j); cq().tk['s' + j] = 1; giveRewards(rr); persist();
    const el = document.querySelector(`[data-cqst="${j}"]`); if (el) { cqPop(el, rr.map(r => '+' + amt(r[0], r[1], r[2] ? 'shard:' + r[2] : undefined)).join(' ')); el.outerHTML = `<div class="cqst1 got">${el.innerHTML.replace(/<em>.*?<\/em>/, '<i>✓</i>')}</div>`; }
    if (typeof renderRes === 'function') renderRes(); return true; }
  if (d.cqchest !== undefined) { cqChestWin(+d.cqchest); return true; }
  if (d.cqopen !== undefined) { const i = +d.cqopen; if (!cqCanClaim(i)) return true; const C = cq(), rw = cqChest(i), pick = rw.any[Math.floor(Math.random() * rw.any.length)]; C.tk['c' + i] = 1; if (i === CQ_CHESTS.length - 1) statInc('cqMax'); const lines = giveRewards([...rw.fix, pick]); persist(); render();
    $('#overlay').innerHTML = `<div class="result won"><div class="box" role="dialog" aria-modal="true"><div class="mousewrap">${MOUSE_SVG(false)}</div><h3>Сундук Джихада · ◆${CQ_CHESTS[i]}</h3><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><div class="acts" style="justify-content:center"><button class="btn go" data-close="1">Забрать</button></div></div></div>`; return true; }
  if (d.cqfw !== undefined) { cqFeatWin(d.cqfw === 'g' ? null : +d.cqfw); return true; }
  if (d.cqback) { leaveBattle(); set_view('conq'); render(); return true; }
  return false;
}
function cqPop(el, html) {    // маленькая всплывашка над наградой
  const r = el.getBoundingClientRect(), d = document.createElement('div'); d.className = 'cqpop'; d.innerHTML = html;
  d.style.left = (r.left + r.width / 2) + 'px'; d.style.top = r.top + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1700);
}
const cqRwHtml = r => amt(r[0], r[1], r[2] ? 'shard:' + r[2] : undefined) + (r[2] ? ` <span class="cqrwn">${CH[r[2]].sn}</span>` : ` <span class="cqrwn">${RW_NAME[r[0]] || ''}</span>`);
const cqBadge = () => { if (!S) return ''; const C = cq(); if (!C.diff) return 'новая неделя'; const ready = CQ_CHESTS.filter((t, i) => cqCanClaim(i)).length, st = cqStReady(); return ready ? `сундуков: ${ready}` : st ? `наград: ${st}` : `очки ${cqScore()}`; };
const cqRarTag = k => `<span class="cqrar r-${CQ_DISKS[k].r}">${cqRar(k).n}</span>`;
const cqDiskCard = (k, btn) => `<div class="cqdiff disk r-${CQ_DISKS[k].r}">${cqI('disk')}${cqRarTag(k)}<h3>${CQ_DISKS[k].n}</h3><p>${CQ_DISKS[k].d}</p>${btn}</div>`;
const cqI = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${CQ_ICON[k]}</svg>`;


export { cqApply, cqFinish, cqFoeCard, cqDetail, renderConq, cqDiskWin, cqResWin, CQ_PRICE, cqShopItems, cqShopView, cqChestWin, cqFeatWin, cqClick, cqPop, cqRwHtml, cqBadge, cqRarTag, cqDiskCard, cqI };
