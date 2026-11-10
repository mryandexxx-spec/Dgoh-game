// Чистая логика Утилизатора Икса. Никакого DOM и случайных конверсий.
import { MEM_MATS, SCRAP, SCRAP_MULT } from '../data/memory-scrap.js';
import { ITEMS, FRAG_NEED, gearPlan } from './gear.js';
import { gearRecipe } from '../data/gear-recipes.js';

const stock = (map, key) => Math.max(0, Math.floor(Number(map?.[key] || 0)));
function scrapPoint(kind, id, partId) {
  const it = ITEMS[id], r = SCRAP[kind];
  if (!it || !r || !r.base[it.t]) return 0;
  const each = Math.max(1, Math.round(r.base[it.t] * (SCRAP_MULT[it.kind] || 1)));
  if (!partId) return each;
  const recipe = gearRecipe(it, FRAG_NEED, () => ({ sol: 0, pl: 0 }));
  const part = recipe.parts?.find(x => x.id === partId);
  return part ? Math.max(1, Math.floor(part.materials[0].count * each * 1.05)) : 0;
}
// Резерв под шесть ячеек каждого уникального героя во всех активных отрядах.
// Готовые детали учитываются, чтобы не резервировать их фрагменты дважды.
function protectedStock(state) {
  const needs = {}, done = new Set();
  const squads = [state.squad, state.squadD, state.squadC, state.raidPick];
  for (const id of squads.flat()) {
    if (!id || done.has(id)) continue;
    done.add(id);
    const p = state.roster?.[id];
    if (!p?.stars) continue;
    const plan = gearPlan(id, p.gear);
    for (let slot = 0; slot < plan.length; slot++) {
      if (p.eq?.[slot]) continue;
      const it = ITEMS[plan[slot]];
      if (!it) continue;
      const recipe = gearRecipe(it, FRAG_NEED, () => ({ sol: 0, pl: 0 }));
      const required = recipe.parts ? recipe.parts.reduce((n, part) =>
        n + (stock(state.gearParts, part.id) ? 0 : part.materials[0].count), 0) : FRAG_NEED[it.t];
      needs[it.id] = (needs[it.id] || 0) + required;
    }
  }
  return needs;
}
function scrapAvailable(state, id, partId, reserve) {
  const key = partId || id;
  const owned = partId ? stock(state.gearParts, partId) : stock(state.inv, id);
  if (state.scrapLocks?.[key]) return 0;
  const held = partId ? 0 : Math.max(0, (reserve || protectedStock(state))[id] || 0);
  return Math.max(0, owned - held);
}
function scrapQuote(state, kind, entries) {
  const r = SCRAP[kind];
  if (!r) return { ok: false, reason: 'kind' };
  const used = new Set(), reserve = protectedStock(state), rows = [];
  let pts = 0;
  for (const entry of entries || []) {
    const id = entry.id, partId = entry.partId || null, count = Number(entry.count);
    const key = partId || id, each = scrapPoint(kind, id, partId);
    if (!each || used.has(key) || !Number.isSafeInteger(count) || count < 1 ||
        count > scrapAvailable(state, id, partId, reserve)) return { ok: false, reason: 'stock' };
    used.add(key);
    pts += each * count;
    rows.push({ id, partId, count, each, pts: each * count });
  }
  const carry = stock(state.scrapCarry, kind);
  const all = carry + pts, count = Math.floor(all / r.threshold);
  return { ok: count > 0, reason: count ? null : 'points', kind, carry, pts,
    threshold: r.threshold, output: count, remainder: all % r.threshold, rows };
}
function scrapCommit(state, kind, entries) {
  const quote = scrapQuote(state, kind, entries);
  if (!quote.ok) return quote;
  for (const { id, partId, count } of quote.rows) {
    const bag = partId ? state.gearParts : state.inv;
    bag[partId || id] -= count;
  }
  state.scrapCarry ??= {};
  state.scrapCarry[kind] = quote.remainder;
  state[kind] = stock(state, kind) + quote.output;
  return quote;
}
function scrapAutoPick(state, kind) {
  if (!SCRAP[kind]) return [];
  const remaining = SCRAP[kind].threshold - stock(state.scrapCarry, kind);
  let pts = 0; const chosen = [], reserve = protectedStock(state);
  const options = Object.values(ITEMS).filter(it => scrapPoint(kind, it.id))
    .map(it => ({ id: it.id, p: scrapPoint(kind, it.id),
      qty: scrapAvailable(state, it.id, null, reserve), tier: it.t }))
    .filter(x => x.qty).sort((a, b) => a.tier - b.tier || a.p - b.p);
  for (const o of options) {
    if (pts >= remaining) break;
    const count = Math.min(o.qty, Math.ceil((remaining - pts) / o.p));
    if (count > 0) { chosen.push({ id: o.id, count }); pts += count * o.p; }
  }
  return chosen;
}
export { MEM_MATS, SCRAP, scrapPoint, protectedStock, scrapAvailable, scrapQuote, scrapCommit, scrapAutoPick };
