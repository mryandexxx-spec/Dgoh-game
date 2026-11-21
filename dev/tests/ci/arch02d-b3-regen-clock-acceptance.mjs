// ARCH-02D-B3 — monotonic in-session Water/Candle/Conquest regen.
// Real compiled PWA and standalone HTML, under multiple TZs. A browser has
// no trusted elapsed-time source across restarts; this is a session guard.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html', KEY='dune-goh-v1';
const fixture=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8'));
const at=(y,m,d,h=12)=>Date.UTC(y,m-1,d,h);
const HOUR=3600000, DAY=24*HOUR, zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
let passed=0;const pass=(id,description)=>{passed++;console.log('  '+id+' '+description+' ['+zone+']');};
class Locks {
  constructor(){this.held=false;}
  request(name,options,cb){
    assert.equal(name,KEY+'.writer');
    assert.equal(options.mode,'exclusive');assert.equal(options.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>cb(null));
    this.held=true;return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
async function boot(now=at(2026,11,9),save=fixture){
  const g=loadGame(html,{seed:109,now});
  const mono={value:1000};
  // Deliberately decouple monotonic time from the VM Date clock: the
  // baseline fixture performance.now() follows Date.setNow().
  g.ctx.performance.now=()=>mono.value;
  g.store.set(KEY,JSON.stringify(save));
  g.ctx.navigator={locks:new Locks()};
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  assert.equal(g.run('todayKey.clock.regenNow()'),now,'boot must anchor monotonic clock');
  g.mono=mono;
  return g;
}
const release=g=>g.run('loadSave.writer.release()');
const snap=g=>JSON.parse(g.run('JSON.stringify(S)'));
function prepare(g) {
  g.run(`(()=>{S.water=0;S.candle=0;S.waterTs=Date.now();S.candleTs=Date.now();
    const C=cq();C.diff='easy';C.en=0;C.enTs=Date.now();C.sta.leto={v:40,t:Date.now()};})()`);
}
function advance(g,delta){g.mono.value+=delta;}
function realNow(g){return g.run('todayKey.clock.regenNow()');}

// B301: Date.now() +48h inside the already-booted session is NOT elapsed
// time for Water and Candles; keep both balances and stamps unchanged.
{
  const now=at(2026,11,9),g=await boot(now);prepare(g);
  const disk=g.store.get(KEY),before=snap(g);
  g.setNow(now+2*DAY);g.run('tickWater()');
  assert.equal(g.run('S.water'),0);assert.equal(g.run('S.candle'),0);
  assert.equal(g.run('S.waterTs'),now);assert.equal(g.run('S.candleTs'),now);
  assert.equal(realNow(g),now);
  assert.equal(g.store.get(KEY),disk,'read must not write to storage');
  assert.equal(before.water,0);
  release(g);pass('B301','forward wall spoof cannot award Water/Candles');
}
// B302: neither Conquest resolve nor hero stamina can regenerate on that
// same spoof. The countdown also uses the same monotonic elapsed time.
{
  const now=at(2026,11,9),g=await boot(now);prepare(g);
  const saved=g.store.get(KEY);
  g.setNow(now+2*DAY);
  assert.equal(g.run('cqEn()'),0);
  assert.equal(g.run('cqSta("leto")'),40);
  assert.equal(g.run('S.conq.enTs'),now);
  assert.equal(g.run('cqEnNext()'),g.run('CQ_EN.sec'));
  assert.equal(g.store.get(KEY),saved);
  release(g);pass('B302','forward wall spoof cannot award Resolve/hero stamina');
}
// B303: genuine monotonic elapsed time regenerates the same integer
// quantities, even while wall clock remains at a forged future value.
{
  const now=at(2026,11,9),g=await boot(now);prepare(g);
  const water=g.run('WATER_SEC'),candle=g.run('CANDLE_SEC'),resolve=g.run('CQ_EN.sec');
  const ms=Math.max(water,candle,resolve)*1000;
  g.setNow(now+2*DAY);advance(g,ms);
  g.run('tickWater();cqEn()');
  assert.equal(g.run('S.water'),Math.floor(ms/(water*1000)));
  assert.equal(g.run('S.candle'),Math.floor(ms/(candle*1000)));
  assert.equal(g.run('S.conq.en'),Math.floor(ms/(resolve*1000)));
  assert.equal(realNow(g),now+ms);
  assert.equal(g.run('S.waterTs'),now+Math.floor(ms/(water*1000))*water*1000);
  release(g);pass('B303','real monotonic elapsed time preserves regen rates');
}
// B304: moving the device clock -48h does not make the session's synthetic
// time go backwards or delay subsequent positive monotonic regeneration.
{
  const now=at(2026,11,9),g=await boot(now);prepare(g);
  const sec=g.run('WATER_SEC');
  g.setNow(now-2*DAY);advance(g,sec*1000);
  g.run('tickWater()');
  assert.equal(g.run('S.water'),1);assert.equal(realNow(g),now+sec*1000);
  assert.ok(g.run('S.waterTs')>g.run('Date.now()'));
  // The same normal session path must continue without a resource reset.
  advance(g,sec*1000);g.run('tickWater()');
  assert.equal(g.run('S.water'),2);
  release(g);pass('B304','backward wall jump does not freeze session regeneration');
}
// B305: spending from a full resource cap cannot write a spoofed FUTURE
// timestamp, causing a delayed cooldown when the user corrects the date.
{
  const now=at(2026,11,9),g=await boot(now);
  g.run('S.water=WMAX();S.waterTs=Date.now();cq().en=CQ_EN.max;');
  g.setNow(now+2*DAY);
  g.run('enSpend("water",1)');
  assert.equal(g.run('S.waterTs'),now);
  assert.equal(g.run('S.water'),g.run('WMAX()')-1);
  assert.equal(g.run('cqEnSpend(1)'),true);
  assert.equal(g.run('S.conq.enTs'),now);
  // Exact milliseconds survive a regular verified checkpoint.
  assert.equal(g.run('persist().ok'),true);
  assert.equal(JSON.parse(g.store.get(KEY)).waterTs,now);
  release(g);pass('B305','energy spend timestamps use monotonic time, not a spoofed future');
}
// B306: Conquest stamina consumed during spoof must stamp the same
// synthetic time and never become negative on a previous/future save.
{
  const now=at(2026,11,9),g=await boot(now);prepare(g);
  g.setNow(now+2*DAY);
  g.run('cqStaSet("leto",35)');
  assert.equal(g.run('S.conq.sta.leto.t'),now);
  g.setNow(now-2*DAY);
  assert.equal(g.run('cqSta("leto")'),35);
  advance(g,g.run('CQ_STA.regenMin')*60000);
  assert.equal(g.run('cqSta("leto")'),36);
  g.run('S.conq.sta.leto.t=Date.now()+1e12');
  assert.equal(g.run('cqSta("leto")'),35,'future legacy timestamp cannot subtract stamina');
  release(g);pass('B306','hero stamina monotonic and never negative on future saved timestamp');
}
// B307: a regressing, NaN, or tampered monotonic reading cannot trigger
// a re-anchor against Date.now() and mint a wall-clock-forward reward.
{
  const now=at(2026,11,9),g=await boot(now);prepare(g);
  const sec=g.run('WATER_SEC');
  advance(g,sec*1000);g.run('tickWater()');
  assert.equal(g.run('S.water'),1);
  g.mono.value=0;g.setNow(now+2*DAY);
  assert.equal(realNow(g),now+sec*1000);
  g.run('tickWater()');
  assert.equal(g.run('S.water'),1);
  g.ctx.performance.now=()=>NaN;
  assert.equal(realNow(g),now+sec*1000);
  g.run('tickWater()');
  assert.equal(g.run('S.water'),1);
  release(g);pass('B307','invalid/regressing monotonic samples fail closed');
}
// B308: ordinary offline accumulation remains identical on the first
// booted tick, with the same caps. This is an EXPLICIT unsolved trust limit.
{
  const now=at(2026,11,9);
  const previous=structuredClone(fixture);
  previous.water=0;previous.candle=0;
  previous.waterTs=now-2*DAY;previous.candleTs=now-2*DAY;
  const g=await boot(now,previous);
  g.run('tickWater()');
  assert.equal(g.run('S.water'),g.run('WMAX()'));
  assert.equal(g.run('S.candle'),g.run('CMAX()'));
  assert.equal(g.run('S.v'),1);
  assert.equal(g.run('S.waterTs'),now);
  release(g);pass('B308','legacy offline gains/caps remain (no cross-session trusted time)');
}
// B309: no new persisted keys, no changes in schema, and no RNG draws;
// genuine monotonic ticking cannot duplicate or create any claim token.
{
  const now=at(2026,11,9),g=await boot(now);prepare(g);
  const old=snap(g),origRand=g.ctx.Math.random;
  g.ctx.Math.random=()=>{throw Error('regen clock must not draw RNG');};
  advance(g,g.run('WATER_SEC')*1000);
  g.run('tickWater();cqEn();cqSta("leto")');
  g.ctx.Math.random=origRand;
  assert.equal(g.run('S.v'),1);
  assert.deepEqual(Object.keys(snap(g)).sort(),Object.keys(old).sort());
  assert.deepEqual(Object.keys(snap(g).conq).sort(),Object.keys(old.conq).sort());
  assert.equal(g.run('persist().ok'),true);
  assert.deepEqual(Object.keys(JSON.parse(g.store.get(KEY))).sort(),Object.keys(old).sort());
  release(g);pass('B309','v1 save shape, RNG and claim markers remain unchanged');
}
// B310: a forged future wall clock must not corrupt the visible Water
// countdown or the verified purchase refill timestamp.
{
  const now=at(2026,11,9),g=await boot(now);prepare(g);
  const originalDocument=g.ctx.document;
  const box={innerHTML:'',children:[]};
  g.ctx.document={querySelectorAll:selector=>selector==='.resbox'?[box]:[]};
  g.setNow(now+2*DAY);
  g.run('renderRes()');
  assert.ok(box.innerHTML.includes('Вода · +1 через '+g.run('WATER_SEC')+'с'),
    'visible Water countdown must use same in-session monotonic time');
  g.ctx.document=originalDocument;
  g.run('S.cry=1000;S.water=WMAX()-1;S.waterTs=todayKey.clock.regenNow()');
  const before=g.run('S.cry');
  g.run('doRefill("water")');
  assert.ok(g.run('S.cry')<before,'verified refill should charge exactly once');
  assert.equal(g.run('S.waterTs'),now,
    'purchased refill cannot persist spoofed future wall timestamp');
  assert.equal(JSON.parse(g.store.get(KEY)).waterTs,now);
  release(g);pass('B310','Water countdown and verified refill keep monotonic stamps');
}
assert.equal(passed,10);
console.log('ARCH-02D-B3 '+passed+' monotonic regen scenarios PASS: '+html+' TZ='+zone);
