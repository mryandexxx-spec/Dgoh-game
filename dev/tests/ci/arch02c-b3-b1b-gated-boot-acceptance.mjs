// ARCH-02C-B3-B1b: explicitly opted-in preboot Web Locks writer-gate
// acceptance. Legacy automatic boot is NOT yet switched over, because cached
// v140 PWA code ignores Web Locks. This tests the potential new startup path,
// not a claim of production same-origin/old-version safety.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const KEY = 'dune-goh-v1', BACKUP = KEY + '.backup';
const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json');
const initial = JSON.stringify(JSON.parse(fs.readFileSync(fixture,'utf8')));
const amount = raw => JSON.parse(raw).solari;
const ids = [];
function pass(id, what, unsafe = false) {
  ids.push(id);
  console.log('  ' + id + (unsafe ? ' [LEGACY NOT FENCED] ' : ' [OPT-IN GATE] ') + what);
}
class Locks {
  constructor() { this.owner = false; this.calls = 0; this.fail = false; }
  request(name, options, callback) {
    assert.equal(name, KEY + '.writer');
    assert.equal(options.mode, 'exclusive');
    assert.equal(options.ifAvailable, true);
    this.calls++;
    if (this.fail) return Promise.reject(new Error('native rejected'));
    if (this.owner) return Promise.resolve().then(() => callback(null));
    this.owner = true;
    return Promise.resolve().then(() => callback({name,mode:'exclusive'}))
      .finally(() => { this.owner = false; });
  }
}
function origin(raw = initial) {
  const store = new Map(raw === null ? [] : [[KEY, raw]]);
  const locks = new Locks();
  function tab(hasLocks = true) {
    const g = loadGame(html,{seed:88});
    const storage = g.ctx.localStorage;
    storage.getItem = k => store.has(k) ? store.get(k) : null;
    storage.setItem = (k,v) => { store.set(k,String(v)); };
    storage.removeItem = k => { store.delete(k); };
    storage.clear = () => { store.clear(); };
    g.ctx.navigator = hasLocks ? {locks} : {};
    return {
      g, storage,
      start: data => { g.ctx.__bootArg = data ?? {}; return g.run('start.writer(__bootArg)'); },
      gate: () => g.run('loadSave.writer.enableGate()'),
      state: () => g.run('loadSave.writer.state()'),
      release: () => g.run('loadSave.writer.release()'),
      persist: () => g.run('persist0()'),
      save: () => g.run('S === undefined ? undefined : JSON.stringify(S)'),
      change: n => { g.ctx.__plus = n; return g.run('S.solari += __plus; persist0()'); },
    };
  }
  return {store,locks,tab};
}
const flush = async () => { for (let i=0;i<8;i++) await Promise.resolve(); };

