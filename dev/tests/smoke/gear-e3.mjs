// E3 regression: node tests/smoke/gear-e3.mjs
import assert from 'node:assert/strict';
import { ITEMS, FRAG_NEED, CRAFT } from '../../src/logic/gear.js';
import { gearBonus } from '../../src/data/gear-bonuses.js';
import { PARTS_BY_KIND } from '../../src/data/gear-recipes.js';
import { recipeFor, craftRequirements, buildPart, craftAndEquip } from '../../src/logic/gear-crafting.js';
import { gearSources } from '../../src/logic/gear-sources.js';

let cases = 0;
for (const item of Object.values(ITEMS)) {
  const recipe = recipeFor(item.id);
  const bonus = gearBonus(item.kind);
  assert.ok(bonus && bonus.dmg >= 0 && bonus.hp >= 0 && bonus.shield >= 0, item.id);
  assert.equal(recipe.parts?.length || 0, item.t >= 6 ? 2 : 0, item.id);
  const expected = CRAFT(item.t), inv = { [item.id]: FRAG_NEED[item.t] };
  const parts = {}, wallet = { sol: expected.sol, pl: expected.pl };
  const ok = craftAndEquip(item.id, inv, parts, wallet);
  assert.equal(ok.ok, true, item.id);
  assert.equal(inv[item.id], 0, item.id);
  assert.equal(wallet.sol, 0, item.id);
  assert.equal(wallet.pl, 0, item.id);
  assert.equal(craftAndEquip(item.id, inv, parts, wallet).ok, false, item.id);
  cases++;
}

const high = Object.values(ITEMS).find(x => x.t === 8);
const recipe = recipeFor(high.id);
assert.deepEqual(recipe.parts.map(x => x.name).length, 2);
const stock = {}, inv = { [high.id]: FRAG_NEED[high.t] }, cash = { ...CRAFT(high.t) };
assert.equal(buildPart(high.id, recipe.parts[0].id, inv, stock, cash).ok, true);
const saved = { ...inv }, state = { ...stock }, funds = { ...cash };
assert.equal(craftAndEquip(high.id, inv, stock, cash).ok, true);
assert.ok(inv[high.id] <= saved[high.id]);
assert.ok(stock[recipe.parts[0].id] === 0);
const insufficient = { [high.id]: 1 }, empty = {}, money = { sol: 100000, pl: 1000 };
const reject = craftAndEquip(high.id, insufficient, empty, money);
assert.equal(reject.ok, false);
assert.equal(insufficient[high.id], 1);
assert.deepEqual(empty, {});
assert.equal(money.sol, 100000);
for (const item of Object.values(ITEMS)) {
  assert.ok(Array.isArray(gearSources(item.id)));
  assert.ok(PARTS_BY_KIND[item.kind]);
}
console.log('E3 gear recipes and sources: PASS (' + cases + ' items)');
