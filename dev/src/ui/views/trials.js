// ui/views/trials.js — строки 4681–4809 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../../logic/trials.js'; // порядок исполнения
import { rwTile } from '../reward-tiles.js';
import { statInc } from '../../logic/stats.js';
import { openSquadSel } from '../overlays/squad-select.js';
import { accXP, fragLines, giveRewards, rewardWin } from '../rewards.js';
import { render } from '../router.js';
import { S } from '../../core/state.js';
import { persist } from '../../core/save.js';
import { grantFrags } from '../../logic/gear.js';
import { ROMAN } from '../../logic/economy.js';
import { portrait } from '../../render2d/figures.js';
import { living } from '../../logic/battle/engine.js';
import { CH } from '../../data/chars.js';
import { TR, TRIALS, TRIAL_LVL, TRIAL_RUNS, TRIAL_ST, tierOpen, trialBest3, trialLeft, trialOpen, trialRoll, trialRunsToday, trialStars } from '../../logic/trials.js';
import { fmt, ic } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { starStr } from '../common.js';

// ===================== META: trials, profile, feats =====================
const DAYS_RU = ['Вс.', 'Пн.', 'Вт.', 'Ср.', 'Чт.', 'Пт.', 'Сб.'];
function trialGive(list) {
  const fr = list.filter(x => x[0] === 'frag').map(x => [x[2], x[1]]), rest = list.filter(x => x[0] !== 'frag');
  grantFrags(fr); return [...giveRewards(rest), ...fragLines(fr)];
}
const rwPreview = (T, t) => `<div class="rwgrid sm">${T.rw(t).map((e, i) => {
  const q = e.q[0] === e.q[1] ? fmt(e.q[0]) : `${fmt(e.q[0])}–${fmt(e.q[1])}`;
  if (e.k === 'frag') return `<div class="rwt rk-res r-rare sm" style="--d:${i}"><span class="rwa"><span class="rwmed">${ic('frag')}</span></span><b class="rwq">${q}</b><span class="rwc">мк. ${e.tiers.map(x => ROMAN[x]).join('–')}</span></div>`;
  return rwTile(e.k, q + (e.ch ? ` · ${Math.round(e.ch * 100)}%` : ''), e.k === 'shard' ? T.hero() : null, { sm: 1, i });
}).join('')}</div>`;
function trialSim(T, t, k) { return trialSimMany([[T, t, k]]); }
function trialSimMany(runs) {   // [[T, t, k]] → общий список наград
  const all = []; let k = 0;
  for (const [T, t, n] of runs) { for (let i = 0; i < n; i++) all.push(...trialRoll(T, t)); trialRunsToday()[T.id] = (trialRunsToday()[T.id] || 0) + n; k += n; }
  statInc('wins', k); statInc('trialRuns', k);
  const accL = accXP(15 * k);
  const agg = {}; for (const [kk, q, id] of all) { const key = kk + ':' + (id || ''); agg[key] = (agg[key] || 0) + q; }
  const merged = Object.entries(agg).map(([key, q]) => { const [kk, id] = key.split(':'); return id ? [kk, q, id] : [kk, q]; });
  return [...trialGive(merged), `+${15 * k} опыта аккаунта`, ...accL];
}
function renderTrials() {
  const sel = TR(S.trialSel) || TRIALS.find(trialOpen) || TRIALS[0]; S.trialSel = sel.id;
  const multi = TRIALS.filter(T => trialOpen(T) && trialLeft(T) > 0 && trialBest3(T) >= 0);
  const rank = T => trialOpen(T) ? (trialLeft(T) > 0 ? 0 : 1) : 2;
  const cards = TRIALS.slice().sort((p, q) => rank(p) - rank(q) || p.ix - q.ix).map(T => {
    const open = trialOpen(T), left = trialLeft(T), done = open && left <= 0, ic0 = T.icon === 'shard' ? portrait(CH[T.hero()], 64) : `<span class="bigico">${ic(T.icon)}</span>`;
    return `<button class="trcard ${open ? '' : 'off'} ${T === sel ? 'sel' : ''}" data-trsel="${T.id}" aria-pressed="${T === sel}">
      <span class="trt">${T.n}</span>
      <span class="trwhen ${open ? 'on' : ''}">${open ? (done ? 'Попытки на сегодня исчерпаны' : `Открыто сегодня · попыток ${left}/${TRIAL_RUNS}`) : `Открыто: ${T.days.map(d => DAYS_RU[d]).join(', ')}`}</span>
      <span class="trart"><canvas data-scene="${T.scene}" width="312" height="200"></canvas><span class="tric">${ic0}</span></span>
      <span class="trnote">${T.note}</span>
      <span class="trfoot ${done ? 'done' : ''}">${done ? 'Завершено' : open ? 'Выбрать' : 'Награды'}</span>
    </button>`; }).join('');
  const open = trialOpen(sel), left = trialLeft(sel);
  const tiers = TRIAL_LVL.map((lv, t) => {
    const st = trialStars(sel, t), to = tierOpen(sel, t), can = open && left > 0 && to;
    return `<div class="trtier ${to ? '' : 'locked'} ${st === 3 ? 'done' : ''}">
      <div class="trtn"><b>${ROMAN[t + 1]}</b><span class="mono">ур. врагов ${lv} · ${TRIAL_ST[t]}★</span><span class="stars">${starStr(st, 3)}</span></div>
      <div class="trtr"><span class="chips">${sel.foes.map(id => portrait(CH[id], 28)).join('')}</span><div class="rwl">${rwPreview(sel, t)}</div></div>
      <div class="trtb">${!to ? `<span class="lockd">Пройдите уровень ${ROMAN[t]}</span>` : `<button class="btn go mini" data-trgo="${sel.id}:${t}" ${can ? '' : 'disabled'}>Бой</button>${st === 3 ? `<button class="btn sim mini" data-trsim="${sel.id}:${t}" ${can ? '' : 'disabled'}>Симуляция</button>${left > 1 ? `<button class="btn mini" data-trsim="${sel.id}:${t}:${left}" ${can ? '' : 'disabled'}>×${left}</button>` : ''}` : ''}`}</div>
    </div>`; }).join('');
  $('#view').innerHTML = `<h2 class="lshide">Испытания</h2>
    <div class="trhead"><p class="sub">Каждое испытание открыто в свои дни — в воскресенье открыты все. По 3 победы в день на испытание, энергия не нужна. Уровень открывается победой на предыдущем; после 3★ доступна симуляция.</p>
      <button class="btn trmulti" data-trmulti="1" ${multi.length ? '' : 'disabled'}><span>Мультисимуляция</span><small>${multi.length ? `${multi.length} испыт. · ${multi.reduce((a, T) => a + trialLeft(T), 0)} боёв` : 'нет доступных'}</small></button></div>
    <div class="trcards">${cards}</div>
    <div class="trdetail"><div class="trdh"><h3>${sel.n}</h3><span class="tag">${sel.note}</span>${open ? `<span class="tag ok">Сегодня открыто · попыток ${left}/${TRIAL_RUNS}</span>` : `<span class="tag">Закрыто сегодня · открыто: ${sel.days.map(d => DAYS_RU[d]).join(', ')}</span>`}${sel.hero ? `<span class="tag">Герой недели: ${CH[sel.hero()].sn}</span>` : ''}</div>${tiers}</div>`;
}
function trialMulti() {
  const list = TRIALS.filter(T => trialOpen(T) && trialLeft(T) > 0 && trialBest3(T) >= 0); if (!list.length) return;
  const runs = list.map(T => [T, trialBest3(T), trialLeft(T)]), lines = trialSimMany(runs);
  persist(); render();
  rewardWin(`Мультисимуляция ×${runs.reduce((a, r) => a + r[2], 0)}`, lines, { sub: runs.map(([T, t, k]) => `${T.short} · ${ROMAN[t + 1]} ×${k}`).join('<br>'), ok: 'Готово' });
}
function trialGo(spec) {
  const [id, ts] = spec.split(':'), T = TR(id), t = +ts;
  if (!trialOpen(T) || trialLeft(T) <= 0 || !tierOpen(T, t)) return;
  openSquadSel('trial', T.ix * 10 + t);
}
function trialSimClick(spec) {
  const [id, ts, ks] = spec.split(':'), T = TR(id), t = +ts, k = Math.min(+ks || 1, trialLeft(T));
  if (!trialOpen(T) || k <= 0 || trialStars(T, t) !== 3) return;
  const lines = trialSim(T, t, k); persist(); render();
  const left = trialLeft(T);
  rewardWin(`Симуляция ×${k}`, lines, { sub: `${T.short} · ур. ${ROMAN[t + 1]} · осталось попыток: ${left}`, ok: 'Готово',
    btns: left > 0 ? `<button class="btn go" data-trsim="${T.id}:${t}:${left}">Ещё ×${left}</button>` : '' });
}
const trialOfSQ = i => ({ T: TRIALS[Math.floor(i / 10)], t: i % 10 });
function trialFinish(B, cfg, won) {
  const { T, t } = trialOfSQ(cfg.i);
  if (!won) return { html: `<h3>Поражение</h3><ul><li>Попытка не потрачена — дневной лимит считает только победы.</li><li>Ограничение: ${T.note.toLowerCase()}. Усильте подходящих героев.</li></ul>`, btns: `<button class="btn go" data-trgo="${T.id}:${t}">Ещё раз</button><button class="btn" data-leave="1">К испытаниям</button>` };
  const surv = living(B, 'A').length, tot = B.units.filter(u => u.side === 'A').length, st = surv === tot ? 3 : surv >= Math.ceil(tot / 2) ? 2 : 1;
  (S.trials[T.id] ??= {})[t] = Math.max(trialStars(T, t), st);
  trialRunsToday()[T.id] = (trialRunsToday()[T.id] || 0) + 1; statInc('trialRuns');
  const lines = trialGive(trialRoll(T, t));
  return { html: `<h3>Победа</h3><div class="stars">${starStr(st, 3)}</div><ul>${lines.map(l => `<li>${l}</li>`).join('')}<li>Осталось попыток сегодня: ${trialLeft(T)}</li></ul>`, btns: `${trialLeft(T) > 0 ? `<button class="btn go" data-trgo="${T.id}:${t}">Ещё раз</button>` : ''}<button class="btn" data-leave="1">К испытаниям</button>` };
}


export { DAYS_RU, trialGive, rwPreview, trialSim, trialSimMany, renderTrials, trialMulti, trialGo, trialSimClick, trialOfSQ, trialFinish };
