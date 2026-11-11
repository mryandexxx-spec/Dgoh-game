// logic/gear.js — строки 3087–3150 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './relics.js'; // порядок исполнения
import { S } from '../core/state.js';
import { ROMAN } from './economy.js';
import { CAMP_KEYS, NODES, campNodes } from '../data/campaigns.js';
import { ghash } from '../data/looks.js';
import { sRng } from '../core/rng.js';
import { PARTS_BY_KIND, partFragId } from '../data/gear-recipes.js';
import { setGearStatProvider } from './battle/stats.js';

// ===== gear =====
const ITEM_KINDS = [['mask', 'Фильтр-маска'], ['boots', 'Сапоги-песчаники'], ['belt', 'Пояс-разгрузка'], ['knife', 'Боевой нож'], ['cloak', 'Пустынный плащ'], ['ring', 'Перстень-печать'],
  ['vial', 'Аптечка'], ['scope', 'Прицел'], ['plate', 'Нагрудник'], ['pad', 'Планшет ментата'], ['emitter', 'Эмиттер щита'], ['compass', 'Паракомпас']];
// gear 1–13: grey → green (2–3) → blue (4–6) → purple (7–11) → gold (12–13)
const TIER_COL = ['', '#93a093', '#5fb35a', '#4fc070', '#4f8fe0', '#4a7cf0', '#5a6cff', '#a46be0', '#a85ae6', '#b04ee8', '#ba44e4', '#c43ade', '#e0a83a', '#ffd040'];
const TIER_NAME = ['', 'обычный', 'добротный', 'добротный', 'редкий', 'редкий', 'редкий', 'эпический', 'эпический', 'эпический', 'эпический', 'эпический', 'легендарный', 'реликтовый'];
const FRAG_NEED = [0, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 25];
const CRAFT = t => ({ sol: 300 * t + 40 * t * t, pl: Math.ceil(t * .6) });
const GEAR_UP_SOL = g => 800 * g + 150 * g * g;
const SHOP_FRAG = [0, 0, 0, 0, 0, 0, 12, 16, 20, 26, 32, 40, 55, 75];
const RAID_FRAGS = [{ n: 12, tiers: [6, 7, 8] }, { n: 22, tiers: [9, 10, 11] }, { n: 36, tiers: [11, 12, 13] }];
const ITEMS = {};
for (let t = 1; t <= 13; t++) for (const [k, n] of ITEM_KINDS) ITEMS[k + t] = { id: k + t, kind: k, n: `${n} мк. ${ROMAN[t]}`, t };
function gearPlan(cid, t) {
  const r = sRng(ghash(cid + ':' + t)), kinds = ITEM_KINDS.map(x => x[0]);
  for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  return kinds.slice(0, 6).map(k => k + t);
}
setGearStatProvider(gearPlan);
// GE1: distinct farm maps, seeded deterministically; no shared missions between parts of one item.
const COMPLETE_RATE = [0, .02,.02,.02,.01,.01,.005,.005,.002,.002,.001,0,0,0];
const COMPLETE_SOURCES = [0,2,2,2,1,1,1,1,1,1,1,0,0,0];
const COMPLETE_NODE_ITEMS = NODES.map(() => []);
const NODE_ITEMS = NODES.map(() => []);
const FRAGMENT_SOURCES = new Map(), COMPLETE_INDEX = new Map();
const _band = i => Math.min(12, 1 + Math.floor(NODES[i].lvl / 7.4));
function selectFarmNodes(item, excluded, count, salt) {
  const options = NODES.map((n, i) => i).filter(i => !excluded.has(i))
    .sort((a,b) => Math.abs(_band(a)-item.t)-Math.abs(_band(b)-item.t) ||
      ghash(item.id + ':' + salt + ':' + a)-ghash(item.id + ':' + salt + ':' + b));
  return options.slice(0, count);
}
for (const item of Object.values(ITEMS)) {
  const used = new Set();
  const parts = item.t <= 5 ? ['direct'] : PARTS_BY_KIND[item.kind];
  for (const part of parts) {
    const id = part === 'direct' ? item.id : partFragId(item, part);
    const chosen = selectFarmNodes(item, used, Math.min(3, item.t < 6 ? 3 : 2), part);
    FRAGMENT_SOURCES.set(id, chosen);
    for (const i of chosen) { NODE_ITEMS[i].push(id); used.add(i); }
  }
  if (COMPLETE_SOURCES[item.t]) {
    const chosen = selectFarmNodes(item, new Set(), COMPLETE_SOURCES[item.t], 'complete');
    COMPLETE_INDEX.set(item.id, chosen);
    chosen.forEach(i => COMPLETE_NODE_ITEMS[i].push(item.id));
  }
}
const nodeChance = i => NODE_ITEMS[i].length ? (NODE_ITEMS[i].length === 1 ? .94 : Math.min(1, 1.3 / NODE_ITEMS[i].length)) : 0;
function rollItems(i) {
  const pool = NODE_ITEMS[i].slice(), out = [];
  if (pool.length && Math.random() < .9) {
    const j = Math.floor(Math.random() * pool.length);
    out.push([pool.splice(j,1)[0], 1]);
  }
  if (pool.length && Math.random() < .4) out.push([pool[Math.floor(Math.random() * pool.length)], 1]);
  for (const id of COMPLETE_NODE_ITEMS[i]) if (Math.random() < COMPLETE_RATE[ITEMS[id].t])
    out.push(['gear:' + id, 1]);
  return out;
}
function grantFrags(list) {
  for (const [id,q] of list) {
    const store = id.startsWith('gear:') ? (S.gearOwned ??= {}) : S.inv;
    const key = id.startsWith('gear:') ? id.slice(5) : id;
    store[key] = (store[key] || 0) + q;
  }
}
function raidFrags(tier, pct) {
  const R = RAID_FRAGS[tier], n = Math.round(R.n * pct), pool = Object.values(ITEMS).filter(it => R.tiers.includes(it.t)), out = [];
  for (let k = 0; k < n; k++) out.push([pool[Math.floor(Math.random() * pool.length)].id, 1]);
  return out;
}
const IG = {
  mask: (c, d) => `<path d="M5 9c0-3 3-5 7-5s7 2 7 5v3c0 4-3 7-7 7s-7-3-7-7z" fill="${c}"/><rect x="8" y="13" width="8" height="3" rx="1.5" fill="${d}"/>`,
  boots: (c, d) => `<path d="M8 3h5v10l6 3v4H6V13z" fill="${c}"/><path d="M6 18h13" stroke="${d}" stroke-width="1.4"/>`,
  belt: (c, d) => `<rect x="3" y="10" width="18" height="5" rx="1" fill="${c}"/><rect x="10" y="8.5" width="4" height="8" rx="1" fill="${d}" stroke="${c}" stroke-width="1.2"/>`,
  knife: (c, d) => `<path d="M7.5 14.5L17 5l3.5-1.5L19 7l-9.5 9.5z" fill="${c}"/><path d="M5 13l6 6" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><path d="M3.5 20.5l3-3" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
  cloak: (c, d) => `<path d="M8 3h8l3 18H5z" fill="${c}"/><path d="M12 3v18" stroke="${d}" stroke-width="1.2"/>`,
  ring: (c, d) => `<circle cx="12" cy="14" r="5.8" fill="none" stroke="${c}" stroke-width="2.6"/><path d="M9 6l3-3 3 3-3 3z" fill="${c}"/>`,
  vial: (c, d) => `<rect x="7.5" y="8" width="9" height="13" rx="2" fill="${c}"/><rect x="10" y="4" width="4" height="4" fill="${c}"/><path d="M12 11v6M9 14h6" stroke="${d}" stroke-width="2"/>`,
  scope: (c, d) => `<circle cx="12" cy="12" r="6.5" fill="none" stroke="${c}" stroke-width="2.2"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5" stroke="${c}" stroke-width="2"/>`,
  plate: (c, d) => `<path d="M5 5l7-2 7 2v6c0 5-3 8-7 10-4-2-7-5-7-10z" fill="${c}"/><path d="M12 5v14M8 9h8" stroke="${d}" stroke-width="1.3"/>`,
  pad: (c, d) => `<rect x="5" y="3" width="14" height="18" rx="2" fill="${c}"/><path d="M8 8h8M8 12h8M8 16h5" stroke="${d}" stroke-width="1.6"/>`,
  emitter: (c, d) => `<circle cx="12" cy="12" r="4" fill="${c}"/><circle cx="12" cy="12" r="8.5" fill="none" stroke="${c}" stroke-width="1.6" stroke-dasharray="3 2"/>`,
  compass: (c, d) => `<circle cx="12" cy="12" r="8" fill="none" stroke="${c}" stroke-width="2"/><path d="M12 5.5l2.6 6.5-2.6 6.5-2.6-6.5z" fill="${c}"/>`,
};

export { ITEM_KINDS, TIER_COL, TIER_NAME, FRAG_NEED, CRAFT, GEAR_UP_SOL, SHOP_FRAG, RAID_FRAGS, ITEMS, gearPlan, NODE_ITEMS, COMPLETE_NODE_ITEMS, FRAGMENT_SOURCES, COMPLETE_INDEX, COMPLETE_RATE, nodeChance, rollItems, grantFrags, raidFrags, IG };
