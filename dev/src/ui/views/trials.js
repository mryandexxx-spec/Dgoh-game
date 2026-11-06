// ui/views/trials.js — строки 4681–4809 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { rwTile } from '../reward-tiles.js';
import { accXP } from '../../logic/account.js';
import { statInc } from '../../logic/stats.js';
import '../hero-window.js'; // порядок исполнения
import { openSquadSel } from '../overlays/squad-select.js';
import { giveRewards, rewardWin } from '../rewards.js';
import { render } from '../router.js';
import { $, starStr } from '../../core/util.js';
import { S } from '../../core/state.js';
import { fmt, ic, persist } from '../../core/save.js';
import { ITEMS, fragLines, grantFrags } from '../../logic/gear.js';
import { ROMAN, todayKey } from '../../logic/economy.js';
import { portrait } from '../../render2d/figures.js';
import { living } from '../../logic/battle/engine.js';
import { CH } from '../../data/chars.js';

// ===================== META: trials, profile, feats =====================
const DAYS_RU = ['Вс.', 'Пн.', 'Вт.', 'Ср.', 'Чт.', 'Пт.', 'Сб.'];
const TRIAL_LVL = [3, 8, 13, 18, 24, 30], TRIAL_ST = [2, 3, 4, 5, 6, 7], TRIAL_RUNS = 3;
const weekNo = () => Math.floor((Date.now() / 864e5 + 4) / 7);
const gearTiers = t => t < 2 ? [1, 2] : t < 4 ? [2, 3] : t < 5 ? [3, 4] : [4, 5];
const TRIALS = [
  { id: 'folio', n: 'Испытание: материалы для способностей', short: 'Материалы способностей', days: [0, 1, 2, 3, 4, 5, 6], scene: 'court', icon: 'folio', note: 'Любые герои',
    foes: ['mohiam', 'piter', 'fenring', 'baron', 'trooper'],
    rw: t => [{ k: 'folio', q: [3 + 3 * t, 5 + 3 * t] }, ...(t >= 2 ? [{ k: 'seal', q: [1, 1], ch: .06 + .04 * t }] : []), ...(t >= 5 ? [{ k: 'wol', q: [1, 1], ch: .06 }] : [])] },
  { id: 'tank', n: 'Испытание: снаряжение (стойкость)', short: 'Снаряжение · стойкость', days: [0, 2, 5], scene: 'giedi', icon: 'pl', note: 'Только для ТАНКОВ', req: { role: ['tank'] },
    foes: ['legion', 'legion', 'rabban', 'bashar', 'trooper'],
    rw: t => [{ k: 'frag', q: [3 + t, 4 + t * 2], tiers: gearTiers(t) }, ...(t >= 3 ? [{ k: 'cry', q: [8, 15] }] : [])] },
  { id: 'att', n: 'Испытание: снаряжение (натиск)', short: 'Снаряжение · натиск', days: [0, 1, 4], scene: 'canyon', icon: 'pl', note: 'Только для АТАКУЮЩИХ', req: { role: ['att'] },
    foes: ['feyd', 'fenring', 'bashar', 'trooper', 'trooper'],
    rw: t => [{ k: 'frag', q: [3 + t, 4 + t * 2], tiers: gearTiers(t) }, ...(t >= 3 ? [{ k: 'cry', q: [8, 15] }] : [])] },
  { id: 'sup', n: 'Испытание: снаряжение (мудрость)', short: 'Снаряжение · мудрость', days: [0, 3, 6], scene: 'ruins', icon: 'pl', note: 'Только для ПОДДЕРЖКИ и ЦЕЛИТЕЛЕЙ', req: { role: ['sup', 'heal'] },
    foes: ['baron', 'piter', 'mohiam', 'shaddam', 'trooper'],
    rw: t => [{ k: 'frag', q: [3 + t, 4 + t * 2], tiers: gearTiers(t) }, ...(t >= 3 ? [{ k: 'cry', q: [8, 15] }] : [])] },
  { id: 'sol', n: 'Караван контрабандистов', short: 'Солярии', days: [0, 2, 5], scene: 'spicefield', icon: 'sol', note: 'Любые герои',
    foes: ['trooper', 'trooper', 'rabban', 'piter', 'feyd'],
    rw: t => [{ k: 'sol', q: [4000 + 4000 * t, 6000 + 6000 * t] }, ...(t >= 3 ? [{ k: 'cry', q: [10, 20] }] : [])] },
  { id: 'pl', n: 'Испытание: учебные поединки', short: 'Пласталь', days: [0, 1, 4], scene: 'caladan', icon: 'pl', note: 'Любые герои',
    foes: ['gurney', 'duncan', 'fedaykin', 'stilgar', 'chani'],
    rw: t => [{ k: 'pl', q: [3 + 2 * t, 5 + 3 * t] }, ...(t >= 2 ? [{ k: 'folio', q: [1, 2 + Math.floor(t / 2)] }] : [])] },
  { id: 'frem', n: 'Испытание глубокой пустыни', short: 'Осколки фрименов', days: [0, 3, 6], scene: 'desert', desert: true, icon: 'shard', note: 'Только ФРИМЕНЫ', req: { f: ['frem'] },
    foes: ['legion', 'bashar', 'legion', 'trooper', 'fenring'], hero: () => ['stilgar', 'chani', 'fedaykin', 'kynes'][weekNo() % 4],
    rw: t => [{ k: 'shard', q: [3 + t, 4 + t], hero: 1 }, { k: 'teeth', q: [10 + 10 * t, 20 + 10 * t] }] },
  { id: 'hark', n: 'Ночь на Гиеди Прайм', short: 'Осколки Харконненов', days: [1, 3, 5], scene: 'giedi', icon: 'shard', note: 'Только ХАРКОННЕНЫ', req: { f: ['hark'] },
    foes: ['gurney', 'duncan', 'fedaykin', 'chani', 'stilgar'], hero: () => ['rabban', 'piter', 'feyd', 'baron'][weekNo() % 4],
    rw: t => [{ k: 'shard', q: [3 + t, 4 + t], hero: 1 }, { k: 'water', q: [20 + 10 * t, 30 + 10 * t] }] },
];
TRIALS.forEach(T => { T.ix = TRIALS.indexOf(T); });
const TR = id => TRIALS.find(T => T.id === id);
const trialOpen = T => T.days.includes(new Date().getDay());
const TRIAL_SQ = 5;
const trialOk = (T, id) => !T.req || (T.req.role ? T.req.role.includes(CH[id].role) : T.req.f.some(f => CH[id].f.includes(f)));
function trialRunsToday() { if (S.trialRuns.d !== todayKey()) S.trialRuns = { d: todayKey(), n: {} }; return S.trialRuns.n; }
const trialLeft = T => TRIAL_RUNS - (trialRunsToday()[T.id] || 0);
const trialStars = (T, t) => (S.trials[T.id] || {})[t] || 0;
const tierOpen = (T, t) => t === 0 || trialStars(T, t - 1) > 0;
const trialBest3 = T => { for (let t = 5; t >= 0; t--) if (trialStars(T, t) === 3) return t; return -1; };
const trialFoes = (T, t) => T.foes.map(id => ({ id, lvl: TRIAL_LVL[t], stars: TRIAL_ST[t], gear: Math.min(13, 1 + Math.floor(TRIAL_LVL[t] / 6.2)) }));
function trialRoll(T, t) {
  const out = [];
  for (const e of T.rw(t)) {
    if (e.ch && Math.random() >= e.ch) continue;
    const q = e.q[0] + Math.floor(Math.random() * (e.q[1] - e.q[0] + 1));
    if (e.k === 'frag') { const pool = Object.values(ITEMS).filter(it => e.tiers.includes(it.t)); for (let i = 0; i < q; i++) out.push(['frag', 1, pool[Math.floor(Math.random() * pool.length)].id]); }
    else if (e.k === 'shard') out.push(['shard', q, T.hero()]);
    else out.push([e.k, q]);
  }
  return out;
}
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


export { DAYS_RU, TRIAL_LVL, TRIAL_ST, TRIAL_RUNS, weekNo, gearTiers, TRIALS, TR, trialOpen, TRIAL_SQ, trialOk, trialRunsToday, trialLeft, trialStars, tierOpen, trialBest3, trialFoes, trialRoll, trialGive, rwPreview, trialSim, trialSimMany, renderTrials, trialMulti, trialGo, trialSimClick, trialOfSQ, trialFinish };
