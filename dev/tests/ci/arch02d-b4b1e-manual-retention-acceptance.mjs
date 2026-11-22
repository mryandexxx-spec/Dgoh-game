// ARCH-02D-B4b1e: manual oldest-week retention, never automatic pruning.
// Compiled PWA and standalone, three local timezones, native writer model.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1',BACKUP=KEY+'.backup',MAX=8000000;
const fixture=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
 '../fixtures/saves/01-legacy-v1.json'),'utf8'));
const start=new Date(2026,10,10,12).getTime();
const ACTIVE=new Date(2026,10,9,12).toDateString();
const WEEK_DATES=[[2026,8,28],[2026,9,5],[2026,9,12],
  [2026,9,19],[2026,9,26],[2026,10,2]];
const WEEK_KEYS=WEEK_DATES.map(xs=>new Date(...xs,12).toDateString());
const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const raw=o=>JSON.stringify(o),buf=o=>Buffer.from(o,'utf8');
const sha=async v=>Buffer.from(await webcrypto.subtle.digest('SHA-256',buf(v))).toString('hex');
const run=(wk,i)=>({v:2,wk,diff:'easy',done:{'0-0-0':1},tk:{c0:1,s0:1},
 route:{0:{0:'0-0-0'}},disks:[{k:'stam',on:1}],stars:10+i,pts:18,
 fp:{},fd:{},dpick:{},foe:{},sta:{},buy:{}});
const SIX=WEEK_KEYS.map(run);
const full=(history=SIX)=>({...fixture,conq:{v:2,wk:ACTIVE,diff:'easy',
 done:{},tk:{},route:{},disks:[],sta:{},foe:{},dpick:{},buy:{},
 stars:0,pts:0,fp:{},fd:{},en:100,enTs:start,weekArchive:history}});
class Locks{
 constructor(){this.held=false;}
 request(name,opts,fn){
  assert.equal(name,KEY+'.writer');assert.equal(opts.mode,'exclusive');
  assert.equal(opts.ifAvailable,true);
  if(this.held)return Promise.resolve().then(()=>fn(null));
  this.held=true;return Promise.resolve().then(()=>fn({name,mode:'exclusive'}))
   .finally(()=>{this.held=false;});
 }
}
function nodes(){
 return new Map([['#overlay2',{innerHTML:''}],
  ['#savecode',{value:'',select(){}}],['#overlay2 .acts',{insertAdjacentHTML(){}}],
  ['#cqarcfile',{isConnected:true,files:[]}],
  ['#cqarcmove',{value:''}],['#cqarcack',{checked:false}],
  ['#cqarcphrase',{value:''}],
  ['#cqarc-status',{textContent:''}],
  ['#cqarc-actions',{html:'',insertAdjacentHTML(_p,t){this.html+=t;}}]]);
}
async function boot(save=full()){
 const f=nodes(),g=loadGame(html,{seed:1717,now:start,
  onQuerySelector:sel=>f.get(sel)});
 g.ctx.performance.now=()=>1000;
 g.ctx.navigator={locks:new Locks()};
 g.ctx.crypto={subtle:webcrypto.subtle};
 g.ctx.fetch=()=>{throw Error('network forbidden');};
 g.store.set(KEY,raw(save));
 assert.equal((await g.run('start({})')).status,'started');
 assert.equal(g.run('loadSave.writer.state().status'),'owned');
 return {g,f};
}
async function wait(cond){
 for(let i=0;i<100;i++){
  if(cond())return;
  await new Promise(done=>setTimeout(done,10));
 }
 throw Error('async archive verification timed out');
}
const stored=h=>h.g.store.get(KEY),end=h=>h.g.run('loadSave.writer.release()');
async function pkgFor(history=SIX,source=ACTIVE) {
 const manifest={format:'dune-goh-conquest-history',version:1,
  sourceWeek:source,count:history.length,historyRaw:raw(history)};
 return raw({...manifest,sha256:await sha(raw(manifest))});
}
function upload(h,v){
 const b=typeof v==='string'?buf(v):v;
 h.f.get('#cqarcfile').files=[{size:b.length,
  arrayBuffer:async()=>Uint8Array.from(b).buffer}];
}
async function plan(h,file,n){
 h.g.run('metaClick({cqarc:1})');
 h.f.get('#cqarcmove').value=n===undefined?'':String(n);
 if(file!==null)upload(h,file);
 h.g.run('metaClick({cqarcplan:1})');
 await wait(()=>h.f.get('#overlay2').innerHTML.includes('data-cqarcapprove') ||
   h.f.get('#cqarc-status').textContent.includes('отклонён'));
}
function declined(h){
 assert.doesNotMatch(h.f.get('#overlay2').innerHTML,/data-cqarcapprove|data-saveconfirm/);
}
function approve(h){
 h.f.get('#cqarcack').checked=true;
 h.f.get('#cqarcphrase').value='УДАЛИТЬ';
 h.g.run('metaClick({cqarcapprove:1})');
 assert.match(h.f.get('#overlay2').innerHTML,/data-saveconfirm/);
}
let count=0;
function pass(id,title){count++;console.log('  '+id+' '+title+' ['+timezone+']');}
const originalArchive=await pkgFor();

