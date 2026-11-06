// ui/overlays/squad-select.js — строки 3859–3950 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './calendar.js'; // порядок исполнения
import { cq, cqEn, cqEnSpend, cqEnTxt, cqLive, cqNode, cqSta, cqStaCol, cqTypeN } from '../../logic/conquest.js';
import { CQ_EN, CQ_SECT, CQ_STA, cqMod } from '../../data/conquest-data.js';
import { celebQueue } from './celebrate.js';
import { trialOfSQ } from '../views/trials.js';
import { launch, startBattle } from '../battle/battle-ui.js';
import { SPOT_ICONS } from '../views/lobby.js';
import { openInfo } from './info.js';
import { renderRes, toast } from '../common.js';
import { $, campSquad, enGet, glyph, nodePower, prog, reqFacOk, reqMissing, reqText, sideOk, unlockedIds } from '../../core/util.js';
import { S, tickWater } from '../../core/state.js';
import { persist } from '../../core/save.js';
import { TIER_COL } from '../../logic/gear.js';
import { unlockNeed } from '../../logic/relics.js';
import { RAID_SCENES, ROMAN, enemyProg } from '../../logic/economy.js';
import { JK, JR, jFoes } from '../../data/journeys.js';
import { CAMP_DEF, NODES, NODE_SCENES, nodeCost, nodeEn, nodeTitle } from '../../data/campaigns.js';
import { sceneThumb } from '../../render2d/scenes.js';
import { figureSVG, portrait } from '../../render2d/figures.js';
import { unitPower } from '../../logic/battle/stats.js';
import { RAID_TIERS } from '../../data/boss.js';
import { CH } from '../../data/chars.js';
import { FACTIONS } from '../../data/fx.js';
import { TRIALS, TRIAL_SQ, trialFoes, trialOk } from '../../logic/trials.js';
import { amt, fmt } from '../../core/format.js';

