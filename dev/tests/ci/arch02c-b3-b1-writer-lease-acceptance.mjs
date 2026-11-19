// ARCH-02C-B3-B1a: opt-in cooperative writer lease proof on shipped-style
// PWA and HTML. This is NOT safety proof for old uncoupled cached PWA clients,
// legacy persist(), real Safari, BFCache, or individual B4-B6 transactions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const KEY = 'dune-goh-v1', BACKUP = KEY + '.backup';
const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/saves/01-legacy-v1.json');
const old = JSON.stringify(JSON.parse(fs.readFileSync(fixture, 'utf8')));
const value = raw => JSON.parse(raw).solari;
const draft = (raw, add) => ({ ...JSON.parse(raw), solari: value(raw) + add });
const seen = [];
function pass(id, message, unsafe = false) {
  seen.push(id);
  console.log('  ' + id + (unsafe ? ' [UNSAFE UNCOOPERATIVE] ' :
    ' [COOPERATIVE PROOF] ') + message);
}
class Locks {
  constructor() { this.busy = false; this.reject = false; this.calls = 0; }
  request(name, options, callback) {
    this.calls++;
    assert.equal(name, KEY + '.writer');
    assert.equal(options.mode, 'exclusive');
    assert.equal(options.ifAvailable, true);
    if (this.reject) return Promise.reject(new Error('denied locks'));
    if (this.busy) return Promise.resolve().then(() => callback(null));
    this.busy = true;
    return Promise.resolve().then(() => callback({ name, mode: 'exclusive' }))
      .finally(() => { this.busy = false; });
  }
}
function origin(saved = old) {
  const store = new Map(saved === null ? [] : [[KEY, saved]]), locks = new Locks();
  function tab(withLocks = true) {
    const g = loadGame(html, {seed: 72});
    g.ctx.localStorage.getItem = k => store.has(k) ? store.get(k) : null;
    g.ctx.localStorage.setItem = (k, v) => { store.set(k, String(v)); };
    g.ctx.localStorage.removeItem = k => { store.delete(k); };
    g.ctx.localStorage.clear = () => { store.clear(); };
    g.ctx.navigator = withLocks ? { locks } : {};
    return {
      g,
      acquire: () => g.run('loadSave.writer.acquire()'),
      state: () => g.run('loadSave.writer.state()'),
      check: () => g.run('loadSave.writer.check()'),
      release: () => g.run('loadSave.writer.release()'),
      commit(expectedRaw, candidate) {
        g.ctx.__candidate = {expectedRaw, candidate};
        try { return g.run('loadSave.writer.commit(__candidate)'); }
        finally { delete g.ctx.__candidate; }
      },
    };
  }
  return {store, locks, tab};
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

// L01: native API missing must fail closed in the opt-in writer path.
{
  const o = origin(), t = o.tab(false), before = o.store.get(KEY);
  assert.equal((await t.acquire()).status, 'unsupported');
  assert.equal(t.commit(before, draft(before, 7)).status, 'not-owner');
  assert.equal(o.store.get(KEY), before);
  pass('L01', 'unsupported native locks refuses opt-in commit');
}
// L02: current owner holds exclusive lock until explicit release.
{
  const o = origin(), a = o.tab(), b = o.tab();
  assert.equal((await a.acquire()).status, 'acquired');
  assert.equal(a.state().status, 'owned');
  assert.equal(o.locks.busy, true);
  assert.equal((await b.acquire()).status, 'busy');
  assert.equal(a.release().status, 'released');
  await flush();
  assert.equal(o.locks.busy, false);
  assert.equal((await b.acquire()).status, 'acquired');
  b.release(); await flush();
  pass('L02', 'cooperative second tab cannot own lock concurrently');
}
// L03: every owned commit retains B1 verified backup and updates lease base;
// a later writer sees new primary, not old S/expectedRaw.
{
  const o = origin(), a = o.tab(), b = o.tab(), prior = o.store.get(KEY);
  assert.equal((await a.acquire()).ok, true);
  const result = a.commit(prior, draft(prior, 100));
  assert.equal(result.ok, true);
  assert.equal(a.state().raw, result.raw);
  assert.equal(JSON.parse(o.store.get(BACKUP)).raw, prior);
  assert.equal((await b.acquire()).status, 'busy');
  assert.equal(b.commit(prior, draft(prior, 10)).status, 'not-owner');
  a.release(); await flush();
  assert.equal((await b.acquire()).status, 'acquired');
  assert.equal(b.commit(prior, draft(prior, 10)).status, 'conflict');
  const newer = o.store.get(KEY);
  assert.equal(b.commit(newer, draft(newer, 10)).ok, true);
  assert.equal(value(o.store.get(KEY)), value(prior) + 110);
  b.release(); await flush();
  pass('L03', 'two sequential owners cannot lose first confirmed +100');
}
// L04: duplicate acquisition is rejected, not a second nested native lock.
{
  const o = origin(), a = o.tab();
  const start = a.acquire(), second = await a.acquire();
  assert.equal(second.status, 'acquiring');
  assert.equal(o.locks.calls, 1);
  assert.equal((await start).status, 'acquired');
  assert.equal((await a.acquire()).status, 'already-owner');
  a.release(); await flush();
  pass('L04', 'pending and reentrant lock acquisition cannot fork ownership');
}
// L05: old bypassing tab changed storage while the coordinator owned lease.
// It is detected and further opted-in commits stop without overwriting it.
{
  const o = origin(), a = o.tab(), oldTab = o.tab(), prior = o.store.get(KEY);
  assert.equal((await a.acquire()).ok, true);
  oldTab.g.run('set_S(loadSave())');
  assert.equal(oldTab.g.run('S.solari += 3; persist0().ok'), true);
  assert.equal(a.check().status, 'stale');
  assert.equal(a.commit(prior, draft(prior, 100)).status, 'stale');
  assert.equal(value(o.store.get(KEY)), value(prior) + 3);
  a.release(); await flush();
  pass('L05', 'outside legacy writer detected but NOT prevented', true);
}
// L06: bad backup preflight blocks lease and leaves primary intact.
{
  const o = origin(), a = o.tab(), prior = o.store.get(KEY);
  o.store.set(BACKUP, '{BROKEN');
  assert.equal((await a.acquire()).status, 'backup-corrupt');
  await flush();
  assert.equal(o.locks.busy, false);
  assert.equal(o.store.get(KEY), prior);
  assert.equal(a.commit(prior, draft(prior, 1)).status, 'not-owner');
  pass('L06', 'invalid backup cannot silently enter writable mode');
}
// L07: backup quota failure cannot change primary while locked.
{
  const o = origin(), a = o.tab(), prior = o.store.get(KEY);
  assert.equal((await a.acquire()).ok, true);
  const original = a.g.ctx.localStorage.setItem;
  a.g.ctx.localStorage.setItem = (k, v) => {
    if (k === BACKUP) throw Object.assign(new Error('injected'), {name:'QuotaExceededError'});
    return original(k, v);
  };
  const result = a.commit(prior, draft(prior, 6));
  assert.equal(result.ok, false);
  assert.equal(result.status, 'quota');
  assert.equal(o.store.get(KEY), prior);
  assert.equal(a.state().status, 'owned');
  a.release(); await flush();
  pass('L07', 'quota before primary preserves confirmed old bytes');
}
// L08: a write-then-throw is ambiguous; no retry, no success, lease stale.
{
  const o = origin(), a = o.tab(), prior = o.store.get(KEY);
  assert.equal((await a.acquire()).ok, true);
  const original = a.g.ctx.localStorage.setItem;
  a.g.ctx.localStorage.setItem = (k,v) => {
    original(k,v);
    if (k === KEY) throw Object.assign(new Error('injected'), {name:'SecurityError'});
  };
  const result = a.commit(prior, draft(prior, 30));
  assert.equal(result.ok, false);
  assert.equal(result.status, 'uncertain');
  assert.equal(a.state().status, 'stale');
  assert.equal(a.commit(prior, draft(prior, 30)).status, 'stale');
  assert.equal(value(o.store.get(KEY)), value(prior) + 30);
  a.release(); await flush();
  pass('L08', 'uncertain write blocks duplicate retry without success');
}
// L09: unavailable primary read cannot acquire writer authority.
{
  const o = origin(), a = o.tab(), before = o.store.get(KEY);
  a.g.ctx.localStorage.getItem = () => {
    throw Object.assign(new Error('denied'), {name:'SecurityError'});
  };
  assert.equal((await a.acquire()).status, 'unavailable');
  await flush();
  assert.equal(o.locks.busy, false);
  assert.equal(o.store.get(KEY), before);
  pass('L09', 'storage read failure releases lock without writes');
}
// L10: rejected native manager yields unavailable, never owner.
{
  const o = origin(), a = o.tab();
  o.locks.reject = true;
  assert.equal((await a.acquire()).status, 'unavailable');
  assert.equal(a.state().status, 'unavailable');
  assert.equal(o.locks.busy, false);
  pass('L10', 'native lock rejection fails closed');
}
// L11: release during pending native acquisition cancels late callback.
{
  const o = origin(), a = o.tab(), first = a.acquire();
  assert.equal(a.state().status, 'acquiring');
  a.release();
  assert.equal((await first).status, 'cancelled');
  await flush();
  assert.equal(o.locks.busy, false);
  assert.equal(a.state().status, 'cancelled');
  pass('L11', 'pending acquisition cancelled without late ownership');
}
// L12: empty verified origin permits only an owned explicit initial commit.
{
  const o = origin(null), a = o.tab();
  assert.equal((await a.acquire()).status, 'acquired');
  assert.equal(o.store.has(KEY), false);
  assert.equal(a.commit(null, JSON.parse(old)).ok, true);
  assert.equal(o.store.get(KEY), old);
  a.release(); await flush();
  pass('L12', 'new-v1 first write needs explicit opt-in writer');
}
// L13: an existing valid backup plus missing primary cannot be treated as new.
{
  const o = origin(), a = o.tab(), base = o.store.get(KEY);
  assert.equal((await a.acquire()).ok, true);
  assert.equal(a.commit(base, draft(base, 9)).ok, true);
  a.release(); await flush();
  o.store.delete(KEY);
  const b = o.tab();
  assert.equal((await b.acquire()).status, 'recovery-required');
  await flush();
  assert.equal(o.store.has(KEY), false);
  pass('L13', 'missing primary with backup blocks silent new-account overwrite');
}
// L14: plain legacy persist remains an explicit UNSAFE bypass until B3-B1b.
{
  const o = origin(), a = o.tab(false), oldValue = o.store.get(KEY);
  a.g.run('set_S(loadSave())');
  assert.equal(a.g.run('S.solari += 2; persist0().ok'), true);
  assert.equal(value(o.store.get(KEY)), value(oldValue)+2);
  pass('L14', 'legacy persist still bypasses coordination in B1a', true);
}
assert.deepEqual(seen, Array.from({length:14}, (_,i) => 'L'+String(i+1).padStart(2,'0')));
console.log('[ARCH-02C-B3-B1a] ' + seen.length + '/14 opt-in lease checks complete; ' +
 'NOT a claim of production multi-tab safety.');
