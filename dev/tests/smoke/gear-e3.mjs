// E3 regression: node tests/smoke/gear-e3.mjs
// Изолируем чистые функции от глобального браузерного boot-цепочки src/.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../../src/' + p, import.meta.url), 'utf8');
const stripped = s => s.replace(/^import .*$/gm, '').replace(/^export \{.*$/gm, '');
const recipes = stripped(read('data/gear-recipes.js'));
const bonuses = stripped(read('data/gear-bonuses.js'));
const craft = stripped(read('logic/gear-crafting.js'));
const gear = read('logic/gear.js');
const FRAG_SOURCE = gear.match(/^const FRAG_NEED = \[[^;]+;/m)?.[0];
const CRAFT_SOURCE = gear.match(/^const CRAFT = [^\n]+/m)?.[0];
assert.ok(FRAG_SOURCE && CRAFT_SOURCE, 'gear costs found in source');
const { FRAG_NEED, CRAFT } = new Function(FRAG_SOURCE + CRAFT_SOURCE +
  'return { FRAG_NEED, CRAFT };')();
const { PARTS_BY_KIND } = new Function(recipes + 'return { PARTS_BY_KIND };')();
const ITEMS = {};
for (let t = 1; t <= 13; t++) for (const kind of Object.keys(PARTS_BY_KIND)) {
  const id = kind + t;
  ITEMS[id] = { id, kind, n: kind + ' ' + t, t };
}
const G = new Function('ITEMS', 'FRAG_NEED', 'CRAFT', recipes + bonuses + craft +
  'return { gearBonus, recipeFor, craftRequirements, buildPart, craftAndEquip };')(ITEMS, FRAG_NEED, CRAFT);

let cases = 0;
for (const item of Object.values(ITEMS)) {
  const recipe = G.recipeFor(item.id), bonus = G.gearBonus(item.kind);
  assert.ok(bonus && bonus.dmg >= 0 && bonus.hp >= 0 && bonus.shield >= 0, item.id);
  assert.equal(recipe.parts?.length || 0, item.t >= 6 ? 2 : 0, item.id);
  const cost = CRAFT(item.t), inv = { [item.id]: FRAG_NEED[item.t] };
  const parts = {}, wallet = { sol: cost.sol, pl: cost.pl };
  assert.equal(G.craftAndEquip(item.id, inv, parts, wallet).ok, true, item.id);
  assert.equal(inv[item.id], 0, item.id);
  assert.equal(wallet.sol, 0, item.id);
  assert.equal(wallet.pl, 0, item.id);
  assert.equal(G.craftAndEquip(item.id, inv, parts, wallet).ok, false, item.id);
  cases++;
}
const it = ITEMS.knife8, recipe = G.recipeFor(it.id);
const inv = { [it.id]: FRAG_NEED[it.t] }, parts = {}, wallet = { ...CRAFT(it.t) };
assert.equal(G.buildPart(it.id, recipe.parts[0].id, inv, parts, wallet).ok, true);
assert.equal(G.craftAndEquip(it.id, inv, parts, wallet).ok, true);
assert.equal(parts[recipe.parts[0].id], 0);
const badInv = { [it.id]: 1 }, badParts = {}, badCash = { sol: 100000, pl: 1000 };
assert.equal(G.craftAndEquip(it.id, badInv, badParts, badCash).ok, false);
assert.equal(badInv[it.id], 1);
assert.deepEqual(badParts, {});
assert.equal(badCash.sol, 100000);

const sources = stripped(read('logic/gear-sources.js'));
const nodes = [{ camp: 'L' }, { camp: 'C' }], nodeItems = [[it.id], []];
const fragmentId = recipe.parts[0].materials[0].id;
const fragSources = new Map([[fragmentId,[0]]]), completeIndex = new Map([[it.id,[1]]]);
const completeRate = Array(14).fill(0); completeRate[8] = .002;
const { gearSources } = new Function('NODES','ITEMS','FRAGMENT_SOURCES','COMPLETE_INDEX',
  'COMPLETE_RATE','NODE_ITEMS','SHOP_FRAG','RAID_FRAGS','nodeChance',sources+
  'return { gearSources };')(nodes, ITEMS, fragSources, completeIndex, completeRate,
  nodeItems, Array(14).fill(12), [{tiers:[8]}], ()=>0.3);
assert.equal(gearSources(fragmentId).filter(s=>s.type==='mission').length, 1);
assert.equal(gearSources(it.id,'complete').filter(s=>s.type==='mission').length, 1);
assert.equal(gearSources(it.id,'complete')[0].chance, .002);
assert.equal(gearSources(it.id).filter(s=>s.type==='sietch').length, 1);
assert.equal(gearSources(it.id).filter(s=>s.type==='raid').length, 1);

// GE1: all original fragments remain usable and existing complete items require no recipe costs.
const completeBag = {[it.id]:1}, emptyInv = {}, noParts = {};
const zeroWallet = {sol:0,pl:0};
assert.equal(G.craftAndEquip(it.id,emptyInv,noParts,zeroWallet,completeBag).ok,true);
assert.equal(completeBag[it.id],0);
assert.equal(zeroWallet.sol,0);
const need = G.craftRequirements(it.id,{}, {}, zeroWallet, {[it.id]:1});
assert.equal(need.ready,true);
assert.equal(need.complete,true);
const specific = {};
for (const part of recipe.parts) specific[part.materials[0].id]=part.materials[0].count;
const preciseWallet={...CRAFT(it.t)}, preciseParts={};
assert.equal(G.craftAndEquip(it.id,specific,preciseParts,preciseWallet).ok,true);
assert.equal(specific[it.id]||0,0);
for (const part of recipe.parts) assert.equal(specific[part.materials[0].id],0);
console.log('E3/GE1 legacy, distinct components, direct equip and source index: PASS (' + cases + ' items)');
