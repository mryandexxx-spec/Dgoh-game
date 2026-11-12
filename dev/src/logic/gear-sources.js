// GE1: source lookup from exactly the same indices as reward generation.
import './gear-crafting.js'; // порядок исполнения
import { NODES } from '../data/campaigns.js';
import { ITEMS, FRAGMENT_SOURCES, COMPLETE_INDEX, COMPLETE_RATE, NODE_ITEMS, nodeChance, SHOP_FRAG, RAID_FRAGS } from './gear.js';
function gearSources(id, type = 'fragment') {
  if (type === 'complete') {
    const item = ITEMS[id];
    return item ? (COMPLETE_INDEX.get(id) || []).map(i => ({
      type:'mission', id:i, chance:COMPLETE_RATE[item.t], energy:NODES[i].camp === 'C'?'candle':'water', reward:'complete'
    })) : [];
  }
  const itemId = id.startsWith('frag:') ? id.split(':')[1] : id;
  const item = ITEMS[itemId];
  if (!item) return [];
  const out = (FRAGMENT_SOURCES.get(id) || []).map(i => ({
    type:'mission', id:i, chance:nodeChance(i),
    energy:NODES[i].camp === 'C'?'candle':'water', reward:'fragment'
  }));
  // GE1: new purchases/raid awards are specific component fragments only.
  // Existing S.inv[itemId] is legacy stock and cannot be newly generated.
  if (id.startsWith('frag:')) {
    if (SHOP_FRAG[item.t]) out.push({type:'sietch',currency:'teeth',price:SHOP_FRAG[item.t],qty:1});
    RAID_FRAGS.forEach((raid,i)=>{if(raid.tiers.includes(item.t)) out.push({type:'raid',tier:i,random:true});});
  }
  return out;
}
export { gearSources };
