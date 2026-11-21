// ARCH-02D-B1: explicit review of Conquest rollback behavior after B0 D005.
// Test the *compiled* PWA and standalone HTML in three timezones, with v1 saves.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1';
const fixture=fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8');
const DAY=86400000, at=(y,m,d)=>Date.UTC(y,m-1,d,12);
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
let passed=0;
class Locks {
  constructor(){this.held=false;}
  request(name,opts,cb){
    assert.equal(name,KEY+'.writer');assert.equal(opts.mode,'exclusive');
    assert.equal(opts.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>cb(null));
    this.held=true;
    return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
async function boot(now){
  const g=loadGame(html,{seed:512,now});
  g.store.set(KEY,fixture);
  g.ctx.navigator={locks:new Locks()};
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  return g;
}
function release(g){g.run('loadSave.writer.release()');}
function pass(name){passed++;console.log('B1 '+name+' PASS ['+zone+']');}
function setup(g){
  g.run("(function(){const C=cq();C.diff='easy';C.stars=100000;C.done.__b1=1;C.tk.c0=1;S.acc.lvl=99;S.cqUnlock={easy:C.wk};persist()})()");
}
function claimState(g){
  return JSON.stringify(g.run('({wk:S.conq.wk,done:S.conq.done.__b1,claimed:S.conq.tk.c0})'));
}

// B101: backwards week must preserve progress in RAM and not rewrite disk.
{
  const now=at(2026,11,9),g=await boot(now);setup(g);
  const oldWeek=g.run('S.conq.wk'),disk=g.store.get(KEY);
  assert.equal(g.run('cqCanClaim(1)'),true,'unclaimed chest is available at the true week');
  assert.equal(g.run('cqStCan(0)'),true,'unclaimed milestone is available at the true week');
  g.setNow(now-7*DAY);
  assert.notEqual(g.run('cqWeek()'),oldWeek);
  for(let i=0;i<3;i++){
    assert.equal(g.run('cq().wk'),oldWeek);
    assert.equal(g.run('cq().done.__b1'),1);
    assert.equal(g.run('cq().tk.c0'),1);
  }
  assert.equal(g.store.get(KEY),disk,'rollback reads cannot rewrite verified snapshot');
  release(g);pass('B101 preserve rollback state and snapshot');
}
// B102: while the clock is earlier than the preserved run, block weekly
// entitlements, including the next difficulty unlocked by a past-week spoof.
{
  const now=at(2026,11,9),g=await boot(now);setup(g);
  const before=claimState(g),disk=g.store.get(KEY);
  g.setNow(now-7*DAY);g.run('cq()');
  assert.equal(g.run('cqCanClaim(1)'),false);
  assert.equal(g.run('cqStCan(0)'),false);
  assert.equal(g.run('cqDifficultyAccess("normal")'),false);
  assert.equal(claimState(g),before);
  assert.equal(g.store.get(KEY),disk);
  g.setNow(now);
  assert.equal(g.run('cqCanClaim(1)'),true);
  assert.equal(g.run('cqStCan(0)'),true);
  assert.equal(g.run('cqDifficultyAccess("normal")'),false,'same-week unlock stays closed');
  assert.equal(claimState(g),before);
  release(g);pass('B102 rollback claim and difficulty fail closed; restoration stable');
}
// B103: legitimate next local Monday continues using historical forward reset.
{
  const now=at(2026,11,9),g=await boot(now);setup(g);
  const wk=g.run('S.conq.wk'),disk=g.store.get(KEY);
  g.setNow(now+7*DAY);
  const newWeek=g.run('cq().wk');
  assert.notEqual(newWeek,wk);
  assert.equal(newWeek,g.run('cqWeek()'));
  assert.equal(g.run('S.conq.diff'),null);
  assert.equal(g.run('S.conq.done.__b1'),undefined);
  assert.equal(g.run('S.conq.tk.c0'),undefined);
  assert.equal(g.run('cqDifficultyAccess("normal")'),true,'completed earlier week opens next difficulty');
  assert.equal(g.run('cq().wk'),newWeek,'second read must not reset again');
  assert.equal(g.store.get(KEY),disk,'reading rollover alone cannot persist');
  release(g);pass('B103 historical forward Monday reset and next-week unlock');
}
// B104: local-week ordering works across the calendar year, no string
// lexical compare, no saved field or schema migration required.
{
  const now=at(2026,12,28),g=await boot(now);setup(g);
  const oldWeek=g.run('S.conq.wk');
  g.setNow(now-7*DAY);
  assert.equal(g.run('cq().wk'),oldWeek);
  assert.equal(g.run('cq().done.__b1'),1);
  g.setNow(at(2027,1,4));
  assert.equal(g.run('cq().wk'),g.run('cqWeek()'));
  assert.notEqual(g.run('S.conq.wk'),oldWeek);
  assert.equal(g.run('S.conq.done.__b1'),undefined);
  release(g);pass('B104 Dec-Jan backwards and forwards');
}
// B105: rollback across the autumn DST transition in both EU and US timezones
// keeps the newer state; no timezone-dependent lexical ordering.
{
  const now=at(2026,11,2),g=await boot(now);setup(g);
  const oldWeek=g.run('S.conq.wk'),disk=g.store.get(KEY);
  g.setNow(at(2026,10,26));
  assert.equal(g.run('cq().wk'),oldWeek);
  assert.equal(g.run('S.conq.tk.c0'),1);
  assert.equal(g.store.get(KEY),disk);
  release(g);pass('B105 autumn DST rollback retains entitlements');
}
assert.equal(passed,5);
console.log('ARCH-02D-B1 '+passed+' verified Conquest scenarios PASS: '+html+' TZ='+zone);