// G01: default existing boot + persist remains unchanged while not opted in.
{
  const o=origin(),t=o.tab(false),old=o.store.get(KEY);
  t.g.run('set_S(loadSave())');
  const x=t.change(3);
  assert.equal(x.ok,true);
  assert.equal(amount(o.store.get(KEY)),amount(old)+3);
  assert.equal(t.state().gated,false);
  pass('G01','default legacy path explicitly still unsafe',true);
}
// G02: opt-in gate WITHOUT a native lock must refuse persist/persist0.
{
  const o=origin(),t=o.tab(false),old=o.store.get(KEY);
  assert.equal(t.gate().ok,true);
  // Once the gate is armed, a test may populate RAM for the negative case;
  // a production boot must instead call start.writer before setting S.
  t.g.run('set_S(loadSave())');
  assert.equal(t.state().gated,true);
  const out=t.change(2);
  assert.equal(out.ok,false);
  assert.equal(out.status,'not-owner');
  assert.equal(o.store.get(KEY),old);
  pass('G02','gate alone has no unchecked storage fallback');
}
// G03: no Web Locks means no boot, even if storage is valid.
{
  const o=origin(),t=o.tab(false),old=o.store.get(KEY);
  const out=await t.start({});
  assert.equal(out.status,'unsupported');
  assert.equal(t.save(),undefined);
  assert.equal(t.state().gated,true);
  assert.equal(t.persist().status,'not-owner');
  assert.equal(o.store.get(KEY),old);
  pass('G03','preboot unsupported API leaves S undefined and refuses writes');
}
// G04: first owner boots, second tab cannot even create mutable game state.
{
  const o=origin(),a=o.tab(),b=o.tab();
  assert.equal((await a.start({})).status,'started');
  assert.equal(o.locks.owner,true);
  const result=await b.start({});
  assert.equal(result.status,'busy');
  assert.equal(b.save(),undefined);
  assert.equal(b.state().gated,true);
  assert.equal(b.persist().status,'not-owner');
  a.release();await flush();
  pass('G04','second cooperating tab cannot boot or save');
}
// G05: only after prior owner releases does second re-read primary.
{
  const o=origin(),a=o.tab(),b=o.tab();
  assert.equal((await a.start({})).ok,true);
  assert.equal(a.change(100).ok,true);
  const expected=o.store.get(KEY);
  assert.equal((await b.start({})).status,'busy');
  a.release();await flush();
  // The lifecycle hardening forbids rearming a previously denied JS heap.
  // A genuinely FRESH tab after owner release must re-read storage instead.
  assert.equal((await b.start({})).status,'session-blocked');
  const fresh=o.tab();
  assert.equal((await fresh.start({})).status,'started');
  assert.equal(fresh.g.run('S.solari'),amount(expected));
  assert.equal(fresh.change(10).ok,true);
  assert.equal(amount(o.store.get(KEY)),amount(expected)+10);
  fresh.release();await flush();
  pass('G05','fresh owner reloads latest save; denied stale heap cannot restart');
}
// G06: opt-in persist routes through checkpoint: original is in verified backup.
{
  const o=origin(),a=o.tab(),raw=o.store.get(KEY);
  assert.equal((await a.start({})).ok,true);
  const afterBoot=o.store.get(KEY);
  assert.equal(a.change(33).ok,true);
  assert.equal(amount(o.store.get(KEY)),amount(afterBoot)+33);
  assert.equal(JSON.parse(o.store.get(BACKUP)).raw,afterBoot);
  assert.equal(a.state().raw,o.store.get(KEY));
  assert.equal(a.state().gated,true);
  a.release();await flush();
  pass('G06','legacy persist0 calls become verified backup+primary under gate');
}
// G07: after release, gated persist cannot resurrect unsafe localStorage path.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start({})).ok,true);
  a.release();await flush();
  const prior=o.store.get(KEY);
  assert.equal(a.change(999).status,'session-stale');
  assert.equal(o.store.get(KEY),prior);
  assert.equal(a.state().gated,true);
  pass('G07','lock release permanently denies further writes in that realm');
}
// G08: old v140 PWA can bypass lock, but opted-in new writer detects stale.
{
  const o=origin(),a=o.tab(),legacy=o.tab(false);
  assert.equal((await a.start({})).ok,true);
  legacy.g.run('set_S(loadSave())');
  assert.equal(legacy.change(9).ok,true);
  const latest=o.store.get(KEY);
  assert.equal(a.change(100).status,'stale');
  assert.equal(o.store.get(KEY),latest);
  assert.equal(a.state().status,'stale');
  a.release();await flush();
  pass('G08','uncooperative old tab can still write: production NO-GO',true);
}
// G09: backup quota failure rejects, keeps primary bytes unchanged.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start({})).ok,true);
  const prev=o.store.get(KEY),set=a.storage.setItem;
  a.storage.setItem=(k,v) => {
    if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
    set(k,v);
  };
  assert.equal(a.change(50).status,'quota');
  assert.equal(o.store.get(KEY),prev);
  assert.equal(a.state().status,'owned');
  a.release();await flush();
  pass('G09','backup quota blocks confirmed save without clobber');
}
// G10: ambiguous primary write disables opt-in retry.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start({})).ok,true);
  const before=o.store.get(KEY),set=a.storage.setItem;
  a.storage.setItem=(k,v) => {
    set(k,v);
    if(k===KEY)throw Object.assign(new Error('denied'),{name:'SecurityError'});
  };
  assert.equal(a.change(40).status,'uncertain');
  assert.equal(a.state().status,'stale');
  const after=o.store.get(KEY);
  assert.equal(amount(after),amount(before)+40);
  assert.equal(a.change(1).status,'stale');
  assert.equal(o.store.get(KEY),after);
  a.release();await flush();
  pass('G10','write-then-throw is never acknowledged or blindly retried');
}
// G11: corrupt storage cannot enter opt-in boot or new account.
{
  const o=origin('bad-json'),a=o.tab();
  assert.equal((await a.start({})).status,'corrupt');
  assert.equal(a.save(),undefined);
  assert.equal(o.store.get(KEY),'bad-json');
  assert.equal(a.persist().status,'not-owner');
  pass('G11','invalid primary refuses boot before S/newSave');
}
// G12: same realm cannot enable opt-in mode after legacy start.
{
  const o=origin(),a=o.tab(),prior=o.store.get(KEY);
  a.g.run('start({})');
  assert.equal((await a.start({})).status,'already-started');
  assert.equal(o.store.get(KEY)!==null,true);
  assert.equal(a.state().gated,false);
  assert.equal(o.locks.calls,0);
  pass('G12','late acquisition does not retroactively mark legacy boot safe',true);
}
// G13: external hot reload snapshot cannot bypass under-lock storage reload.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start({save:JSON.parse(initial)})).status,'hot-reload-unsupported');
  assert.equal(a.save(),undefined);
  assert.equal(o.locks.calls,0);
  assert.equal(o.store.get(KEY),initial);
  pass('G13','unverified in-memory hot reload cannot write stale snapshot');
}
// G14: empty origin is verified and first-save is explicitly guarded.
{
  const o=origin(null),a=o.tab();
  assert.equal((await a.start({})).status,'started');
  assert.equal(o.store.has(KEY),true);
  assert.equal(JSON.parse(o.store.get(KEY)).v,1);
  // The first null->valid write has no predecessor, but later boot writes
  // may legitimately stage that first valid snapshot into backup.
  if (o.store.has(BACKUP)) {
    const snapshot=JSON.parse(o.store.get(BACKUP));
    assert.equal(snapshot.key,KEY);
    assert.equal(JSON.parse(snapshot.raw).v,1);
  }
  a.release();await flush();
  pass('G14','new account first save committed through owned gate');
}
// G15: valid backup plus missing primary requires manual recovery.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start({})).ok,true);
  assert.equal(a.change(3).ok,true);
  a.release();await flush();
  o.store.delete(KEY);
  const b=o.tab();
  assert.equal((await b.start({})).status,'recovery-required');
  assert.equal(b.save(),undefined);
  assert.equal(o.store.has(KEY),false);
  pass('G15','missing primary with backup cannot auto-create fresh progress');
}
// G16: native manager denial cannot start, and cannot save after failure.
{
  const o=origin(),a=o.tab(),old=o.store.get(KEY);
  o.locks.fail=true;
  assert.equal((await a.start({})).status,'unavailable');
  assert.equal(a.save(),undefined);
  assert.equal(a.persist().status,'not-owner');
  assert.equal(o.store.get(KEY),old);
  pass('G16','native lock denied fails closed');
}
// G17: if a storage write fails during gated startup, start returns failure.
{
  const o=origin(),a=o.tab(),prior=o.store.get(KEY);
  const orig=a.storage.setItem;
  a.storage.setItem=(k,v) => {
    if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
    orig(k,v);
  };
  const out=await a.start({});
  assert.equal(out.status,'boot-incomplete');
  assert.equal(a.state().gated,true);
  assert.equal(o.store.get(KEY),prior);
  a.release();await flush();
  pass('G17','failed initial checkpoint never acknowledges successful boot');
}
// G18: releasing an active gated session must not allow reacquire with stale S.
{
  const o=origin(),a=o.tab(),b=o.tab();
  assert.equal((await a.start({})).ok,true);
  a.release();await flush();
  assert.equal((await b.start({})).ok,true);
  assert.equal(b.change(777).ok,true);
  const confirmed=o.store.get(KEY);
  b.release();await flush();
  assert.equal((await a.g.run('loadSave.writer.acquire()')).status,'session-stale');
  assert.equal(a.change(11).status,'session-stale');
  assert.equal(o.store.get(KEY),confirmed);
  pass('G18','released stale-RAM session can never reacquire and clobber newer owner');
}
// G19: direct gate activation after ungated S exists is an explicit NO-GO,
// and stays fail-closed rather than treating that old RAM as latest primary.
{
  const o=origin(),a=o.tab(),prior=o.store.get(KEY);
  a.g.run('set_S(loadSave())');
  const denied=a.gate();
  assert.equal(denied.ok,false);
  assert.equal(denied.status,'late-gate');
  assert.equal(a.state().status,'session-stale');
  assert.equal(a.change(88).status,'session-stale');
  assert.equal((await a.g.run('loadSave.writer.acquire()')).status,'session-stale');
  assert.equal(o.store.get(KEY),prior);
  pass('G19','late gate cannot confer authority upon previously loaded RAM');
}
assert.deepEqual(ids,Array.from({length:19},(_,i)=>'G'+String(i+1).padStart(2,'0')));
console.log('[ARCH-02C-B3-B1b] 19/19 gated boot/legacy-persist checks complete; '+
  'legacy default and old cached versions UNSAFE until separately approved cutover.');
