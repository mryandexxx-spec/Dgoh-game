// ARCH-02C-B6b: fail-closed hero upgrades and equipment/craft settlement.
// Mandatory on actual bundled PWA and independent standalone HTML artifact.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const KEY = 'dune-goh-v1', BACKUP = KEY + '.backup';
const fixture = JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'), 'utf8')));
const passed = [];
function pass(id, message) { passed.push(id); console.log('  ' + id + ' ' + message); }
class Locks {
  constructor() { this.held = false; }
  request(name, opts, callback) {
    assert.equal(name, KEY + '.writer');
    assert.equal(opts.mode, 'exclusive'); assert.equal(opts.ifAvailable, true);
    if (this.held) return Promise.resolve().then(() => callback(null));
    this.held = true;
    return Promise.resolve().then(() => callback({ name, mode: 'exclusive' }))
      .finally(() => { this.held = false; });
  }
}
async function boot(raw = fixture) {
  const listeners = {}, overlay = { innerHTML: '' }, overlay2 = { innerHTML: '' }, slider = { value: '12' };
  const g = loadGame(html, { seed: 99, now: Date.UTC(2026, 10, 2, 9),
    onQuerySelector: s => s === '#overlay' ? overlay : s === '#overlay2' ? overlay2 :
      s === '#lvlr' ? slider : null,
    onDocumentListener: (type, fn) => { (listeners[type] ??= []).push(fn); }
  });
  g.store.set(KEY, raw); g.ctx.navigator = { locks: new Locks() };
  assert.equal((await g.run('start({})')).status, 'started');
  assert.equal(g.run('loadSave.writer.state().status'), 'owned');
  g.listeners = listeners; g.overlay = overlay; g.overlay2 = overlay2; g.slider = slider;
  return g;
}
const disk = g => JSON.parse(g.store.get(KEY));
const ram = g => JSON.parse(g.run('JSON.stringify(S)'));
const blocked = g => g.run('start.writerLifecycle().blocked');
function click(g, name, value = 'paul') {
  const button = { tagName: 'BUTTON', dataset: { [name]: String(value) } };
  const event = { target: { closest: selector => selector === 'button, [data-fxu], .unit.tgt, .detail' ? button : null },
    preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
  for (const fn of g.listeners.click || []) fn(event);
}
function spy(g, fault) {
  const original = g.ctx.localStorage.setItem, keys = [];
  g.ctx.localStorage.setItem = (key, value) => {
    keys.push(key);
    if (fault) fault(key, value, original);
    else original(key, value);
  };
  return keys;
}
function verified(g, prior, keys) {
  assert.equal(keys.filter(key => key === KEY).length, 1);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw, prior);
  assert.deepEqual(disk(g), ram(g));
}
function quota(g) {
  spy(g, (key, value, write) => {
    if (key === BACKUP) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    write(key, value);
  });
}
function money(g, level = 80) {
  g.run(`S.solari=100000000;S.folio=100000;S.seal=100000;S.wol=100000;
    S.plast=1000000;S.ix_plate=100000;S.acc.lvl=${level};
    prog('paul').stars=7;prog('paul').lvl=5;persist()`);
}
function release(g) { g.run('loadSave.writer.release()'); }

