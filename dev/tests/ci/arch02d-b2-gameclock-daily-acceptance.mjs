// ARCH-02D-B2: centralized non-authoritative wall clock and single-operation
// daily/calendar snapshots. Execute against built PWA AND standalone HTML in TZ matrix.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html', KEY='dune-goh-v1';
const fixture=fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8');
const at=(y,m,d,h=12)=>Date.UTC(y,m-1,d,h), HOUR=3600000, DAY=24*HOUR;
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
let passed=0;
function pass(id,desc){passed++;console.log(id+' '+desc+' ['+zone+']');}
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
function fresh(now=at(2026,11,2)){return loadGame(html,{seed:83,now});}
async function boot(now=at(2026,11,2)){
  const overlay={innerHTML:''};
  const g=loadGame(html,{seed:83,now,
    onQuerySelector:selector=>selector==='#overlay2'?overlay:null});
  g.store.set(KEY,fixture);
  g.ctx.navigator={locks:new Locks()};
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  g.overlay=overlay;
  return g;
}
function release(g){g.run('loadSave.writer.release()');}
function snap(g){return JSON.parse(g.run('JSON.stringify(todayKey.clock.snapshot())'));}
function movingDate(g,from,to){
  const Real=g.ctx.Date;let reads=0;
  class MovingDate extends Real {
    constructor(...args){if(args.length)super(...args);else super(reads++===0?from:to);}
    static now(){return reads>0?to:from;}
  }
  g.ctx.Date=MovingDate;
  return ()=>{g.ctx.Date=Real;return reads;};
}
// B201: same local date/month as the frozen v141 legacy APIs; one snapshot is immutable.
{
  const now=at(2026,11,2,1),g=fresh(now),s=snap(g),native=new Date(now);
  assert.equal(s.now,now);assert.equal(s.day,native.toDateString());
  assert.equal(s.month,native.getFullYear()+'-'+(native.getMonth()+1));
  assert.equal(s.monthIndex,native.getMonth());assert.equal(s.weekday,native.getDay());
  assert.equal(g.run('todayKey()'),s.day);
  assert.equal(g.run('monthKey()'),s.month);
  assert.equal(g.run('monthHero()'),g.run('MONTH_HEROES['+s.monthIndex+']'));
  assert.equal(g.run('dly.clock === todayKey.clock'),true);
  assert.equal(g.run('Object.isFrozen(todayKey.clock.snapshot())'),true);
  pass('B201','legacy local-day/month identity and immutable one-shot GameClock');
}
// B202: midnight is computed from the same civil date, so 23/25-hour DST
// days are handled correctly in local time without UTC day normalization.
{
  const g=fresh();
  for (const [year,month,day] of [[2026,3,29],[2026,10,25],[2026,11,1],[2028,2,29],[2026,12,31]]) {
    const atNoon=g.run(`new Date(${year},${month-1},${day},12).getTime()`);
    g.setNow(atNoon);
    const s=snap(g),midnight=g.run(`new Date(${year},${month-1},${day+1}).getTime()`);
    assert.equal(s.now,atNoon);assert.equal(s.nextMidnight,midnight);
    assert.ok(s.nextMidnight>s.now);
    assert.equal(s.daysInMonth,new Date(year,month,0).getDate());
  }
  const spring=g.run('new Date(2026,2,30).getTime()-new Date(2026,2,29).getTime()');
  const fall=g.run('new Date(2026,9,26).getTime()-new Date(2026,9,25).getTime()');
  if(zone==='Europe/Amsterdam'){assert.equal(spring,23*HOUR);assert.equal(fall,25*HOUR);}
  pass('B202','DST 23/25h, leap Feb and year end local midnight');
}
// B203: central now() delegates exactly to legacy Date.now() for energy,
// including backwards time and capped forwards time. No persisted new field.
{
  const now=at(2026,11,2),g=await boot(now);
  assert.equal(g.run('todayKey.clock.now()'),now);
  g.run('S.water=0;S.candle=0;S.waterTs=Date.now();S.candleTs=Date.now()');
  g.setNow(now-2*DAY);g.run('tickWater()');
  assert.equal(g.run('S.water'),0);assert.equal(g.run('S.candle'),0);
  assert.equal(g.run('S.waterTs'),now);
  g.setNow(now+2*DAY);g.run('tickWater()');
  assert.equal(g.run('S.water'),g.run('WMAX()'));
  assert.equal(g.run('S.candle'),g.run('CMAX()'));
  assert.equal(g.run('Object.prototype.hasOwnProperty.call(S,"gameClock")'),false);
  release(g);pass('B203','legacy energy math, cap and same save v1 shape');
}
// B204: if local day changes between click and verified checkpoint, reject
// without writing an earlier-day reward, XP or one-time claim marker.
{
  const from=at(2026,11,2),to=from+DAY,g=await boot(from);
  g.run('S.daily={d:todayKey(),c:{login:1},got:{},chest:false};persist()');
  const raw=g.store.get(KEY),restore=movingDate(g,from,to);
  g.run('claimQuest("login")');
  assert.ok(restore()>=2,'a fresh time read must guard checkpoint');
  assert.equal(g.store.get(KEY),raw);
  assert.equal(g.run('S.daily.got.login'),undefined);
  release(g);pass('B204','daily claim rejects wall-day shift inside transaction');
}
// B205: all calendar modal fields derive from one local snapshot, even if
// subsequent wall-clock constructor calls would jump into a different month.
{
  const from=at(2026,11,30),to=at(2026,12,1),g=await boot(from);
  const restore=movingDate(g,from,to);
  g.run('openCalendar()');
  const reads=restore(),rendered=JSON.parse(g.run('JSON.stringify(claimLogin.rendered)'));
  assert.equal(rendered.day,new Date(from).toDateString());
  assert.equal(rendered.month,'2026-11');
  assert.ok(g.overlay.innerHTML.includes('Ноябрь 2026'));
  assert.ok(reads>=1);
  release(g);pass('B205','calendar month, hero and displayed claim stamp stay coherent');
}
// B206: same-month or cross-month Date jump inside verified calendar claim
// must not settle a stale login reward, month counter or inventory.
{
  const from=at(2026,11,30),to=at(2026,12,1),g=await boot(from);
  g.run('S.login={m:"2026-11",n:0,last:""};persist();openCalendar()');
  const raw=g.store.get(KEY),restore=movingDate(g,from,to);
  g.run('claimLogin()');
  assert.ok(restore()>=2,'calendar must recheck at checkpoint');
  assert.equal(g.store.get(KEY),raw);
  assert.equal(g.run('S.login.n'),0);
  release(g);pass('B206','calendar claim refuses cross-month transaction drift');
}
// B207: under a stable clock, original B5 paid flows still succeed with a
// verified writer; time snapshots alone consume no payout Math.random().
{
  const now=at(2026,11,2),g=await boot(now);
  const draw=g.ctx.Math.random;
  g.ctx.Math.random=()=>{throw Error('GameClock must not draw reward RNG');};
  g.run('todayKey.clock.snapshot();todayKey();monthKey();monthHero();monthDays();loginCan()');
  g.ctx.Math.random=draw;
  g.run('S.daily={d:todayKey(),c:{login:1},got:{},chest:false};persist()');
  const before=g.run('S.cry');
  g.run('claimQuest("login")');
  assert.equal(g.run('S.daily.got.login'),true);
  assert.equal(g.run('S.cry'),before+20);
  assert.equal(JSON.parse(g.store.get(KEY)).daily.got.login,true);
  release(g);pass('B207','stable B5 reward unchanged, no GameClock RNG draws');
}
assert.equal(passed,7);
console.log('ARCH-02D-B2 '+passed+' GameClock/daily/calendar scenarios PASS: '+html+' TZ='+zone);
