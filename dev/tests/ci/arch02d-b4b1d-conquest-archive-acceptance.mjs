// ARCH-02D-B4b1d — SHA-256 Conquest history archive and additive restore.
// Both compiled PWA and standalone artifact across UTC/Amsterdam/Los Angeles.
// No server, no pruning, no resource grants, no new storage schema.
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
const WK1=new Date(2026,9,26,12).toDateString();
const WK2=new Date(2026,10,2,12).toDateString();
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const raw=x=>JSON.stringify(x),buf=x=>Buffer.from(x,'utf8');
const md=async s=>Buffer.from(await webcrypto.subtle.digest('SHA-256',buf(s))).toString('hex');
let passed=0;
const pass=(id,detail)=>{passed++;console.log('  '+id+' '+detail+' ['+zone+']');};
function run(wk,score=120){
 return {v:2,wk,diff:'easy',done:{'0-0-0':1},tk:{s0:1,c0:1},
   route:{0:{0:'0-0-0'}},disks:[{k:'stam',on:1}],stars:score,pts:24,
   fp:{},fd:{},dpick:{},foe:{},sta:{},buy:{}};
}
const ONE=run(WK1),TWO=run(WK2);
function full(hist) {
 return {...fixture,conq:{v:2,wk:ACTIVE,diff:'easy',done:{},
   tk:{},route:{},disks:[],sta:{},foe:{},dpick:{},buy:{},
   stars:0,pts:0,fp:{},fd:{},en:100,enTs:start,
   weekArchive:hist}};
}
class Locks{
 constructor(){this.held=false;}
 request(name,opts,fn){
   assert.equal(name,KEY+'.writer');
   assert.equal(opts.mode,'exclusive');assert.equal(opts.ifAvailable,true);
   if(this.held)return Promise.resolve().then(()=>fn(null));
   this.held=true;
   return Promise.resolve().then(()=>fn({name,mode:'exclusive'}))
     .finally(()=>{this.held=false;});
 }
}
function fields(){
 return new Map([['#overlay2',{innerHTML:''}],
   ['#cqarcfile',{isConnected:true,files:[]}],
   ['#cqarc-status',{textContent:''}],
   ['#cqarc-actions',{html:'',insertAdjacentHTML(_pos,txt){this.html+=txt;}}],
   ['#savecode',{value:'',select(){}}],['#overlay2 .acts',{insertAdjacentHTML(){}}]]);
}
async function boot(save=full([ONE,TWO])){
 const f=fields(),g=loadGame(html,{seed:1337,now:start,
   onQuerySelector:selector=>f.get(selector)});
 g.ctx.performance.now=()=>1000;
 g.ctx.navigator={locks:new Locks()};
 g.ctx.crypto={subtle:webcrypto.subtle};
 g.ctx.fetch=()=>{throw Error('network forbidden');};
 g.store.set(KEY,raw(save));
 assert.equal((await g.run('start({})')).status,'started');
 assert.equal(g.run('loadSave.writer.state().status'),'owned');
 return {g,f};
}
const wait=async pred=>{for(let i=0;i<100;i++){
 if(pred())return;
 await new Promise(done=>setTimeout(done,10));
 }throw Error('async digest/read never finished');};
