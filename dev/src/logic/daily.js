// logic/daily.js — выделен из core/util в фазе 3a (REFACTOR_PLAN §2). Правится вручную.
import { S } from '../core/state.js';
import { todayKey } from './economy.js';
const DAILY = [
  { k: 'login', n: 'Зайти в игру', need: 1, rw: [['cry', 20]] },
  { k: 'water', n: 'Потратить 120 Воды', need: 120, rw: [['cry', 30], ['sol', 2000]], go: 'camp' },
  { k: 'camp', n: 'Провести 8 боёв кампании (симуляции считаются)', need: 8, rw: [['folio', 3], ['sol', 3000]], go: 'camp' },
  { k: 'chron', n: 'Провести 3 боя в Хрониках Дюны (симуляции считаются)', need: 3, rw: [['rid', 20], ['cry', 20]], go: 'chron' },
  { k: 'shop', n: '3 покупки или 5 боёв кампании', need: 3, alt: { k: 'camp', need: 5 }, rw: [['pl', 5], ['cry', 20]], go: 'shop' },
  { k: 'raid', n: 'Атаковать Шаи-Хулуда', need: 1, rw: [['teeth', 60]], go: 'raid' },
  { k: 'ult', n: 'Применить мощное умение 3 раза', need: 3, rw: [['folio', 2]], go: 'camp' },
  { k: 'skill', n: 'Повысить умение героя', need: 1, rw: [['sol', 1500]], go: 'squad' },
  { k: 'craft', n: 'Собрать предмет или провести 10 боёв', need: 1, alt: { k: 'camp', need: 10 }, rw: [['pl', 3]], go: 'squad' },
  { k: 'lvl', n: '3 повышения уровня или 3 боя Хроник', need: 3, alt: { k: 'chron', need: 3 }, rw: [['sol', 1500]], go: 'squad' },
];
const activeDaily = () => DAILY.filter(q => q.k !== 'skill' || (S.acc?.lvl || 1) <= 50);
const CHEST_NEED = 7, CHEST_RW = [['seal', 1], ['cry', '50–300'], ['sol', 5000]], CHEST_CRY = [50, 300];
function dly(stamp = todayKey.clock.snapshot()) {
  const day = stamp.day;
  if (S.daily.d !== day) {
    // A backwards device clock must not resurrect an already spent daily token.
    // With offline client time we can block rollback, not prove real elapsed days.
    const saved = Date.parse(S.daily.d), current = Date.parse(day);
    if (!(Number.isFinite(saved) && saved > current))
      S.daily = { d: day, c: {}, got: {}, chest: false };
  }
  return S.daily;
}
// Existing exported function is the accessor for the same GameClock provider;
// avoid changing the 167-module / named-export contract.
// Lazy accessor: economy/state/daily are part of an approved ESM cycle.
// Do not eagerly read the imported todayKey binding during module evaluation.
Object.defineProperty(dly, 'clock', { get: () => todayKey.clock });
function quest(k, n = 1) { if (!S || (k === 'skill' && (S.acc?.lvl || 1) > 50)) return; const D = dly(); D.c[k] = Math.max(0, (D.c[k] || 0) + n); }
// ECON-01: optional OR requirements read existing daily counters; no extra rewards,
// no new persisted schema, and previous primary progress/claimed flags are untouched.
function qState(q, stamp = todayKey.clock.snapshot()) {
  const D = dly(stamp);
  if (D.got[q.k]) return 'got';
  const primary = (D.c[q.k] || 0) >= q.need;
  const alternative = q.alt && (D.c[q.alt.k] || 0) >= q.alt.need;
  return primary || alternative ? 'done' : 'prog';
}
const dailyGot = (stamp = todayKey.clock.snapshot()) => {
  const D = dly(stamp);
  return DAILY.filter(q => D.got[q.k]).length;
};
const dailyReady = (stamp = todayKey.clock.snapshot()) =>
  activeDaily().filter(q => qState(q, stamp) === 'done').length +
  (dailyGot(stamp) >= CHEST_NEED && !dly(stamp).chest ? 1 : 0);


export { DAILY, activeDaily, CHEST_NEED, CHEST_RW, CHEST_CRY, dly, quest, qState, dailyGot, dailyReady };
