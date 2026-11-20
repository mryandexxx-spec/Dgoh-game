// ARCH-02C-B4-B2: launch only AFTER a byte-verified resource debit.
// Real bundled PWA and artifact, mandatory Web Locks start() and B1 backup.
// Historical B0 C12 (deliberately ungated) remains a separate frozen baseline.
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
function pass(id, what) { passed.push(id); console.log('  ' + id + ' ' + what); }
class Locks {
  constructor() { this.held = false; }
  request(name, options, cb) {
    assert.equal(name, KEY + '.writer');
    assert.equal(options.mode, 'exclusive');
    assert.equal(options.ifAvailable, true);
    if (this.held) return Promise.resolve().then(() => cb(null));
    this.held = true;
    return Promise.resolve().then(() => cb({ name, mode: 'exclusive' }))
      .finally(() => { this.held = false; });
  }
}
async function boot(raw = fixture) {
  const g = loadGame(html, { seed: 41 });
  g.store.set(KEY, raw);
  g.ctx.navigator = { locks: new Locks() };
  const started = await g.run('start({})');
  assert.equal(started.status, 'started');
  assert.equal(g.run('loadSave.writer.state().status'), 'owned');
  return g;
}
const ram = g => JSON.parse(g.run('JSON.stringify(S)'));
const disk = g => JSON.parse(g.store.get(KEY));
const life = g => g.run('start.writerLifecycle()');
function spy(g, onWrite) {
  const writes = [], setter = g.ctx.localStorage.setItem;
  g.ctx.localStorage.setItem = (k, v) => {
    writes.push(k);
    if (onWrite) onWrite(k, v, setter);
    else setter(k, v);
  };
  return writes;
}
function conqReady(g) {
  g.run("cq().diff='easy'; cq().squad=S.squad.slice(); persist()");
  g.run("openSquadSel('conq','0-0-0')");
  assert.equal(g.run('SQ.mode'), 'conq');
}

// B407: the real campaign entry debits water + daily quest exactly once,
// a verified primary and previous-primary backup, then launches battle.
{
  const g = await boot(), before = g.store.get(KEY), old = ram(g);
  const c = g.run('nodeCost(3)'), en = g.run('nodeEn(3)');
  const writes = spy(g);
  g.run('startBattle(3)');
  const next = disk(g), after = g.store.get(KEY);
  assert.equal(g.run('BT.cfg.mode'), 'camp');
  assert.equal(g.run('BT.done'), false);
  assert.equal(next[en], old[en] - c);
  if (en === 'water') assert.equal(next.daily.c.water, (old.daily.c.water || 0) + c);
  assert.equal(writes.filter(k => k === KEY).length, 1);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw, before);
  assert.equal(ram(g)[en], next[en]);
  assert.equal(g.run('loadSave.writer.check().ok'), true);
  pass('B407', 'verified campaign debit precedes battle launch');
  // B408: a second entry event while battle is active is not another debit.
  g.run('startBattle(3)');
  assert.equal(g.store.get(KEY), after);
  assert.equal(writes.filter(k => k === KEY).length, 1);
  pass('B408', 'double-tap active campaign launch spends energy only once');
  g.run('loadSave.writer.release()');
}

// B409: no backup write means no primary write, no RAM debit and no battle.
{
  const g = await boot(), before = g.store.get(KEY), old = ram(g);
  const writes = spy(g, (key, value, setter) => {
    if (key === BACKUP) throw Object.assign(new Error('no quota'), { name: 'QuotaExceededError' });
    setter(key, value);
  });
  g.run('startBattle(3)');
  assert.ok(writes.includes(BACKUP));
  assert.equal(g.store.get(KEY), before);
  assert.deepEqual(ram(g), old);
  assert.equal(g.run('BT === null'), true);
  assert.equal(life(g).blocked, true);
  pass('B409', 'backup quota prevents debit and launch; stale writer retired');
}

