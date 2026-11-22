// ARCH-02D-B4b2: paid daily entitlements survive clock forward/back shifts.
// Run against compiled PWA + standalone in three real TZ environments.
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
const at=(d)=>new Date(2026,10,d,12).getTime();
let passed=0;
function pass(id,msg){passed++;console.log('  '+id+' '+msg);}
class Locks {
  constructor(){this.held=false;}
  request(name,opts,cb) {
    assert.equal(name,KEY+'.writer');
    assert.equal(opts.mode,'exclusive');assert.equal(opts.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>cb(null));
    this.held=true;
    return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
async function boot(now,raw=fixture) {
  const listeners={},overlay={innerHTML:''},overlay2={innerHTML:''};
  const g=loadGame(html,{seed:149,now,
    onQuerySelector:s=>s==='#overlay'?overlay:s==='#overlay2'?overlay2:null,
    onDocumentListener:(type,fn)=>{(listeners[type]??=[]).push(fn);}
  });
  g.store.set(KEY,raw);g.ctx.navigator={locks:new Locks()};
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  g.listeners=listeners;
  return g;
}
const disk=g=>JSON.parse(g.store.get(KEY));
function release(g){g.run('loadSave.writer.release()');}
function save(g){assert.equal(g.run('persist().ok'),true);return g.store.get(KEY);}
function click(g,name,value) {
  const button={tagName:'BUTTON',dataset:{[name]:String(value)}};
  const event={target:{closest:sel=>sel==='button, [data-fxu], .unit.tgt, .detail'?button:null},
    preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
  for(const fn of g.listeners.click||[])fn(event);
}
function corruptWrite(g,stage,after=false) {
  const original=g.ctx.localStorage.setItem;
  let failed=false;
  g.ctx.localStorage.setItem=(k,v)=>{
    if(k===stage&&!failed){
      failed=true;if(after)original(k,v);
      throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
    }
    original(k,v);
  };
  return ()=>failed;
}
function seed(g) {
  g.run('S.solari=100000;S.trials.folio={0:3};S.trialRuns={d:todayKey(),n:{folio:3}};' +
    'S.buys={d:todayKey(),n:{"post:pl":3}};');
  return save(g);
}
// T01: an unmodified legacy v1 save remains legal and needs no migration.
{
  const g=await boot(at(10));
  assert.equal(disk(g).v,1);
  assert.equal(g.run('todayKey.dayLedgerValid(S.buys)'),true);
  assert.equal(g.run('todayKey.dayLedgerValid(S.trialRuns)'),true);
  assert.equal(g.run('todayKey.dayLedgerRead(S.buys,todayKey())["post:pl"]'),undefined);
  release(g);pass('T01','legacy v1, no eager conversion or version change');
}
// T02: views across future/backward day never mutate a verified primary.
{
  const g=await boot(at(10)),old=seed(g);
  g.setNow(at(11));
  assert.equal(g.run('trialLeft(TR("folio"))'),3);
  assert.equal(g.run('shopLeft(findShopItem("post:pl"))'),3);
  assert.equal(g.run('S.trialRuns.n.folio'),3);
  assert.equal(g.run('S.buys.n["post:pl"]'),3);
  g.setNow(at(10));
  assert.equal(g.run('trialLeft(TR("folio"))'),0);
  assert.equal(g.run('shopLeft(findShopItem("post:pl"))'),0);
  assert.equal(g.store.get(KEY),old);
  release(g);pass('T02','clock-only views cannot erase spent entitlements');
}
// T03: a real verified Trial simulation on future day retains original day.
{
  const g=await boot(at(10)),old=seed(g),first=g.run('todayKey()');
  g.setNow(at(11));
  g.run("trialSimClick('folio:0:1')");
  const next=disk(g);
  assert.equal(next.trialRuns.n.folio,1);
  assert.equal(next.trialRuns.days[first].folio,3);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw,old);
  g.setNow(at(10));
  assert.equal(g.run('trialLeft(TR("folio"))'),0);
  const before=g.store.get(KEY);
  g.run("trialSimClick('folio:0:1')");
  assert.equal(g.store.get(KEY),before,'no rollback-day extra reward');
  release(g);
  const cold=await boot(at(10),before);
  assert.equal(cold.run('trialLeft(TR("folio"))'),0);
  release(cold);pass('T03','transactional Trial payout and cold-restart rollback');
}
// T04: paid shop transaction keeps previous stock, balances and backup exact.
{
  const g=await boot(at(10)),old=seed(g),first=g.run('todayKey()');
  g.setNow(at(11));
  click(g,'buy','post:pl');
  const next=disk(g);
  assert.equal(next.buys.n['post:pl'],1);
  assert.equal(next.buys.days[first]['post:pl'],3);
  assert.equal(next.solari,100000-6000);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw,old);
  g.setNow(at(10));
  assert.equal(g.run('shopLeft(findShopItem("post:pl"))'),0);
  const before=g.store.get(KEY);
  click(g,'buy','post:pl');
  assert.equal(g.store.get(KEY),before,'no refund, debit or double purchase');
  release(g);
  const cold=await boot(at(10),before);
  assert.equal(cold.run('shopLeft(findShopItem("post:pl"))'),0);
  release(cold);pass('T04','paid limits survive rollback without double charging');
}
// T05: multiple forward/backward calendar days restore the matching counts.
{
  const g=await boot(at(10));seed(g);
  g.setNow(at(11));
  g.run('trialRunsToday().folio=2;buysToday()["post:pl"]=2;');
  const second=g.run('todayKey()');save(g);
  g.setNow(at(12));
  g.run('trialRunsToday().folio=1;buysToday()["post:pl"]=1;');
  save(g);
  g.setNow(at(10));
  assert.equal(g.run('trialLeft(TR("folio"))'),0);
  assert.equal(g.run('shopLeft(findShopItem("post:pl"))'),0);
  g.setNow(at(11));
  assert.equal(g.run('trialLeft(TR("folio"))'),1);
  assert.equal(g.run('shopLeft(findShopItem("post:pl"))'),1);
  assert.equal(disk(g).trialRuns.days[second].folio,2);
  release(g);pass('T05','multiple stored days, no silent pruning');
}
// T06: malformed nested counters must fail closed, never re-open quota.
{
  const g=await boot(at(10));seed(g);
  g.run('S.trialRuns.days={"Sun Nov 01 2026":{folio:{bad:1}}};' +
    'S.buys.days={"Sun Nov 01 2026":{"post:pl":{bad:1}}};');
  assert.equal(g.run('trialLeft(TR("folio"))'),0);
  assert.equal(g.run('shopLeft(findShopItem("post:pl"))'),0);
  assert.equal(g.run('todayKey.dayLedgerValid(S.trialRuns)'),false);
  assert.equal(g.run('todayKey.dayLedgerValid(S.buys)'),false);
  release(g);pass('T06','corrupt history fails closed without being cleared');
}
// T07: quota during predecessor backup must not lose used days.
{
  const g=await boot(at(10)),old=seed(g);g.setNow(at(11));
  const failed=corruptWrite(g,BACKUP);
  g.run("trialSimClick('folio:0:1')");
  assert.equal(failed(),true);
  assert.equal(g.store.get(KEY),old);
  assert.equal(g.run('start.writerLifecycle().blocked'),true);
  pass('T07','backup quota abort preserves exact source primary');
}
// T08: write-then-throw is uncertain; a cold reload may inspect the new
// candidate but must never auto-retry a reward.
{
  const g=await boot(at(10));seed(g);const first=g.run('todayKey()');
  g.setNow(at(11));const failed=corruptWrite(g,KEY,true);
  g.run("trialSimClick('folio:0:1')");
  assert.equal(failed(),true);
  assert.equal(g.run('start.writerLifecycle().blocked'),true);
  const candidate=g.store.get(KEY);
  assert.equal(JSON.parse(candidate).trialRuns.days[first].folio,3);
  const cold=await boot(at(10),candidate);
  assert.equal(cold.run('trialLeft(TR("folio"))'),0);
  release(cold);pass('T08','uncertain write locks writer; past attempts survive reload');
}
// T09: native lease loss cannot authorize a purchase or trial payout.
{
  const g=await boot(at(10)),old=seed(g);g.setNow(at(11));release(g);
  click(g,'buy','post:pl');
  g.run("trialSimClick('folio:0:1')");
  assert.equal(g.store.get(KEY),old);
  pass('T09','lost native Web Lock cannot spend or grant rewards');
}
assert.equal(passed,9);
console.log('ARCH-02D-B4b2 '+passed+' daily-ledger cases PASS: '+html+
  ' TZ='+Intl.DateTimeFormat().resolvedOptions().timeZone);
