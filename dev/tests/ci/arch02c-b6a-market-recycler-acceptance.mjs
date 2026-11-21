// ARCH-02C-B6a: every market/refill/recycler debit is a verified snapshot.
// Execute against actual compiled PWA AND standalone HTML (no source mocks).
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
function pass(id, description) { passed.push(id); console.log('  ' + id + ' ' + description); }
class Locks {
  constructor() { this.held = false; }
  request(name, options, callback) {
    assert.equal(name, KEY + '.writer');
    assert.equal(options.mode, 'exclusive');
    assert.equal(options.ifAvailable, true);
    if (this.held) return Promise.resolve().then(() => callback(null));
    this.held = true;
    return Promise.resolve().then(() => callback({ name, mode: 'exclusive' }))
      .finally(() => { this.held = false; });
  }
}
async function boot(raw = fixture) {
  const listeners = {}, overlay = { innerHTML: '' }, overlay2 = { innerHTML: '' };
  const g = loadGame(html, { seed: 71, now: Date.UTC(2026, 10, 2, 9),
    onQuerySelector: s => s === '#overlay' ? overlay : s === '#overlay2' ? overlay2 : null,
    onDocumentListener: (type, fn) => { (listeners[type] ??= []).push(fn); }
  });
  g.store.set(KEY, raw);
  g.ctx.navigator = { locks: new Locks() };
  assert.equal((await g.run('start({})')).status, 'started');
  assert.equal(g.run('loadSave.writer.state().status'), 'owned');
  g.listeners = listeners; g.overlay = overlay; g.overlay2 = overlay2;
  return g;
}
const disk = g => JSON.parse(g.store.get(KEY));
const ram = g => JSON.parse(g.run('JSON.stringify(S)'));
const blocked = g => g.run('start.writerLifecycle().blocked');
function click(g, name, value = '1') {
  const button = { tagName: 'BUTTON', dataset: { [name]: String(value) } };
  const event = { target: { closest: selector => selector === 'button, [data-fxu], .unit.tgt, .detail' ? button : null },
    preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
  for (const fn of g.listeners.click || []) fn(event);
}
function spy(g, injection = null) {
  const original = g.ctx.localStorage.setItem, calls = [];
  g.ctx.localStorage.setItem = (key, value) => {
    calls.push(key);
    if (injection) injection(key, value, original);
    else original(key, value);
  };
  return calls;
}
function assertCommitted(g, before, calls) {
  assert.equal(calls.filter(key => key === KEY).length, 1, 'exactly one primary save write');
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw, before, 'verified prior backup');
  assert.deepEqual(disk(g), ram(g), 'committed and active saves agree');
}
function money(g) {
  g.run('S.solari=1000000;S.cry=5000;S.teeth=5000;S.wring=5000;' +
    'S.buys={d:todayKey(),n:{}};persist()');
}
function failBackup(g) {
  spy(g, (key, value, write) => {
    if (key === BACKUP) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    write(key, value);
  });
}
function release(g) { g.run('loadSave.writer.release()'); }

