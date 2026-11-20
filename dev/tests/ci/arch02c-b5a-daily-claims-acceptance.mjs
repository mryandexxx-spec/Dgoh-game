// ARCH-02C-B5a: daily quest, batch claim and random chest transaction
// acceptance against the actual built PWA / standalone HTML bundles.
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
const passed=[];
function pass(id,desc){passed.push(id);console.log('  '+id+' '+desc);}
class Locks {
  constructor(){this.held=false;}
  request(name,opts,cb){
    assert.equal(name,KEY+'.writer');
    assert.equal(opts.mode,'exclusive');
    assert.equal(opts.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>cb(null));
    this.held=true;
    return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
async function boot(raw=fixture){
  const listeners={},overlay={innerHTML:'<p>old</p>'};
  const g=loadGame(html,{seed:67,
    onDocumentListener:(type,fn)=>{(listeners[type]??=[]).push(fn);},
    onQuerySelector:selector=>selector==='#overlay'?overlay:null
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
const day=g=>g.run('todayKey()');
const blocked=g=>g.run('start.writerLifecycle().blocked');
function setup(g,{counts={},got={},chest=false,level=null,xp=null,date=null}={}){
  const payload=JSON.stringify({counts,got,chest,date});
  g.run(`(()=>{const p=${payload};S.daily={d:p.date||todayKey(),c:p.counts,got:p.got,chest:p.chest};persist();})()`);
  if(level!==null)g.run(`S.acc.lvl=${level};S.acc.xp=${xp??0};persist()`);
}
function spy(g,fail=null){
  const calls=[],base=g.ctx.localStorage.setItem;
  g.ctx.localStorage.setItem=(k,v)=>{
    calls.push(k);
    if(fail)fail(k,v,base);else base(k,v);
  };
  return calls;
}
function click(g,dataset){
  const button={tagName:'BUTTON',dataset};
  const e={target:{closest:selector=>
    selector==='button, [data-fxu], .unit.tgt, .detail'?button:null},
    preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
  assert.ok(g.listeners.click?.length,'real ui/events delegated click handler');
  for(const fn of g.listeners.click)fn(e);
}
const claim=(g,k,stamp=day(g))=>{g.run('claimQuest.renderedDay='+JSON.stringify(stamp));click(g,{qclaim:k});};
const chest=(g,stamp=day(g))=>{g.run('claimChest.renderedDay='+JSON.stringify(stamp));click(g,{qchest:'1'});};
const all=(g,stamp=day(g))=>{g.run('claimQuest.renderedDay='+JSON.stringify(stamp));click(g,{qall:'1'});};
const seven=()=>Object.fromEntries(['login','water','camp','chron','shop','raid','ult'].map(k=>[k,true]));

// B501: a normal quest claim verifies reward, XP and token in one write.
{
  const g=await boot();setup(g,{counts:{login:1}});
  const before=g.store.get(KEY),old=ram(g),calls=spy(g);
  claim(g,'login');
  const next=disk(g);
  assert.equal(next.daily.got.login,true);
  assert.equal(next.cry,old.cry+20);
  assert.equal(next.acc.xp,old.acc.xp+10);
  assert.equal(calls.filter(k=>k===KEY).length,1);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
  assert.deepEqual(ram(g),next);
  pass('B501','quest flag, crystals and account XP share one verified checkpoint');
  g.run('loadSave.writer.release()');
}
// B502: replay and stale DOM date token cannot duplicate a claim.
{
  const g=await boot();setup(g,{counts:{login:1}});
  claim(g,'login');
  const saved=g.store.get(KEY),calls=spy(g);
  claim(g,'login');claim(g,'login','Sun Nov 01 2026');
  assert.equal(g.store.get(KEY),saved);
  assert.equal(calls.length,0);
  pass('B502','replay and stale-date quest clicks cannot pay twice');
  g.run('loadSave.writer.release()');
}
// B503: unmet, unknown or locked quests never write.
{
  const g=await boot();setup(g,{counts:{}});
  const saved=g.store.get(KEY),calls=spy(g);
  claim(g,'water');claim(g,'not-a-quest');all(g);
  assert.equal(g.store.get(KEY),saved);
  assert.equal(calls.length,0);
  pass('B503','unmet and forged quest requests fail closed');
  g.run('loadSave.writer.release()');
}
// B504: collect-all settles ALL eligible quests with one checkpoint.
{
  const g=await boot();setup(g,{counts:{login:1,water:120,camp:8}});
  const before=g.store.get(KEY),old=ram(g),calls=spy(g);
  all(g);
  const next=disk(g);
  for(const k of ['login','water','camp'])assert.equal(next.daily.got[k],true);
  assert.equal(next.cry,old.cry+50);
  assert.equal(next.solari,old.solari+5000);
  assert.equal(next.folio,old.folio+3);
  assert.equal(next.acc.xp,old.acc.xp+30);
  assert.equal(calls.filter(k=>k===KEY).length,1);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
  assert.deepEqual(ram(g),next);
  pass('B504','collect-all flags, rewards and XP commit in one backup-first write');
  g.run('loadSave.writer.release()');
}
// B505: quota prevents even the first of several batch claims.
{
  const g=await boot();setup(g,{counts:{login:1,water:120}});
  const before=g.store.get(KEY),old=ram(g),pending=g.run('accXP.pendingQueue.length');
  spy(g,(k,v,put)=>{
    if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
    put(k,v);
  });
  all(g);
  assert.equal(g.store.get(KEY),before);
  assert.deepEqual(ram(g),old);
  assert.equal(g.run('accXP.pendingQueue.length'),pending);
  assert.equal(blocked(g),true);
  pass('B505','backup quota rolls back entire batch and presentation queue');
}
// B506: denied primary SecurityError cannot acknowledge a completed quest.
{
  const g=await boot();setup(g,{counts:{login:1}});
  const before=g.store.get(KEY),old=ram(g);
  spy(g,(k,v,put)=>{
    if(k===KEY)throw Object.assign(new Error('security'),{name:'SecurityError'});
    put(k,v);
  });
  claim(g,'login');
  assert.equal(g.store.get(KEY),before);
  assert.deepEqual(ram(g),old);
  assert.equal(blocked(g),true);
  pass('B506','primary SecurityError leaves quest and resources uncommitted');
}
// B507: chest fixed rewards, random prize and one-time token settle together.
{
  const g=await boot();setup(g,{got:seven()});
  const before=g.store.get(KEY),old=ram(g),calls=spy(g);
  chest(g);
  const next=disk(g),delta=next.cry-old.cry;
  assert.equal(next.daily.chest,true);
  assert.equal(next.seal,old.seal+1);
  assert.equal(next.solari,old.solari+5000);
  assert.ok(delta>=50&&delta<=300&&delta%10===0);
  assert.equal(calls.filter(k=>k===KEY).length,1);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
  assert.deepEqual(ram(g),next);
  pass('B507','random chest payout and marker share exactly one verified commit');
  g.run('loadSave.writer.release()');
}
// B508: duplicate chest and obsolete date reject without a second RNG write.
{
  const g=await boot();setup(g,{got:seven()});
  chest(g);
  const prior=g.store.get(KEY),calls=spy(g);
  chest(g);chest(g,'Sun Nov 01 2026');
  assert.equal(g.store.get(KEY),prior);
  assert.equal(calls.length,0);
  pass('B508','chest replay cannot mint or reroll');
  g.run('loadSave.writer.release()');
}
// B509: uncertain primary write forces new realm; its saved chest is final.
{
  const g=await boot();setup(g,{got:seven()});
  const before=g.store.get(KEY),old=ram(g);
  let hit=false;
  spy(g,(k,v,put)=>{
    put(k,v);
    if(k===KEY&&!hit){hit=true;throw Object.assign(new Error('after-write'),{name:'QuotaExceededError'});}
  });
  chest(g);
  assert.equal(hit,true);
  assert.notEqual(g.store.get(KEY),before);
  assert.deepEqual(ram(g),old);
  assert.equal(blocked(g),true);
  const re=await boot(g.store.get(KEY)),after=disk(re),calls=spy(re);
  assert.equal(after.daily.chest,true);
  chest(re);
  assert.equal(calls.length,0);
  assert.deepEqual(disk(re),after);
  re.run('loadSave.writer.release()');
  pass('B509','uncertain chest write survives cold boot without replay');
}
// B510: lease loss cannot perform any claim, even via a stale click.
{
  const g=await boot();setup(g,{counts:{login:1},got:seven()});
  const saved=g.store.get(KEY),old=ram(g);
  g.run('loadSave.writer.release()');
  const calls=spy(g);
  claim(g,'login');all(g);chest(g);
  assert.equal(g.store.get(KEY),saved);
  assert.deepEqual(ram(g),old);
  assert.equal(calls.length,0);
  assert.equal(blocked(g),true);
  pass('B510','retired native Web Locks writer refuses quest, batch and chest');
}
// B511: no backwards daily reset can resurrect a future claim.
{
  const g=await boot();setup(g,{date:'Tue Nov 03 2026',counts:{login:1}});
  const saved=g.store.get(KEY),calls=spy(g);
  claim(g,'login');all(g);chest(g);
  assert.equal(g.store.get(KEY),saved);
  assert.equal(calls.length,0);
  assert.equal(g.run('dly().d'),'Tue Nov 03 2026');
  pass('B511','backwards clock does not turn future daily state into fresh claims');
  g.run('loadSave.writer.release()');
}
// B512: account level-up is presentation-only until verified success.
{
  const g=await boot();setup(g,{counts:{login:1},level:1,xp:15});
  const before=g.store.get(KEY),old=ram(g),pending=g.run('accXP.pendingQueue.length');
  spy(g,(k,v,put)=>{
    if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
    put(k,v);
  });
  claim(g,'login');
  assert.equal(g.store.get(KEY),before);
  assert.deepEqual(ram(g),old);
  assert.equal(g.run('accXP.pendingQueue.length'),pending);
  assert.equal(blocked(g),true);
  pass('B512','failed account level-up never leaks pending level-up notifications');
}
// B513: collect-all ignores skill quest once level cap condition excludes it.
{
  const g=await boot();setup(g,{counts:{login:1,skill:1},level:51,xp:0});
  all(g);
  const next=disk(g);
  assert.equal(next.daily.got.login,true);
  assert.equal(next.daily.got.skill,undefined);
  pass('B513','batch claim applies only active, currently eligible quests');
  g.run('loadSave.writer.release()');
}
// B514: completed quest is durable after cold reload, not reissued.
{
  const g=await boot();setup(g,{counts:{login:1}});
  claim(g,'login');
  const saved=g.store.get(KEY);
  g.run('loadSave.writer.release()');
  const re=await boot(saved),calls=spy(re);
  claim(re,'login');
  assert.equal(re.store.get(KEY),saved);
  assert.equal(calls.length,0);
  re.run('loadSave.writer.release()');
  pass('B514','cold boot does not issue an already received daily quest again');
}
assert.deepEqual(passed,Array.from({length:14},(_,i)=>'B'+(501+i)));
console.log('ARCH-02C-B5a: '+passed.length+' quest/chest cases on '+html);
