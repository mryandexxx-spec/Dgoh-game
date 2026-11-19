// ARCH-02C-B3-B1c-B2: unexpected lock loss + duplicate entrypoint proof.
// Run on BOTH compiled PWA and HTML. Default boot remains legacy/UNSAFE;
// these cases must not be represented as production promotion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1', BACKUP=KEY+'.backup';
const initial=JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8')));
const ids=[];
const pass=(id,description)=>{ids.push(id);console.log('  '+id+' [PRE-CUTOVER] '+description);};
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};

// A normal Web Locks request stays pending until its callback is released.
// Simulate an abnormal provider/browser revocation by making the request
// Promise settle *before* the callback's holding Promise. This tests that a
// lost native lease cannot leave gameplay interactive or stale RAM writable.
class RevocableLocks {
  constructor(){this.held=false;this.current=null;}
  request(name,options,callback){
    assert.equal(name,KEY+'.writer');
    assert.equal(options.mode,'exclusive');
    assert.equal(options.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>callback(null));
    this.held=true;
    let resolveOutside,rejectOutside;
    const outside=new Promise((resolve,reject)=>{
      resolveOutside=resolve;rejectOutside=reject;
    });
    this.current={resolve:resolveOutside,reject:rejectOutside};
    const acquired=Promise.resolve().then(()=>callback({name,mode:'exclusive'}));
    return Promise.race([acquired,outside]).finally(()=>{
      this.held=false;this.current=null;
    });
  }
  revoke(kind='resolve'){
    assert.ok(this.current,'native lease must have been granted');
    if(kind==='reject')this.current.reject(new Error('revoked Web Lock'));
    else this.current.resolve();
  }
}
function origin(raw=initial){
  const store=new Map(raw===null?[]:[[KEY,raw]]);
  const locks=new RevocableLocks();
  const tab=(support=true)=>{
    const g=loadGame(html,{seed:79}),local=g.ctx.localStorage;
    local.getItem=k=>store.has(k)?store.get(k):null;
    local.setItem=(k,v)=>{store.set(k,String(v));};
    local.removeItem=k=>store.delete(k);
    g.ctx.navigator=support?{locks}:{};
    g.ctx.__DGOH_B3_B1C_BOOT_MODE__='writer-preview';
    return {
      g,local,
      start:data=>{g.ctx.__rBootArg=data??{};return g.run('start(__rBootArg)');},
      phase:()=>g.run('start.writerLifecycle()'),
      state:()=>g.run('loadSave.writer.state()'),
      ram:()=>g.run('S===undefined?undefined:S.solari'),
      json:()=>g.run('S===undefined?undefined:JSON.stringify(S)'),
      change:n=>{g.ctx.__rAmount=n;return g.run('S.solari+=__rAmount;persist0()');},
      release:()=>g.run('loadSave.writer.release()'),
      stop:reason=>{g.ctx.__rReason=reason;return g.run('metaFill.stopWriterSession(__rReason)');}
    };
  };
  return {store,locks,tab};
}

// R01: the historical start() first AST statement must not set S=undefined
// when a hot host accidentally invokes the same entrypoint a second time.
{
  const o=origin(),t=o.tab();
  assert.equal((await t.start()).status,'started');
  const before=t.json(),primary=o.store.get(KEY);
  assert.equal(t.start().status,'session-blocked');
  assert.equal(t.json(),before,'duplicate callback must retain active RAM');
  assert.equal(t.state().status,'owned');
  assert.equal(t.phase().blocked,false,'no duplicate gameplay initialization');
  assert.equal(o.store.get(KEY),primary);
  assert.equal(t.change(3).ok,true);
  t.release();await flush();
  pass('R01','repeated composition-root start retains active writer state');
}

// R02: abnormal native request resolution retires input *without* needing
// any user click, storage event or subsequent persist attempt.
{
  const o=origin(),owner=o.tab();
  assert.equal((await owner.start()).status,'started');
  const prior=o.store.get(KEY);
  o.locks.revoke('resolve');await flush();
  assert.equal(owner.phase().blocked,true);
  assert.equal(owner.phase().reason,'lock-lost');
  assert.equal(owner.state().status,'session-stale');
  assert.equal(owner.change(100).status,'session-stale');
  assert.equal(o.store.get(KEY),prior);
  assert.equal((await owner.start()).status,'session-blocked');
  const fresh=o.tab();
  assert.equal((await fresh.start()).status,'started');
  assert.equal(fresh.ram(),JSON.parse(prior).solari);
  assert.equal(fresh.change(2).ok,true);
  const newer=o.store.get(KEY);
  // A blocked re-entry is allowed to clear old RAM, so call persist0
  // directly instead of trying to mutate a now-undefined S.
  assert.equal(owner.ram(),undefined);
  assert.equal(owner.g.run('persist0()').status,'session-stale');
  assert.equal(o.store.get(KEY),newer);
  fresh.release();await flush();
  pass('R02','unexpected fulfilled lock request blocks stale owner and preserves successor');
}