// ===== squad select =====
let SQ = null;
function sqArr() { if (SQ.mode === 'conq') return cq().squad; if (SQ.mode === 'trial') { const T = TRIALS[Math.floor(SQ.i / 10)]; return (S.squadTr[T.id] ??= []); } return SQ.mode === 'camp' ? campSquad(SQ.i) : SQ.mode === 'journey' ? S.jPicks[JK()] : S.raidPick; }
function sqPool() {
  if (SQ.mode === 'conq') return unlockedIds().filter(id => cqSta(id) >= CQ_STA.min);
  if (SQ.mode === 'journey') return JR().req.filter(id => prog(id).stars);
  if (SQ.mode === 'camp') return unlockedIds().filter(id => sideOk(NODES[SQ.i].camp, id) && reqFacOk(SQ.i, id));
  if (SQ.mode === 'trial') { const T = TRIALS[Math.floor(SQ.i / 10)]; return unlockedIds().filter(id => trialOk(T, id)); }
  return unlockedIds();
}
function openSquadSel(mode, i) {
  SQ = { mode, i, f: 'all' };
  const a = sqArr(), pool = sqPool(), used = mode === 'raid' && S.raid ? new Set(S.raid.used) : new Set();
  for (let k = a.length - 1; k >= 0; k--) if (!pool.includes(a[k]) || used.has(a[k])) a.splice(k, 1);
  if (mode !== 'camp' && !a.length) for (const id of (mode === 'raid' ? S.squad : pool)) if (a.length < 5 && pool.includes(id) && !used.has(id)) a.push(id);
  renderSquadSel();
}
function sqEnemy() {
  if (SQ.mode === 'conq') { const a = cqNode(SQ.i), foes = cqLive(a).foes.map(p => [p.id, p]); return { title: `Джихад · ${CQ_SECT[a.s].n} · ${cqTypeN(a.type)}`, scene: CQ_SECT[a.s].scene, foes, pw: foes.reduce((x, [id, p]) => x + unitPower(CH[id], p), 0), cost: 0, sideNote: [`Решимость −${CQ_EN.fight} (есть ${cqEn()})`, `выносливость −${CQ_STA.loss}%`, ...a.mods.map(m => cqMod(m).n)].join(' · ') }; }
  if (SQ.mode === 'trial') { const { T, t } = trialOfSQ(SQ.i), foes = trialFoes(T, t).map(p => [p.id, p]); return { title: `${T.short} · ур. ${ROMAN[t + 1]}`, scene: T.scene, foes, pw: foes.reduce((a, [id, p]) => a + unitPower(CH[id], p), 0), cost: 0, sideNote: T.req ? T.note : '' }; }
  if (SQ.mode === 'camp') { const n = NODES[SQ.i]; return { title: nodeTitle(SQ.i), scene: NODE_SCENES[SQ.i], foes: n.enemy.map(id => [id, enemyProg(id, n.lvl, n.m === 9)]), pw: nodePower(n), cost: nodeCost(SQ.i), en: nodeEn(SQ.i), sideNote: [CAMP_DEF[n.camp].side === 'all' ? '' : CAMP_DEF[n.camp].side === 'light' ? 'Только светлые герои' : 'Только тёмные герои', reqText(SQ.i)].filter(Boolean).join(' · ') }; }
  if (SQ.mode === 'journey') { const t = JR().tiers[SQ.i]; const foes = jFoes(JK(), SQ.i).map(p => [p.id, p]); return { title: `Легенда ${SQ.i + 1}. ${t.n}`, scene: JR().scenes[SQ.i], foes, pw: foes.reduce((s, [id, p]) => s + unitPower(CH[id], p), 0), cost: 0 }; }
  const R = S.raid; return { title: `Шаи-Хулуд · ${RAID_TIERS[R.tier].n}`, scene: RAID_SCENES[R.tier], foes: [], pw: 0, cost: 0, raid: R };
}
function renderSquadSel() {
  if (!SQ) return;
  const a = sqArr(), pool = sqPool(), E = sqEnemy(), used = SQ.mode === 'raid' && S.raid ? new Set(S.raid.used) : new Set();
  const pw = a.reduce((s, id) => s + unitPower(CH[id], prog(id)), 0), lead = a[0] && CH[a[0]];
  const leadersIn = a.filter(id => CH[id].leader);
  let warn = '';
  if (!a.length) warn = 'Отряд пуст: выберите до 5 героев';
  else if (!lead.leader) warn = `${lead.sn} стоит лидером, но лидерской способности нет${leadersIn.length ? ` — сделайте лидером ${leadersIn.map(id => CH[id].sn).join(' или ')}` : ''}`;
  if (SQ.mode === 'camp') { const miss = reqMissing(SQ.i, a); if (miss.length) warn = 'В отряде обязательно: ' + miss.map(id => CH[id].sn + (prog(id).stars ? '' : ' (не открыт)')).join(', '); }
  const facs = ['all', 'light', 'dark', ...Object.keys(FACTIONS)].filter(f => f === 'all' || pool.some(id => f === 'light' || f === 'dark' ? CH[id].side === f : CH[id].f.includes(f)));
  const facN = f => f === 'all' ? 'Все' : f === 'light' ? 'Светлые' : f === 'dark' ? 'Тёмные' : FACTIONS[f].n;
  const list = pool.filter(id => SQ.f === 'all' || (SQ.f === 'light' || SQ.f === 'dark' ? CH[id].side === SQ.f : CH[id].f.includes(SQ.f))).sort((x, y) => used.has(x) - used.has(y) || unitPower(CH[y], prog(y)) - unitPower(CH[x], prog(x)));
  const slot = k => { const id = a[k]; if (!id) return `<div class="sqslot empty ${k === 0 ? 'lead' : ''}"><span class="sqlab">${k === 0 ? 'Лидер' : 'Пусто'}</span><span class="sqhint">Коснитесь героя слева</span></div>`;
    const d = CH[id], p = prog(id);
    return `<div class="sqslot ${k === 0 ? 'lead' : ''} ${d.legendary ? 'legend' : ''}" data-sqrm="${k}" role="button" tabindex="0" aria-label="Убрать ${d.sn}" style="--fc:var(--${d.f[0]});--tc:${TIER_COL[p.gear]}">
      <span class="sqtop"><span class="stars">${'★'.repeat(p.stars)}</span><span class="mono">ур. ${p.lvl}</span></span>
      ${k === 0 ? `<span class="sqlab lab0">${d.leader ? 'Лидер · ' + d.leader.n : 'Лидер'}</span>` : `<button class="sqmk" data-sqlead="${k}" title="Сделать лидером">${d.leader ? '★ ' : ''}Лидер</button>`}
      <span class="sqfig">${figureSVG(d, true)}</span>
      <span class="sqname">${d.sn}</span><span class="sqpw mono">${fmt(unitPower(d, p))}</span></div>`; };
  $('#overlay').innerHTML = `<div class="sqsel" role="dialog" aria-modal="true" aria-labelledby="sq-h">
    <canvas class="sqbg" data-scene="${E.scene}" width="640" height="320"></canvas>
    <div class="sqwrap">
      <div class="sqhd"><button class="btn sqback" data-sqback="1" aria-label="Назад">←</button><div><h3 id="sq-h">Выбор отряда: ${E.title}</h3><span class="sub" style="margin:0">Касание героя — добавить или убрать · долгое касание — карточка героя</span></div><div class="res resbox sqres"></div></div>
      <div class="sqbody">
        <div class="sqleft">
          <div class="sqpow"><span>Мощь отряда${E.sideNote ? ` · <span class="sidenote">${E.sideNote}</span>` : ''}</span><b class="mono">${fmt(pw)}</b></div>
          ${warn ? `<div class="sqwarn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10v5M12 17.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>${warn}</span></div>` : ''}
          <div class="filters">${facs.map(f => `<button data-sqf="${f}" style="${f === 'all' ? '' : `--fc:var(--${f})`}" aria-pressed="${SQ.f === f}">${facN(f)}</button>`).join('')}</div>
          <div class="sqlist">${list.map(id => { const d = CH[id], p = prog(id), on = a.includes(id), u = used.has(id);
            return `<button class="sqcard side-${d.side} ${d.legendary ? 'legend' : ''} ${on ? 'on' : ''} ${u ? 'used' : ''}" data-sqadd="${id}" ${u ? 'disabled' : ''} title="${d.n}">${portrait(d, 58, TIER_COL[p.gear])}<span class="sqcst">${'★'.repeat(p.stars)}</span><span class="sqcnm">${d.sn}</span><span class="mono sqcpw">${u ? 'уже атаковал' : fmt(unitPower(d, p))}</span>${SQ.mode === 'conq' ? `<span class="sqhp"><i style="width:${cqSta(id)}%;background:${cqStaCol(cqSta(id))}"></i></span>${cqSta(id) < 100 ? `<span class="sqfat">выносл. ${cqSta(id)}%</span>` : ''}` : ''}${on ? `<span class="sqnum">${a.indexOf(id) === 0 ? 'Л' : a.indexOf(id) + 1}</span>` : ''}</button>`; }).join('')}</div>
        </div>
        <div class="sqright">
          <div class="sqfoe"><span class="lbl">Противник</span>${E.raid ? `<span class="sqworm"><svg viewBox="0 0 24 24" style="color:var(--worm)">${SPOT_ICONS.worm}</svg> Шаи-Хулуд · ${fmt(E.raid.hp)} / ${fmt(E.raid.maxHp)}</span>` : `<span class="chips">${E.foes.map(([id, ep]) => portrait(CH[id], 34, TIER_COL[ep.gear])).join('')}</span><span class="power ${E.pw > pw * 1.1 ? 'bad' : 'ok'}">мощь ${fmt(E.pw)}</span>`}</div>
          <div class="sqslots">${[0, 1, 2, 3, 4].map(slot).join('')}</div>

        </div>
      </div>
      <div class="sqfoot"><div class="sqbtns"><button class="btn" data-sqclear="1" ${a.length ? '' : 'disabled'}>Распустить отряд</button><button class="btn go sqgo" data-sqgo="1" ${a.length && !(SQ.mode === 'camp' && reqMissing(SQ.i, a).length) && !(SQ.mode === 'trial' && a.length < TRIAL_SQ) ? '' : 'disabled'}>${SQ.mode === 'raid' ? 'Атаковать' : SQ.mode === 'trial' && a.length < TRIAL_SQ ? `Нужно ${TRIAL_SQ} героев` : 'Бой'}${E.cost ? ` <span class="sqcost">${amt(E.en || 'water', E.cost)}</span>` : ''}</button></div></div>
    </div></div>`;
  sceneThumb($('#overlay .sqbg')); renderRes();
}
function sqGo() {
  const a = sqArr(); if (!a.length || !SQ) return;
  const mode = SQ.mode, i = SQ.i;
  if (mode === 'trial' && a.length < TRIAL_SQ) return toast(`Испытания — только полным составом: ${TRIAL_SQ} героев`);
  if (mode === 'camp' && reqMissing(i, a).length) return toast('В отряде обязательно: ' + reqMissing(i, a).map(id => CH[id].sn).join(', '));
  if (mode === 'camp') { tickWater(); if (enGet(nodeEn(i)) < nodeCost(i)) return openInfo(`need:${nodeEn(i)}:${nodeCost(i)}`); return startBattle(i); }
  if (mode === 'conq') { const nd = cqNode(i), SE = CQ_SECT[nd.s], lv = cqLive(nd); if (!lv.foes.length) return; if (!cqEnSpend(CQ_EN.fight)) { toast(`Нужно ${CQ_EN.fight} Решимости. ${cqEnTxt()}`); return; } persist(); return launch({ mode: 'conq', i, scene: SE.scene, desert: !!SE.desert, title: `${SE.n} · ${nd.type === 'boss' ? 'босс' : nd.type === 'elite' ? 'элита' : 'бой'}`, squad: a.slice(), enemy: lv.foes, cq: { key: i, mods: nd.mods, idx: lv.idx, fresh: !lv.st } }); }
  if (mode === 'trial') { const { T, t } = trialOfSQ(i); return launch({ mode: 'trial', i, scene: T.scene, desert: !!T.desert, title: `${T.short} · ур. ${ROMAN[t + 1]}`, squad: a.slice(), enemy: trialFoes(T, t) }); }
  if (mode === 'journey') { const t = JR().tiers[i]; return launch({ mode: 'journey', scene: JR().scenes[i], i, title: `Легенда ${i + 1}. ${t.n}`, desert: t.desert, squad: a.slice(), enemy: jFoes(JK(), i) }); }
  const R = S.raid; if (!R) return; return launch({ mode: 'raid', scene: RAID_SCENES[R.tier], title: 'Шаи-Хулуд · ' + RAID_TIERS[R.tier].n.split(' · ')[0], squad: a.slice(), boss: { tier: R.tier, hp: R.hp, maxHp: R.maxHp } });
}
const RING_RATE = 10;   // 1 осколок героя на 7★ = 10 водяных колец
let SHCONV = 0, SHCONV_T = 0;
function convFlush() { if (SHCONV > 0) { const n = SHCONV; SHCONV = 0; toast(`Осколки героев 7★ обменены: +${amt('wring', n)} водяных колец`); } }
function grantShards(id, k) {
  const p = prog(id);
  if (p.stars >= 7) { const n = k * RING_RATE; S.wring = (S.wring || 0) + n; SHCONV += n; clearTimeout(SHCONV_T); SHCONV_T = setTimeout(convFlush, 700); return false; }
  p.shards += k;
  const un = unlockNeed(CH[id]);
  if (p.stars === 0 && p.shards >= un) { p.shards -= un; p.stars = un > 10 ? 7 : 1; celebQueue({ type: 'unlock', id }); return true; }
  return false;
}
function pickerHtml(kind, ids, pick, disabled = new Set()) {
  return `<div class="pick">${ids.map(id => { const d = CH[id], i = pick.indexOf(id);
    return `<button data-pick="${kind}:${id}" aria-pressed="${i >= 0}" ${disabled.has(id) ? 'disabled' : ''}><span class="ord">${i >= 0 ? (i === 0 ? 'Л' : i + 1) : ''}</span>${glyph(d)}${d.sn} <span class="mono" style="color:var(--dust)">${'★'.repeat(prog(id).stars)}</span></button>`; }).join('')}</div>`;
}

function set_SQ(v) { return SQ = v; }
function set_SHCONV(v) { return SHCONV = v; }
export { SQ, sqArr, sqPool, openSquadSel, sqEnemy, renderSquadSel, sqGo, RING_RATE, SHCONV, SHCONV_T, convFlush, grantShards, pickerHtml, set_SQ, set_SHCONV };
