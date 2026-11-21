// ARCH-02D-B4a — cross-session wall-clock policy characterization.
// Observation, NOT fraud prevention: an offline browser cannot authenticate
// elapsed time between separate PWA processes. No game/runtime modification.
// Execute real compiled PWA + standalone HTML under UTC / Amsterdam / LA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html', KEY='dune-goh-v1';
const fixture=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8'));
const HOUR=3600000, DAY=24*HOUR;
const at=(y,m,d,h=12)=>new Date(y,m-1,d,h).getTime();
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
let passed=0;
function pass(id,desc){passed++;console.log('  '+id+' '+desc+' ['+zone+']');}
class Locks {
  constructor(){this.held=false;}
  request(name,options,cb){
    assert.equal(name,KEY+'.writer');
    assert.equal(options.mode,'exclusive');
    assert.equal(options.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>cb(null));
    this.held=true;
    return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
async function boot(now,save=fixture,{offline=false}={}){
  const g=loadGame(html,{seed:113,now});
  const mono={value:1000};
  g.ctx.performance.now=()=>mono.value; // newly started process, independent of Date
  if(offline)g.ctx.fetch=()=>{throw Error('unexpected network time dependency');};
  g.store.set(KEY,typeof save==='string'?save:JSON.stringify(save));
  g.ctx.navigator={locks:new Locks()};
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  assert.equal(g.run('todayKey.clock.regenNow()'),now);
  g.mono=mono;
  return g;
}
function release(g){g.run('loadSave.writer.release()');}
function emptyEnergy(stamp){
  const s=structuredClone(fixture);
  s.water=0;s.candle=0;s.waterTs=stamp;s.candleTs=stamp;
  return s;
}
function snapshot(g){return JSON.parse(g.run('JSON.stringify(S)'));}
function checkpoint(g){
  assert.equal(g.run('persist().ok'),true);
  return g.store.get(KEY);
}

// B401: a legitimately closed PWA must retain its full historical offline
// regeneration. Restart from a verified v1 checkpoint, not a shared JS heap.
{
  const start=at(2026,11,10),end=start+2*DAY;
  const g=await boot(end,emptyEnergy(start));
  g.run('tickWater()');
  assert.equal(g.run('S.water'),g.run('WMAX()'));
  assert.equal(g.run('S.candle'),g.run('CMAX()'));
  const raw=checkpoint(g);
  assert.equal(JSON.parse(raw).v,1);
  release(g);
  const reopened=await boot(end,raw);
  assert.equal(reopened.run('S.water'),reopened.run('WMAX()'));
  assert.equal(reopened.run('S.candle'),reopened.run('CMAX()'));
  release(reopened);
  pass('B401','honest offline 48h + verified v1 reopen preserves resources');
}

// B402 (known vulnerability): pre-launch +48h spoof and an actual +48h
// absence are indistinguishable to a fully offline local-only application.
// This intentionally CHARACTERIZES the exposure; it is not a security pass.
{
  const start=at(2026,11,10),saved=emptyEnergy(start);
  const honest=await boot(start+2*DAY,saved);
  const spoofed=await boot(start+2*DAY,saved);
  honest.run('tickWater()');spoofed.run('tickWater()');
  assert.equal(honest.run('S.water'),spoofed.run('S.water'));
  assert.equal(honest.run('S.candle'),spoofed.run('S.candle'));
  assert.equal(spoofed.run('S.water'),spoofed.run('WMAX()'));
  release(honest);release(spoofed);
  pass('B402','KNOWN LIMIT: spoof before relaunch looks like honest offline time');
}

// B403: backdated device time on a new process may defer future accrual,
// but cannot erase an existing resource or silently rewrite timestamps.
{
  const start=at(2026,11,10),s=emptyEnergy(start);
  s.water=3;s.candle=2;
  const g=await boot(start-2*DAY,s);
  g.run('tickWater()');
  assert.equal(g.run('S.water'),3);
  assert.equal(g.run('S.candle'),2);
  assert.equal(g.run('S.waterTs'),start);
  assert.equal(g.run('S.candleTs'),start);
  assert.equal(g.store.get(KEY),JSON.stringify(s),'read must not alter verified disk');
  release(g);
  pass('B403','backward relaunch retains earned balances and future stamps');
}

// B404: correcting a spoofed wall clock during the new session must not
// claw back resources already credited at boot or reverse the B3 clock.
{
  const start=at(2026,11,10),g=await boot(start+2*DAY,emptyEnergy(start));
  g.run('tickWater()');
  const amount=g.run('S.water'),anchor=g.run('todayKey.clock.regenNow()');
  g.setNow(start);g.run('tickWater()');
  assert.equal(g.run('S.water'),amount);
  assert.equal(g.run('todayKey.clock.regenNow()'),anchor);
  release(g);
  pass('B404','wall correction within relaunched process never clawbacks energy');
}

// B405: ordinary same-week Conquest offline Resolve/stamina regeneration,
// token preservation and verified checkpoint survive process restart.
{
  const start=at(2026,11,10);
  const first=await boot(start);
  first.run('(()=>{const C=cq();C.diff="easy";C.en=0;C.enTs=Date.now();C.sta.leto={v:40,t:Date.now()};C.done.b4probe=1;C.tk.b4probe=1;})()');
  const wk=first.run('cq().wk'),raw=checkpoint(first);
  release(first);
  const second=await boot(start+2*DAY,raw);
  assert.equal(second.run('cq().wk'),wk);
  assert.equal(second.run('cqEn()'),second.run('CQ_EN.max'));
  const minutes=second.run('CQ_STA.regenMin');
  assert.equal(second.run('cqSta("leto")'),Math.min(100,40+Math.floor(2*DAY/(minutes*60000))));
  assert.equal(second.run('cq().done.b4probe'),1);
  assert.equal(second.run('cq().tk.b4probe'),1);
  assert.equal(second.store.get(KEY),raw);
  release(second);
  pass('B405','same-week Conquest offline energy/stamina and claims preserved');
}

// B406 (known forward-clock exposure): advancing to the following local
// Monday creates a new Conquest run in RAM. Never checkpoint this simulated
// forged reset; retain the verified old run on disk.
{
  const start=at(2026,11,10),first=await boot(start);
  first.run('(()=>{const C=cq();C.diff="easy";C.done.b4probe=1;C.tk.b4probe=1;})()');
  const wk=first.run('cq().wk'),raw=checkpoint(first);
  release(first);
  const jump=await boot(start+8*DAY,raw);
  assert.notEqual(jump.run('cq().wk'),wk);
  assert.equal(jump.run('cq().tk.b4probe'),undefined);
  assert.equal(jump.store.get(KEY),raw);
  release(jump);
  pass('B406','KNOWN LIMIT: forward local week causes Conquest reset in RAM');
}

// B407 (known daily entitlement exposure): forward-day restart rolls normal
// daily/Trial/shop ledgers by the original local-date rules. It cannot by
// itself mint a paid reward or write to storage without a writer checkpoint.
{
  const start=at(2026,11,10),first=await boot(start);
  first.run('S.daily={d:todayKey(),c:{login:1},got:{login:true},chest:false};S.trialRuns={d:todayKey(),n:{folio:3}};S.buys={d:todayKey(),n:{"post:pl":3}};');
  const raw=checkpoint(first);
  release(first);
  const next=await boot(start+DAY,raw);
  assert.equal(next.run('dly().d'),next.run('todayKey()'));
  assert.equal(next.run('dly().got.login'),undefined);
  assert.equal(next.run('trialRunsToday().folio'),undefined);
  assert.equal(next.run('shopLeft({key:"post:pl",lim:3})'),3);
  assert.equal(next.store.get(KEY),raw);
  release(next);
  pass('B407','KNOWN LIMIT: local daily/Trial/shop entitlement rotation');
}

// B408: spring/fall DST durations must be based on actual elapsed UTC ms,
// not 24-hour calendar arithmetic. Original local key/regen policies stay.
{
  const spring=at(2026,3,30)-at(2026,3,28);
  const autumn=at(2026,10,26)-at(2026,10,24);
  assert.equal(spring,(zone==='Europe/Amsterdam'?47:48)*HOUR);
  assert.equal(autumn,(zone==='Europe/Amsterdam'?49:48)*HOUR);
  for(const [start,end] of [[at(2026,3,28),at(2026,3,30)],[at(2026,10,24),at(2026,10,26)]]){
    const g=await boot(end,emptyEnergy(start));
    g.run('tickWater()');
    assert.equal(g.run('S.water'),g.run('WMAX()'));
    assert.equal(g.run('S.candle'),g.run('CMAX()'));
    release(g);
  }
  pass('B408','DST 23/25-hour days do not lose offline capped accrual');
}

// B409: import-style legacy v1 data remains loadable and checkpointable
// without introducing persisted trust flags, schema changes or a migration.
{
  const start=at(2026,11,10),g=await boot(start,fixture);
  const original=snapshot(g);
  assert.equal(original.v,1);
  assert.equal(Object.prototype.hasOwnProperty.call(original,'trustedClock'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(original,'gameClock'),false);
  const raw=checkpoint(g),written=JSON.parse(raw);
  assert.deepEqual(Object.keys(written).sort(),Object.keys(original).sort());
  release(g);
  const imported=await boot(start,raw);
  assert.equal(imported.run('S.v'),1);
  assert.deepEqual(Object.keys(snapshot(imported)).sort(),Object.keys(original).sort());
  release(imported);
  pass('B409','legacy dune-goh-v1 import/restart retains exact save keys');
}

// B410: no mandatory network/time service. Offline startup continues using
// native Web Locks and verified writer; no source may pretend Date is trusted.
{
  const start=at(2026,11,10),g=await boot(start,fixture,{offline:true});
  const before=g.run('todayKey.clock.now()');
  g.mono.value+=g.run('WATER_SEC')*1000;
  assert.equal(g.run('todayKey.clock.now()'),before);
  assert.equal(g.run('todayKey.clock.regenNow()'),start+g.run('WATER_SEC')*1000);
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  checkpoint(g);
  release(g);
  pass('B410','fully offline v1 writer boot; clock remains non-authoritative');
}

assert.equal(passed,10);
console.log('ARCH-02D-B4a '+passed+' cross-session characterization scenarios PASS: '+html+' TZ='+zone);
