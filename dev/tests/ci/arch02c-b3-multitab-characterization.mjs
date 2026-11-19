// ARCH-02C-B3-A0: deterministic SHARED-ORIGIN multi-tab fault characterization.
// UNSAFE EXPECTATIONS model pre-B3 uncooperative writers ONLY.
// Ordinary production bootstrap now requires native Web Locks.
// Exercises each actual compiled PWA and HTML game through independent VMs.
// No live browser profiles, production keys, or golden snapshots are changed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const KEY = 'dune-goh-v1', BACKUP = KEY + '.backup';
const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/saves');
const legacy = JSON.stringify(JSON.parse(fs.readFileSync(path.join(fixtures, '01-legacy-v1.json'), 'utf8')));
const reports = [];
const mark = (id, label, unsafe = true) => {
  reports.push(id);
  console.log('  ' + id + (unsafe ? ' [UNSAFE CHARACTERIZED] ' : ' [EXISTING GUARD] ') + label);
};
const changed = (raw, amount) => {
  const s = JSON.parse(raw);
  s.solari += amount;
  return s;
};
const amount = raw => JSON.parse(raw).solari;
function origin(raw = legacy) {
  // Each tab receives a separate JS heap and its own game; only the origin's
  // storage map is shared, with deterministic injected interleaving hooks.
  const store = new Map([[KEY, raw]]);
  function tab() {
    const fields = new Map([['#savecode', {value: ''}], ['#overlay2', {innerHTML: ''}],
      ['#overlay2 .acts', {insertAdjacentHTML() {}}]]);
    const g = loadGame(html, {seed: 19, onQuerySelector: selector => fields.get(selector)});
    g.ctx.localStorage.getItem = k => store.has(k) ? store.get(k) : null;
    g.ctx.localStorage.setItem = (k, v) => { store.set(k, String(v)); };
    g.ctx.localStorage.removeItem = k => { store.delete(k); };
    g.ctx.localStorage.clear = () => { store.clear(); };
    return {g, fields};
  }
  return {store, tab};
}
function invoke(t, name, args) {
  t.g.ctx.__b3Arg = args;
  try { return t.g.run('loadSave.checkpoint.' + name + '(__b3Arg)'); }
  finally { delete t.g.ctx.__b3Arg; }
}
const commit = (t, expectedRaw, candidate) =>
  invoke(t, 'commit', {expectedRaw, candidate});
const recover = (t, expectedPrimaryRaw, expectedBackupEnvelope) =>
  invoke(t, 'recover', {expectedPrimaryRaw, expectedBackupEnvelope});
function preview(t, candidate) {
  t.fields.get('#savecode').value = Buffer.from(JSON.stringify(candidate), 'utf8').toString('base64');
  assert.equal(t.g.run('metaClick({saveload:1})'), true);
  assert.match(t.fields.get('#overlay2').innerHTML, /data-saveconfirm/);
}
function confirm(t) { assert.equal(t.g.run('metaClick({saveconfirm:1})'), true); }

