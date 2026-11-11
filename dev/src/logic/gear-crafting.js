// E3: расчёт вложенной сборки и затрат. Не работает с DOM или сохранением.
import './gear.js'; // порядок исполнения
import { gearRecipe } from '../data/gear-recipes.js';
import { CRAFT, FRAG_NEED, ITEMS } from './gear.js';

const recipeFor = id => ITEMS[id] ? gearRecipe(ITEMS[id], FRAG_NEED, CRAFT) : null;
const amount = (bag, key) => Math.max(0, Number(bag?.[key] || 0));
const partStock = (bag, key) => amount(bag, key);

// Возвращает потребности и возможные действия, не меняя состояние игрока.
// У предмета не больше двух деталей; каждая деталь требует обычные фрагменты.
// Сначала учитываем уже созданные детали, затем общий доступный запас фрагментов.
function craftRequirements(id, inventory, partsStock = {}, currencies = {}, gearOwned = {}) {
  const recipe = recipeFor(id);
  if (!recipe) return null;
  const legacy = amount(inventory,id), ownedFragments = legacy;
  const needs = [], missing = [];
  let availableLegacy = legacy, sol = recipe.cost.sol, pl = recipe.cost.pl, fragments = 0;
  if (recipe.parts) {
    for (const part of recipe.parts) {
      if (partStock(partsStock,part.id)) continue;
      const needed = part.materials[0].count;
      const specific = amount(inventory,part.materials[0].id);
      const legacyUsed = Math.min(availableLegacy,Math.max(0,needed-specific));
      availableLegacy -= legacyUsed;
      if (specific+legacyUsed < needed) missing.push({kind:'fragment',id:part.materials[0].id,have:specific+legacyUsed,need:needed});
      needs.push({kind:'part',id:part.id,count:1,name:part.name,fragmentId:part.materials[0].id,fragments:needed,sol:part.cost.sol,pl:part.cost.pl});
      fragments += needed; sol += part.cost.sol; pl += part.cost.pl;
    }
  } else {
    fragments = recipe.materials[0].count;
    if (legacy < fragments) missing.push({kind:'fragment',id,have:legacy,need:fragments});
  }
  const complete = amount(gearOwned,id)>0;
  if (amount(currencies,'sol') < sol) missing.push({kind:'currency',id:'sol',have:amount(currencies,'sol'),need:sol});
  if (amount(currencies,'pl') < pl) missing.push({kind:'currency',id:'pl',have:amount(currencies,'pl'),need:pl});
  return {recipe,needs,fragments,currencies:{sol,pl},missing,ready:complete || missing.length===0,complete,ownedFragments};
}

// Атомарная автосборка: сначала проверяем весь маршрут на копиях,
// затем применяем списание только если предмет действительно можно надеть.
function craftAndEquip(itemId, inventory, partsStock, currencies, gearOwned = {}) {
  if (amount(gearOwned,itemId)>0) { gearOwned[itemId] -= 1; return {ok:true,complete:true,steps:[]}; }
  const recipe = recipeFor(itemId);
  if (!recipe) return { ok: false, reason: 'item' };
  const inv = { ...inventory }, parts = { ...partsStock }, cash = { ...currencies };
  const steps = [];
  for (const part of recipe.parts || []) {
    if (partStock(parts, part.id)) continue;
    const res = buildPart(itemId, part.id, inv, parts, cash);
    if (!res.ok) return { ok: false, reason: res.reason, part: part.id };
    steps.push(part.id);
  }
  const result = consumeRecipe(itemId, inv, parts, cash);
  if (!result.ok) return result;
  // Применяем только известные ключи, удалений/перезаписи других ресурсов нет.
  inventory[itemId] = inv[itemId] || 0;
  for (const part of recipe.parts || []) inventory[part.materials[0].id] = inv[part.materials[0].id] || 0;
  for (const part of recipe.parts || []) partsStock[part.id] = parts[part.id] || 0;
  currencies.sol = cash.sol; currencies.pl = cash.pl;
  return { ok: true, steps };
}

// Создать только выбранную деталь. Изменения выполняются атомарно после проверки.
function buildPart(itemId, partId, inventory, partStockMap, currencies) {
  const recipe = recipeFor(itemId);
  const part = recipe?.parts?.find(p => p.id === partId);
  if (!part) return { ok: false, reason: 'part' };
  const count = part.materials[0].count, key = part.materials[0].id;
  const availableSpecific = Math.min(count,amount(inventory,key));
  const specific = availableSpecific, legacy = count-specific;
  if (amount(inventory,itemId) < legacy || amount(inventory,key) < specific || amount(currencies, 'sol') < part.cost.sol ||
      amount(currencies, 'pl') < part.cost.pl) return { ok: false, reason: 'resources' };
  inventory[itemId] = amount(inventory,itemId) - legacy;
  inventory[key] = amount(inventory,key) - specific;
  currencies.sol -= part.cost.sol;
  currencies.pl -= part.cost.pl;
  partStockMap[partId] = amount(partStockMap, partId) + 1;
  return { ok: true };
}

// Сборка предмета: требуется готовая пара деталей, при прямом рецепте — фрагменты.
// Предмет сразу надевается существующим потоком UI после успешной сборки.
function consumeRecipe(itemId, inventory, partStockMap, currencies) {
  const recipe = recipeFor(itemId);
  if (!recipe) return { ok: false, reason: 'item' };
  if (amount(currencies, 'sol') < recipe.cost.sol || amount(currencies, 'pl') < recipe.cost.pl)
    return { ok: false, reason: 'resources' };
  if (recipe.parts) {
    if (recipe.parts.some(p => !partStock(partStockMap, p.id))) return { ok: false, reason: 'parts' };
    for (const part of recipe.parts) partStockMap[part.id] -= 1;
  } else {
    const count = recipe.materials[0].count;
    if (amount(inventory, itemId) < count) return { ok: false, reason: 'fragments' };
    inventory[itemId] -= count;
  }
  currencies.sol -= recipe.cost.sol;
  currencies.pl -= recipe.cost.pl;
  return { ok: true };
}
export { recipeFor, craftRequirements, buildPart, consumeRecipe, craftAndEquip };
