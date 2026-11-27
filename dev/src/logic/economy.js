// logic/economy.js — строки 3057–3077 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../data/journeys.js'; // порядок исполнения
import { BATTLE_WATER, CANDLE_COST } from '../data/campaign-energy.js';
import { MAX_GEAR } from '../data/gear-cap.js';
import { S } from '../core/state.js';
import { CHARS } from '../data/chars.js';
import { NODES } from '../data/campaigns.js';
import { rollItems } from './gear.js';
import { SIGNAL_NODES, MEM_MATS } from '../data/memory-scrap.js';

const RAID_REWARD = [ { teeth: 300, kill: 200, pl: 6, sol: 10000, cry: 60, cryK: 40, folio: 10, sealK: 2, wolK: 0 }, { teeth: 700, kill: 500, pl: 15, sol: 25000, cry: 140, cryK: 80, folio: 20, sealK: 3, wolK: 1 }, { teeth: 1500, kill: 1200, pl: 30, sol: 60000, cry: 300, cryK: 150, folio: 40, sealK: 5, wolK: 2 } ];
const REFILL_AMT = 120, REFILL_MAX = 15, CRY_WIN = 2, CRY_3STAR = 25, CRY_JOURNEY = 50;
const refillPrice = n => 50 * 2 ** Math.floor(n / 3);   // x2 after every 3rd refill, resets daily
// ARCH-02D-B2: one-operation, non-authoritative local wall-clock snapshot.
// Keep this seam on the existing todayKey export: no ESM module/order/export ABI
// change. The test VM provides a virtual Date without writing to save v1.
// Reading Date once prevents day/month/hero disagreement within an operation.
// B3: an ephemeral monotonic epoch for resource regeneration only.
// Persisted v1 timestamps retain their original wall-millisecond format.
// On the first booted read, Date.now() honors legacy offline regeneration;
// subsequently, wall-clock jumps cannot accelerate or reverse elapsed time.
// No browser-only monotonic clock can authenticate elapsed time after relaunch.
let regenAnchorWall = null, regenAnchorMono = null, regenLastMono = null;
function regenNow() {
  const mono = typeof performance === 'object' && performance &&
    typeof performance.now === 'function' ? performance.now() : NaN;
  if (regenAnchorWall === null) {
    regenAnchorWall = Date.now();
    if (!Number.isFinite(mono)) return regenAnchorWall; // ancient browser fallback
    regenAnchorMono = regenLastMono = mono;
    return regenAnchorWall;
  }
  if (regenAnchorMono === null) return Date.now(); // legacy fallback without performance
  // Ignore a nonfinite/regressing monotonic sample: never re-anchor to
  // untrusted Date.now() and thereby award a forward wall-clock jump.
  if (Number.isFinite(mono)) regenLastMono = Math.max(regenLastMono, mono);
  return Math.floor(regenAnchorWall + (regenLastMono - regenAnchorMono));
}
const gameClock = Object.freeze({
  now: () => Date.now(),
  regenNow,
  date: () => new Date(),
  snapshot: () => {
    const d = new Date(), year = d.getFullYear(), monthIndex = d.getMonth();
    return Object.freeze({
      now: d.getTime(), day: d.toDateString(), month: year + '-' + (monthIndex + 1),
      year, monthIndex, weekday: d.getDay(),
      daysInMonth: new Date(year, monthIndex + 1, 0).getDate(),
      nextMidnight: new Date(year, monthIndex, d.getDate() + 1).getTime(),
    });
  },
});
const todayKey = () => gameClock.date().toDateString();
todayKey.clock = gameClock;
// B4b2: retain spent daily entitlements across reversible calendar switches.
// Optional "days" contains ONLY inactive nonempty daily ledgers. No automatic
// pruning and no absolute-time claim: device-local dates remain untrusted.
const dayLedgerOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const dayLedgerRecord = o => !!o && typeof o === 'object' && !Array.isArray(o);
const dayLedgerCounts = o => dayLedgerRecord(o) && Object.entries(o).every(([k, v]) =>
  !['__proto__', 'constructor', 'prototype'].includes(k) &&
  Number.isSafeInteger(v) && v >= 0);
