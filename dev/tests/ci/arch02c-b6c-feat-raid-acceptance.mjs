// ARCH-02C-B6c: one-time feats and raid-session start use verified checkpoint.
// Run against BOTH compiled PWA and standalone HTML artifact.
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
  const listeners = {}, overlay = { innerHTML: '' };
  const g = loadGame(html, { seed: 105, now: Date.UTC(2026, 10, 2, 9),
    onQuerySelector: s => s === '#overlay' ? overlay : null,
    onDocumentListener: (type, fn) => { (listeners[type] ??= []).push(fn); }
  });
  g.store.set(KEY, raw); g.ctx.navigator = { locks: new Locks() };
  assert.equal((await g.run('start({})')).status, 'started');
  assert.equal(g.run('loadSave.writer.state().status'), 'owned');
  g.listeners = listeners;
  return g;
}
const ram = g => JSON.parse(g.run('JSON.stringify(S)'));
const disk = g => JSON.parse(g.store.get(KEY));
const blocked = g => g.run('start.writerLifecycle().blocked');
function click(g, name, value) {
  const button = { tagName: 'BUTTON', dataset: { [name]: String(value) } };
  const event = { target: { closest: selector => selector === 'button, [data-fxu], .unit.tgt, .detail' ? button : null },
    preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
  for (const fn of g.listeners.click || []) fn(event);
}
function spy(g, injection = null) {
  const real = g.ctx.localStorage.setItem, keys = [];
  g.ctx.localStorage.setItem = (key, value) => {
    keys.push(key);
    if (injection) injection(key, value, real);
    else real(key, value);
  };
  return keys;
}
function verified(g, prior, calls) {
  assert.equal(calls.filter(k => k === KEY).length, 1);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw, prior);
  assert.deepEqual(disk(g), ram(g));
}
function quota(g) {
  spy(g, (key, val, write) => {
    if (key === BACKUP) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    write(key, val);
  });
}
function featReadyState(g, claimed = 0, stars = 15) {
  g.run(`(function(){
    S.feats.light=${claimed};const nodes=campNodes('L');
    S.cleared={};for(let i=0;i<${stars}/3;i++)S.cleared[nodes[i]]=3;
    persist();
  })()`);
}
function release(g) { g.run('loadSave.writer.release()'); }