// B617: a skill debit, new level and daily quest progress are indivisible.
{
  const g = await boot(); money(g, 20);
  g.run("prog('paul').sk.basic=1;persist()");
  const old = ram(g), q = g.run('dly().c.skill || 0'), before = g.store.get(KEY), writes = spy(g);
  click(g, 'skup', 'paul:basic');
  assert.equal(disk(g).roster.paul.sk.basic, 2);
  assert.equal(disk(g).solari, old.solari - g.run('skCost(2).sol'));
  assert.equal(disk(g).folio, old.folio - g.run('skCost(2).folio'));
  assert.equal(g.run('dly().c.skill || 0'), q + 1);
  verified(g, before, writes);
  pass('B617', 'skill price, level and quest progress share one checkpoint'); release(g);
}
// B618: quota cannot create an unsaved skill or daily quest step.
{
  const g = await boot(); money(g, 20);
  const before = g.store.get(KEY), old = ram(g);
  quota(g); click(g, 'skup', 'paul:basic');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B618', 'skill backup quota restores money, levels and quest');
}
// B619: skill cap/locked input cannot spend or write a save.
{
  const g = await boot(); money(g, 20);
  g.run("prog('paul').sk.basic=skMax(CH.paul,'basic');persist()");
  const before = g.store.get(KEY), writes = spy(g);
  click(g, 'skup', 'paul:basic'); click(g, 'skup', 'paul:invalid');
  assert.equal(g.store.get(KEY), before); assert.equal(writes.length, 0);
  pass('B619', 'capped/forged skill action makes zero transactions'); release(g);
}
// B620: level slider advances hero and daily quest at exact committed price.
{
  const g = await boot(); money(g);
  const old = ram(g), q = g.run('dly().c.lvl || 0'), prior = g.store.get(KEY), keys = spy(g);
  click(g, 'lvlto', 'paul');
  assert.equal(disk(g).roster.paul.lvl, 12);
  assert.equal(disk(g).solari, old.solari - g.run('lvlCost(5,12)'));
  assert.equal(g.run('dly().c.lvl || 0'), q + 7);
  verified(g, prior, keys);
  pass('B620', 'slider-level debit and seven quest steps settle together'); release(g);
}
// B621: level-five button spends per-step prices and writes once.
{
  const g = await boot(); money(g);
  const old = ram(g), prior = g.store.get(KEY), keys = spy(g);
  click(g, 'lvl5', 'paul');
  assert.equal(disk(g).roster.paul.lvl, 10);
  assert.equal(disk(g).solari, old.solari - g.run('lvlCost(5,10)'));
  verified(g, prior, keys);
  pass('B621', 'five-level purchase is one atomic batch, not five writes'); release(g);
}
// B622: a failed level write has no unsaved advancement or celebration.
{
  const g = await boot(); money(g);
  const old = ram(g), prior = g.store.get(KEY), celebrated = g.run('CELEB.length');
  quota(g); click(g, 'lvlto', 'paul');
  assert.equal(g.store.get(KEY), prior); assert.deepEqual(ram(g), old);
  assert.equal(g.run('CELEB.length'), celebrated); assert.equal(blocked(g), true);
  pass('B622', 'failed level transaction cannot announce upgrade');
}
// B623: stars consume shards/solari in the same durable record.
{
  const g = await boot(); money(g);
  g.run("prog('paul').stars=3;prog('paul').shards=1000;persist()");
  const old = ram(g), price = g.run('STAR_COST(3)'), need = g.run("nextShards(prog('paul'))");
  const prior = g.store.get(KEY), keys = spy(g);
  click(g, 'star', 'paul');
  assert.equal(disk(g).roster.paul.stars, 4);
  assert.equal(disk(g).roster.paul.shards, old.roster.paul.shards - need);
  assert.equal(disk(g).solari, old.solari - price);
  verified(g, prior, keys);
  pass('B623', 'star shards, cash and level are checkpointed together'); release(g);
}
// B624: insufficient shards never spend money or start a transaction.
{
  const g = await boot(); money(g);
  g.run("prog('paul').stars=3;prog('paul').shards=0;persist()");
  const old = g.store.get(KEY), keys = spy(g);
  click(g, 'star', 'paul');
  assert.equal(g.store.get(KEY), old); assert.equal(keys.length, 0);
  pass('B624', 'insufficient star shards refuse a stale action'); release(g);
}
// B625: write-then-throw star upgrade is durable-but-unacknowledged.
{
  const g = await boot(); money(g);
  g.run("prog('paul').stars=3;prog('paul').shards=1000;persist()");
  const old = ram(g), prior = g.store.get(KEY), celebrated = g.run('CELEB.length');
  let threw = false;
  spy(g, (key, value, write) => {
    write(key, value);
    if (key === KEY && !threw) { threw = true; throw Object.assign(new Error('after primary'), { name: 'QuotaExceededError' }); }
  });
  click(g, 'star', 'paul');
  assert.equal(threw, true); assert.equal(blocked(g), true);
  assert.notEqual(g.store.get(KEY), prior); assert.deepEqual(ram(g), old);
  assert.equal(g.run('CELEB.length'), celebrated);
  const reopened = await boot(g.store.get(KEY));
  assert.equal(disk(reopened).roster.paul.stars, 4);
  pass('B625', 'ambiguous star write survives reboot without false celebration'); release(reopened);
}
// B626: legacy direct gear rank purchase now uses one verified debit.
{
  const g = await boot(); money(g);
  g.run("prog('paul').gear=2;persist()");
  const old = ram(g), cost = g.run('GEAR_COST(2)'), prior = g.store.get(KEY), keys = spy(g);
  click(g, 'gear', 'paul');
  assert.equal(disk(g).roster.paul.gear, 3);
  assert.equal(disk(g).solari, old.solari - cost.sol);
  assert.equal(disk(g).plast, old.plast - cost.pl);
  verified(g, prior, keys);
  pass('B626', 'direct gear rank purchase commits both currencies and rank'); release(g);
}
// B627: full equipment rank-up consumes solari and resets all six slots.
{
  const g = await boot(); money(g);
  g.run("prog('paul').gear=2;prog('paul').eq=[true,true,true,true,true,true];persist()");
  const old = ram(g), cost = g.run('GEAR_UP_SOL(2)'), prior = g.store.get(KEY), keys = spy(g);
  click(g, 'gup', 'paul');
  assert.equal(disk(g).roster.paul.gear, 3);
  assert.deepEqual(disk(g).roster.paul.eq, [false,false,false,false,false,false]);
  assert.equal(disk(g).solari, old.solari - cost);
  verified(g, prior, keys);
  pass('B627', 'equipped gear rank-up debits and resets equipment in one save'); release(g);
}
// B628: relic levels spend every required material with one verified commit.
{
  const g = await boot(); money(g);
  g.run("prog('paul').gear=MAX_GEAR;prog('paul').eq=[true,true,true,true,true,true];" +
    "for(const [key,qty] of Object.entries(MEM_COSTS[1]))S[key==='sol'?'solari':key]=Math.max(10000000,qty);persist()");
  const old = ram(g), cost = g.run('MEM_COSTS[1]'), prior = g.store.get(KEY), keys = spy(g);
  click(g, 'relic', 'paul');
  assert.equal(disk(g).roster.paul.relic, 1);
  for (const [key, qty] of Object.entries(cost)) {
    const field = key === 'sol' ? 'solari' : key;
    assert.equal(disk(g)[field], old[field] - qty);
  }
  verified(g, prior, keys);
  pass('B628', 'relic materials, currency and new level share verified checkpoint'); release(g);
}
// B629: relic quota leaves no memory level or queued visual celebration.
{
  const g = await boot(); money(g);
  g.run("prog('paul').gear=MAX_GEAR;prog('paul').eq=[true,true,true,true,true,true];" +
    "for(const [key,qty] of Object.entries(MEM_COSTS[1]))S[key==='sol'?'solari':key]=Math.max(10000000,qty);persist()");
  const old = ram(g), prior = g.store.get(KEY), visual = g.run('CELEB.length');
  quota(g); click(g, 'relic', 'paul');
  assert.deepEqual(ram(g), old); assert.equal(g.store.get(KEY), prior);
  assert.equal(g.run('CELEB.length'), visual); assert.equal(blocked(g), true);
  pass('B629', 'failed relic backup never charges or plays upgrade celebration');
}
// B630: ultimate unlock spends exactly one Water of Life, not twice on replay.
{
  const g = await boot(); money(g);
  g.run("prog('paul').gl=false;persist()");
  const old = ram(g), prior = g.store.get(KEY), keys = spy(g);
  click(g, 'glopen', 'paul');
  assert.equal(disk(g).roster.paul.gl, true);
  assert.equal(disk(g).wol, old.wol - 1);
  verified(g, prior, keys);
  const after = g.store.get(KEY), repeated = spy(g);
  click(g, 'glopen', 'paul');
  assert.equal(g.store.get(KEY), after); assert.equal(repeated.length, 0);
  pass('B630', 'ultimate unlock is one verified payment and cannot repay on replay'); release(g);
}
function prepareCraft(g, tier = 2) {
  return g.run(`(function(){
    const p=prog('paul');p.stars=7;p.gear=${tier};p.eq=[false,false,false,false,false,false];
    S.gearOwned={};S.gearParts={};S.inv={};
    const item=slotState('paul',0).it,recipe=recipeFor(item.id);
    if(recipe.parts){for(const part of recipe.parts)S.inv[part.materials[0].id]=part.materials[0].count;}
    else S.inv[item.id]=recipe.materials[0].count;
    persist();return {item:item.id,recipe};
  })()`);
}
// B631: crafting a full item includes parts/cash/equip + quest in one save.
{
  const g = await boot(); money(g, 20);
  const { item, recipe } = prepareCraft(g);
  g.run("itemCtx={cid:'paul',k:0,partId:null}");
  const old = ram(g), q = g.run('dly().c.craft || 0'), prior = g.store.get(KEY), keys = spy(g);
  click(g, 'craft', '1');
  assert.equal(disk(g).roster.paul.eq[0], true);
  assert.equal(disk(g).solari, old.solari - recipe.cost.sol);
  assert.equal(g.run('dly().c.craft || 0'), q + 1);
  if (!recipe.parts) assert.equal(disk(g).inv[item], 0);
  verified(g, prior, keys);
  pass('B631', 'gear crafting atomically consumes recipe and increments quest'); release(g);
}
// B632: failed crafting backup retains mats/currency and does not equip.
{
  const g = await boot(); money(g, 20); prepareCraft(g);
  g.run("itemCtx={cid:'paul',k:0,partId:null}");
  const old = ram(g), prior = g.store.get(KEY);
  quota(g); click(g, 'craft', '1');
  assert.deepEqual(ram(g), old); assert.equal(g.store.get(KEY), prior);
  assert.equal(blocked(g), true);
  pass('B632', 'failed gear crafting cannot consume fragments or award equip');
}
// B633: building an individual high-tier part uses one confirmed transaction.
{
  const g = await boot(); money(g); const { recipe } = prepareCraft(g, 6);
  assert.ok(recipe.parts?.length);
  const part = recipe.parts[0];
  g.run("itemCtx={cid:'paul',k:0,partId:" + JSON.stringify(part.id) + '}');
  const old = ram(g), prior = g.store.get(KEY), keys = spy(g);
  click(g, 'buildpart', part.id);
  assert.equal(disk(g).gearParts[part.id], (old.gearParts[part.id] || 0) + 1);
  assert.equal(disk(g).inv[part.materials[0].id], 0);
  assert.equal(disk(g).solari, old.solari - part.cost.sol);
  verified(g, prior, keys);
  pass('B633', 'individual craft part has verified material and cost debit'); release(g);
}
// B634: one-button craft-all never commits a partial multi-slot inventory.
{
  const g = await boot(); money(g, 20);
  const item = g.run("(function(){const p=prog('paul');p.gear=2;p.eq=[false,false,false,false,false,false];" +
    "S.inv={};S.gearParts={};S.gearOwned={};const id=slotState('paul',0).it.id;" +
    "S.gearOwned[id]=1;persist();return id})()");
  const expected = g.run("craftAllPlan('paul').length");
  assert.ok(expected >= 1, item);
  const prior = g.store.get(KEY), old = ram(g), q = g.run('dly().c.craft || 0'), keys = spy(g);
  click(g, 'craftall', 'paul');
  assert.equal(disk(g).roster.paul.eq.filter(Boolean).length, expected);
  assert.equal(g.run('dly().c.craft || 0'), q + expected);
  assert.equal(disk(g).gearOwned[item], old.gearOwned[item] - 1);
  verified(g, prior, keys);
  pass('B634', 'craft-all stages all ready slots, money and quest in one commit'); release(g);
}
// B635: craft-all failure rolls back all slots and ephemeral success UI.
{
  const g = await boot(); money(g, 20);
  g.run("(function(){const p=prog('paul');p.gear=2;p.eq=[false,false,false,false,false,false];" +
    "S.inv={};S.gearParts={};S.gearOwned={[slotState('paul',0).it.id]:1};persist()})()");
  const old = ram(g), prior = g.store.get(KEY);
  quota(g); click(g, 'craftall', 'paul');
  assert.equal(g.store.get(KEY), prior); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B635', 'craft-all quota cannot leave half-equipped heroes');
}
// B636: a released writer lease never reaches an unchecked upgrade handler.
{
  const g = await boot(); money(g, 20);
  g.run("prog('paul').stars=3;prog('paul').shards=1000;persist()");
  const before = g.store.get(KEY), old = ram(g);
  release(g); const writes = spy(g);
  click(g, 'skup', 'paul:basic'); click(g, 'lvl5', 'paul');
  click(g, 'star', 'paul'); click(g, 'glopen', 'paul');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(writes.length, 0); assert.equal(blocked(g), true);
  pass('B636', 'retired lease blocks hero upgrades without legacy fallback');
}
assert.equal(passed.length, 20);
console.log(`ARCH-02C-B6b ${passed.length} verified upgrade/craft scenarios PASS: ${html}`);