const before=h=>h.g.store.get(KEY);
const done=h=>h.g.run('loadSave.writer.release()');
async function exportPackage(h){
 assert.equal(h.g.run('metaClick({cqarc:1})'),true);
 await wait(()=>!!h.g.run('pendingHistoryExport?.content'));
 const json=h.g.run('pendingHistoryExport.content');
 assert.match(h.f.get('#cqarc-actions').html,/data-cqarcdownload/);
 return json;
}
const setFile=(h,text)=>{
 const b=typeof text==='string'?buf(text):text;
 h.f.get('#cqarcfile').files=[{size:b.length,
   arrayBuffer:async()=>Uint8Array.from(b).buffer}];
};
async function verifyFile(h,text) {
 setFile(h,text);
 h.g.run('metaClick({cqarcread:1})');
 await wait(()=>h.f.get('#overlay2').innerHTML.includes('data-saveconfirm') ||
   h.f.get('#cqarc-status').textContent.includes('отклонён') ||
   h.f.get('#cqarc-status').textContent.includes('SHA-256 проверен'));
}
function noPreview(h){assert.doesNotMatch(h.f.get('#overlay2').innerHTML,/data-saveconfirm/);}
async function packageWith(weeks,source=ACTIVE) {
 const historyRaw=raw(weeks);
 return raw({format:'dune-goh-conquest-history',version:1,
  sourceWeek:source,count:weeks.length,historyRaw,sha256:await md(historyRaw)});
}
let exported;
// H01: verified primary, same bytes/historical flags with explicit digest.
{
 const h=await boot(),initial=before(h);
 h.g.run('S.solari += 7777'); // uncommitted RAM is never archived
 exported=await exportPackage(h);
 const pkg=JSON.parse(exported);
 assert.equal(pkg.sourceWeek,ACTIVE);
 assert.equal(pkg.count,2);assert.deepEqual(JSON.parse(pkg.historyRaw),[ONE,TWO]);
 assert.equal(pkg.sha256,await md(pkg.historyRaw));
 assert.equal(before(h),initial);
 done(h);pass('H01','exact stored history exported with SHA-256, never RAM');
}
// H02: file readback adds only missing history; current run/roster/resources
// unchanged, previous exact primary backed up, cold restart retains flags.
{
 const h=await boot(full([TWO])),original=before(h);
 h.g.run('metaClick({cqarc:1})');
 await verifyFile(h,exported);
 assert.match(h.f.get('#overlay2').innerHTML,/Добавится архивных недель: 1; уже присутствует: 1/);
 assert.equal(before(h),original);
 h.g.run('metaClick({saveconfirm:1})');
 const curr=JSON.parse(before(h)),prev=JSON.parse(original);
 assert.deepEqual(curr.conq.weekArchive,[ONE,TWO]);
 const copy={...curr,conq:{...curr.conq,weekArchive:prev.conq.weekArchive}};
 assert.deepEqual(copy,prev,'only history changes, nothing else');
 assert.equal(JSON.parse(h.g.store.get(BACKUP)).raw,original);
 assert.equal(h.g.run('loadSave.writer.state().status'),'session-stale');
 const restart=await boot(curr);
 assert.deepEqual(JSON.parse(restart.g.run('JSON.stringify(S.conq.weekArchive)')),[ONE,TWO]);
 assert.equal(restart.g.run('cq().tk.c0'),undefined,'no archived token grants');
 done(restart);pass('H02','safe additive merge, predecessor backup, cold reload and no claims');
}
// H03: idempotent readback touches neither primary nor backup.
{
 const h=await boot(),prior=before(h),oldBackup=h.g.store.get(BACKUP);
 h.g.run('metaClick({cqarc:1})');await verifyFile(h,exported);
 noPreview(h);
 assert.match(h.f.get('#cqarc-status').textContent,/Все 2 архивных недель уже сохранены/);
 assert.equal(before(h),prior);assert.equal(h.g.store.get(BACKUP),oldBackup);
 done(h);pass('H03','matching weeks verify without duplicate writes');
}
// H04: a different record under the same week is a hard conflict.
{
 const h=await boot(full([{...TWO,stars:999}])),prior=before(h);
 h.g.run('metaClick({cqarc:1})');await verifyFile(h,exported);
 noPreview(h);assert.match(h.f.get('#cqarc-status').textContent,/Файл отклонён/);
 assert.equal(before(h),prior);done(h);
 pass('H04','conflicting week cannot overwrite an existing record');
}
// H05: modified archive, hash and unknown wrapper fields are rejected.
{
 const h=await boot(full([TWO])),prior=before(h);
 for(const candidate of [
  raw({...JSON.parse(exported),historyRaw:JSON.parse(exported).historyRaw.replace('"stars":120','"stars":121')}),
  raw({...JSON.parse(exported),sha256:'f'.repeat(64)}),
  raw({...JSON.parse(exported),unexpected:true})
 ]) {
   h.g.run('metaClick({cqarc:1})');
   await verifyFile(h,candidate);noPreview(h);
   assert.equal(before(h),prior);
 }
 done(h);pass('H05','tampered SHA-256, payload and envelope blocked');
}
// H06: correctly rehashed but malicious histories cannot be imported.
{
 const h=await boot(full([TWO])),prior=before(h);
 for(const weeks of [
  [{...ONE,weekArchive:[]}],
  [ONE,ONE],
  [{...ONE,tk:JSON.parse('{"__proto__":{"polluted":true}}')}],
  [run(ACTIVE)]
 ]) {
  h.g.run('metaClick({cqarc:1})');
  await verifyFile(h,await packageWith(weeks));noPreview(h);
  assert.equal(before(h),prior);
 }
 done(h);pass('H06','nested, duplicate, prototype and current-week histories denied');
}
// H07: file size rejected before allocating, malformed UTF-8 refused.
{
 const h=await boot(full([TWO])),prior=before(h);
 h.g.run('metaClick({cqarc:1})');
 let allocations=0;
 h.f.get('#cqarcfile').files=[{size:MAX+1,
   arrayBuffer:async()=>{allocations++;return new ArrayBuffer(0);}}];
 h.g.run('metaClick({cqarcread:1})');
 await wait(()=>h.f.get('#cqarc-status').textContent.includes('отклонён'));
 assert.equal(allocations,0);
 h.g.run('metaClick({cqarc:1})');
 await verifyFile(h,Buffer.from([0x7b,0xff,0x7d]));
 noPreview(h);assert.equal(before(h),prior);
 done(h);pass('H07','bounded File API and fatal UTF-8');
}
// H08: asynchronous file read cannot outlive exclusive writer lease.
{
 const h=await boot(full([TWO])),prior=before(h);
 h.g.run('metaClick({cqarc:1})');
 let finish;const b=buf(exported);
 h.f.get('#cqarcfile').files=[{size:b.length,arrayBuffer:()=>new Promise(ok=>finish=ok)}];
 h.g.run('metaClick({cqarcread:1})');
 h.g.run('loadSave.writer.release()');
 finish(Uint8Array.from(b).buffer);
 await new Promise(done=>setTimeout(done,20));
 assert.equal(h.g.run('loadSave.writer.state().status'),'session-stale');
 assert.equal(before(h),prior);noPreview(h);
 pass('H08','lease loss while read pending cannot create valid preview');
}
// H09: quota on verified backup denies even user-approved history restore.
{
 const h=await boot(full([TWO])),prior=before(h),ram=h.g.run('JSON.stringify(S)');
 h.g.run('metaClick({cqarc:1})');await verifyFile(h,exported);
 assert.match(h.f.get('#overlay2').innerHTML,/data-saveconfirm/);
 const write=h.g.ctx.localStorage.setItem;
 h.g.ctx.localStorage.setItem=(k,v)=>{
  if(k===BACKUP)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});
  return write(k,v);
 };
 h.g.run('metaClick({saveconfirm:1})');
 assert.equal(before(h),prior);assert.equal(h.g.run('JSON.stringify(S)'),ram);
 done(h);pass('H09','quota denial preserves original primary and live RAM');
}
// H10: verified export cannot emit stale stored bytes after conflict.
{
 const h=await boot(),original=before(h);
 await exportPackage(h);
 const external=raw({...JSON.parse(original),solari:9999999});
 h.g.store.set(KEY,external);
 let blobs=0;
 h.g.ctx.Blob=class{constructor(){blobs++;}};
 h.g.run('metaClick({cqarcdownload:1})');
 assert.equal(blobs,0);assert.equal(before(h),external);
 done(h);pass('H10','stale export is refused and never builds a Blob');
}
assert.equal(passed,10);
console.log('ARCH-02D-B4b1d verified Conquest archive H01-H10 PASS: '+html+' TZ='+zone);
