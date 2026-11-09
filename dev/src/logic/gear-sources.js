// E3: детерминированный индекс мест получения фрагментов.
// Вычисляется из существующих таблиц наград; без DOM, без копии списка миссий.
import './gear-crafting.js'; // порядок исполнения
import { NODES } from '../data/campaigns.js';
import { ITEMS, NODE_ITEMS, SHOP_FRAG, RAID_FRAGS, nodeChance } from './gear.js';

const INDEX = (() => {
  const map = new Map();
  for (let i = 0; i < NODE_ITEMS.length; i++) {
    for (const id of NODE_ITEMS[i]) {
      let list = map.get(id);
      if (!list) map.set(id, list = []);
      list.push(Object.freeze({
        type: 'mission', id: i, chance: nodeChance(i),
        energy: NODES[i].camp === 'C' ? 'candle' : 'water',
      }));
    }
  }
  return map;
})();

function gearSources(id) {
  const it = ITEMS[id];
  if (!it) return [];
  const out = [...(INDEX.get(id) || [])];
  if (SHOP_FRAG[it.t]) out.push({ type: 'sietch', currency: 'teeth', price: SHOP_FRAG[it.t], qty: 1 });
  for (let i = 0; i < RAID_FRAGS.length; i++) {
    if (RAID_FRAGS[i].tiers.includes(it.t))
      out.push({ type: 'raid', tier: i, random: true });
  }
  return out;
}
export { gearSources };
