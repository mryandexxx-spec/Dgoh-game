// logic/gear.js — строки 3087–3150 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './relics.js'; // порядок исполнения
import { S } from '../core/state.js';
import { ROMAN } from './economy.js';
import { CAMP_KEYS, NODES, campNodes } from '../data/campaigns.js';
import { ghash } from '../data/looks.js';
import { amt } from '../core/format.js';
import { sRng } from '../core/rng.js';

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
const NODE_ITEMS = (() => {
  const m = NODES.map(() => []), band = i => Math.min(11, 1 + Math.floor(NODES[i].lvl / 7.4));
  for (const ck of CAMP_KEYS) {
    const idx = campNodes(ck);
    for (const it of Object.values(ITEMS)) {
      if (it.t > 12) continue;
      const cand = idx.filter(i => it.t === band(i) || it.t === band(i) + 1), r = sRng(ghash(it.id + ck));
      for (let k = 0; k < 3 && cand.length; k++) m[cand.splice(Math.floor(r() * cand.length), 1)[0]].push(it.id);
    }
    for (const i of idx) if (!m[i].length) { const t = band(i), pool = Object.values(ITEMS).filter(x => x.t === t); m[i].push(pool[i % pool.length].id); }
  }
  return m;
})();
const nodeChance = i => 1.8 / NODE_ITEMS[i].length;
function rollItems(i) {
  const L = NODE_ITEMS[i].slice(), out = [];
  let left = 2; for (let k = 0; k < 2 && L.length && left > 0; k++) { if (Math.random() > .9) continue; const q = Math.min(left, 1 + (Math.random() < .3 ? 1 : 0)); left -= q; out.push([L.splice(Math.floor(Math.random() * L.length), 1)[0], q]); }
  return out;
}
function grantFrags(list) { for (const [id, q] of list) S.inv[id] = (S.inv[id] || 0) + q; }
function fragLines(list) {
  const agg = {}; for (const [id, q] of list) agg[id] = (agg[id] || 0) + q;
  return Object.entries(agg).map(([id, q]) => `+${amt('frag', q, 'frag:' + id)} ${itemIcon(ITEMS[id], 18)} ${ITEMS[id].n}`);
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
function itemIcon(it, size = 40, extra = '') {
  return `<span class="itm ${extra}" data-info="frag:${it.id}" style="--tc:${TIER_COL[it.t]};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" aria-hidden="true">${IG[it.kind]('#efe6d6', '#1a1420')}</svg></span>`;
}

export { ITEM_KINDS, TIER_COL, TIER_NAME, FRAG_NEED, CRAFT, GEAR_UP_SOL, SHOP_FRAG, RAID_FRAGS, ITEMS, gearPlan, NODE_ITEMS, nodeChance, rollItems, grantFrags, fragLines, raidFrags, IG, itemIcon };
