// ARCH-02C-B1: verify the OPT-IN checkpoint API in the actual shipped-style
// PWA + HTML artifact build. No real profile, no UI caller integration.
// These assert safety guarantees of the new API, NOT legacy persist() or
// cross-tab atomicity. The old B0 unsafe baseline stays separately pinned.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html',KEY='dune-goh-v1',BACKUP=KEY+'.backup';
const fixtureDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../fixtures/saves');
const old=JSON.stringify(JSON.parse(fs.readFileSync(path.join(fixtureDir,'01-legacy-v1.json'),'utf8')));
const results=[];
function seen(id,description){results.push(id);console.log('  '+id+' [CHECKPOINT SAFE] '+description);}
function init(raw=old) {
 const g=loadGame(html,{seed:7});
 assert.equal(g.get('SAVE_KEY'),KEY);
 assert.equal(g.get('CHECKPOINT_KEY'),BACKUP);
 if(raw!==null)g.store.set(KEY,raw);
 return g;
}
function next(raw=old,delta=47){const value=JSON.parse(raw);value.solari+=delta;return value;}
function commit(g,args={expectedRaw:old,candidate:next()}) {
 g.ctx.__checkpointTestArg=args;
 const out=g.run('commitCheckpoint(__checkpointTestArg)');
 delete g.ctx.__checkpointTestArg;
 return out;
}
function recover(g,args){
 g.ctx.__checkpointTestArg=args;
 const out=g.run('recoverCheckpoint(__checkpointTestArg)');
 delete g.ctx.__checkpointTestArg;
 return out;
}
function inspect(g){return JSON.parse(g.run('JSON.stringify(inspectCheckpoint())'));}
function status(g){return g.run('loadSave(true).status');}
function writeFault(g,key,kind='QuotaExceededError',afterWrite=false){
 const set=g.ctx.localStorage.setItem;
 g.ctx.localStorage.setItem=(k,v)=>{
   if(k===key){if(afterWrite)set(k,v);throw Object.assign(new Error('injected write fault'),{name:kind});}
   return set(k,v);
 };
}
function backupFromCommit(g) {
 const value=g.store.get(BACKUP);
 assert.equal(typeof value,'string');
 const parsed=JSON.parse(value);
 assert.equal(parsed.format,1);
 assert.equal(parsed.key,KEY);
 assert.equal(parsed.raw,old);
 assert.equal(typeof parsed.checksum,'string');
 return value;
}
function committed(){const g=init();const result=commit(g);assert.equal(result.ok,true);assert.equal(result.status,'committed');return g;}