function dayLedgerValid(o) {
  if (o == null) return true; // legacy v1 has optional ledgers
  if (!dayLedgerRecord(o) || (o.d !== undefined && typeof o.d !== 'string') ||
      (o.n !== undefined && !dayLedgerCounts(o.n)) ||
      (o.d && !o.n)) return false;
  if (o.days === undefined) return true;
  return dayLedgerRecord(o.days) && Object.entries(o.days).every(([day, counts]) =>
    day.length > 0 && day.length <= 64 &&
    !['__proto__', 'constructor', 'prototype'].includes(day) &&
    day !== o.d && dayLedgerCounts(counts));
}
function dayLedgerRead(o, day) {
  if (!dayLedgerValid(o)) return null; // never turn corrupt history into free stock
  return o?.d === day ? (o.n || {}) :
    o?.days && dayLedgerOwn(o.days, day) ? o.days[day] : {};
}
function dayLedgerSelect(o, day) {
  if (!dayLedgerValid(o)) return null;
  if (o?.d === day) return o;
  const days = Object.assign(Object.create(null), o?.days || {});
  if (o?.d && o.n && Object.keys(o.n).length) {
    if (dayLedgerOwn(days, o.d)) return null;
    days[o.d] = o.n; // entire prior day's spent entitlement is preserved
  }
  const n = dayLedgerOwn(days, day) ? days[day] : {};
  delete days[day]; // activated day lives in n, never duplicated in days
  const next = { ...(o || {}), d: day, n };
  if (Object.keys(days).length) next.days = days;
  else delete next.days;
  return next;
}
todayKey.dayLedgerValid = dayLedgerValid;
todayKey.dayLedgerRead = dayLedgerRead;
todayKey.dayLedgerSelect = dayLedgerSelect;
function refillN() { return S.refills.d === todayKey() ? S.refills.n : 0; }
function refillCost() { return refillPrice(refillN()); }
const SHOP = [
  ...['paul', 'jessica', 'gurney', 'stilgar', 'chani', 'kynes', 'leto', 'duncan', 'thufir', 'fedaykin'].map(id => ({ kind: 'sh', id, qty: 5, price: 60 })),
  { kind: 'pl', qty: 5, price: 80 }, { kind: 'sol', qty: 5000, price: 50 }, { kind: 'folio', qty: 5, price: 40 }, { kind: 'seal', qty: 1, price: 300, daily: 1 },
];
const ROSTER_IDS = CHARS.filter(c => !c.npc).map(c => c.id);
const RAID_SCENES = ['desert', 'saltflat', 'storm'];
const enemyProg = (id, lvl, boss) => ({ id, lvl, stars: Math.min(7, 1 + Math.floor(lvl / 5)), gear: Math.min(13, 1 + Math.floor(lvl / 6.2)), relic: lvl > 55 ? Math.min(7, Math.floor((lvl - 55) / 4.3)) : 0, pow: (1 + Math.max(0, lvl - 10) * .006) * (boss ? 1.1 : 1) });
const SHARDS_NEXT = [10, 15, 25, 30, 65, 85, 100];   // index = current stars
const STAR_COST = s => s * s * 500;
const LVL_COST = l => l * 40 + (l >= 30 ? (l - 29) ** 2 * 15 : 0);
const GEAR_COST = g => ({ sol: g * 1000, pl: g * 3 });
// ECON-01 approved: 24h base refill horizon; save v1 timestamps retain their format.
const MAX_LVL = 85, WATER_BASE = 360, WATER_SEC = 240, CANDLE_BASE = 288, CANDLE_SEC = 300, CANDLE_REFILL = 100;
const enCapStep = () => Math.floor((S && S.acc ? S.acc.lvl : 1) / 10), WMAX = () => WATER_BASE + 15 * enCapStep(), CMAX = () => CANDLE_BASE + 10 * enCapStep();
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];
const RW_NAME = { wring: 'водяных колец', jt: 'трофеев Джихада', core: 'устаревших голосов предков', ...Object.fromEntries(Object.entries(MEM_MATS).map(([k, m]) => [k, m.label.toLowerCase()])), rid: 'ридулианских кристаллов', candle: 'Огней Хроник', sol: 'соляриев', cry: 'камней су', folio: 'фолиантов', seal: 'Печать Ландсраада', wol: 'Вода жизни', pl: 'пластали', teeth: 'зубов червя', water: 'Воды' };
function rollShards(n, ch) {   // never more than 2 shards per attempt
  const r = Math.random(), a = r < (ch ? .4 : .5) ? 0 : r < (ch ? .78 : .8) ? 1 : 2, b = a < 2 && Math.random() < .3 ? 1 : 0;
  return [[n.drops[0], a], [n.drops[1], b]].filter(x => x[1] > 0);
}
// Целевой фарм сигналов с гарантией после серии неудач. Счётчики хранятся в сейве.
function signalDrop(n) {
  const hit = Object.entries(SIGNAL_NODES).find(([key, cfg]) =>
    cfg.camps.includes(n.camp) && n.lvl >= (cfg.minLvl || 0) &&
    n.c + 1 >= (cfg.minChapter || 1) && n.c + 1 <= (cfg.maxChapter || 99));
  if (!hit) return null;
  const [key, cfg] = hit;
  S.signalPity ??= {};
  const misses = S.signalPity[key] || 0;
  const got = Math.random() < cfg.chance || misses >= Math.ceil(2 / cfg.chance);
  S.signalPity[key] = got ? 0 : misses + 1;
  return got ? key : null;
}
// Guaranteed victory amounts: read-only projection used by the campaign console.
function campRewardBase(i, st) {
  const n = NODES[i], ch = n.camp === 'C', L = n.lvl;
  return { sol: ch ? 300 + L * 60 : 400 + L * 110, pl: 1 + (st === 3 ? 1 : 0) + (L >= 14 ? 1 : 0), folio: ch ? 2 + (L >= 20 ? 1 : 0) : 1 + (L >= 14 ? 1 : 0) };
}
function campReward(i, st, preview = false) {
  const n = NODES[i], ch = n.camp === 'C', L = n.lvl;
  return { ...campRewardBase(i,st),
    seal: Math.random() < (ch ? .08 : L >= 8 ? .04 : 0) ? 1 : 0, rid: ch ? 8 + Math.floor(Math.random() * 8) : 0,
    core: 0, signals: preview ? null : signalDrop(n), drops: rollShards(n, ch), items: rollItems(i) };
}


export { RAID_REWARD, REFILL_AMT, REFILL_MAX, CRY_WIN, CRY_3STAR, CRY_JOURNEY, refillPrice, todayKey, refillN, refillCost, SHOP, ROSTER_IDS, RAID_SCENES, enemyProg, SHARDS_NEXT, STAR_COST, LVL_COST, GEAR_COST, MAX_LVL, MAX_GEAR, WATER_BASE, WATER_SEC, BATTLE_WATER, CANDLE_BASE, CANDLE_SEC, CANDLE_COST, CANDLE_REFILL, enCapStep, WMAX, CMAX, ROMAN, RW_NAME, rollShards, campReward, campRewardBase };
