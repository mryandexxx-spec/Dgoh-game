// ARCH-02C-B4-B1: real built-game battle settlement, mandatory Web Locks.
// Exercise both PWA and HTML artifacts. Never use legacy persist0 as a proxy
// for a protected user session; all cases enter via ordinary start().
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
  constructor() { this.held = false; this.requests = 0; }
  request(name, options, callback) {
    assert.equal(name, KEY + '.writer');
    assert.equal(options.mode, 'exclusive');
    assert.equal(options.ifAvailable, true);
    this.requests++;
    if (this.held) return Promise.resolve().then(() => callback(null));
    this.held = true;
    return Promise.resolve().then(() => callback({ name, mode: 'exclusive' }))
      .finally(() => { this.held = false; });
  }
}
async function boot(raw = fixture) {
  const g = loadGame(html, { seed: 31 });
  g.store.set(KEY, raw);
  g.ctx.navigator = { locks: new Locks() };
  const started = await g.run('start({})');
  assert.equal(started.status, 'started');
  assert.equal(g.run('start.writerLifecycle().blocked'), false);
  assert.equal(g.run('loadSave.writer.state().status'), 'owned');
  return g;
}
const ram = g => JSON.parse(g.run('JSON.stringify(S)'));
const disk = g => JSON.parse(g.store.get(KEY));
const life = g => g.run('start.writerLifecycle()');
function winCampaign(g) {
  // The real campaign's seeded engine creates battle #3 (first uncleared
  // mission in the v1 fixture), then the test sets victory as legacy C13 did.
  // Settlement is the unmodified UI path.
  g.run(`(()=>{
    const n=NODES[3], allies=S.squad.map(id=>({id,...S.roster[id]}));
    const foes=n.enemy.map(id=>enemyProg(id,n.lvl,n.m===9));
    const b=createBattle(allies,foes,{seed:142,desert:n.desert});
    b.over='A';
    set_BT({B:b,cfg:{mode:'camp',i:3},i:3,timer:null,done:false});
    finish();
  })()`);
}

// B401/B402: ordinary boot + one verified checkpoint; two finish calls do
// not duplicate crystals/shards or rotate the backup a second time.
{
  const g = await boot(), before = g.store.get(KEY), old = ram(g);
  winCampaign(g);
  const after = g.store.get(KEY), next = disk(g);
  assert.notEqual(after, before);
  assert.equal(g.run('loadSave(true).status'), 'ok');
  assert.equal(g.run('loadSave.writer.check().ok'), true);
  assert.equal(g.run('BT.done'), true);
  assert.ok(next.cleared[3] > (old.cleared[3] || 0));
  assert.ok(next.cry > old.cry);
  assert.equal(ram(g).cry, next.cry);
  assert.deepEqual(ram(g).roster, next.roster);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw, before);
  pass('B401', 'verified battle victory saves whole v1 progress and previous backup');
  g.run('finish()');
  assert.equal(g.store.get(KEY), after);
  assert.equal(ram(g).cry, next.cry);
  pass('B402', 'duplicate finish is idempotent within this battle instance');
  g.run('loadSave.writer.release()');
}

// B403: backup quota prevents even the primary from being overwritten.
// The unconfirmed draft and result UI must not survive as active RAM.
{
  const g = await boot(), before = g.store.get(KEY), old = ram(g);
  const setter = g.ctx.localStorage.setItem, writes = [];
  g.ctx.localStorage.setItem = (k, v) => {
    writes.push(k);
    if (k === BACKUP) throw Object.assign(new Error('injected quota'), { name: 'QuotaExceededError' });
    return setter(k, v);
  };
  winCampaign(g);
  assert.ok(writes.includes(BACKUP));
  assert.equal(g.store.get(KEY), before);
  assert.deepEqual(ram(g), old);
  assert.equal(life(g).blocked, true);
  assert.equal(g.run('loadSave.writer.state().ok'), false);
  pass('B403', 'backup-quota denies victory, restores RAM and retires writer');
}

// B404: unexpected native lease release before finish fences even a direct
// stale finish call. No saving or grant is attempted by that realm.
{
  const g = await boot(), before = g.store.get(KEY), old = ram(g);
  g.run('loadSave.writer.release()');
  winCampaign(g);
  assert.equal(g.store.get(KEY), before);
  assert.deepEqual(ram(g), old);
  assert.equal(life(g).blocked, true);
  pass('B404', 'lost writer prevents stale battle settlement');
}

// B405: primary write-then-throw is ambiguous. The game must block and not
// replay the action or use its own unsaved draft; a fresh boot sees exactly
// the persisted result, with no extra random rolls.
{
  const g = await boot(), before = g.store.get(KEY), old = ram(g);
  const setter = g.ctx.localStorage.setItem;
  let injected = false;
  g.ctx.localStorage.setItem = (k, v) => {
    if (k === KEY && !injected) {
      injected = true;
      setter(k, v);
      throw Object.assign(new Error('injected after write'), { name: 'QuotaExceededError' });
    }
    return setter(k, v);
  };
  winCampaign(g);
  assert.equal(injected, true);
  assert.equal(life(g).blocked, true);
  assert.deepEqual(ram(g), old);
  const written = g.store.get(KEY);
  assert.notEqual(written, before);
  assert.equal(g.run('loadSave(true).status'), 'ok');
  const reopened = await boot(written);
  assert.equal(disk(reopened).cry, JSON.parse(written).cry);
  assert.equal(reopened.run('BT === null'), true);
  reopened.run('loadSave.writer.release()');
  pass('B405', 'ambiguous after-write blocks old realm; cold boot does not replay result');
}

// B406: the real frozen Conquest finish calls persist() internally. Its
// request must be deferred, with stars/loot/feats AND XP in ONE primary write.
{
  const g = await boot();
  g.run("cq().diff='easy'; persist()");
  const before = g.store.get(KEY), old = ram(g), writes = [];
  const setter = g.ctx.localStorage.setItem;
  g.ctx.localStorage.setItem = (k, v) => { writes.push(k); return setter(k, v); };
  g.run(`(()=>{
    const a=cqNode('0-0-0'), live=cqLive(a), squad=S.squad.slice();
    const allies=squad.map(id=>({id,...S.roster[id]}));
    const b=createBattle(allies,live.foes,{seed:142});
    b.over='A';
    set_BT({B:b,cfg:{mode:'conq',i:a.key,squad,
      cq:{key:a.key,mods:a.mods,idx:live.idx,fresh:true}},
      i:a.key,timer:null,done:false});
    finish();
  })()`);
  const next = disk(g);
  assert.equal(writes.filter(k => k === KEY).length, 1, 'exactly one primary commit, including nested Conquest request');
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw, before);
  assert.equal(next.conq.done['0-0-0'], 3);
  assert.ok(next.solari > old.solari);
  assert.ok(next.stats.wins > old.stats.wins);
  assert.equal(g.run('loadSave.writer.check().ok'), true);
  g.run('loadSave.writer.release()');
  pass('B406', 'frozen Conquest nested persist deferred into single result/XP checkpoint');
}

assert.deepEqual(passed, ['B401', 'B402', 'B403', 'B404', 'B405', 'B406']);
console.log('ARCH-02C-B4-B1: 6 battle checkpoint scenarios passed on ' + html);
