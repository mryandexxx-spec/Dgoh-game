// E3: расчёт вложенной сборки и затрат. Не работает с DOM или сохранением.
import { gearRecipe } from '../data/gear-recipes.js';
import { CRAFT, FRAG_NEED, ITEMS } from './gear.js';

const recipeFor = id => ITEMS[id] ? gearRecipe(ITEMS[id], FRAG_NEED, CRAFT) : null;
const amount = (bag, key) => Math.max(0, Number(bag?.[key] || 0));
const partStock = (bag, key) => amount(bag, key);

// Возвращает потребности и возможные действия, не меняя состояние игрока.
// У предмета не больше двух деталей; каждая деталь требует обычные фрагменты.
// Сначала учитываем уже созданные детали, затем общий доступный запас фрагментов.
function craftRequirements(id, inventory, partsStock = {}, currencies = {}) {
  const recipe = recipeFor(id);
  if (!recipe) return null;
  const ownedFragments = amount(inventory, id);
  const needs = [], missing = [];
  let fragments = 0, sol = recipe.cost.sol, pl = recipe.cost.pl;
  if (recipe.parts) {
    for (const part of recipe.parts) {
      if (partStock(partsStock, part.id)) continue;
      fragments += part.materials[0].count;
      sol += part.cost.sol; pl += part.cost.pl;
      needs.push({ kind: 'part', id: part.id, count: 1, name: part.name,
        fragmentId: id, fragments: part.materials[0].count,
        sol: part.cost.sol, pl: part.cost.pl });
    }
  } else {
    fragments = recipe.materials[0].count;
  }
  if (ownedFragments < fragments) missing.push({ kind: 'fragment', id, have: ownedFragments, need: fragments });
  if (amount(currencies, 'sol') < sol) missing.push({ kind: 'currency', id: 'sol', have: amount(currencies, 'sol'), need: sol });
  if (amount(currencies, 'pl') < pl) missing.push({ kind: 'currency', id: 'pl', have: amount(currencies, 'pl'), need: pl });
  return { recipe, needs, fragments, currencies: { sol, pl }, missing,
    ready: missing.length === 0, ownedFragments };
}

// Создать только выбранную деталь. Изменения выполняются атомарно после проверки.
function buildPart(itemId, partId, inventory, partStockMap, currencies) {
  const recipe = recipeFor(itemId);
  const part = recipe?.parts?.find(p => p.id === partId);
  if (!part) return { ok: false, reason: 'part' };
  const count = part.materials[0].count;
  if (amount(inventory, itemId) < count || amount(currencies, 'sol') < part.cost.sol ||
      amount(currencies, 'pl') < part.cost.pl) return { ok: false, reason: 'resources' };
  inventory[itemId] -= count;
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
export { recipeFor, craftRequirements, buildPart, consumeRecipe };