// B601: market payment, stock and quest counter form one verified commit.
{
  const g = await boot(); money(g);
  const before = g.store.get(KEY), old = ram(g), q = g.run("dly().c.shop || 0"), writes = spy(g);
  click(g, 'buy', 'post:pl');
  const next = disk(g);
  assert.equal(next.solari, old.solari - 6000);
  assert.equal(next.plast, old.plast + 5);
  assert.equal(next.buys.n['post:pl'], 1);
  assert.equal(g.run('dly().c.shop || 0'), q + 1);
  assertCommitted(g, before, writes);
  pass('B601', 'market payment, receipt, day stock and quest share one checkpoint'); release(g);
}
// B602: limit replay never silently purchases a fourth daily item.
{
  const g = await boot(); money(g);
  for (let i = 0; i < 3; i++) click(g, 'buy', 'post:pl');
  const before = g.store.get(KEY), writes = spy(g);
  click(g, 'buy', 'post:pl');
  assert.equal(g.store.get(KEY), before); assert.equal(writes.length, 0);
  assert.equal(disk(g).buys.n['post:pl'], 3);
  pass('B602', 'sold-out daily market offer cannot overcharge or grant again'); release(g);
}
// B603: live shop rendering may NOT reset a saved old-day buy marker.
{
  const g = await boot(); money(g);
  g.run("S.buys={d:'Sun Nov 01 2026',n:{'post:pl':3}};persist()");
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  assert.equal(g.run("shopLeft(findShopItem('post:pl'))"), 3);
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(writes.length, 0);
  click(g, 'buy', 'post:pl');
  assert.equal(disk(g).buys.n['post:pl'], 1);
  assert.equal(disk(g).buys.d, g.run('todayKey()'));
  pass('B603', 'viewing old ledger is read-only; next purchase rolls day atomically'); release(g);
}
// B604: shard conversion UI hooks must not fire before successful IO.
{
  const g = await boot(); money(g);
  g.run("S.roster.paul.stars=7;persist();globalThis.__shardHook=0;" +
    "giveRewards.presentationHooks.shardConv=()=>{globalThis.__shardHook++}");
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  click(g, 'buy', 'sietch:sh:paul');
  assert.equal(g.run('__shardHook'), 1);
  assert.equal(disk(g).wring, old.wring + 50);
  assert.equal(disk(g).teeth, old.teeth - 60);
  assertCommitted(g, before, writes);
  pass('B604', 'market shard conversion emits exactly once after verified debit'); release(g);
}
// B605: quota before primary preserves shard wallet and defers hooks.
{
  const g = await boot(); money(g);
  g.run("S.roster.paul.stars=7;persist();globalThis.__shardHook=0;" +
    "giveRewards.presentationHooks.shardConv=()=>{globalThis.__shardHook++}");
  const before = g.store.get(KEY), old = ram(g);
  failBackup(g); click(g, 'buy', 'sietch:sh:paul');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(g.run('__shardHook'), 0); assert.equal(blocked(g), true);
  pass('B605', 'failed market backup rolls back payment and shard presentation');
}
// B606: primary write-then-throw is uncertain and never auto-replayed.
{
  const g = await boot(); money(g);
  const old = ram(g); let hit = false;
  spy(g, (key, value, write) => {
    write(key, value);
    if (key === KEY && !hit) { hit = true; throw Object.assign(new Error('after primary'), { name: 'QuotaExceededError' }); }
  });
  click(g, 'buy', 'post:pl');
  assert.equal(hit, true); assert.equal(blocked(g), true);
  assert.deepEqual(ram(g), old); assert.equal(disk(g).buys.n['post:pl'], 1);
  const re = await boot(g.store.get(KEY));
  assert.equal(disk(re).buys.n['post:pl'], 1);
  pass('B606', 'ambiguous shop write retains committed stock on cold boot'); release(re);
}
// B607: fragment shop token, inventory and daily quest settle together.
{
  const g = await boot(); money(g);
  const id = g.run("Object.values(ITEMS).find(x=>x.t===6).id");
  const spec = 'frag:' + id + ':core:1', key = 'frag:' + id + ':core';
  const before = g.store.get(KEY), old = ram(g), q = g.run('dly().c.shop || 0'), writes = spy(g);
  click(g, 'fbuy', spec);
  assert.equal(disk(g).inv[key], (old.inv[key] || 0) + 1);
  assert.equal(disk(g).teeth, old.teeth - g.run('SHOP_FRAG[6]'));
  assert.equal(g.run('dly().c.shop || 0'), q + 1);
  assertCommitted(g, before, writes);
  pass('B607', 'fragment purchase includes resource debit, item and quest progress'); release(g);
}
// B608: fragment shop quota failure leaves no resources or quest increments.
{
  const g = await boot(); money(g);
  const id = g.run("Object.values(ITEMS).find(x=>x.t===6).id");
  const before = g.store.get(KEY), old = ram(g);
  failBackup(g); click(g, 'fbuy', 'frag:' + id + ':core:1');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B608', 'failed fragment purchase cannot leak inventory or quest progress');
}
// B609: water refill debit and counter are one snapshot.
{
  const g = await boot(); money(g);
  g.run('S.water=WMAX()-5;S.refills={d:todayKey(),n:0};persist()');
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  click(g, 'refill', '1'); // exact shipped water button token
  assert.equal(disk(g).cry, old.cry - g.run('refillPrice(0)'));
  assert.equal(disk(g).water, old.water + g.run('REFILL_AMT'));
  assert.equal(disk(g).refills.n, 1);
  assertCommitted(g, before, writes);
  pass('B609', 'water refill commits crystals, water, timestamp and counter'); release(g);
}
// B610: candle refill follows its own count but the same commit gate.
{
  const g = await boot(); money(g);
  g.run('S.crefills={d:todayKey(),n:0};persist()');
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  click(g, 'refill', 'candle');
  assert.equal(disk(g).cry, old.cry - g.run('refillPrice(0)'));
  assert.equal(disk(g).candle, old.candle + g.run('CANDLE_REFILL'));
  assert.equal(disk(g).crefills.n, 1);
  assertCommitted(g, before, writes);
  pass('B610', 'candle refill commits escalating counter and charged credit'); release(g);
}
// B611: capped refills cannot charge further; invalid kinds cannot buy water.
{
  const g = await boot(); money(g);
  g.run('S.refills={d:todayKey(),n:REFILL_MAX};persist()');
  const before = g.store.get(KEY), writes = spy(g);
  click(g, 'refill', 'water'); click(g, 'refill', 'unknown');
  assert.equal(g.store.get(KEY), before); assert.equal(writes.length, 0);
  pass('B611', 'refill cap and forged kind refuse payment'); release(g);
}
// B612: backup quota refuses a refill without changing the active account.
{
  const g = await boot(); money(g);
  const before = g.store.get(KEY), old = ram(g);
  failBackup(g); click(g, 'refill', 'candle');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B612', 'refill quota failure cannot acknowledge energy or debit');
}
function prepareRecycler(g) {
  return g.run(`(function(){
    const item=Object.values(ITEMS).find(it=>scrapPoint('ix_plate',it.id)>0);
    if(!item)throw Error('missing recyclable item');
    S.squad=[];S.squadD=[];S.squadC=[];S.raidPick=[];
    const count=Math.ceil(SCRAP.ix_plate.threshold/scrapPoint('ix_plate',item.id));
    S.inv[item.id]=count+5;S.scrapLocks={};S.scrapCarry={};
    persist();return {id:item.id,count};
  })()`);
}
// B613: recycler consumes protected inventory and awards plates once.
{
  const g = await boot(), { id, count } = prepareRecycler(g);
  g.run('basket=' + JSON.stringify([{ id, count }]));
  const expected = g.run("scrapQuote(S,'ix_plate',basket)");
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  click(g, 'ixdo');
  assert.equal(disk(g).inv[id], old.inv[id] - count);
  assert.equal(disk(g).ix_plate, old.ix_plate + expected.output);
  assert.equal(disk(g).scrapCarry.ix_plate, expected.remainder);
  assertCommitted(g, before, writes);
  pass('B613', 'recycler stock, carry and artifact output share one commit'); release(g);
}
// B614: recycler quota preserves both materials and confirmation modal.
{
  const g = await boot(), { id, count } = prepareRecycler(g);
  g.run('basket=' + JSON.stringify([{ id, count }]));
  g.overlay2.innerHTML = '<div>Pending recycler confirmation</div>';
  const before = g.store.get(KEY), old = ram(g);
  failBackup(g); click(g, 'ixdo');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(g.overlay2.innerHTML, '<div>Pending recycler confirmation</div>');
  assert.equal(blocked(g), true);
  pass('B614', 'failed recycler write retains items, carry and unacknowledged modal');
}
// B615: stale basket is revalidated, never grants rewards without materials.
{
  const g = await boot(), { id, count } = prepareRecycler(g);
  g.run('basket=' + JSON.stringify([{ id, count }]) + ';S.inv[' + JSON.stringify(id) + ']=0;persist()');
  const before = g.store.get(KEY), writes = spy(g);
  click(g, 'ixdo');
  assert.equal(g.store.get(KEY), before); assert.equal(writes.length, 0);
  pass('B615', 'stale recycler basket is cancelled against current stock'); release(g);
}
// B616: an expired lease prevents all market and recycler writes.
{
  const g = await boot(); money(g);
  const { id, count } = prepareRecycler(g);
  g.run('basket=' + JSON.stringify([{ id, count }]));
  const before = g.store.get(KEY), old = ram(g);
  release(g); const writes = spy(g);
  click(g, 'buy', 'post:pl'); click(g, 'fbuy', 'frag:' + id + ':core:1');
  click(g, 'refill', 'water'); click(g, 'ixdo');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(writes.length, 0); assert.equal(blocked(g), true);
  pass('B616', 'retired Web Locks lease refuses purchases, refills and recycling');
}
assert.equal(passed.length, 16);
console.log(`ARCH-02C-B6a ${passed.length} verified market/recycler scenarios PASS: ${html}`);
