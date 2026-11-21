// ARCH-02D-B4b0 — forward day/week clock spoof: entitlement and preservation baseline.
// Intentionally captures CURRENT behavior (including known vulnerabilities).
// This adds no runtime enforcement and does not mark client-local time as trusted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html', KEY='dune-goh-v1';
const fixture=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8'));
const DAY=86400000, zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const at=(y,m,d,h=12)=>new Date(y,m-1,d,h).getTime();
let passed=0;
function pass(id,desc){passed++;console.log('  '+id+' '+desc+' ['+zone+']');}
class Locks {
  constructor(){this.held=false;}
  request(name,options,cb){
    assert.equal(name,KEY+'.writer');
    assert.equal(options.mode,'exclusive');assert.equal(options.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>cb(null));
    this.held=true;
    return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
async function boot(now,save=fixture) {
  const g=loadGame(html,{seed:127,now}),mono={now:1000};
  g.ctx.performance.now=()=>mono.now;
  g.store.set(KEY,typeof save==='string'?save:JSON.stringify(save));
  g.ctx.navigator={locks:new Locks()};
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  g.mono=mono;return g;
}
function release(g){g.run('loadSave.writer.release()');}
function checkpoint(g){assert.equal(g.run('persist().ok'),true);return g.store.get(KEY);}
function markedRun(g) {
  g.run('(()=>{const C=cq();C.diff="easy";C.done.b4b=1;C.tk.b4b=1;C.stars=25;})()');
  return {wk:g.run('cq().wk'),raw:checkpoint(g)};
}

// B411: reading a *forward* week resets an existing Conquest run in RAM,
// but until checkpoint the verified previous-week record is intact on disk.
{
  const start=at(2026,11,10),first=await boot(start);
  const {wk,raw}=markedRun(first);release(first);
  const g=await boot(start+8*DAY,raw);
  const disk=g.store.get(KEY);
  assert.equal(JSON.parse(disk).conq.tk.b4b,1);
  assert.notEqual(g.run('cq().wk'),wk);
  assert.equal(g.run('cq().tk.b4b'),undefined);
  assert.equal(g.run('cq().done.b4b'),undefined);
  assert.equal(g.store.get(KEY),disk,'read must not itself write to disk');
  release(g);
  pass('B411','KNOWN P1: forward-week read drops prior Conquest run in RAM');
}

// B412: if any legitimate verified checkpoint persists that forward-week
// view, B1 correctly blocks backward-week access but cannot resurrect the
// earlier weekly run. This is a SAVE-SAFETY design problem, not just anti-cheat.
{
  const start=at(2026,11,10),first=await boot(start);
  const {wk,raw}=markedRun(first);release(first);
  const forward=await boot(start+8*DAY,raw);
  assert.notEqual(forward.run('cq().wk'),wk);
  const advanced=checkpoint(forward);
  assert.notEqual(JSON.parse(advanced).conq.wk,wk);
  release(forward);
  const back=await boot(start,advanced);
  assert.notEqual(back.run('cq().wk'),wk);
  assert.equal(back.run('cq().done.b4b'),undefined);
  assert.equal(back.run('cq().tk.b4b'),undefined);
  assert.equal(back.run('cqCanClaim(0)'),false);
  release(back);
  pass('B412','KNOWN P1: verified future-week save can lose prior entitlement');
}

// B413: the historical local Monday boundary legitimately changes Conquest
// once; B4b must never silently convert the rule to a UTC week.
{
  const sunday=at(2026,11,8,23),monday=at(2026,11,9,1);
  const first=await boot(sunday);
  const {wk,raw}=markedRun(first);release(first);
  const next=await boot(monday,raw);
  const newWeek=next.run('cq().wk');
  assert.notEqual(newWeek,wk);
  assert.equal(next.run('cq().wk'),newWeek);
  assert.equal(next.run('cqCanClaim(0)'),false);
  release(next);
  pass('B413','legitimate local Monday Conquest rollover unchanged');
}

// B414: unlike daily-quest rollback, Trial attempt ledger rotates on *any*
// local-day change. A +1 day followed by -1 day may clear the original
// exhausted attempts twice, even though no real day has elapsed.
{
  const start=at(2026,11,10),g=await boot(start);
  g.run('S.trialRuns={d:todayKey(),n:{folio:3}}');
  const saved=checkpoint(g);
  assert.equal(g.run('trialLeft(TR("folio"))'),0);
  g.setNow(start+DAY);
  assert.equal(g.run('trialLeft(TR("folio"))'),3);
  assert.equal(g.run('S.trialRuns.n.folio'),undefined);
  g.setNow(start);
  assert.equal(g.run('trialLeft(TR("folio"))'),3);
  assert.equal(g.run('S.trialRuns.n.folio'),undefined);
  assert.equal(JSON.parse(saved).trialRuns.n.folio,3);
  release(g);
  pass('B414','KNOWN P1: Trial attempts can reset on forward-back day flip');
}

// B415: shop VIEW stays read-only, but a paid purchase invokes the mutable
// current-day ledger. Clock spoof plus return can reopen a prior-day quota.
// No paid action or RNG draw is performed by this characterization.
{
  const start=at(2026,11,10),g=await boot(start);
  g.run('S.buys={d:todayKey(),n:{"post:pl":3}}');
  const old=checkpoint(g);
  assert.equal(g.run('shopLeft({key:"post:pl",lim:3})'),0);
  g.setNow(start+DAY);
  assert.equal(g.run('shopLeft({key:"post:pl",lim:3})'),3);
  assert.equal(g.run('S.buys.n["post:pl"]'),3,'stock read must not erase ledger');
  g.run('buysToday()');
  assert.equal(g.run('S.buys.n["post:pl"]'),undefined);
  g.setNow(start);
  g.run('buysToday()');
  assert.equal(g.run('shopLeft({key:"post:pl",lim:3})'),3);
  assert.equal(JSON.parse(old).buys.n['post:pl'],3);
  release(g);
  pass('B415','KNOWN P1: shop paid-ledger day flip can reopen limits');
}

// B416: existing B5 daily-quest ledger blocks backwards *from a saved future
// day* rather than creating another reward cycle. This is a limited guard,
// not proof that the newly reached forward date is genuine.
{
  const start=at(2026,11,10),g=await boot(start);
  g.run('S.daily={d:todayKey(),c:{login:1},got:{login:true},chest:false}');
  const original=g.run('S.daily.d');
  g.setNow(start+DAY);
  assert.notEqual(g.run('dly().d'),original);
  const forward=g.run('dly().d');
  g.setNow(start);
  assert.equal(g.run('dly().d'),forward);
  assert.equal(g.run('S.daily.got.login'),undefined);
  release(g);
  pass('B416','daily-quest backwards guard remains (forward date still untrusted)');
}

// B417: B1 backward-week guard protects the *existing newer* run and denies
// paid weekly claims while device date is earlier. This is complementary to,
// not a repair for, the B412 forward-write loss.
{
  const start=at(2026,11,10),first=await boot(start);
  const {wk,raw}=markedRun(first);release(first);
  const back=await boot(start-8*DAY,raw);
  assert.equal(back.run('cq().wk'),wk);
  assert.equal(back.run('cq().tk.b4b'),1);
  assert.equal(back.run('cqCanClaim(0)'),false);
  release(back);
  pass('B417','backward Conquest preserved run and fail-closed claims');
}
assert.equal(passed,7);
console.log('ARCH-02D-B4b0 '+passed+' entitlement-clock baseline scenarios PASS: '+html+' TZ='+zone);