// B3-01: sequentially stale expected bytes DO fail closed with existing B1.
{
  const o = origin(), a = o.tab(), b = o.tab(), base = o.store.get(KEY);
  assert.equal(commit(a, base, changed(base, 100)).ok, true);
  const stale = commit(b, base, changed(base, 10));
  assert.equal(stale.ok, false);
  assert.equal(stale.status, 'conflict');
  assert.equal(amount(o.store.get(KEY)), amount(base) + 100);
  mark('B3-01', 'sequential stale checkpoint refuses to overwrite', false);
}
// B3-02: hook B's verified commit *after A's final check but before A's set*.
// Both can return success; B's acknowledged +10 is irretrievably lost.
{
  const o = origin(), a = o.tab(), b = o.tab(), base = o.store.get(KEY);
  const set = a.g.ctx.localStorage.setItem;
  let fired = false, bResult;
  a.g.ctx.localStorage.setItem = (k, v) => {
    if (k === KEY && !fired) {
      fired = true;
      bResult = commit(b, base, changed(base, 10));
    }
    return set(k, v);
  };
  const aResult = commit(a, base, changed(base, 100));
  assert.equal(fired, true);
  assert.equal(bResult.ok, true);
  assert.equal(aResult.ok, true);
  assert.equal(amount(o.store.get(KEY)), amount(base) + 100);
  assert.notEqual(o.store.get(KEY), bResult.raw);
  mark('B3-02', 'two acknowledged checkpoint commits race between check and write');
}
// B3-03: legacy gameplay persist bypasses even a completed verified checkpoint.
{
  const o = origin(), a = o.tab(), b = o.tab(), base = o.store.get(KEY);
  b.g.run('set_S(loadSave())');
  assert.equal(commit(a, base, changed(base, 100)).ok, true);
  assert.equal(b.g.run('S.solari += 10; persist0().ok'), true);
  assert.equal(amount(o.store.get(KEY)), amount(base) + 10);
  mark('B3-03', 'stale legacy persist overwrites successfully committed progress');
}
// B3-04: an import PREVIEW correctly refuses a sequential outsider save.
// This still does not protect against concurrent or subsequent legacy writes.
{
  const o = origin(), a = o.tab(), b = o.tab();
  // Historical uncooperative old-client RAM: never call the new
  // mandatory production start() to simulate a legacy writer.
  a.g.run('set_S(loadSave())'); b.g.run('set_S(loadSave())');
  const expected = o.store.get(KEY), oldS = a.g.run('JSON.stringify(S)');
  preview(a, changed(expected, 100));
  assert.equal(b.g.run('S.solari += 7; persist0().ok'), true);
  const other = o.store.get(KEY);
  confirm(a);
  assert.equal(o.store.get(KEY), other);
  assert.equal(a.g.run('JSON.stringify(S)'), oldS);
  assert.notEqual(other, expected);
  mark('B3-04', 'import rejects sequential changed primary', false);
}
// B3-05: an import may succeed, then a stale gameplay tab writes old RAM.
// The next PWA/HTML reopen sees the overwritten value, not the imported one.
{
  const o = origin(), a = o.tab(), b = o.tab();
  // Historical uncooperative old-client RAM: never call the new
  // mandatory production start() to simulate a legacy writer.
  a.g.run('set_S(loadSave())'); b.g.run('set_S(loadSave())');
  const base = o.store.get(KEY);
  const bSolari = b.g.run('S.solari');
  preview(a, changed(base, 100));
  confirm(a);
  assert.equal(amount(o.store.get(KEY)), amount(base) + 100);
  assert.equal(b.g.run('S.solari += 9; persist0().ok'), true);
  assert.equal(amount(o.store.get(KEY)), bSolari + 9);
  assert.notEqual(amount(o.store.get(KEY)), amount(base) + 100);
  const reopened = o.tab();
  assert.equal(reopened.g.run('loadSave(true).save.solari'), bSolari + 9);
  mark('B3-05', 'confirmed import lost after stale tab persists; cold reopen observes loss');
}
// B3-06: recovery's last check is also non-atomic. A concurrent explicit
// recovery followed by a verified commit can be overwritten by first restorer.
{
  const o = origin(), init = o.tab(), base = o.store.get(KEY);
  assert.equal(commit(init, base, changed(base, 11)).ok, true);
  const envelope = o.store.get(BACKUP), corrupt = '{"v":1,';
  assert.equal(JSON.parse(envelope).raw, base);
  o.store.set(KEY, corrupt); // injected corruption, NOT normal torn setItem
  const a = o.tab(), b = o.tab();
  const set = a.g.ctx.localStorage.setItem;
  let fired = false, bRestore, bCommit;
  a.g.ctx.localStorage.setItem = (k, v) => {
    if (k === KEY && !fired) {
      fired = true;
      bRestore = recover(b, corrupt, envelope);
      bCommit = commit(b, base, changed(base, 60));
    }
    return set(k, v);
  };
  const restored = recover(a, corrupt, envelope);
  assert.equal(fired, true);
  assert.equal(bRestore.ok, true);
  assert.equal(bCommit.ok, true);
  assert.equal(restored.ok, true);
  assert.equal(o.store.get(KEY), base);
  mark('B3-06', 'concurrent recovery overwrites another verified post-recovery commit');
}
// B3-07: an error AFTER another tab's successful commit stays uncertain;
// it cannot be retried blindly and must not be reported as success.
{
  const o = origin(), a = o.tab(), b = o.tab(), base = o.store.get(KEY);
  const error = Object.assign(new Error('injected quota'), {name: 'QuotaExceededError'});
  let fired = false, bResult;
  const set = a.g.ctx.localStorage.setItem;
  a.g.ctx.localStorage.setItem = (k, v) => {
    if (k === KEY && !fired) {
      fired = true;
      bResult = commit(b, base, changed(base, 25));
      throw error;
    }
    return set(k, v);
  };
  const rejected = commit(a, base, changed(base, 70));
  assert.equal(bResult.ok, true);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.status, 'uncertain');
  assert.equal(o.store.get(KEY), bResult.raw);
  mark('B3-07', 'injected primary failure does not falsely acknowledge overwrite', false);
}
// B3-08: no native Web Locks API: old runtime nonetheless keeps writing.
// This is a documented NOT-SAFE fallback that B3 implementation must reverse.
{
  const o = origin(), a = o.tab();
  a.g.ctx.navigator = {}; // unsupported API, not an artificial lock
  a.g.run('set_S(loadSave())');
  const base = o.store.get(KEY);
  assert.equal(a.g.run('typeof navigator.locks'), 'undefined');
  assert.equal(a.g.run('S.solari += 5; persist0().ok'), true);
  assert.equal(amount(o.store.get(KEY)), amount(base) + 5);
  mark('B3-08', 'missing Web Locks leaves legacy writer unprotected');
}
assert.deepEqual(reports, ['B3-01','B3-02','B3-03','B3-04',
  'B3-05','B3-06','B3-07','B3-08']);
console.log('[ARCH-02C-B3-A0] ' + reports.length + '/8 deterministic evidence scenarios COMPLETE. ' +
  'UNSAFE cases are expected baseline failures of the CURRENT design, not fixed behavior.');
