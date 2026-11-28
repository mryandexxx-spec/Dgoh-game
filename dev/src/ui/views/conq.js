// ui/views/conq.js — строки 5531–5728 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../overlays/celebrate.js'; // ARCH-01C5a-B1 UI-owned Conquest bootstrap
import { cq, cqAddDisk, cqCanClaim, cqCanOn, cqChest, cqDiskOn, cqDiskPick, cqEn, cqEnSpend, cqEnTxt, cqFoes, cqGoods, cqLayout, cqLive, cqNode, cqNodeDisks, cqDifficultyAccess, cqRecordFinalBoss, cqRoute, cqRouteBlocked, cqCommitRoute, cqOpen, cqStCan, cqStReady, cqSta, cqStaCol, cqStaPen, cqStaSet, cqStatic, cqSyncTrack, cqTrack, cqTypeN, cqRfN, cqRfCost, cqBump, cqK, cqModD, cqScore } from '../../logic/conquest.js';
import { CQ_CHESTS, CQ_DIFF, CQ_DISKS, CQ_DMAX, CQ_EN, CQ_ICON, CQ_LAST, CQ_LAYERS, CQ_LFAC, CQ_LMAX, CQ_MED, CQ_RF, CQ_SECT, CQ_STA, CQ_TROPHY, cqFeats, cqMod, cqRar } from '../../data/conquest-data.js';
import { assetUrl } from '../../assets/models.js';
import { MOUSE_SVG } from '../mouse.js';
import { statInc } from '../../logic/stat-counters.js';
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
  const C = cq(), A = B.units.slice(0, cfg.squad.length), E = B.units.filter(u => u.side === 'B').slice(0, cfg.cq.idx.length), st = C.done[cfg.cq.key] ? null : C.foe[cfg.cq.key];
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
    if (!prev) cqCommitRoute(a); // A new victory commits the chosen branch
    if (a.type === 'boss') cqRecordFinalBoss(a);
    const m = (CQ_DIFF[C.diff] || CQ_DIFF.easy).mult, sol = Math.round((1500 + a.lvl * 40) * m);
    if (!prev) {
      S.solari += sol; lines.push(`+${amt('sol', sol)} соляриев`);
      { const tr = (CQ_TROPHY[a.type] || 0) * m; if (tr) { S.jt = (S.jt || 0) + tr; lines.push(`+${amt('jt', tr)} трофеев Джихада`); } }
      if (a.type === 'boss' || a.type === 'elite') { const c = (a.type === 'boss' ? 2 : 1) * m; const key = a.type === 'boss' ? 'legacy_thread' : 'blood_echo'; S[key] = (S[key] || 0) + c; lines.push(`+${amt(key, c)} сигналов памяти`); }
      if (a.s === 4 && Math.random() < .5) { const id = Math.random() < .5 ? 'robot' : 'cymek', q = m; lines.push(`+${amt('shard', q, 'shard:' + id)} ${CH[id].sn}${grantShards(id, q) ? ' — персонаж открыт!' : ''}`); }
      if (a.type === 'boss') { if (a.s < 4) { C.open = Math.max(C.open, a.s + 1); C.sec = a.s + 1; lines.push(`Открыт сектор ${a.s + 2}: ${CQ_SECT[a.s + 1].n}`); } else lines.push('Джихад завершён! Эразм признаёт силу вашего Дома.'); }
    } else lines.push('Повторная победа: лучший результат сохранён, разовые награды уже получены. Подвиги засчитываются.');
    const fac = CQ_LFAC[a.s], few = mine.length <= 3, flaw = surv === mine.length, sq = mine.map(u => u.def);
    cqBump('win', a.s); if (flaw) cqBump('flaw', a.s); if (few) cqBump('few', a.s);
    for (const f of ['atr', 'hark', 'frem']) if (sq.every(d => d.f.includes(f))) cqBump('only:' + f, a.s);
    if (sq.filter(d => d.f.includes(fac[0])).length >= fac[1]) cqBump('fac', a.s);
    if (a.type === 'elite' && flaw) cqBump('eliteflaw', a.s);
    if (a.type === 'boss') { if (!prev) cqBump('boss', a.s, Object.keys(C.done).filter(k => k.endsWith(`-${CQ_LAST}-0`)).length, true); if (cfg.cq.fresh && !prev) cqBump('boss1', a.s); if (flaw) cqBump('bossflaw', a.s); }
    lines.push(`Очки Джихада: ${cqScore()} (звёзды ${C.stars} + подвиги ${C.pts || 0})`);
    html = `<h3>Победа</h3><div class="stars">${starStr(st, 3)}</div><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
  } else if (C.done[a.key]) {
    delete C.foe[a.key]; // a defeated replay never leaves a wounded farming target
    html = '<h3>Поражение в повторном бою</h3><p>Лучший результат и полученные награды сохранены. В следующем повторе враги восстановятся полностью.</p>';
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
  const C = cq(), op = cqOpen(a), dn = C.done[a.key] || 0, blocked = cqRouteBlocked(a), m = CQ_DIFF[C.diff].mult;
  let body = '', acts = '';
  if (a.type === 'cache') {
    if (!op && !dn) body = `<p class="lockd">${blocked ? 'Маршрут закрыт: выбрана другая ветка.' : 'Доберитесь до тайника по карте — после этого лавка будет доступна до конца недели.'}</p>`;
    else if (!dn) body = `<p class="sub">Открытие тайника закрепит выбранную ветку маршрута.</p><button class="btn go" data-cqnode="${a.key}">Открыть тайник</button>`;
    else {
      const got = C.buy[a.key] || [];
      body = `<p class="sub" style="margin:0 0 6px">Контрабандисты торгуют редким товаром. Каждый лот — один раз; заглядывать можно в любое время, пока идёт Джихад.</p><div class="cqgoods">${cqGoods(a.key).map((g, k) => { const sold = got.includes(k), [ck, cn] = g.cost, can = !sold && getRes(ck) >= cn;
        return `<div class="cqgood ${sold ? 'sold' : ''}">${g.rw ? `<div class="cqgrw">${g.rw.map(r => amt(r[0], r[1], r[2] ? 'shard:' + r[2] : undefined) + (r[2] ? ' ' + CH[r[2]].sn : '')).join(' ')}</div>` : `<div class="cqgrw">${cqI(g.ico)}</div>`}<b>${g.n}</b>${g.d ? `<p>${g.d}</p>` : ''}${sold ? '<span class="qok">✓ куплено</span>' : `<button class="btn mini ${can ? 'go' : ''}" data-cqbuy="${a.key}:${k}" ${can ? '' : 'disabled'}>${amt(ck, cn)}</button>`}</div>`; }).join('')}</div>`;
    }
  } else if (a.type === 'disk') {
    if (dn) body = '<span class="qok">✓ Диск из этого тайника уже получен</span>';
    else if (!op) body = `<p class="lockd">${blocked ? 'Маршрут закрыт: выбрана другая ветка' : C.pick ? 'Сначала выберите стартовый диск' : 'Пройдите соседнюю точку слева'}</p>`;
    else { const ks = cqNodeDisks(a); body = ks.length ? `<p class="sub" style="margin:0 0 6px">Выберите один диск из трёх. Если надето уже ${CQ_DMAX} (или ${CQ_LMAX} легендарных), новый ляжет в запас.</p><div class="cqdiffs">${ks.map(k => cqDiskCard(k, `<button class="btn go" data-cqnd="${a.key}:${k}">Взять</button>`)).join('')}</div>` : `<p class="sub">Все диски уже собраны.</p><button class="btn go" data-cqnd="${a.key}:">Дальше</button>`; }
  } else {
    const { all, st } = cqLive(a), pw = all.reduce((x, p, k) => x + (st && st[k] && st[k].h <= 0 ? 0 : unitPower(CH[p.id], p)), 0), left = st ? st.filter(x => x.h > 0).length : all.length;
    body = `<div class="cdrow cq11foes"><span class="lbl">Противник${st ? ` · осталось ${left} из ${all.length}` : ''}</span><div class="cdenemy">${all.map((p, k) => cqFoeCard(p, k, st && st[k], k === 0 && CH[p.id].leader)).join('')}</div></div>
      <div class="cdrow cq11conditions"><span class="lbl">Условия</span><div class="cdtags"><span class="power">мощь врага ${fmt(pw)}</span>${CQ_SECT[a.s].desert ? '<span class="tag desert">Пустыня · червь</span>' : ''}${a.type === 'boss' ? '' : a.mods.map(k => `<span class="tag mod">${cqMod(k).n}: ${cqModD(k)}</span>`).join('') || '<span class="tag">без модификаторов</span>'}</div></div>
      ${a.type === 'boss' ? `<div class="cdrow"><span class="lbl">Синергия отряда</span><p class="cqsyn">${CQ_SECT[a.s].syn}. Босс сражается сыгранной командой своей фракции, и Джихад усиливает её:</p><div class="cqbm">${a.mods.map(k => `<div class="cqbmi"><b>${cqMod(k).n}</b><span>${cqModD(k)}</span></div>`).join('')}</div></div><div class="cdrow"><span class="lbl">Подвиги босса</span><div class="cdtags">${cqFeats(a.s).filter(F => F.boss).map(F => `<span class="tag ${C.fd[F.key] ? 'cqok' : ''}">${C.fd[F.key] ? '✓ ' : ''}${F.n} · +${F.pts} оч.</span>`).join('')}</div></div>` : ''}
      <div class="cdrow cq11nodereward"><span class="lbl">${dn?'Разовая награда получена':'Награда за первую победу'}</span><div class="cdtags">${amt('sol', Math.round((1500 + a.lvl * 40) * m))}${a.type === 'boss' ? ' ' + amt('legacy_thread', 2 * m) + (a.s < 4 ? ' · открывает следующий сектор' : ' · завершение Джихада') : a.type === 'elite' ? ' ' + amt('blood_echo', m) : ''} ${amt('jt', (CQ_TROPHY[a.type] || 0) * m)} за первую победу · до 3 звёзд</div></div>`;
    acts = op ? `${dn ? '<span class="qok">✓ Лучший результат: ' + dn + '★ · разовая награда получена</span>' : ''}<button class="btn go" data-cqgo="${a.key}">${dn === 3 ? 'Повторить бой' : dn ? 'Улучшить результат' : st ? 'Продолжить бой' : 'В бой'}<small>−${CQ_EN.fight} Решимости · −${cqDiskOn().includes('stam') ? CQ_STA.loss / 2 : CQ_STA.loss}% выносливости за победу</small></button>${dn ? '<small class="cqrepeatnote">Повторные разовые награды не выдаются. Подвиги засчитываются.</small>' : ''}` : `<span class="lockd">${blocked ? 'Маршрут закрыт: выбрана другая ветка' : C.pick ? 'Сначала выберите диск' : 'Пройдите соседнюю точку слева'}</span>`;
  }
  return `<div class="cdetail cqdet"><div class="cdinfo ${a.fight?'cq11combatinfo':''}">${body}</div>${acts ? `<div class="acts cq11nodeacts">${acts}</div>` : ''}</div>`;
}
let cqScreen='overview', cqUiWeek=null, cqInspectKey=null, cqRailX=null;
function cqArt(k,cls='') {
  const src=assetUrl('ui/conquest/icon-'+k+'.webp')||assetUrl('ui/shop/postrelease/'+k+'.webp');
  return src?`<img class="${cls} cqart" src="${src}" alt="" aria-hidden="true">`:cqI('disk',cls);
}
function cqChestArt(got=false,can=false,last=false) {
  const src=assetUrl('ui/conquest/chest-'+(got?'open':last?'final':can?'gold':'steel')+'.webp');
  return src?`<img class="cqchestart" src="${src}" alt="">`:cqI('cache');
}
function cqWorld(s,map=false) {return assetUrl('ui/conquest/'+(map&&s===1?'map-1':'sector-'+s)+'.webp');}
function cqScreenBar(C,dd,hh) {
  return `<div class="cq11bar"><span class="cq11week">${CQ_DIFF[C.diff].n} · до сброса ${dd} д ${hh} ч</span><button class="cqitem cqres" data-cqres="1">${cqArt('energy')}<b>${cqEn()}/${CQ_EN.max}</b><span>Решимость</span></button><button class="cqitem" data-shoptab="jihad">${ic('jt')}<b>${fmt(S.jt||0)}</b><span>Трофеи · лавка</span></button></div>`;
}
function cqOverview(C) {
  const sc=cqScore(), ready=cqStReady()+CQ_CHESTS.filter((_,i)=>cqCanClaim(i)).length,next=CQ_CHESTS.find(t=>t>sc);
  const on=cqDiskOn().length,tired=unlockedIds().filter(id=>cqSta(id)<100).length;
  return `<div class="cq11entry"><section class="cq11sectors"><h3>Секторы <small>${CQ_SECT.filter((_,i)=>C.done[i+'-'+CQ_LAST+'-0']).length}/5 зачищено</small></h3>${CQ_SECT.map((x,i)=>{const done=!!C.done[i+'-'+CQ_LAST+'-0'],count=cqLayout(i).filter(a=>a.fight&&C.done[a.key]).length;return `<button class="cq11sector ${done?'passed':i===C.open?'current':''}" data-cqsec="${i}" data-cqenter="1" ${i>C.open?'disabled':''} style="--world:url('${cqWorld(i)}')"><span class="cq11num">${cqI('boss')} 0${i+1}</span><span><b>${x.n}</b><small>${CH[x.boss[0]].sn} · ${done?'Зачищен':i>C.open?'Закрыт':count+'/9 боёв'}</small></span><strong>${done?'✓':i>C.open?'🔒':'›'}</strong></button>`}).join('')}</section><section class="cq11command"><h3>Прогресс</h3><button class="cq11rewardpanel" data-cqscreen="rewards"><span class="cq11row">${cqArt('cache')}<span><b>Награды</b><small>${next?'До сундука '+(next-sc)+' оч.':'Все пороги достигнуты'}</small></span><strong>${sc}<small>/${CQ_CHESTS.at(-1)}</small></strong></span><span class="cqtbar"><i style="width:${Math.min(100,sc/CQ_CHESTS.at(-1)*100)}%"></i></span><span class="cq11milestones">${CQ_CHESTS.map((t,i)=>`<span class="${C.tk['c'+i]?'got':cqCanClaim(i)?'ready':''}">${t}${cqChestArt(!!C.tk['c'+i],cqCanClaim(i),i===6)}</span>`).join('')}</span><small>${ready?'Доступно наград: '+ready:'Нет доступных наград'} ›</small></button><button class="cq11commandrow" data-cqfw="g">${cqArt('feat')}<span><b>Подвиги</b><small>Общие ${cqFeats(null).filter(F=>C.fd[F.key]).length}/9 · все секторы</small></span><strong>›</strong></button><button class="cq11commandrow" data-cqdisks="1">${cqArt('disk')}<span><b>Диски</b><small>${on}/${CQ_DMAX} надето · ${C.disks.length-on} в запасе</small></span><strong>›</strong></button><button class="cq11commandrow" data-cqscreen="stamina">${cqArt('med')}<span><b>Расходники и герои</b><small>${S.cqMed||0} аптечки · ${tired} уставших</small></span><strong>›</strong></button></section></div>`;
}
function cqRewardView(C) {
  const sc=cqScore(), T=cqTrack(), max=CQ_CHESTS.at(-1);
  const entries=T.map(x=>{
    if(x.kind==='st'){
      const got=!!C.tk['s'+x.i],av=!got&&cqStCan(x.i), rr=cqStatic(x.i);
      return `<${av?'button':'div'} class="cqst1 ${got?'got':av?'ready':''}" data-at="${x.at}" ${av?`data-cqst="${x.i}"`:''}><span class="cq11rpoint">${x.at}</span><span class="cq11ritems">${rr.map(r=>amt(r[0],r[1],r[2]?'shard:'+r[2]:undefined)).join('')}</span>${got?'<i>✓</i>':av?'<em>Забрать</em>':'<small>Закрыто</small>'}</${av?'button':'div'}>`;
    }
    const got=!!C.tk['c'+x.i],can=cqCanClaim(x.i);
    return `<button class="cqchest ${got?'got':can?'ready':''}" data-at="${x.at}" data-cqchest="${x.i}"><span class="cq11rpoint">${x.at}</span>${cqChestArt(got,can,x.i===6)}<b>Сундук ${x.i+1}</b><span class="cqcs">${got?'✓ Получено':can?'Открыть':'Состав'}</span></button>`;
  }).join('');
  return `<div class="cq11rewards"><div class="cq11subhead"><button class="btn" data-cqscreen="overview">‹ К секторам</button><h3>Награды Джихада</h3><b>${sc}/${max} очков</b></div><div class="cq11rsummary"><span>Звёзды + подвиги</span><span>${CQ_CHESTS.find(t=>t>sc)?'До сундука: '+(CQ_CHESTS.find(t=>t>sc)-sc)+' оч.':'Все пороги достигнуты'}</span><span>Доступно: ${cqStReady()+CQ_CHESTS.filter((_,i)=>cqCanClaim(i)).length}</span></div><div class="cq11rail" id="cq11rail"><div class="cq11railinner"><div class="cq11rewardline">${entries}</div><div class="cq11baseline"><i></i><b class="cq11progressmarker" aria-label="Текущие очки ${sc}"></b></div></div></div><div class="cq11rewardtools"><button class="btn" data-cqjump="ready">К доступным</button><button class="btn" data-cqjump="progress">К прогрессу</button><small>Свайп по линейке · нажмите сундук для просмотра</small></div></div>`;
}
function cqHeroView() {
  const ids=unlockedIds().map(id=>[id,cqSta(id)]).sort((a,b)=>a[1]-b[1]);
  return `<div class="cq11heroes"><div class="cq11subhead"><button class="btn" data-cqscreen="overview">‹ К секторам</button><h3>Выносливость героев</h3><b>${cqArt('med')} ${S.cqMed||0}</b></div><p class="sub">+1% каждые ${CQ_STA.regenMin} мин · расход только за победу · аптечки +${CQ_MED}%</p><div class="cqheroes">${ids.map(([id,v])=>{const p=cqStaPen(v);return `<div class="cqh ${v<CQ_STA.min?'dead':''}">${portrait(CH[id],46,ringCol(prog(id)))}<span class="cqhn">${CH[id].sn}</span><span class="cqhp"><i style="width:${v}%;background:${cqStaCol(v)}"></i></span><span class="mono">${v}%${p.dmg>0?` · урон −${Math.round(p.dmg*100)}%, скор. −${Math.round(p.spd*100)}%`:''}</span><button class="btn mini ${S.cqMed&&v<100?'go':''}" data-cqmed="${id}" ${S.cqMed&&v<100?'':'disabled'}>Аптечка +${CQ_MED}%</button></div>`}).join('')||'<p class="sub">Нет открытых героев</p>'}</div></div>`;
}
function cqMapView(C) {
  const s=Math.min(C.sec??0,C.open),nodes=cqLayout(s),SE=CQ_SECT[s],W=1000,H=300,px=a=>40+a.L*(W-80)/CQ_LAST,py=a=>40+a.y*(H-80),route=cqRoute(s);
  const lines=nodes.flatMap(a=>a.next.map(k=>{const b=nodes.find(x=>x.key===k),sel=(!route[a.L]||route[a.L]===a.key)&&(!route[b.L]||route[b.L]===b.key),on=sel&&C.done[a.key]&&C.done[b.key];return `<line x1="${px(a)}" y1="${py(a)}" x2="${px(b)}" y2="${py(b)}" class="${on?'on':sel?'pending':'off'}"/>`})).join('');
  const count=nodes.filter(a=>a.fight&&C.done[a.key]).length;
  return `<div class="cq11mapview"><div class="cq11subhead"><button class="btn" data-cqscreen="overview">‹ Секторы</button><h3>${SE.n}</h3><b>${count}/9 боёв</b><button class="btn" data-cqfw="${s}">Подвиги</button></div><div class="cqmap" id="cqmap" style="--world:url('${cqWorld(s,true)}')"><div class="cqtrack"><svg class="cqlines" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${lines}</svg>${nodes.map(a=>{const op=cqOpen(a),dn=C.done[a.key]||0,blocked=cqRouteBlocked(a),hurt=a.fight&&!dn&&C.foe[a.key];return `<button class="cqn t-${a.type} ${dn?'done':op?'open':'locked'} ${hurt?'hurt':''} ${blocked?'branchlocked':''} ${a.key===cqInspectKey?'sel':''}" data-cqinspect="${a.key}" style="left:${px(a)/W*100}%;top:${py(a)/H*100}%" aria-label="${cqTypeN(a.type)} · ${a.L+1}">${blocked?'<span class="cqroute-x">×</span>':cqI(a.type)}${dn&&a.fight?`<span class="cqns">${'★'.repeat(dn)}</span>`:''}</button>`}).join('')}</div></div><div class="cq11mapfoot"><small>${SE.d}</small><button class="btn go" data-cqnext="1">Продолжить маршрут</button></div></div>`;
}
function cqNodeWin(a) {
  if(!a)return;
  $('#overlay').innerHTML=`<div class="result" data-close="1"><div class="box cq-nodebox cq11box" role="dialog" aria-modal="true" aria-label="${cqTypeN(a.type)}"><div class="cq11modalhead"><h3>${cqTypeN(a.type)} · ${a.L+1}/${CQ_LAYERS.length}</h3><button class="btn" data-close="1" aria-label="Закрыть">×</button></div>${cqDetail(a)}<div class="cq11modalfoot"><button class="btn" data-close="1">К карте</button>${a.fight?`<button class="btn" data-cqfw="${a.s}">Подвиги сектора</button>`:''}</div></div></div>`;
}
function renderConq(reset = false) {
  cqSyncTrack(); const C = cq(), L = S.acc.lvl, msLeft = (() => { const d = new Date(C.wk); d.setDate(d.getDate() + 7); return d - Date.now(); })(), dd = Math.floor(msLeft / 8.64e7), hh = Math.floor(msLeft % 8.64e7 / 3.6e6);
  const rail = document.querySelector('#cq11rail'); if (rail) cqRailX=rail.scrollLeft;
  if (reset || cqUiWeek !== C.wk) { cqScreen='overview';cqInspectKey=null;cqRailX=null;cqUiWeek=C.wk; }
  let html = `<h2 class="lshide">Джихад</h2>`;
  if (L < CQ_DIFF.easy.acc) { $('#view').innerHTML = html + `<div class="panel"><p class="lockd">Джихад откроется с ${CQ_DIFF.easy.acc} уровня аккаунта.</p></div>`; return; }
  if (!C.diff) {
    html += `<div class="cqdiffs cq11difficulty">${Object.entries(CQ_DIFF).map(([k, D]) => { const ok = cqDifficultyAccess(k), prerequisite = k === 'normal' ? 'лёгкой' : 'средней', prev = k === 'normal' ? 'easy' : 'normal'; const why = L < D.acc ? `Нужен уровень аккаунта ${D.acc}` : !S.cqUnlock?.[prev] ? `Победите босса сектора 5 на ${prerequisite} сложности` : 'Откроется для выбора на следующей неделе'; return `<div class="cqdiff d-${k} ${ok ? '' : 'locked'}"><div class="cq11levelart">${cqChestArt(false,k==='normal',k==='hard')}</div><h3>${D.n}</h3><small>Уровень ${D.acc}</small><span class="mono">враги ур. ${D.lvl[0]}–${D.lvl[1]}${D.relic[1] ? ` · Другая память до ${D.relic[1]}` : ''}</span><p>Награды ×${D.mult}. Эразм: до ${D.er.reduce((a, b) => a + b, 0)} осколков за неделю.</p>${ok ? '<p class="cqrequire ready">✓ Доступно к выбору</p>' : `<p class="cqrequire">🔒 ${why}</p>`}<button class="btn ${ok ? 'go' : ''}" data-cqdiff="${k}" ${ok ? '' : 'disabled'}>${ok ? 'Выбрать' : 'Закрыто'}</button></div>`; }).join('')}</div><p class="sub">Сложность выбирается один раз на неделю.</p>`;
    $('#view').innerHTML = `<div class="cq11root cq11choose"><h3>Выберите сложность</h3>${html}</div>`; return;
  }

  let body;
  if(C.pick) { body=`<div class="cq11pick"><h3>Выберите стартовый диск</h3><p class="sub">До ${CQ_DMAX} активных дисков · до ${CQ_LMAX} легендарных · до конца недели</p><div class="cqdiffs">${C.pick.map(k=>cqDiskCard(k,`<button class="btn go" data-cqdisk="${k}">Взять</button>`)).join('')}</div></div>`; }
  else body=cqScreen==='map'?cqMapView(C):cqScreen==='rewards'?cqRewardView(C):cqScreen==='stamina'?cqHeroView():cqOverview(C);
  $('#view').innerHTML=`<div class="cq11root">${cqScreenBar(C,dd,hh)}${body}</div>`;
  const r=document.querySelector('#cq11rail');if(r?.querySelectorAll&&r.querySelector('.cq11baseline')){
    const entries=Array.from(r.querySelectorAll('[data-at]')), sc=cqScore(), line=r.querySelector('.cq11baseline'), fill=line.querySelector('i'), marker=line.querySelector('b');
    const points=[{at:0,x:0},...entries.map(e=>({at:Number(e.dataset.at),x:e.offsetLeft+e.offsetWidth/2}))];
    let x=points.at(-1).x;
    for(let i=1;i<points.length;i++){if(sc<=points[i].at){const a=points[i-1],b=points[i];x=a.x+(b.x-a.x)*Math.max(0,(sc-a.at)/(b.at-a.at));break;}}
    fill.style.width=x+'px';marker.style.left=x+'px';
    if(cqRailX!==null)r.scrollLeft=cqRailX;else {const el=r.querySelector('.ready')||entries.find(e=>+e.dataset.at>sc);if(el)r.scrollLeft=Math.max(0,el.offsetLeft-r.clientWidth/3);}
  }
  if(cqScreen==='map'&&cqInspectKey&&document.querySelector('#overlay .cq-nodebox'))cqNodeWin(cqNode(cqInspectKey));
}
function cqDiskWin() {
  const C=cq(),on=C.disks.filter(x=>x.on),off=C.disks.filter(x=>!x.on),en=cqEn();
  const slot=x=>x?`<article class="cq11slot r-${CQ_DISKS[x.k].r}">${cqDiskArt(x.k)}<b>${CQ_DISKS[x.k].n}</b><small class="cq11effect">${CQ_DISKS[x.k].d}</small><button class="btn mini" data-cqdoff="${x.k}" ${en>=CQ_EN.unequip?'':'disabled'}>Снять · ${CQ_EN.unequip}</button></article>`:'<div class="cq11slot empty"><span>+</span><small>Свободно</small></div>';
  $('#overlay').innerHTML=`<div class="result" data-close="1"><div class="box cqdbox cq11box cq11diskbox" role="dialog" aria-modal="true" aria-label="Диски"><div class="cq11modalhead"><h3>Диски · ${on.length}/${CQ_DMAX}</h3><button class="btn" data-close="1">×</button></div><div class="cq11diskbody"><div class="cq11diskhead"><b>Установлено</b><small>Легендарных ${on.filter(x=>CQ_DISKS[x.k].r==='l').length}/${CQ_LMAX} · снятие ${CQ_EN.unequip} · запас ${en}</small></div><div class="cq11slots">${Array.from({length:CQ_DMAX},(_,i)=>slot(on[i])).join('')}</div><div class="cq11diskhead"><b>Запас · ${off.length}</b><small>Установка бесплатна</small></div><div class="cq11reserve">${off.map(x=>`<div class="cqdk r-${CQ_DISKS[x.k].r}">${cqDiskArt(x.k)}<div>${cqRarTag(x.k)}<b>${CQ_DISKS[x.k].n}</b><p>${CQ_DISKS[x.k].d}</p></div><button class="btn mini ${cqCanOn(x.k)?'go':''}" data-cqdon="${x.k}" ${cqCanOn(x.k)?'':'disabled'}>Надеть</button></div>`).join('')||'<p class="sub">Запас пуст</p>'}</div></div><div class="cq11modalfoot"><button class="btn" data-close="1">Закрыть</button></div></div></div>`;
}
function cqDiskArt(k){const src=assetUrl('ui/shop/postrelease/disk-'+k+'.webp');if(src)return `<img class="cq11diskart cqart" src="${src}" alt="">`;const sig={dmg:'⚡',hp:'＋',spd:'»',crit:'◎',shield:'◇',mind:'◈',arm:'⬡',eva:'≋'};return `<span class="cq11commondisk" aria-hidden="true">${sig[k]||'◇'}</span>`;}
function cqResWin(need) {
  const en = cqEn(), n = cqRfN(), c = cqRfCost(), lim = n >= REFILL_MAX;
  $('#overlay').innerHTML = `<div class="result" data-close="1"><div class="box cqcbox" role="dialog" aria-modal="true" aria-label="Решимость"><h3>${need && en < need ? 'Не хватает Решимости' : 'Решимость'}</h3>
    <div class="cqresh">${cqI('res')}<b class="mono">${en} / ${CQ_EN.max}</b>${need ? `<span>нужно ${need}</span>` : ''}</div>
    <p class="sub" style="margin:0">Энергия Джихада. Бой стоит ${CQ_EN.fight} Решимости, снятие диска — ${CQ_EN.unequip}. Восстанавливается сама: +1 каждые ${CQ_EN.sec / 60} мин (${cqEnTxt()}). Каждую неделю запас снова полон. Пополнить можно за камни су — по тем же правилам, что Воду: цена удваивается после каждого третьего пополнения и сбрасывается в полночь, не больше ${REFILL_MAX} в день; запас может превысить максимум.</p>
    <div class="kv"><span>Пополнений сегодня</span><div>${n} из ${REFILL_MAX}</div><span>Камни су</span><div>${amt('cry', S.cry)}</div></div>
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
      buy: () => { mark()['d:' + k] = 1; cqAddDisk(k); return `Диск «${CQ_DISKS[k].n}» — ${C.disks.find(x => x.k === k).on ? 'надет' : 'в запасе'}`; } })),
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
  $('#overlay').innerHTML = `<div class="result" data-close="1"><div class="box cqcbox cq11box cq11chestbox" role="dialog" aria-modal="true" aria-label="Сундук"><h3>${cqChestArt(got,can,i===6)} Сундук ${i + 1} · ◆${CQ_CHESTS[i]}</h3>
    <p class="chap">Гарантированно</p><ul class="cqrw">${li(rw.fix)}</ul><p class="chap">И одна награда на выбор судьбы</p><ul class="cqrw any">${li(rw.any)}</ul>
    <p class="sub" style="margin:0">${got ? 'Сундук уже открыт.' : can ? 'Порог достигнут — сундук можно открыть.' : `Нужно ещё ${CQ_CHESTS[i] - sc} очков Джихада.`}</p>
    <div class="acts" style="justify-content:center">${can ? `<button class="btn go" data-cqopen="${i}">Открыть</button>` : ''}<button class="btn" data-close="1">Закрыть</button></div></div></div>`;
}
function cqFeatWin(s) {
  const C = cq(), L = cqFeats(s), row = F => { const v = C.fp[F.key] || 0, ok = !!C.fd[F.key];
    return `<div class="cqft ${ok ? 'ok' : v ? 'active' : 'unstarted'}"><div class="cqftn"><b>${ok?'✓':v?'◔':'○'} ${F.n}</b><span class="cqftp">+${F.pts} оч.</span></div><p>${F.d}</p><div class="cqftb"><span class="fbar"><i style="width:${Math.min(100,v / F.need * 100)}%"></i></span><span class="mono">${ok ? '✓ выполнен' : `${v} / ${F.need}`}</span></div></div>`; };
  const title = s === null ? 'Общие подвиги' : `Подвиги сектора: ${CQ_SECT[s].n}`, sub = s === null ? 'Засчитываются в любом секторе Джихада. Каждый даёт 15 очков шкалы наград.' : `Засчитываются только в этом секторе. Обычные — ${s < 3 ? 3 : 5} очков, подвиги босса — ${s < 2 ? 1 : s < 4 ? 2 : 3}.`;
  $('#overlay').innerHTML = `<div class="result" data-close="1"><div class="box cqdbox cq11box cq11featbox" role="dialog" aria-modal="true" aria-label="${title}"><h3>${title}</h3><nav class="cq11feattabs">${['g',0,1,2,3,4].map(k=>`<button class="btn ${(s===null?k==='g':k===s)?'go':''}" data-cqfw="${k}">${k==='g'?'Общие':'Сектор '+(k+1)}</button>`).join('')}</nav><p class="sub" style="margin:0">${sub}</p>
    ${s === null ? `<div class="cqfts">${L.map(row).join('')}</div>` : `<p class="chap">Сектор</p><div class="cqfts">${L.filter(F => !F.boss).map(row).join('')}</div><p class="chap">Босс сектора</p><div class="cqfts">${L.filter(F => F.boss).map(row).join('')}</div>`}
    <div class="acts" style="justify-content:center"><button class="btn go" data-close="1">Закрыть</button></div></div></div>`;
}
function cqClick(d) {
  if(d.cqscreen){if(view!=='conq')return true;const C=cq();if(!C.diff||C.pick)return true;if(d.cqscreen!=='refresh'){if(!['overview','map','rewards','stamina'].includes(d.cqscreen))return true;cqScreen=d.cqscreen;cqInspectKey=null;cqRailX=null;}render();return true;}
  if(d.cqinspect){if(view!=='conq'||cqScreen!=='map'||cq().pick)return true;const a=cqLayout(Math.min(cq().sec??0,cq().open)).find(x=>x.key===d.cqinspect);if(a){cqInspectKey=a.key;cqNodeWin(a);}return true;}
  if(d.cqnext){if(view!=='conq'||cqScreen!=='map')return true;const a=cqLayout(Math.min(cq().sec??0,cq().open)).filter(x=>cqOpen(x)&&!cq().done[x.key]);if(a.length===1){cqInspectKey=a[0].key;cqNodeWin(a[0]);}else if(a.length){$('#overlay').innerHTML=`<div class="result" data-close="1"><div class="box cq11box" role="dialog" aria-modal="true"><h3>Выберите маршрут</h3><div class="cq11routechoices">${a.map(x=>`<button class="btn" data-cqinspect="${x.key}">${cqTypeN(x.type)} · шаг ${x.L+1}</button>`).join('')}</div><button class="btn" data-close="1">К карте</button></div></div>`;}else toast('Сектор пройден');return true;}
  if(d.cqjump){const r=document.querySelector('#cq11rail');if(r){const el=d.cqjump==='ready'?r.querySelector('.ready'):Array.from(r.querySelectorAll('[data-at]')).find(e=>+e.dataset.at>cqScore());if(el)r.scrollTo({left:Math.max(0,el.offsetLeft-r.clientWidth/3),behavior:'smooth'});}return true;}

  if (d.cqdiff) { const C = cq(); if (C.diff || !cqDifficultyAccess(d.cqdiff)) return true; C.diff = d.cqdiff; C.pick = cqDiskPick('start'); persist(); render(); return true; }
  if (d.cqdisk) { const C = cq(); if (!C.pick || !C.pick.includes(d.cqdisk)) return true; cqAddDisk(d.cqdisk); C.pick = null; persist(); toast(`${cqRar(d.cqdisk).n} диск «${CQ_DISKS[d.cqdisk].n}» установлен`); render(); return true; }
  if (d.cqnd !== undefined) { const [key, k] = d.cqnd.split(':'), C = cq(), a = cqNode(key); if (!a || a.type !== 'disk' || C.done[key] || !cqOpen(a)) return true;
    if (k) { if (!cqNodeDisks(a).includes(k)) return true; cqAddDisk(k); toast(`${cqRar(k).n} диск «${CQ_DISKS[k].n}» ${C.disks.find(x => x.k === k).on ? 'надет' : 'отправлен в запас'}`); }
    C.done[key] = 1; cqCommitRoute(a); persist(); render(); return true; }
  if (d.cqsec !== undefined) { const C = cq(); C.sec = Math.min(+d.cqsec, C.open); C.sel = null; persist(); if(d.cqenter)cqScreen='map'; render(); return true; }
  if (d.cqnode) { const C = cq(), a = cqNode(d.cqnode); C.sel = d.cqnode; if (a && a.type === 'cache' && !C.done[a.key] && cqOpen(a)) { C.done[a.key] = 1; cqCommitRoute(a); persist(); } render(); return true; }
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
    if (typeof renderRes === 'function') renderRes(); if(view==='conq'&&document.querySelector('#cq11rail'))render(); return true; }
  if (d.cqchest !== undefined) { cqChestWin(+d.cqchest); return true; }
  if (d.cqopen !== undefined) { const i = +d.cqopen; if (!cqCanClaim(i)) return true; const C = cq(), rw = cqChest(i), pick = rw.any[Math.floor(Math.random() * rw.any.length)]; C.tk['c' + i] = 1; if (i === CQ_CHESTS.length - 1) statInc('cqMax'); const lines = giveRewards([...rw.fix, pick]); persist(); render();
    $('#overlay').innerHTML = `<div class="result won"><div class="box" role="dialog" aria-modal="true"><div class="mousewrap">${MOUSE_SVG(false)}</div><h3>Сундук Джихада · ◆${CQ_CHESTS[i]}</h3><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><div class="acts" style="justify-content:center"><button class="btn go" data-close="1">Забрать</button></div></div></div>`; return true; }
  if (d.cqfw !== undefined) { cqFeatWin(d.cqfw === 'g' ? null : +d.cqfw); return true; }
  if (d.cqback) { leaveBattle(); set_view('conq'); render(); cqScreen='map';render(); return true; }
  return false;
}
function cqPop(el, html) {    // маленькая всплывашка над наградой
  const r = el.getBoundingClientRect(), d = document.createElement('div'); d.className = 'cqpop'; d.innerHTML = html;
  d.style.left = (r.left + r.width / 2) + 'px'; d.style.top = r.top + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1700);
}
const cqRwHtml = r => amt(r[0], r[1], r[2] ? 'shard:' + r[2] : undefined) + (r[2] ? ` <span class="cqrwn">${CH[r[2]].sn}</span>` : ` <span class="cqrwn">${RW_NAME[r[0]] || ''}</span>`);
const cqBadge = () => { if (!S) return ''; const C = cq(); if (!C.diff) return 'новая неделя'; const ready = CQ_CHESTS.filter((t, i) => cqCanClaim(i)).length, st = cqStReady(); return ready ? `сундуков: ${ready}` : st ? `наград: ${st}` : `очки ${cqScore()}`; };
const cqRarTag = k => `<span class="cqrar r-${CQ_DISKS[k].r}">${cqRar(k).n}</span>`;
const cqDiskCard = (k, btn) => `<div class="cqdiff disk r-${CQ_DISKS[k].r}">${cqDiskArt(k)}${cqRarTag(k)}<h3>${CQ_DISKS[k].n}</h3><p>${CQ_DISKS[k].d}</p>${btn}</div>`;
const cqI = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${CQ_ICON[k]}</svg>`;


export { cqApply, cqFinish, cqFoeCard, cqDetail, renderConq, cqDiskWin, cqResWin, CQ_PRICE, cqShopItems, cqShopView, cqChestWin, cqFeatWin, cqClick, cqPop, cqRwHtml, cqBadge, cqRarTag, cqDiskCard, cqI };
