// ARCH-02D-B0: read-only characterization of published v141 clock/RNG semantics.
// This intentionally records known rollback weaknesses; do not "fix" expectations
// by changing production code, the v1 save schema, goldens or RNG draw order.
// Test on BOTH compiled PWA and standalone HTML, in several process TZ values.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1';
const fixture=fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8');
const HOUR=3600000, DAY=24*HOUR, at=(y,m,d,h=12)=>Date.UTC(y,m-1,d,h);
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const passed=[];
function pass(id,msg){passed.push(id);console.log(id+' '+msg+' ['+zone+']');}
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
async function boot(now=at(2026,11,2)){
  const g=loadGame(html,{seed:512,now});
  g.store.set(KEY,fixture);
  g.ctx.navigator={locks:new Locks()};
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  return g;
}
const fresh=(now=at(2026,11,2))=>loadGame(html,{seed:512,now});
function release(g){g.run('loadSave.writer.release()');}
const disk=g=>g.store.get(KEY);

// D001: the daily key is the locale's wall date, not the UTC ISO date.
{
  const time=at(2026,11,2,1),g=fresh(time);
  assert.equal(g.run('todayKey()'),new Date(time).toDateString());
  assert.equal(g.run('monthKey()'),new Date(time).getFullYear()+'-'+(new Date(time).getMonth()+1));
  assert.equal(g.run('trialOpen(TRIALS[0])'),true);
  pass('D001','local daily, month and trial-weekday identity');
}
// D002: UTC-SUNDAY rotation (epoch +4) and local-Monday Conquest week differ.
{
  const before=at(2026,10,31,23),after=at(2026,11,1,1),g=fresh(before);
  const oldNumber=g.run('weekNo()'),oldLocal=g.run('cqWeek()'),oldDay=g.run('todayKey()');
  g.setNow(after);
  assert.equal(g.run('weekNo()'),oldNumber+1,'trial rotation ticks at UTC Sunday (legacy +4 epoch formula)');
  assert.equal(g.run('cqWeek()'),new Date(after-( ((new Date(after).getDay()+6)%7)*DAY )).toDateString(),
    'local Monday must match the historical algorithm for this Sunday/Monday fixture');
  // Do not assert local dates differ: that depends on runner TZ.
  assert.ok(typeof oldLocal==='string'&&typeof oldDay==='string');
  pass('D002','UTC Sunday trial rotation versus local Monday Conquest boundary');
}
// D003: a local calendar month is reconstructed on reads, without side effects.
{
  const g=fresh(at(2026,2,28,12));
  assert.equal(g.run('monthKey()'),'2026-2');
  g.setNow(at(2026,3,1,12));
  assert.equal(g.run('monthKey()'),'2026-3');
  assert.equal(g.run('monthDays()'),31);
  g.setNow(at(2028,2,15,12));
  assert.equal(g.run('monthDays()'),29);
  pass('D003','month-end and leap-February historical values');
}
// D004: the daily loot/shop rotation is deterministic by local date,
// irrespective of unrelated Math.random state.
{
  const g=fresh(at(2026,11,2,12));
  const base=g.run('JSON.stringify(dailyHeroes("post",4))');
  const rand=g.ctx.Math.random;
  g.ctx.Math.random=()=>{throw Error('seeded shop must not draw global Math.random');};
  assert.equal(g.run('JSON.stringify(dailyHeroes("post",4))'),base);
  g.ctx.Math.random=rand;
  pass('D004','daily shop seeded generation independent of payout random source');
}
// D005: Conquest's observable rollback bug: cq() replaces the current week in RAM
// when the wall clock goes back seven days. This is characterization, not approval.
{
  const now=at(2026,11,2,12),g=await boot(now);
  g.run("(function(){const C=cq();C.diff='easy';C.done.__arch02d=1;persist()})()");
  const oldWeek=g.run('S.conq.wk'),before=disk(g);
  g.setNow(now-7*DAY);
  assert.notEqual(g.run('cqWeek()'),oldWeek,'must cross a legacy Conquest week');
  assert.equal(g.run('S.conq.done.__arch02d'),1);
  assert.equal(g.run('cq().done.__arch02d'),undefined,
    'known P1: read after clock rollback creates another weekly run in RAM');
  assert.equal(disk(g),before,'characterization does not commit accidental rollback');
  release(g);
  pass('D005','KNOWN WEAKNESS: backwards week recreates in-memory Conquest state');
}
// D006: at the same date a Conquest read should not discard progress.
{
  const g=await boot();
  g.run("(function(){const C=cq();C.done.__arch02d=2;persist()})()");
  const raw=disk(g),week=g.run('S.conq.wk');
  assert.equal(g.run('cq().done.__arch02d'),2);
  assert.equal(g.run('S.conq.wk'),week);
  assert.equal(disk(g),raw);release(g);
  pass('D006','same-week Conquest read stable and read-only');
}
// D007: forward wall jump regenerates water to bounded max;
// backward wall jump does not subtract water but can leave a future timestamp.
{
  const now=at(2026,11,2,12),g=await boot(now);
  g.run('S.water=0;S.candle=0;S.waterTs=Date.now();S.candleTs=Date.now()');
  g.setNow(now-48*HOUR);g.run('tickWater()');
  assert.equal(g.run('S.water'),0);assert.equal(g.run('S.candle'),0);
  const futureTimestamp=g.run('S.waterTs');assert.equal(futureTimestamp,now);
  g.setNow(now+48*HOUR);g.run('tickWater()');
  assert.equal(g.run('S.water'),g.run('WMAX()'));
  assert.equal(g.run('S.candle'),g.run('CMAX()'));
  release(g);
  pass('D007','bounded forward energy generation and backwards-time delay');
}
// D008: legacy no-seed battle RNG uses current time, including explicit 0.
{
  const now=at(2026,11,2),g=fresh(now);
  const reference=g.run('mkRng(Date.now())()');
  assert.equal(g.run('createBattle([],[],{seed:0}).rng()'),reference);
  assert.equal(g.run('createBattle([],[],{}).rng()'),reference);
  assert.equal(g.run('createBattle([],[],{seed:1}).rng()'),g.run('mkRng(1)()'));
  pass('D008','legacy battle seed=0 time fallback and fixed nonzero seed');
}
// D009: global loot draws are stable in order and count for a fixed random
// sequence; do not assume one draw per reward (branching consumes variable draws).
{
  const sample=()=>{
    const g=fresh(at(2026,11,2));
    const values=[.12,.91,.24,.33,.77,.04,.6,.2,.47,.82,.05,.9,.71,.14,.52,.02,.34,.41,.11,.79];
    let draws=0;
    g.ctx.Math.random=()=>values[(draws++)%values.length];
    const result=g.run('JSON.stringify([rollShards(NODES[0],false),trialRoll(TRIALS[0],0)])');
    return {result,draws};
  };
  const a=sample(),b=sample();
  assert.deepEqual(a,b);
  assert.ok(a.draws>=3,'both loot paths must consume random values');
  pass('D009','exact replay and draw-count of global shard/trial loot sources ('+a.draws+' draws)');
}
// D010: calendar backdating currently blocks already-claimed future-day token.
{
  const g=await boot(at(2026,11,2,12));
  g.run("S.login={m:'2026-11',n:6,last:'Fri Nov 06 2026'};persist()");
  const old=disk(g);
  assert.equal(g.run('loginCan()'),false);
  assert.equal(disk(g),old);release(g);
  pass('D010','existing B5b future-day login protection still read-only');
}
assert.equal(passed.length,10);
console.log('ARCH-02D-B0 '+passed.length+' clock/RNG characterization scenarios PASS: '+html+' TZ='+zone);