// M01: inert by default; source archive remains after entering UI and export.
{
 const h=await boot(),before=stored(h);
 h.g.run('metaClick({saveexp:1})');
 assert.match(h.f.get('#overlay2').innerHTML,/data-cqarc/);
 h.g.run('metaClick({cqarc:1})');
 assert.match(h.f.get('#overlay2').innerHTML,/data-cqarcplan/);
 assert.equal(h.f.get('#cqarcmove').value,'');
 assert.equal(stored(h),before);
 end(h);pass('M01','no background pruning or preselected retention count');
}
// M02: missing file and missing explicit count cannot stage deletion.
{
 const h=await boot(),before=stored(h);
 await plan(h,null,2);declined(h);assert.equal(stored(h),before);
 await plan(h,originalArchive,undefined);declined(h);
 assert.equal(stored(h),before);end(h);
 pass('M02','file and explicit count both required');
}
// M03: double-check external custody + typed phrase + final confirm, exact
// old primary backup, last four retained and all unrelated data identical.
let pruned;
{
 const h=await boot(),old=stored(h);
 await plan(h,originalArchive,2);
 assert.match(h.f.get('#overlay2').innerHTML,/БУДУТ УДАЛЕНЫ/);
 assert.equal(stored(h),old);
 h.g.run('metaClick({cqarcapprove:1})');
 assert.doesNotMatch(h.f.get('#overlay2').innerHTML,/data-saveconfirm/);
 h.f.get('#cqarcack').checked=true;
 h.f.get('#cqarcphrase').value='не согласен';
 h.g.run('metaClick({cqarcapprove:1})');
 assert.doesNotMatch(h.f.get('#overlay2').innerHTML,/data-saveconfirm/);
 assert.equal(stored(h),old);
 approve(h);
 assert.equal(stored(h),old,'first approval cannot write');
 h.g.run('metaClick({saveconfirm:1})');
 pruned=JSON.parse(stored(h));
 assert.deepEqual(pruned.conq.weekArchive,SIX.slice(2));
 const clone=JSON.parse(raw(pruned));
 clone.conq.weekArchive=SIX;
 assert.deepEqual(clone,JSON.parse(old),'no resource, tokens or roster mutated');
 assert.equal(JSON.parse(h.g.store.get(BACKUP)).raw,old);
 assert.equal(h.g.run('loadSave.writer.state().status'),'session-stale');
 const restart=await boot(pruned);
 assert.deepEqual(JSON.parse(restart.g.run('JSON.stringify(S.conq.weekArchive)')),SIX.slice(2));
 assert.equal(restart.g.run('cq().tk.c0'),undefined);
 end(restart);pass('M03','explicit two confirmations -> safe oldest-first history retention, cold reload');
}
// M04: the SHA-verified old external file restores pruned records additively.
{
 const h=await boot(pruned),old=stored(h);
 h.g.run('metaClick({cqarc:1})');
 upload(h,originalArchive);
 h.g.run('metaClick({cqarcread:1})');
 await wait(()=>h.f.get('#overlay2').innerHTML.includes('data-saveconfirm'));
 assert.equal(stored(h),old);
 h.g.run('metaClick({saveconfirm:1})');
 assert.deepEqual(JSON.parse(stored(h)).conq.weekArchive,SIX);
 assert.equal(JSON.parse(h.g.store.get(BACKUP)).raw,old);
 end(h);pass('M04','all removed weeks recoverable, no duplicate rewards');
}
// M05: keep at least four most recent even if user requests more.
{
 const h=await boot(),old=stored(h);
 for(const n of [0,-1,3,6,'2.5','xyz',999]){
  await plan(h,originalArchive,n);declined(h);assert.equal(stored(h),old);
 }
 const few=await boot(full(SIX.slice(2))),fewOld=stored(few);
 await plan(few,await pkgFor(SIX.slice(2)),1);
 declined(few);assert.equal(stored(few),fewOld);
 end(few);end(h);pass('M05','minimum four recent weeks, no implicit/default count');
}
// M06: incomplete, older-source, conflicting and rehashed malicious files
// cannot authorize removal of even one week.
{
 const h=await boot(),old=stored(h);
 const incomplete=await pkgFor(SIX.slice(0,5));
 const olderSource=await pkgFor(SIX,new Date(2026,10,2,12).toDateString());
 const conflicting=await pkgFor([SIX[0],{...SIX[1],stars:999},...SIX.slice(2)]);
 for(const v of [incomplete,olderSource,conflicting,
  originalArchive.replace('"stars":10','"stars":11')]){
   await plan(h,v,1);declined(h);assert.equal(stored(h),old);
 }
 end(h);pass('M06','incomplete, conflicting, stale-week and tampered archive refused');
}
// M07: reject oversized File API request before arrayBuffer allocation.
{
 const h=await boot(),old=stored(h);
 h.g.run('metaClick({cqarc:1})');h.f.get('#cqarcmove').value='1';
 let reads=0;
 h.f.get('#cqarcfile').files=[{size:MAX+1,arrayBuffer:async()=>{
  reads++;return new ArrayBuffer(0);
 }}];
 h.g.run('metaClick({cqarcplan:1})');
 await wait(()=>h.f.get('#cqarc-status').textContent.includes('отклонён'));
 assert.equal(reads,0);declined(h);assert.equal(stored(h),old);
 end(h);pass('M07','file bound enforced before reading');
}
// M08: missing attestation / stale dialog after opening normal export cannot
// continue with an old candidate.
{
 const h=await boot(),old=stored(h);
 await plan(h,originalArchive,1);
 h.g.run('metaClick({saveexp:1})');
 h.f.get('#cqarcack').checked=true;h.f.get('#cqarcphrase').value='УДАЛИТЬ';
 h.g.run('metaClick({cqarcapprove:1})');
 assert.equal(stored(h),old);
 assert.doesNotMatch(h.f.get('#overlay2').innerHTML,/data-saveconfirm/);
 end(h);pass('M08','changing transfer invalidates old retention preview');
}
// M09: a preview cannot survive the writer's native lease loss.
{
 const h=await boot(),old=stored(h);
 await plan(h,originalArchive,1);
 h.g.run('loadSave.writer.release()');
 h.f.get('#cqarcack').checked=true;h.f.get('#cqarcphrase').value='УДАЛИТЬ';
 h.g.run('metaClick({cqarcapprove:1})');
 assert.equal(stored(h),old);
 assert.equal(h.g.run('loadSave.writer.state().status'),'session-stale');
 pass('M09','native writer loss denies retention and keeps primary');
}
// M10: backup quota failure cannot remove any history or adopt candidate RAM.
{
 const h=await boot(),old=stored(h),ram=h.g.run('JSON.stringify(S)');
 await plan(h,originalArchive,1);approve(h);
 const set=h.g.ctx.localStorage.setItem;
 h.g.ctx.localStorage.setItem=(k,v)=>{
  if(k===BACKUP)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});
  return set(k,v);
 };
 h.g.run('metaClick({saveconfirm:1})');
 assert.equal(stored(h),old);assert.equal(h.g.run('JSON.stringify(S)'),ram);
 end(h);pass('M10','backup quota failure preserves full original archive');
}
// M11: stale primary before the final user confirmation fails closed.
{
 const h=await boot(),old=stored(h);
 await plan(h,originalArchive,1);approve(h);
 const external=raw({...JSON.parse(old),solari:556677});
 h.g.store.set(KEY,external);
 h.g.run('metaClick({saveconfirm:1})');
 assert.equal(stored(h),external);
 assert.equal(h.g.run('loadSave.writer.state().status'),'session-stale');
 end(h);pass('M11','primary CAS rejects external changes under locked preview');
}
// M12: a write-then-throw is uncertain — do not restore memory or retry.
// The candidate may already be stored, so never assert old primary survived.
{
 const h=await boot(),old=stored(h),ram=h.g.run('JSON.stringify(S)');
 await plan(h,originalArchive,1);approve(h);
 const set=h.g.ctx.localStorage.setItem;
 let uncertainty=0;
 h.g.ctx.localStorage.setItem=(k,v)=>{
  if(k===KEY){uncertainty++;set(k,v);throw Error('write-then-throw');}
  return set(k,v);
 };
 h.g.run('metaClick({saveconfirm:1})');
 assert.equal(uncertainty,1);
 assert.equal(h.g.run('JSON.stringify(S)'),ram);
 assert.equal(h.g.run('loadSave.writer.state().status'),'session-stale');
 assert.notEqual(stored(h),old);
 pass('M12','uncertain post-write event fail-closed, no retry or RAM adoption');
}
assert.equal(count,12);
console.log('ARCH-02D-B4b1e manual retention M01-M12 PASS '+html+' TZ='+timezone);