// B637: first milestone pays currency and increments marker exactly once.
{
  const g = await boot(); featReadyState(g);
  const old = ram(g), before = g.store.get(KEY), calls = spy(g);
  click(g, 'featclaim', 'light');
  assert.equal(disk(g).feats.light, 1);
  assert.equal(disk(g).cry, old.cry + 50);
  verified(g, before, calls);
  pass('B637', 'feat tier marker and exact reward settle together'); release(g);
}
// B638: stale repeated claim cannot mint a second reward for the first tier.
{
  const g = await boot(); featReadyState(g);
  click(g, 'featclaim', 'light');
  const saved = g.store.get(KEY), calls = spy(g);
  click(g, 'featclaim', 'light');
  assert.equal(g.store.get(KEY), saved); assert.equal(calls.length, 0);
  pass('B638', 'replayed feat with next threshold unmet makes no save write'); release(g);
}
// B639: rollback on backup quota must preserve feat and resource balances.
{
  const g = await boot(); featReadyState(g);
  const old = ram(g), saved = g.store.get(KEY);
  quota(g); click(g, 'featclaim', 'light');
  assert.equal(g.store.get(KEY), saved); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B639', 'quota-denied feat claim cannot acknowledge entitlement');
}
// B640: SecurityError at primary leaves feat marker and reward untouched.
{
  const g = await boot(); featReadyState(g);
  const old = ram(g), saved = g.store.get(KEY);
  spy(g, (key, val, write) => {
    if (key === KEY) throw Object.assign(new Error('denied'), { name: 'SecurityError' });
    write(key, val);
  });
  click(g, 'featclaim', 'light');
  assert.equal(g.store.get(KEY), saved); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B640', 'primary storage denial does not show or store a feat reward');
}
// B641: after-primary-write uncertainty can be cold-booted safely.
{
  const g = await boot(); featReadyState(g);
  const old = ram(g), saved = g.store.get(KEY); let hit = false;
  spy(g, (key, val, write) => {
    write(key, val);
    if (key === KEY && !hit) { hit = true; throw Object.assign(new Error('after primary'), { name: 'QuotaExceededError' }); }
  });
  click(g, 'featclaim', 'light');
  assert.equal(hit, true); assert.equal(blocked(g), true);
  assert.notEqual(g.store.get(KEY), saved); assert.deepEqual(ram(g), old);
  const re = await boot(g.store.get(KEY)), committed = re.store.get(KEY), calls = spy(re);
  click(re, 'featclaim', 'light');
  assert.equal(re.store.get(KEY), committed); assert.equal(calls.length, 0);
  assert.equal(disk(re).feats.light, 1);
  pass('B641', 'uncertain feat write cannot replay its paid milestone on reboot'); release(re);
}
// B642: third-tier cosmetic unlock and currency reward share one checkpoint.
{
  const g = await boot(); featReadyState(g, 2, 90);
  const before = g.store.get(KEY), old = ram(g), calls = spy(g);
  click(g, 'featclaim', 'light');
  assert.equal(disk(g).feats.light, 3);
  assert.equal(disk(g).unlocks.ava['emb:hawk'], 1);
  assert.equal(disk(g).seal, old.seal + 1);
  assert.equal(disk(g).cry, old.cry + 150);
  verified(g, before, calls);
  pass('B642', 'cosmetic, currency and tier marker commit atomically'); release(g);
}
// B643: quota on a cosmetic tier never unlocks the profile reward.
{
  const g = await boot(); featReadyState(g, 2, 90);
  const old = ram(g), saved = g.store.get(KEY);
  quota(g); click(g, 'featclaim', 'light');
  assert.equal(g.store.get(KEY), saved); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B643', 'failed feat cosmetic transaction preserves profile entitlements');
}
// B644: starting a raid checkpoints initial HP, tier and cleared selection.
{
  const g = await boot();
  g.run("S.raidPick=['paul','jessica'];persist()");
  const before = g.store.get(KEY), calls = spy(g);
  click(g, 'raidstart', '0');
  assert.equal(disk(g).raid.tier, 0);
  assert.equal(disk(g).raid.hp, g.run('RAID_TIERS[0].hp'));
  assert.deepEqual(disk(g).raidPick, []);
  verified(g, before, calls);
  pass('B644', 'raid start HP, tier and selection share one durable checkpoint'); release(g);
}
// B645: a failed raid start cannot destroy previous raid session progress.
{
  const g = await boot();
  g.run("S.raid={tier:0,hp:1234,maxHp:9999,used:['paul'],log:[]};persist()");
  const old = ram(g), saved = g.store.get(KEY);
  quota(g); click(g, 'raidstart', '1');
  assert.equal(g.store.get(KEY), saved); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B645', 'failed raid restart preserves existing committed run');
}
// B646: a dead Web Locks lease denies both one-time claims and raid creation.
{
  const g = await boot(); featReadyState(g);
  const old = ram(g), saved = g.store.get(KEY);
  release(g); const calls = spy(g);
  click(g, 'featclaim', 'light'); click(g, 'raidstart', '0');
  assert.equal(g.store.get(KEY), saved); assert.deepEqual(ram(g), old);
  assert.equal(calls.length, 0); assert.equal(blocked(g), true);
  pass('B646', 'retired writer session cannot mint feats or replace raid state');
}
assert.equal(passed.length, 10);
console.log(`ARCH-02C-B6c ${passed.length} feat/raid scenarios PASS: ${html}`);
