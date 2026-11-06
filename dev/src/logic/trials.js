// logic/trials.js — данные и правила испытаний, вынесены из ui/views/trials.js (фаза 2, правило зависимостей §2).
import '../ui/hero-window.js'; // порядок исполнения
import { CH } from '../data/chars.js';
import { S } from '../core/state.js';
import { todayKey } from './economy.js';
import { ITEMS } from './gear.js';

// ===================== trials: data & rules =====================
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

// порядок исполнения



export { TRIAL_LVL, TRIAL_ST, TRIAL_RUNS, weekNo, gearTiers, TRIALS, TR, trialOpen, TRIAL_SQ, trialOk, trialRunsToday, trialLeft, trialStars, tierOpen, trialBest3, trialFoes, trialRoll };
