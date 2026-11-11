// core/save.js — строки 3151–3201 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { S } from './state.js';
import './format.js'; // порядок исполнения
import { CMAX, WMAX } from '../logic/economy.js';
import { CHARS } from '../data/chars.js';
import { MEM_MATS, SCRAP } from '../data/memory-scrap.js';

const SAVE_KEY = 'dune-goh-v1';

function newSave() {
  const roster = {};
  for (const c of CHARS) roster[c.id] = { shards: 0, stars: 0, lvl: 1, gear: 1 };
  Object.assign(roster.leto, { stars: 3 }); Object.assign(roster.paul, { stars: 3 });
  for (const id of ['jessica', 'duncan', 'gurney']) roster[id].stars = 2;
  return fillSave({ v: 1, water: WMAX(), waterTs: Date.now(), solari: 3000, plast: 3, roster, squad: ['leto', 'paul', 'jessica', 'duncan', 'gurney'], cleared: {} });
}
function fillSave(s) {
  s.candle ??= CMAX(); s.candleTs ??= Date.now(); s.rid ??= 0; s.crefills ??= { d: '', n: 0 }; s.buys ??= { d: '', n: {} }; s.campTab ??= 'L'; s.campCh ??= {}; s.shopTab ??= 'post';
  for (const c of CHARS) s.roster[c.id] ??= { shards: 0, stars: 0, lvl: 1, gear: 1 };
  if (!s.darkGift) { s.darkGift = 1; for (const id of ['trooper', 'rabban', 'piter']) s.roster[id].stars = Math.max(s.roster[id].stars || 0, 2); }
  s.squadD ??= ['rabban', 'piter', 'trooper']; s.squadC ??= (s.squad || []).slice();
  s.daily ??= { d: '', c: {}, got: {}, chest: false }; s.login ??= { m: '', n: 0, last: '' };
  s.folio ??= 10; s.seal ??= 0; s.wol ??= 0; s.seenDlg ??= {}; s.skipDlg ??= false; s.sealBuy ??= { d: '', n: 0 }; s.sealClaim ??= {};
  for (const id in s.roster) s.roster[id].sk ??= { basic: 1, special: 1, ult: 1, passive: 1, leader: 1 };
  // BH9.4: idempotent placeholder for independent story event progress.
  // Future hero roster records are deliberately NOT created until release.
  s.storyEvents ??= {};
  s.cry ??= 200; s.cryClaim ??= {}; s.refills ??= { d: '', n: 0 };
  s.inv ??= {}; s.gearParts ??= {}; for (const id in s.roster) s.roster[id].eq ??= [false, false, false, false, false, false];
  // Однократная миграция Голосов предков в Платы Икса. Старые уровни ДП не меняются.
  if (!s.memoryEconomyV2) { s.ix_plate = (s.ix_plate || 0) + (s.core || 0); s.core = 0; s.memoryEconomyV2 = 1; }
  for (const k of Object.keys(MEM_MATS)) s[k] ??= 0;
  s.scrapCarry ??= {}; s.scrapLocks ??= {};
  for (const k of Object.keys(SCRAP)) s.scrapCarry[k] ??= 0;
  s.core ??= 0; s.teeth ??= 0; s.raid ??= null; s.raidKills ??= []; s.journey ??= {}; s.journeys ??= { muaddib: s.journey, liet: {} }; s.jKey ??= 'muaddib'; s.jPicks ??= { muaddib: s.jPick || [], liet: [] }; s.raidPick ??= []; s.jPick ??= [];
  // v83: one-time retirement of legendary liet, no compensation; keep historical data reversible.
  if (!s.migrations) s.migrations = {};
  if (!s.migrations.retireLietV83) {
    s.retiredLiet ??= { hero: s.roster.liet || null, journey: s.journeys.liet || null };
    s.migrations.retireLietV83 = true;
  }
  delete s.roster.liet;
  delete s.journeys.liet;
  delete s.jPicks.liet;
  if (s.jKey === 'liet') s.jKey = 'muaddib';
  for (const name of ['squad', 'squadD', 'squadC', 'squadTr', 'raidPick', 'jPick', 'jPicks', 'squadByCamp', 'squadByNode']) {
    const prune = v => {
      if (Array.isArray(v)) return v.filter(id => id !== 'liet');
      if (v && typeof v === 'object') for (const k of Object.keys(v)) v[k] = prune(v[k]);
      return v;
    };
    if (s[name]) s[name] = prune(s[name]);
  }
  if (s.conq && typeof s.conq === 'object') {
    const pruneCq = o => {
      if (!o || typeof o !== 'object') return;
      for (const k in o) if (k === 'squad' && Array.isArray(o[k])) o[k] = o[k].filter(id => id !== 'liet');
      else if (o[k] && typeof o[k] === 'object') pruneCq(o[k]);
    };
    pruneCq(s.conq);
  }
  // J1: permanent difficulty unlocks survive the weekly S.conq reset.
  // Grandfather previously selected normal/hard to avoid revoking old access.
  s.cqUnlock ??= {};
  if (!s.migrations.jihadJ1) {
    const C = s.conq;
    if (C?.diff === 'normal' || C?.diff === 'hard') s.cqUnlock.easy ??= 'legacy';
    if (C?.diff === 'hard') s.cqUnlock.normal ??= 'legacy';
    // A finished fifth sector from before this update also counts.
    if (C?.done?.['4-11-0'] && (C.diff === 'easy' || C.diff === 'normal'))
      s.cqUnlock[C.diff] ??= C.wk || 'legacy';
    s.migrations.jihadJ1 = 1;
  }
  return s;
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) { for (const c of CHARS) s.roster[c.id] ||= { shards: 0, stars: 0, lvl: 1, gear: 1 }; return fillSave(s); } } catch (e) {}
  return null;
}
function persist0() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
let notePend = 0;
function persist() { persist0(); if (!notePend) notePend = setTimeout(() => { notePend = 0; if (persistHook) persistHook(); }, 60); }
let persistHook = null; // ui/notifications подписывает notePoll (core не импортирует ui)
const onPersist = f => { persistHook = f; };


export { SAVE_KEY, newSave, fillSave, loadSave, persist0, notePend, persist, onPersist };