// B410: an obsolete writer is not permitted to spend or launch.
{
  const g = await boot(), before = g.store.get(KEY), old = ram(g);
  g.run('loadSave.writer.release()');
  g.run('startBattle(3)');
  assert.equal(g.store.get(KEY), before);
  assert.deepEqual(ram(g), old);
  assert.equal(g.run('BT === null'), true);
  assert.equal(life(g).blocked, true);
  pass('B410', 'lost writer prevents campaign entry and RAM debit');
}

// B411: Conquest resolves its own energy and mode state in one checkpoint,
// and only then builds battle. This also protects the squad-selector path.
{
  const g = await boot();
  conqReady(g);
  const before = g.store.get(KEY), old = ram(g), cost = g.run('CQ_EN.fight');
  const writes = spy(g);
  g.run('sqGo()');
  const next = disk(g), after = g.store.get(KEY);
  assert.equal(g.run('BT.cfg.mode'), 'conq');
  assert.equal(next.conq.en, old.conq.en - cost);
  assert.equal(writes.filter(k => k === KEY).length, 1);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw, before);
  assert.equal(g.run('loadSave.writer.check().ok'), true);
  pass('B411', 'verified Conquest resolve debit precedes battle launch');
  g.run('sqGo()');
  assert.equal(g.store.get(KEY), after);
  pass('B412', 'double-tap active Conquest launch spends resolve only once');
  g.run('loadSave.writer.release()');
}

// B413: quota during Conquest debit must not show a battle.
{
  const g = await boot();
  conqReady(g);
  const before = g.store.get(KEY), old = ram(g);
  const writes = spy(g, (key, value, setter) => {
    if (key === BACKUP) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    setter(key, value);
  });
  g.run('sqGo()');
  assert.ok(writes.includes(BACKUP));
  assert.equal(g.store.get(KEY), before);
  assert.deepEqual(ram(g), old);
  assert.equal(g.run('BT === null'), true);
  assert.equal(life(g).blocked, true);
  pass('B413', 'Conquest backup quota denies entry and preserves progress');
}

// B414: insufficient resolve is a benign cancellation, not a storage write.
{
  const g = await boot();
  conqReady(g);
  g.run('cq().en=0; cq().enTs=Date.now(); persist()');
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  g.run('sqGo()');
  assert.equal(g.store.get(KEY), before);
  assert.equal(writes.length, 0);
  assert.deepEqual(ram(g), old);
  assert.equal(g.run('BT === null'), true);
  assert.equal(g.run('loadSave.writer.check().ok'), true);
  pass('B414', 'insufficient resolve cancels without saving or retiring lock');
  g.run('loadSave.writer.release()');
}

// B415: primary write-then-throw is ambiguous: no battle in this realm,
// no automatic refund or replay. Cold boot adopts EXACT stored bytes.
{
  const g = await boot(), before = g.store.get(KEY), old = ram(g);
  let injected = false;
  spy(g, (key, value, setter) => {
    setter(key, value);
    if (key === KEY && !injected) {
      injected = true;
      throw Object.assign(new Error('injected-after-write'), { name: 'QuotaExceededError' });
    }
  });
  g.run('startBattle(3)');
  assert.equal(injected, true);
  assert.equal(g.run('BT === null'), true);
  assert.deepEqual(ram(g), old);
  assert.equal(life(g).blocked, true);
  const saved = g.store.get(KEY);
  assert.notEqual(saved, before);
  const reopened = await boot(saved);
  assert.deepEqual(disk(reopened), JSON.parse(saved));
  assert.equal(reopened.run('BT === null'), true);
  reopened.run('loadSave.writer.release()');
  pass('B415', 'ambiguous campaign debit blocks old realm, cold boot does not replay');
}
assert.deepEqual(passed, ['B407','B408','B409','B410','B411','B412','B413','B414','B415']);
console.log('ARCH-02C-B4-B2: ' + passed.length + ' entry scenarios passed on ' + html);