// S16: reading a pristine previous-version profile is pure; no sidecar created.
{
 const g=init(),result=inspect(g);
 assert.equal(result.status,'ok');
 assert.equal(result.primary.raw,old);
 assert.equal(result.backup.status,'missing');
 assert.deepEqual([...g.store.keys()],[KEY]);
 seen('S16','old v1 primary inspected without writes or migration');
}
// S17: fully verified backup-before-primary, one complete candidate write.
{
 const g=committed(),result=inspect(g);
 assert.equal(result.status,'ok');
 assert.equal(result.primary.raw,g.store.get(KEY));
 assert.equal(result.primary.save.solari,next().solari);
 assert.equal(result.backup.raw,old);
 assert.equal(result.backup.checksum,JSON.parse(g.store.get(BACKUP)).checksum);
 assert.equal(status(g),'ok');
 seen('S17','valid old v1 preserved as independently readable backup');
}
// S18: a cold VM after successful commit reads both snapshots correctly.
{
 const first=committed(),g=init(first.store.get(KEY));
 g.store.set(BACKUP,first.store.get(BACKUP));
 const result=inspect(g);
 assert.equal(result.status,'ok');
 assert.equal(result.primary.save.solari,next().solari);
 assert.equal(result.backup.raw,old);
 assert.equal(status(g),'ok');
 seen('S18','cold reload after exact readback retains valid committed v1');
}
// S19: missing primary with no earlier progress is an explicitly allowed first
// commit, never a fabricated backup of a nonexisting save.
{
 const g=init(null),out=commit(g,{expectedRaw:null,candidate:JSON.parse(old)});
 assert.equal(out.ok,true);assert.equal(out.status,'committed');
 assert.equal(g.store.get(KEY),old);
 assert.equal(g.store.has(BACKUP),false);
 seen('S19','verified first commit from confirmed empty origin');
}
// S20-S21: failed backup stage must preserve the current primary.
for(const [id,kind] of [['S20','QuotaExceededError'],['S21','SecurityError']]){
 const g=init();writeFault(g,BACKUP,kind);
 const result=commit(g);
 assert.equal(result.ok,false);
 assert.equal(result.stage,'backup-write');
 assert.equal(result.status,kind==='QuotaExceededError'?'quota':'security');
 assert.equal(g.store.get(KEY),old);
 assert.equal(g.store.has(BACKUP),false);
 seen(id,kind+' during backup blocks primary write');
}
// S22: denial on backup readback after successful write also blocks primary.
{
 const g=init(),get=g.ctx.localStorage.getItem;let n=0;
 g.ctx.localStorage.getItem=k=>{
   if(k===BACKUP&&++n===2)throw Object.assign(new Error('denied read'),{name:'SecurityError'});
   return get(k);
 };
 const out=commit(g);
 assert.equal(out.ok,false);assert.equal(out.stage,'backup-readback');
 assert.equal(g.store.get(KEY),old);
 assert.equal(inspect(g).backup.status,'ok');
 seen('S22','backup verification read denied; only old primary remains');
}
// S23: invalid existing backup is never destructively rotated.
{
 const g=init(),tampered='{BROKEN';
 g.store.set(BACKUP,tampered);
 const out=commit(g);
 assert.equal(out.ok,false);assert.equal(out.status,'backup-corrupt');
 assert.equal(g.store.get(KEY),old);
 assert.equal(g.store.get(BACKUP),tampered);
 seen('S23','corrupt existing backup preserved and commit blocked');
}
// S24: backup read unavailable is distinct from missing, and blocks writes.
{
 const g=init(),get=g.ctx.localStorage.getItem;
 g.ctx.localStorage.getItem=k=>{
   if(k===BACKUP)throw Object.assign(new Error('read denied'),{name:'SecurityError'});
   return get(k);
 };
 const out=commit(g);
 assert.equal(out.ok,false);assert.equal(out.status,'unavailable');
 assert.equal(out.stage,'backup-read');
 assert.equal(g.store.get(KEY),old);
 seen('S24','unavailable backup read never treated as absent');
}
// S25: invalid/unsupported candidate cannot touch primary or checkpoint.
{
 const g=init(),bad=next();bad.v=2;
 let out=commit(g,{expectedRaw:old,candidate:bad});
 assert.equal(out.ok,false);assert.equal(out.status,'invalid');
 bad.v=1;bad.solari=-1;
 out=commit(g,{expectedRaw:old,candidate:bad});
 assert.equal(out.status,'invalid');
 assert.equal(g.store.get(KEY),old);
 assert.equal(g.store.has(BACKUP),false);
 seen('S25','future version and negative balance candidate rejected');
}
// S26: cyclic candidate cannot be serialized or acknowledged.
{
 const g=init(),bad=next();bad.loop=bad;
 const out=commit(g,{expectedRaw:old,candidate:bad});
 assert.equal(out.ok,false);assert.equal(out.status,'serialization');
 assert.equal(g.store.get(KEY),old);
 assert.equal(g.store.has(BACKUP),false);
 seen('S26','cyclic candidate fails before touching any storage key');
}
// S27: stale/omitted expected snapshot is rejected.
{
 const g=init();
 assert.equal(commit(g,{candidate:next()}).status,'invalid-expected');
 const wrong=JSON.stringify(next());
 assert.equal(commit(g,{expectedRaw:wrong,candidate:next(wrong)}).status,'conflict');
 assert.equal(g.store.get(KEY),old);
 assert.equal(g.store.has(BACKUP),false);
 seen('S27','explicit exact expected primary required');
}
// S28: a sequential other-writer update after checkpoint but before primary
// is detected; this does NOT prove race-free localStorage CAS.
{
 const g=init(),get=g.ctx.localStorage.getItem,outsider=JSON.stringify(next(old,9));
 let n=0;
 g.ctx.localStorage.getItem=k=>{
   if(k===KEY&&++n===2){g.store.set(KEY,outsider);return outsider;}
   return get(k);
 };
 const out=commit(g);
 assert.equal(out.status,'conflict');
 assert.equal(out.stage,'primary-recheck');
 assert.equal(g.store.get(KEY),outsider);
 assert.equal(inspect(g).backup.raw,old);
 seen('S28','sequential stale writer detected before primary write');
}
// S29-S30: ordinary primary write quota/security leaves old primary and a
// verified backup; never an OK result.
for(const [id,kind] of [['S29','QuotaExceededError'],['S30','SecurityError']]){
 const g=init();writeFault(g,KEY,kind);
 const out=commit(g);
 assert.equal(out.ok,false);
 assert.equal(out.stage,'primary-write');
 assert.equal(out.status,kind==='QuotaExceededError'?'quota':'security');
 assert.equal(g.store.get(KEY),old);
 backupFromCommit(g);
 seen(id,kind+' primary write preserves old committed state');
}
// S31: even throw AFTER the underlying setItem is an UNCERTAIN outcome; don't
// wrongly claim failure to commit or rerun a random reward.
{
 const g=init();writeFault(g,KEY,'QuotaExceededError',true);
 const out=commit(g);
 assert.equal(out.ok,false);assert.equal(out.status,'uncertain');
 assert.equal(out.stage,'primary-write');
 assert.equal(g.store.get(KEY),JSON.stringify(next()));
 backupFromCommit(g);
 seen('S31','primary set-then-throw is uncertain; candidate may be committed');
}
// S32: primary readback SecurityError after successful set => uncertain.
{
 const g=init(),get=g.ctx.localStorage.getItem;let n=0;
 g.ctx.localStorage.getItem=k=>{
   if(k===KEY&&++n===3)throw Object.assign(new Error('verification denial'),{name:'SecurityError'});
   return get(k);
 };
 const out=commit(g);
 assert.equal(out.ok,false);assert.equal(out.status,'uncertain');
 assert.equal(out.stage,'primary-readback');
 assert.equal(g.store.get(KEY),JSON.stringify(next()));
 backupFromCommit(g);
 seen('S32','post-primary write read denial is uncertain, no false OK');
}
// S33: adversarial post-write mismatch is uncertain, no rollback that could
// erase an externally committed newer snapshot.
{
 const g=init(),get=g.ctx.localStorage.getItem;let n=0;
 const outsider=JSON.stringify(next(old,900));
 g.ctx.localStorage.getItem=k=>{
   if(k===KEY&&++n===3){g.store.set(KEY,outsider);return outsider;}
   return get(k);
 };
 const out=commit(g);
 assert.equal(out.status,'uncertain');
 assert.equal(out.stage,'primary-readback');
 assert.equal(g.store.get(KEY),outsider);
 backupFromCommit(g);
 seen('S33','mismatched primary verification preserves outsider bytes');
}
// S34: valid backup never silently replaces a corrupt primary; explicit
// guarded recovery can restore it without erasing backup evidence.
{
 const g=committed(),backup=g.store.get(BACKUP),broken='{"v":1,"roster":';
 g.store.set(KEY,broken);
 const state=inspect(g);
 assert.equal(state.status,'recoverable');
 assert.equal(state.primary.raw,broken);
 assert.equal(state.backup.raw,old);
 assert.equal(g.store.get(KEY),broken);
 const out=recover(g,{expectedPrimaryRaw:broken,expectedBackupEnvelope:backup});
 assert.equal(out.ok,true);assert.equal(out.status,'restored');
 assert.equal(g.store.get(KEY),old);
 assert.equal(g.store.get(BACKUP),backup);
 assert.equal(status(g),'ok');
 seen('S34','explicit restore of verified backup preserves old invalid raw until user action');
}
// S35: when primary is missing but backup exists, starting a fresh candidate
// is forbidden; only explicitly guarded restore is available.
{
 const g=committed(),backup=g.store.get(BACKUP);
 g.store.delete(KEY);
 assert.equal(inspect(g).status,'recoverable');
 assert.equal(commit(g,{expectedRaw:null,candidate:next()}).status,'recovery-required');
 assert.equal(g.store.has(KEY),false);
 const out=recover(g,{expectedPrimaryRaw:null,expectedBackupEnvelope:backup});
 assert.equal(out.ok,true);
 assert.equal(g.store.get(KEY),old);
 seen('S35','missing primary with verified backup cannot become new account');
}
// S36: unsupported higher version must not be overwritten automatically by
// a previous v1 backup; recovery deliberately refuses this downgrade.
{
 const g=committed(),backup=g.store.get(BACKUP),future=JSON.stringify({...next(),v:2});
 g.store.set(KEY,future);
 assert.equal(inspect(g).status,'unsupported');
 const out=recover(g,{expectedPrimaryRaw:future,expectedBackupEnvelope:backup});
 assert.equal(out.ok,false);assert.equal(out.status,'unsupported');
 assert.equal(g.store.get(KEY),future);
 seen('S36','unsupported v2 protected from restoration overwrite');
}
// S37: tampered checksum is invalid, not a recoverable snapshot.
{
 const g=committed(),tamper=JSON.parse(g.store.get(BACKUP));
 tamper.checksum='00000000';
 const broken='{"bad":';
 g.store.set(BACKUP,JSON.stringify(tamper));g.store.set(KEY,broken);
 const state=inspect(g);
 assert.equal(state.status,'blocked');
 assert.equal(state.backup.status,'checksum-mismatch');
 const out=recover(g,{expectedPrimaryRaw:broken,expectedBackupEnvelope:g.store.get(BACKUP)});
 assert.equal(out.ok,false);assert.equal(out.status,'no-verified-backup');
 assert.equal(g.store.get(KEY),broken);
 seen('S37','backup checksum corruption is never auto-trusted');
}
// S38: recovery preview/backup must match exact original bytes.
{
 const g=committed(),backup=g.store.get(BACKUP),broken='null';
 g.store.set(KEY,broken);
 assert.equal(recover(g,{expectedPrimaryRaw:'wrong',expectedBackupEnvelope:backup}).status,'conflict');
 assert.equal(recover(g,{expectedPrimaryRaw:broken,expectedBackupEnvelope:'other'}).status,'conflict');
 assert.equal(g.store.get(KEY),broken);
 seen('S38','stale restore preview refused; original corrupt bytes retained');
}
// S39: denied recovery write preserves broken primary and verified backup.
{
 const g=committed(),backup=g.store.get(BACKUP),broken='{"broken":';
 g.store.set(KEY,broken);writeFault(g,KEY);
 const out=recover(g,{expectedPrimaryRaw:broken,expectedBackupEnvelope:backup});
 assert.equal(out.ok,false);assert.equal(out.status,'quota');
 assert.equal(g.store.get(KEY),broken);assert.equal(g.store.get(BACKUP),backup);
 seen('S39','quota on explicit restore leaves invalid primary untouched');
}
// S40: restore set-then-throw is not reported as guaranteed failure.
{
 const g=committed(),backup=g.store.get(BACKUP),broken='not json';
 g.store.set(KEY,broken);writeFault(g,KEY,'SecurityError',true);
 const out=recover(g,{expectedPrimaryRaw:broken,expectedBackupEnvelope:backup});
 assert.equal(out.ok,false);assert.equal(out.status,'uncertain');
 assert.equal(g.store.get(KEY),old);
 seen('S40','ambiguous restore correctly reports uncertain outcome');
}
// S41: entire-origin deletion makes local backup unavailable too.
{
 const g=committed();g.store.clear();
 const state=inspect(g);
 assert.equal(state.status,'blocked');
 assert.equal(state.primary.status,'missing');
 assert.equal(state.backup.status,'missing');
 seen('S41','origin eviction cannot be recovered from same-origin backup');
}
// S42: never silently activate the prepared save in live S.
{
 const g=init();g.run('start({})');
 const was=JSON.parse(g.run('JSON.stringify(S)')).solari;
 const current=g.store.get(KEY);
 const out=commit(g,{expectedRaw:current,candidate:next(current,200)});
 assert.equal(out.ok,true);
 assert.equal(g.run('S.solari'),was);
 assert.equal(JSON.parse(g.store.get(KEY)).solari,was+200);
 seen('S42','opt-in commit does not mutate global S or publish reward UI');
}
// S43: Unicode in previously committed save is protected byte-exactly.
{
 const value=JSON.parse(old);value.customNote='Герои Дюны — 試験 🌘';
 const original=JSON.stringify(value),g=init(original);
 const out=commit(g,{expectedRaw:original,candidate:next(original,1)});
 assert.equal(out.ok,true);
 assert.equal(inspect(g).backup.raw,original);
 assert.equal(g.store.get(BACKUP).includes('Герои Дюны'),true);
 seen('S43','Unicode backup checksum and raw copy are exact');
}
// S44: no-op must not rewrite or rotate a known-good backup.
{
 const g=committed(),primary=g.store.get(KEY),before=g.store.get(BACKUP);
 const out=commit(g,{expectedRaw:primary,candidate:JSON.parse(primary)});
 assert.equal(out.ok,true);assert.equal(out.status,'unchanged');
 assert.equal(g.store.get(BACKUP),before);
 assert.equal(g.store.get(KEY),primary);
 seen('S44','idempotent same-snapshot no-op never rotates backup');
}
// S45: demonstrate unchanged legacy v138 write API (not a B1 guarantee).
{
 const g=committed(),before=g.store.get(BACKUP);
 g.run('start({})');
 g.run('S.solari+=2');
 assert.equal(g.run('persist0().ok'),true);
 assert.equal(g.store.get(BACKUP),before);
 assert.equal(inspect(g).primary.status,'ok');
 seen('S45','old persist0 still writes v1 without maintaining backup (NOT protected)');
}
// S46: refuse a new candidate when previous primary is corrupt.
{
 const g=init('{"v":1,"roster":');
 const out=commit(g,{expectedRaw:g.store.get(KEY),candidate:next()});
 assert.equal(out.ok,false);assert.equal(out.status,'corrupt');
 assert.equal(g.store.has(BACKUP),false);
 seen('S46','invalid old primary cannot be laundered into a backup');
}
// S47: denied primary read never means "missing".
{
 const g=init(),get=g.ctx.localStorage.getItem;
 g.ctx.localStorage.getItem=k=>{
  if(k===KEY)throw Object.assign(new Error('blocked'),{name:'SecurityError'});
  return get(k);
 };
 const out=commit(g,{expectedRaw:old,candidate:next()});
 assert.equal(out.ok,false);assert.equal(out.status,'unavailable');
 assert.equal(g.store.get(KEY),old);assert.equal(g.store.has(BACKUP),false);
 seen('S47','security denial on primary preflight blocks all writes');
}
assert.equal(new Set(results).size,results.length);
assert.equal(results.length,32);
console.log('ARCH-02C-B1: SAFE PASS '+results.length+' opt-in checkpoint/recovery cases on '+html+
  '; same-origin retention only; legacy callers, real browser concurrency and physical Safari remain unprotected.');
