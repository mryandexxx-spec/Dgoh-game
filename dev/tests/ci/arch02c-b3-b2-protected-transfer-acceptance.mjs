// ARCH-02C-B3-B2-A1: protected manual import + one-shot recovery-only lease.
// Run against BOTH compiled PWA and HTML. The default PWA boot remains legacy;
// this exercises explicit writer-owned sessions, not production promotion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1',BACKUP=KEY+'.backup';
const fixture=JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8')));
const code=raw=>Buffer.from(raw,'utf8').toString('base64');
const ids=[];
function pass(id,desc){ids.push(id);console.log('  '+id+' [B3-B2 OPT-IN] '+desc);}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
class NativeLocks {
  constructor(){this.held=false;}
  request(name,options,callback){
    assert.equal(name,KEY+'.writer');
    assert.equal(options.mode,'exclusive');
    assert.equal(options.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>callback(null));
    this.held=true;
    return Promise.resolve().then(()=>callback({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
function origin(raw=fixture) {
  const store=new Map(raw===null?[]:[[KEY,raw]]),locks=new NativeLocks();
  function tab(hasLocks=true){
    const fields=new Map([['#savecode',{value:''}],
      ['#overlay2',{innerHTML:''}],['#overlay2 .acts',{insertAdjacentHTML(){}}]]);
    const g=loadGame(html,{seed:25,onQuerySelector:selector=>fields.get(selector)});
    const local=g.ctx.localStorage;
    local.getItem=k=>store.has(k)?store.get(k):null;
    local.setItem=(k,v)=>{store.set(k,String(v));};
    local.removeItem=k=>store.delete(k);
    local.clear=()=>store.clear();
    g.ctx.navigator=hasLocks?{locks}:{};
    // Fake DOM overlay; real browser integration separately covers DOM.
    g.run('metaFill.showWriterBlocked = outcome => { window.__blockedAfterImport = outcome.status; }');
    return {
      g,local,fields,
      start:data=>{g.ctx.__b2BootArg=data??{};return g.run('start.writer(__b2BootArg)');},
      gate:()=>g.run('loadSave.writer.enableGate()'),
      acquire:options=>{g.ctx.__b2AcquireArg=options??{};return g.run('loadSave.writer.acquire(__b2AcquireArg)');},
      state:()=>g.run('loadSave.writer.state()'),
      release:()=>g.run('loadSave.writer.release()'),
      check:()=>g.run('loadSave.writer.check()'),
      recover:args=>{g.ctx.__b2RecoveryArg=args;return g.run('loadSave.writer.recover(__b2RecoveryArg)');},
      inspect:()=>g.run('loadSave.checkpoint.inspect()'),
      ram:()=>g.run('S===undefined?undefined:S.solari'),
      save:()=>g.run('S===undefined?undefined:JSON.stringify(S)'),
      change:n=>{g.ctx.__delta=n;return g.run('S.solari += __delta; persist0()');},
      preview:candidate=>{
        fields.get('#savecode').value=code(JSON.stringify(candidate));
        assert.equal(g.run('metaClick({saveload:1})'),true);
      },
      confirm:()=>assert.equal(g.run('metaClick({saveconfirm:1})'),true),
    };
  }
  return {store,locks,tab};
}
const imported=delta=>({...JSON.parse(fixture),solari:JSON.parse(fixture).solari+delta});
async function backupOrigin(){
  const o=origin(),t=o.tab();
  assert.equal((await t.start()).status,'started');
  const before=o.store.get(KEY);
  assert.equal(t.change(7).ok,true);
  const backup=o.store.get(BACKUP);
  assert.equal(JSON.parse(backup).raw,before);
  t.release();await flush();
  return {o,before,backup};
}
// X01 valid B2 candidate is imported ONLY under a live, exact writer lease.
{
  const o=origin(),t=o.tab();
  assert.equal((await t.start()).status,'started');
  const before=o.store.get(KEY),ram=t.save(),candidate=imported(123);
  t.preview(candidate);
  assert.equal(o.store.get(KEY),before);
  assert.match(t.fields.get('#overlay2').innerHTML,/Защищённый Web Locks/);
  t.confirm();
  assert.equal(JSON.parse(o.store.get(KEY)).solari,candidate.solari);
  assert.equal(JSON.parse(o.store.get(BACKUP)).raw,before);
  assert.equal(t.save(),ram,'old RAM is never grafted onto imported save');
  assert.equal(t.g.ctx.__blockedAfterImport,'import-verified-reload');
  assert.equal(t.state().status,'session-stale');
  const saved=o.store.get(KEY);
  assert.equal(t.change(999).status,'session-stale');
  assert.equal(o.store.get(KEY),saved);
  await flush();
  const fresh=o.tab();
  assert.equal((await fresh.start()).status,'started');
  assert.equal(fresh.ram(),candidate.solari);
  fresh.release();await flush();
  pass('X01','verified import retires writer, requires cold reload');
}
// X02 fresh installed empty origin can bootstrap under a lock and then
// import verified v1, preserving the fresh placeholder as predecessor backup.
{
  const o=origin(null),t=o.tab();
  assert.equal((await t.start()).status,'started');
  const freshRaw=o.store.get(KEY);
  assert.equal(JSON.parse(freshRaw).v,1);
  const candidate=imported(777);
  t.preview(candidate);t.confirm();
  assert.equal(JSON.parse(o.store.get(KEY)).solari,candidate.solari);
  assert.equal(JSON.parse(o.store.get(BACKUP)).raw,freshRaw);
  await flush();
  const cold=o.tab();
  assert.equal((await cold.start()).status,'started');
  assert.equal(cold.ram(),candidate.solari);
  cold.release();await flush();
  pass('X02','empty localStorage manual transfer reloads existing v1');
}
// X03 denied second tab cannot act as import owner or checkpoint bypass.
{
  const o=origin(),a=o.tab(),b=o.tab();
  assert.equal((await a.start()).status,'started');
  assert.equal((await b.start()).status,'busy');
  const raw=o.store.get(KEY);
  assert.equal(b.g.run('loadSave.writer.commit({expectedRaw:null,candidate:{}})').status,
    'not-owner');
  assert.equal(b.g.run('loadSave.checkpoint.commit({expectedRaw:null,candidate:{}})').status,
    'writer-required');
  assert.equal(o.store.get(KEY),raw);
  a.release();await flush();
  pass('X03','busy second tab has no live import or checkpoint write path');
}
// X04 external legacy write after preview invalidates writer import.
{
  const o=origin(),t=o.tab();
  assert.equal((await t.start()).status,'started');
  t.preview(imported(100));
  const outside=JSON.stringify({...JSON.parse(o.store.get(KEY)),solari:900111});
  o.store.set(KEY,outside);
  t.confirm();
  assert.equal(o.store.get(KEY),outside);
  assert.equal(t.state().status,'stale');
  t.release();await flush();
  pass('X04','stale expected primary does not overwrite outsider bytes');
}
// X05 pagehide/released lease between preview and confirmation never falls
// back to the older direct B2 checkpoint API.
{
  const o=origin(),t=o.tab();
  assert.equal((await t.start()).status,'started');
  t.preview(imported(200));
  const before=o.store.get(KEY);
  t.release();await flush();t.confirm();
  assert.equal(o.store.get(KEY),before);
  assert.equal(t.state().status,'session-stale');
  pass('X05','released writer denies pending confirmation');
}
// X06 quota on backup stage rejects import without changing S or primary.
{
  const o=origin(),t=o.tab();
  assert.equal((await t.start()).status,'started');
  t.preview(imported(300));
  const before=o.store.get(KEY),ram=t.save(),write=t.local.setItem;
  t.local.setItem=(k,v)=>{if(k===BACKUP)throw Object.assign(
    new Error('quota'),{name:'QuotaExceededError'});write(k,v);};
  t.confirm();
  assert.equal(o.store.get(KEY),before);
  assert.equal(t.save(),ram);
  assert.equal(t.state().status,'owned');
  t.release();await flush();
  pass('X06','quota before primary write blocks import');
}
// X07 write then throw is uncertain and must never advance live RAM.
{
  const o=origin(),t=o.tab();
  assert.equal((await t.start()).status,'started');
  t.preview(imported(400));
  const old=t.save(),write=t.local.setItem;
  t.local.setItem=(k,v)=>{write(k,v);if(k===KEY)
    throw Object.assign(new Error('post-write'),{name:'SecurityError'});};
  t.g.run('metaFill.showSaveRecovery = issue => {window.__recoverWarn=issue.status;}');
  t.confirm();
  assert.equal(t.state().status,'stale');
  assert.equal(t.save(),old);
  assert.equal(t.g.ctx.__recoverWarn,'uncertain');
  t.release();await flush();
  pass('X07','ambiguous primary write blocks reapplication');
}
// X08 recovery lease requires prior opt-in gate and S===undefined.
{
  const o=origin(),t=o.tab();
  assert.equal((await t.acquire({purpose:'recovery'})).status,
    'recovery-requires-empty-ram');
  assert.equal((await t.start()).status,'started');
  assert.equal((await t.acquire({purpose:'recovery'})).status,
    'recovery-requires-empty-ram');
  assert.equal(t.recover({}).status,'not-recovery-owner');
  t.release();await flush();
  pass('X08','gameplay RAM can never be used for backup restore');
}
// X09 verified backup is restored under an explicitly requested recovery-only
// native lock, no auto boot or silent new-save creation.
{
  const {o,before,backup}=await backupOrigin();
  o.store.set(KEY,'{CORRUPTED');
  const rescuer=o.tab();
  assert.equal(rescuer.gate().ok,true);
  assert.equal((await rescuer.acquire({purpose:'recovery'})).status,'acquired');
  assert.equal(rescuer.ram(),undefined);
  assert.equal(rescuer.g.run('loadSave.writer.commit({expectedRaw:null,candidate:{}})').status,
    'recovery-only');
  const snap=rescuer.inspect();
  assert.equal(snap.status,'recoverable');
  assert.equal(snap.backup.envelopeRaw,backup);
  const outcome=rescuer.recover({expectedPrimaryRaw:snap.primary.raw,
    expectedBackupEnvelope:snap.backup.envelopeRaw});
  assert.equal(outcome.status,'restored');
  assert.equal(o.store.get(KEY),before);
  assert.equal(o.store.get(BACKUP),backup);
  assert.equal(rescuer.ram(),undefined);
  assert.equal(rescuer.state().status,'session-stale');
  assert.equal((await rescuer.acquire({purpose:'recovery'})).status,'session-stale');
  await flush();
  const fresh=o.tab();
  assert.equal((await fresh.start()).status,'started');
  assert.equal(fresh.ram(),JSON.parse(before).solari);
  fresh.release();await flush();
  pass('X09','explicit under-lease recovery restores exact backup then reload');
}
// X10 unsupported future primary is never overwritten with an older backup.
{
  const {o,backup}=await backupOrigin();
  const future=JSON.stringify({...JSON.parse(fixture),v:2});
  o.store.set(KEY,future);
  const t=o.tab();t.gate();
  assert.equal((await t.acquire({purpose:'recovery'})).status,'unsupported');
  assert.equal(o.store.get(KEY),future);
  assert.equal(o.store.get(BACKUP),backup);
  pass('X10','future version requires manual review, not rollback');
}
// X11 no verified backup => recovery never owns a lock or writes primary.
{
  const o=origin('{CORRUPTED'),t=o.tab();t.gate();
  assert.equal((await t.acquire({purpose:'recovery'})).status,'no-verified-backup');
  assert.equal(o.store.get(KEY),'{CORRUPTED');
  assert.equal(t.ram(),undefined);
  pass('X11','unverified backup cannot be used to restore');
}
// X12 stale inspected recovery envelope, including outsider tamper, fails
// without replacing the corrupt primary and retires the attempt.
{
  const {o}=await backupOrigin();
  o.store.set(KEY,'BROKEN');
  const t=o.tab();t.gate();
  assert.equal((await t.acquire({purpose:'recovery'})).status,'acquired');
  const state=t.inspect();
  o.store.set(BACKUP,'BROKEN-BACKUP');
  assert.equal(t.recover({expectedPrimaryRaw:state.primary.raw,
    expectedBackupEnvelope:state.backup.envelopeRaw}).status,'no-verified-backup');
  assert.equal(o.store.get(KEY),'BROKEN');
  assert.equal(t.state().status,'session-stale');
  await flush();
  pass('X12','backup tamper between inspect and confirm denies recovery');
}
// X13 wrong exact expected primary is a conflict; no retry after release.
{
  const {o}=await backupOrigin();
  o.store.set(KEY,'CORRUPT');
  const t=o.tab();t.gate();
  assert.equal((await t.acquire({purpose:'recovery'})).status,'acquired');
  const snap=t.inspect();
  assert.equal(t.recover({expectedPrimaryRaw:'OTHER',
    expectedBackupEnvelope:snap.backup.envelopeRaw}).status,'conflict');
  assert.equal(o.store.get(KEY),'CORRUPT');
  assert.equal(t.state().status,'session-stale');
  await flush();
  pass('X13','wrong primary bytes fail closed without second attempt');
}
// X14 recovery write-then-throw is never falsely acknowledged.
{
  const {o}=await backupOrigin();
  o.store.set(KEY,'BROKEN');
  const t=o.tab();t.gate();
  assert.equal((await t.acquire({purpose:'recovery'})).status,'acquired');
  const snap=t.inspect(),write=t.local.setItem;
  t.local.setItem=(k,v)=>{write(k,v);if(k===KEY)
    throw Object.assign(new Error('post-write'),{name:'QuotaExceededError'});};
  assert.equal(t.recover({expectedPrimaryRaw:snap.primary.raw,
    expectedBackupEnvelope:snap.backup.envelopeRaw}).status,'uncertain');
  assert.equal(t.state().status,'session-stale');
  assert.equal(t.ram(),undefined);
  await flush();
  pass('X14','ambiguous backup restore requires fresh inspection');
}
assert.deepEqual(ids,Array.from({length:14},(_,i)=>
  'X'+String(i+1).padStart(2,'0')));
console.log('[ARCH-02C-B3-B2-A1] 14/14 protected transfer/recovery proofs on '+html+
  '; opt-in only, old cached PWA UNFENCED, recovery UI not yet promoted.');
