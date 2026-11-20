// ARCH-02C-B5b: transactional login calendar on compiled PWA + HTML.
// Ordinary start() obtains a mandatory native-shape Web Locks writer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1', BACKUP=KEY+'.backup';
const fixture=JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8')));
const NOV2=Date.UTC(2026,10,2,9), NOV3=Date.UTC(2026,10,3,9);
const NOV30=Date.UTC(2026,10,30,9);
const passed=[];
const pass=(id,description)=>{passed.push(id);console.log('  '+id+' '+description);};
class Locks {
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
async function boot(raw=fixture,now=NOV2){
  const listeners={},overlay={innerHTML:'<div>unclaimed</div>'};
  const g=loadGame(html,{seed:73,now,
    onDocumentListener:(type,fn)=>{(listeners[type]??=[]).push(fn);},
    onQuerySelector:selector=>selector==='#overlay2'?overlay:null
  });
  g.store.set(KEY,raw);
  g.ctx.navigator={locks:new Locks()};
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  g.listeners=listeners;g.overlay=overlay;
  return g;
}
const disk=g=>JSON.parse(g.store.get(KEY));
const ram=g=>JSON.parse(g.run('JSON.stringify(S)'));
const blocked=g=>g.run('start.writerLifecycle().blocked');
function setup(g,{m='2026-11',n=0,last=''}={}){
  g.run('S.login='+JSON.stringify({m,n,last})+';persist()');
}
function open(g){g.run('openCalendar()');assert.ok(g.overlay.innerHTML.includes('data-calclaim="1"'));}
function click(g){
  const button={tagName:'BUTTON',dataset:{calclaim:'1'}};
  const e={target:{closest:selector=>
    selector==='button, [data-fxu], .unit.tgt, .detail'?button:null},
    preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
  assert.ok(g.listeners.click?.length,'production delegated click must exist');
  for(const fn of g.listeners.click)fn(e);
}
function spy(g,fail=null){
  const calls=[],base=g.ctx.localStorage.setItem;
  g.ctx.localStorage.setItem=(key,value)=>{
    calls.push(key);
    if(fail)fail(key,value,base);else base(key,value);
  };
  return calls;
}
// B515: day-one calendar reward, month, date, sequential marker and backup.
{
 const g=await boot();setup(g);open(g);
 const before=g.store.get(KEY),old=ram(g),calls=spy(g);
 click(g);
 const now=disk(g);
 assert.deepEqual(now.login,{m:'2026-11',n:1,last:'Mon Nov 02 2026'});
 assert.equal(now.solari,old.solari+3000);
 assert.equal(calls.filter(x=>x===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 assert.deepEqual(ram(g),now);
 pass('B515','calendar sequence, login day and solari share one checkpoint');
 g.run('loadSave.writer.release()');
}
// B516: same-date click is idempotent despite replayed button dataset.
{
 const g=await boot();setup(g);open(g);click(g);
 const saved=g.store.get(KEY),calls=spy(g);
 click(g);open(g);click(g);
 assert.equal(g.store.get(KEY),saved);assert.equal(calls.length,0);
 pass('B516','replayed claim cannot pay twice on one day');
 g.run('loadSave.writer.release()');
}
// B517: the previously rendered modal cannot claim after midnight.
{
 const g=await boot();setup(g);open(g);
 const saved=g.store.get(KEY),calls=spy(g);
 g.setNow(NOV3);click(g);
 assert.equal(g.store.get(KEY),saved);assert.equal(calls.length,0);
 pass('B517','stale modal click from prior date is rejected');
 g.run('loadSave.writer.release()');
}
// B518: a new month may be displayed without resetting live/durable login.
{
 const g=await boot();setup(g,{m:'2026-10',n:21,last:'Sat Oct 31 2026'});
 const saved=g.store.get(KEY),previous=ram(g),calls=spy(g);
 open(g);
 assert.equal(g.run('loginState().n'),0);
 assert.equal(g.run('loginCan()'),true);
 assert.deepEqual(ram(g),previous);
 assert.equal(g.store.get(KEY),saved);assert.equal(calls.length,0);
 pass('B518','month rollover preview is read-only until a verified claim');
 g.run('loadSave.writer.release()');
}
// B519: month reset and new hero's first reward commit together.
{
 const g=await boot();setup(g,{m:'2026-10',n:21,last:'Sat Oct 31 2026'});open(g);
 const before=g.store.get(KEY),old=ram(g),calls=spy(g);
 click(g);
 const after=disk(g);
 assert.deepEqual(after.login,{m:'2026-11',n:1,last:'Mon Nov 02 2026'});
 assert.equal(after.solari,old.solari+3000);
 assert.equal(calls.filter(x=>x===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 pass('B519','previous month rollover plus one reward uses one checkpoint');
 g.run('loadSave.writer.release()');
}
// B520: backwards device clock cannot reset a future month to claim again.
{
 const g=await boot();setup(g,{m:'2026-12',n:9,last:'Tue Dec 15 2026'});
 const saved=g.store.get(KEY),old=ram(g),calls=spy(g);
 open(g);assert.equal(g.run('loginCan()'),false);click(g);
 assert.deepEqual(ram(g),old);
 assert.equal(g.store.get(KEY),saved);assert.equal(calls.length,0);
 pass('B520','calendar refuses rollback to a month preceding saved month');
 g.run('loadSave.writer.release()');
}
// B521: roll back within the same month cannot repeat a future-day reward.
{
 const g=await boot();setup(g,{m:'2026-11',n:3,last:'Fri Nov 06 2026'});
 const saved=g.store.get(KEY),calls=spy(g);
 open(g);assert.equal(g.run('loginCan()'),false);click(g);
 assert.equal(g.store.get(KEY),saved);assert.equal(calls.length,0);
 pass('B521','future last-claim date blocks same-month time rollback');
 g.run('loadSave.writer.release()');
}
// B522: backup quota denies grant and month state without success UI.
{
 const g=await boot();setup(g,{m:'2026-10',n:12,last:'Sat Oct 31 2026'});open(g);
 const before=g.store.get(KEY),old=ram(g),presentation=g.overlay.innerHTML;
 spy(g,(key,value,write)=>{
   if(key===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
   write(key,value);
 });
 click(g);
 assert.equal(g.store.get(KEY),before);assert.deepEqual(ram(g),old);
 assert.equal(g.overlay.innerHTML,presentation);assert.equal(blocked(g),true);
 pass('B522','backup quota aborts month change, payout and presentation');
}
// B523: security-denied primary leaves existing calendar progress intact.
{
 const g=await boot();setup(g);open(g);
 const before=g.store.get(KEY),old=ram(g),presentation=g.overlay.innerHTML;
 spy(g,(key,value,write)=>{
   if(key===KEY)throw Object.assign(new Error('storage denied'),{name:'SecurityError'});
   write(key,value);
 });
 click(g);
 assert.equal(g.store.get(KEY),before);assert.deepEqual(ram(g),old);
 assert.equal(g.overlay.innerHTML,presentation);assert.equal(blocked(g),true);
 pass('B523','primary SecurityError does not acknowledge a login reward');
}
// B524: write-then-throw is uncertain; a new realm sees the token and no replay.
{
 const g=await boot();setup(g);open(g);
 const old=ram(g),before=g.store.get(KEY);
 let hit=false;
 spy(g,(key,value,write)=>{
   write(key,value);
   if(key===KEY&&!hit){hit=true;throw Object.assign(new Error('after write'),{name:'QuotaExceededError'});}
 });
 click(g);
 assert.equal(hit,true);assert.notEqual(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);assert.equal(blocked(g),true);
 const re=await boot(g.store.get(KEY));const after=disk(re);
 assert.equal(after.login.n,1);
 open(re);const calls=spy(re);click(re);
 assert.equal(calls.length,0);assert.deepEqual(disk(re),after);
 pass('B524','ambiguous primary write survives cold boot without second grant');
 re.run('loadSave.writer.release()');
}
// B525: persisted claim remains denied on ordinary cold boot.
{
 const g=await boot();setup(g);open(g);click(g);
 const saved=g.store.get(KEY);g.run('loadSave.writer.release()');
 const re=await boot(saved);open(re);
 const calls=spy(re);click(re);
 assert.equal(re.store.get(KEY),saved);assert.equal(calls.length,0);
 pass('B525','cold boot preserves received calendar reward and one-day cap');
 re.run('loadSave.writer.release()');
}
// B526: after native Web Locks release, no stale calendar grant is possible.
{
 const g=await boot();setup(g);open(g);
 const before=g.store.get(KEY),old=ram(g);
 g.run('loadSave.writer.release()');
 const calls=spy(g);click(g);
 assert.equal(g.store.get(KEY),before);assert.deepEqual(ram(g),old);
 assert.equal(calls.length,0);assert.equal(blocked(g),true);
 pass('B526','retired writer lease prevents login claims');
}
// B527: shard-conversion hook is deferred while a checkpoint is uncommitted.
{
 const g=await boot();setup(g,{m:'2026-11',n:6,last:'Sun Nov 01 2026'});
 g.run("S.roster[monthHero()].stars=7;persist();globalThis.__conversions=0;giveRewards.presentationHooks.shardConv=()=>{globalThis.__conversions++};");
 open(g);
 const before=g.store.get(KEY),old=ram(g);
 spy(g,(key,value,write)=>{
   if(key===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
   write(key,value);
 });
 click(g);
 assert.equal(g.run('__conversions'),0);
 assert.equal(g.store.get(KEY),before);assert.deepEqual(ram(g),old);
 pass('B527','failed shard conversion does not leak a queued presentation hook');
}
// B528: verified day-seven shard-conversion hook flushes exactly once.
{
 const g=await boot();setup(g,{m:'2026-11',n:6,last:'Sun Nov 01 2026'});
 g.run("S.roster[monthHero()].stars=7;persist();globalThis.__conversions=0;giveRewards.presentationHooks.shardConv=()=>{globalThis.__conversions++};");
 open(g);
 const old=ram(g);click(g);
 const after=disk(g);
 assert.equal(after.login.n,7);
 assert.equal(after.wring,(old.wring||0)+100);
 assert.equal(g.run('__conversions'),1);
 assert.deepEqual(ram(g),after);
 pass('B528','successful seventh-day conversion notifies only after commit');
 g.run('loadSave.writer.release()');
}
// B529: existing day-ten crystal reward remains exactly 100.
{
 const g=await boot();setup(g,{m:'2026-11',n:9,last:'Sun Nov 01 2026'});
 open(g);const old=ram(g);
 click(g);assert.equal(disk(g).cry,old.cry+100);
 assert.equal(disk(g).login.n,10);
 pass('B529','day-ten special crystal amount remains unchanged');
 g.run('loadSave.writer.release()');
}
// B530: final November day grants original 25 shards + one Water of Life.
{
 const g=await boot(fixture,NOV30);
 setup(g,{m:'2026-11',n:29,last:'Sun Nov 29 2026'});
 open(g);const old=ram(g);click(g);const now=disk(g);
 assert.equal(now.login.n,30);assert.equal(now.login.last,'Mon Nov 30 2026');
 assert.equal(now.wol,old.wol+1);
 const saved=g.store.get(KEY),calls=spy(g);click(g);
 assert.equal(g.store.get(KEY),saved);assert.equal(calls.length,0);
 pass('B530','last-day special reward preserves v1 amounts and completion limit');
 g.run('loadSave.writer.release()');
}
// B531: a completed calendar never pays a 31st day in a 30-day month.
{
 const g=await boot();setup(g,{m:'2026-11',n:30,last:'Sun Nov 01 2026'});
 open(g);const before=g.store.get(KEY),calls=spy(g);click(g);
 assert.equal(g.store.get(KEY),before);assert.equal(calls.length,0);
 pass('B531','fully claimed month refuses overflow beyond monthDays');
 g.run('loadSave.writer.release()');
}
assert.deepEqual(passed,Array.from({length:17},(_,i)=>'B'+(515+i)));
console.log('ARCH-02C-B5b: '+passed.length+' login-calendar cases on '+html);