// R03: a rejected Web Locks request AFTER acquisition is the same authority
// loss as early resolution; no unchecked fallback or revivable old heap.
{
  const o=origin(),owner=o.tab();
  assert.equal((await owner.start()).status,'started');
  const before=o.store.get(KEY);
  o.locks.revoke('reject');await flush();
  assert.equal(owner.phase().blocked,true);
  assert.equal(owner.phase().reason,'lock-lost');
  assert.equal(owner.state().status,'session-stale');
  assert.equal(owner.change(8).status,'session-stale');
  assert.equal(o.store.get(KEY),before);
  assert.equal((await owner.start()).status,'session-blocked');
  pass('R03','unexpected rejected request revokes gameplay and commits');
}

// R04: a deliberate release must block input immediately as well. The
// storage-only writer gate already denied writes, but UI remained live.
{
  const o=origin(),t=o.tab();
  assert.equal((await t.start()).status,'started');
  const before=o.store.get(KEY);
  assert.equal(t.release().status,'released');
  assert.equal(t.phase().reason,'writer-released');
  assert.equal(t.phase().blocked,true);
  assert.equal(t.change(5).status,'session-stale');
  assert.equal(o.store.get(KEY),before);
  assert.equal((await t.start()).status,'session-blocked');
  await flush();
  pass('R04','manual release also immediately fences the old gameplay UI');
}

// R05: existing lifecycle suspension reason must not be overwritten by the
// synchronous retirement callback, and cannot reattach on wake.
{
  const o=origin(),t=o.tab();
  assert.equal((await t.start()).status,'started');
  const before=o.store.get(KEY);
  t.stop('pagehide');
  assert.equal(t.phase().blocked,true);
  assert.equal(t.phase().reason,'pagehide');
  assert.equal(t.state().status,'session-stale');
  assert.equal((await t.start()).status,'session-blocked');
  assert.equal(t.ram(),undefined,'stale RAM must not reattach on re-entry');
  assert.equal(t.g.run('persist0()').status,'session-stale');
  assert.equal(o.store.get(KEY),before);
  await flush();
  pass('R05','pagehide keeps its reason and never reopens stale writer');
}

// R06: unsupported native Web Locks refuses before ANY primary/backup read
// even when rendering blocked UX; a second start cannot turn legacy on.
{
  const o=origin(),t=o.tab(false);
  const read=t.local.getItem;let reads=0;
  t.local.getItem=k=>{reads++;return read(k);};
  const before=o.store.get(KEY);
  assert.equal((await t.start()).status,'unsupported');
  assert.equal(reads,0);
  assert.equal(t.ram(),undefined);
  t.g.ctx.__DGOH_B3_B1C_BOOT_MODE__=undefined;
  assert.equal((await t.start()).status,'session-blocked');
  assert.equal(t.g.run('persist0()').ok,false);
  assert.equal(o.store.get(KEY),before);
  pass('R06','unsupported API has no storage read, write or legacy fallback');
}

// R07: recovery-only lease is still not gameplay authority. Its explicit
// release while boot is blocked cannot accidentally start a live game.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).status,'started');
  assert.equal(a.change(1).ok,true);
  a.release();await flush();
  const backup=o.store.get(BACKUP);
  assert.ok(backup,'checkpoint should exist from owned persist');
  o.store.set(KEY,'{BROKEN');
  const rescue=o.tab();
  assert.equal((await rescue.start()).status,'corrupt');
  assert.equal(rescue.phase().blocked,true);
  assert.equal(rescue.ram(),undefined);
  assert.equal((await rescue.g.run('loadSave.writer.acquire({purpose:"recovery"})')).status,'acquired');
  rescue.release();await flush();
  assert.equal(rescue.phase().blocked,true);
  assert.equal((await rescue.start()).status,'session-blocked');
  assert.equal(o.store.get(KEY),'{BROKEN');
  assert.equal(o.store.get(BACKUP),backup);
  pass('R07','recovery lease release never auto-restores or enters gameplay');
}
assert.deepEqual(ids,Array.from({length:7},(_,i)=>
  'R'+String(i+1).padStart(2,'0')));
console.log('[ARCH-02C-B3-B1c-B2] 7/7 mandatory pre-cutover revocation checks '+html+
  '; NOT default production, old cached v140 still UNFENCED');
