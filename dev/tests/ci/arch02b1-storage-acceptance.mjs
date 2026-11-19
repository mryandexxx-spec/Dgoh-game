// ARCH-02B1 — SAFETY acceptance: real PWA/artifact JavaScript in isolated VM.
// This intentionally REVERSES v137's unsafe B0 oracle. Baseline evidence remains
// in B0's pinned commit and CI logs; no browser/local profile is ever touched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const KEY = 'dune-goh-v1';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/saves');
const readFixture = name => JSON.stringify(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
const old = readFixture('01-legacy-v1.json');
const check = [];
const seen = (id, message) => { check.push(id); console.log('  ' + id + ' [B1 SAFE] ' + message); };
const init = () => {
  const g = loadGame(html, {seed: 7});
  assert.equal(g.get('SAVE_KEY'), KEY);
  // Mandatory B3: this VM now grants the same exclusive native lease shape
  // as the browser; no old synchronous/unguarded start() path is exercised.
  let occupied = false;
  g.ctx.navigator = {locks:{request(name,opts,fn){
    assert.equal(name,KEY+'.writer');
    assert.equal(opts.mode,'exclusive');
    assert.equal(opts.ifAvailable,true);
    if(occupied)return Promise.resolve().then(()=>fn(null));
    occupied=true;
    return Promise.resolve().then(()=>fn({name,mode:'exclusive'}))
      .finally(()=>{occupied=false;});
  }}};
  return g;
};
const state = g => JSON.parse(g.run('JSON.stringify(S)'));
const details = g => JSON.parse(g.run('JSON.stringify(loadSave(true))'));
const fault = (g, {read = null, write = null} = {}) => {
  const get = g.ctx.localStorage.getItem, set = g.ctx.localStorage.setItem;
  const ops = [];
  g.ctx.localStorage.getItem = k => {
    ops.push('get:' + k);
    if (k === KEY && read) throw Object.assign(new Error('test read'), {name: read});
    return get(k);
  };
  g.ctx.localStorage.setItem = (k,v) => {
    ops.push('set:' + k);
    if (k === KEY && write) throw Object.assign(new Error('test write'), {name: write});
    return set(k,v);
  };
  return ops;
};
// This probes a save written by actual gameplay, not just static fixtures.
const roundtrip = (g, label) => {
  const result = details(g);
  if (result.status !== 'ok') {
    const s = JSON.parse(g.store.get(KEY));
    const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
    const numeric = k => typeof s[k] === 'number' && Number.isFinite(s[k]) && s[k] >= 0;
    const bad = {
      status: result.status,
      numbers: ['water','solari','plast','candle','cry','folio','seal','rid','wol','core','teeth'].filter(k => k in s && !numeric(k)),
      records: ['cleared','daily','login','conq','journey','journeys','migrations','inv','gearParts','gearOwned','cryClaim','sealClaim','refills','buys'].filter(k => k in s && s[k] !== null && !record(s[k])),
      squads: ['squad','squadD','squadC','raidPick','jPick'].filter(k => k in s && !Array.isArray(s[k]))
        .concat('squadTr' in s && !record(s.squadTr) && !Array.isArray(s.squadTr) ? ['squadTr'] : []),
      heroes: Object.entries(s.roster || {}).filter(([id,h]) => !record(h) ||
        ['shards','stars','lvl','gear'].some(k => k in h && !(typeof h[k]==='number' && Number.isFinite(h[k]) && h[k]>=0)) ||
        ('eq' in h && (!Array.isArray(h.eq)||h.eq.length!==6)) ||
        ('sk' in h && !record(h.sk))).map(([id])=>id),
      missingCore: ['v','water','solari','plast','roster'].filter(k=>!(k in s))
    };
    assert.fail(label + ': saved game state rejected by loader: ' + JSON.stringify(bad));
  }
  assert.equal(result.save.v, 1);
};

const blocked = async (g, raw, kind) => {
  const ops = fault(g);
  g.store.set(KEY, raw);
  const read = details(g);
  assert.equal(read.status,kind);
  assert.equal(g.run('loadSave()'),null,'legacy API returns null, but never authorizes newSave');
  assert.equal((await g.run('start({})')).status,kind);
  assert.equal(g.run('typeof S'),'undefined','boot must block before setting account state');
  assert.equal(g.store.get(KEY),raw,'primary original bytes must be preserved EXACTLY');
  assert.ok(!ops.includes('set:' + KEY),'blocked boot must never attempt writes');
  return read;
};

// S01-S04, unchanged existing valid v1 compatibility.
{
  const g=init(), ops=fault(g);
  assert.equal(details(g).status,'missing');
  assert.equal(g.run('loadSave()'),null);
  await g.run('start({})');
  assert.equal(JSON.parse(g.store.get(KEY)).v,1);
  assert.equal(JSON.parse(g.store.get(KEY)).solari,state(g).solari);
  assert.ok(ops.includes('set:'+KEY));
  roundtrip(g, 'S01 after fresh boot');
  seen('S01','only confirmed missing primary creates a starter account');
}
for(const [id,name] of [['S02','01-legacy-v1.json'],['S03','02-mid.json'],['S04','03-late.json']]){
  const g=init(),raw=readFixture(name),was=JSON.parse(raw);
  g.store.set(KEY,raw);
  assert.equal(details(g).status,'ok');
  assert.equal(details(g).save.water,was.water, 'loaded resource remains exact before tickWater');
  await g.run('start({})');
  assert.equal(state(g).solari,was.solari);
  assert.equal(JSON.parse(g.store.get(KEY)).solari,was.solari);
  seen(id,name+' remains compatible with current save migrations');
}

// S05-S06: exceptions from read, even if write would work, never clear raw.
for(const [id,name] of [['S05','SecurityError'],['S06','InjectedReadError']]){
  const g=init();
  g.store.set(KEY,old);
  const ops=fault(g,{read:name});
  assert.equal(details(g).status,'unavailable');
  assert.equal(g.run('loadSave()'),null);
  await g.run('start({})');
  assert.equal(g.run('typeof S'),'undefined');
  assert.equal(g.store.get(KEY),old);
  assert.ok(!ops.includes('set:'+KEY));
  seen(id,name+' read failure blocks all boot writes');
}

// S07-S10: distinct statuses, exact original raw retained even for parseable garbage.
const cases=[
 ['S07','{"v":1,"roster":','corrupt'],
 ['S08-null','null','invalid'],
 ['S08-array','[]','invalid'],
 ['S08-no-v','{"roster":{}}','invalid'],
 ['S09',JSON.stringify({...JSON.parse(old),v:2}),'unsupported'],
 ['S10','{"v":1,"roster":null,"water":10,"solari":20,"plast":2}','invalid'],
 ['S10-negative','{"v":1,"roster":{},"water":10,"solari":-20,"plast":2}','invalid'],
 ['S10-deep','{"v":1,"roster":{"leto":null},"water":10,"solari":20,"plast":2}','invalid']
];
for(const [id,raw,kind] of cases){
 const g=init();
 const result=await blocked(g,raw,kind);
 assert.equal(result.raw,raw,'rescue copy preserves raw content');
 seen(id,kind+' blocks, no write or reset');
}

// S11-S12: optional historical fields may be absent; fillSave remains idempotent.
{
 const raw=JSON.parse(old);
 for(const k of ['daily','login','conq','journeys','migrations','gearOwned','trialRuns'])delete raw[k];
 const g=init();
 g.store.set(KEY,JSON.stringify(raw));
 const loaded=details(g);
 assert.equal(loaded.status,'ok');
 assert.equal(loaded.save.v,1);
 assert.equal(loaded.save.solari,raw.solari);
 await g.run('start({})');
 assert.equal(state(g).solari,raw.solari);
 seen('S11','old mandatory fields plus missing optional fields are accepted');
}
{
 const g=init();g.store.set(KEY,old);
 const first=g.run('JSON.stringify(fillSave(JSON.parse(localStorage.getItem(SAVE_KEY))))');
 const second=g.run('JSON.stringify(fillSave(fillSave(JSON.parse(localStorage.getItem(SAVE_KEY)))))');
 assert.equal(second,first,'fillSave must never repeat a one-time reward');
 seen('S12','legacy migration is idempotent');
}

// S12-RT: Conquest's real weekly state is a normal, reloadable v1 snapshot.
{
 const g=init();await g.run('start({})');
 g.run("S.cqUnlock={...S.cqUnlock,easy:'b1-persisted'}; const c=cq(); S.conq={...c,wk:'Mon Jan 05 2026',stars:4321,pts:876,done:{'0-0-0':1},route:{0:{chosen:1}},diff:'hard'}; cq(); persist0();");
 roundtrip(g,'Conquest weekly roundtrip');
 seen('S12-RT','Conquest committed state can be parsed and reloaded');
}

// S13: no serialization error may report an acknowledged write.
{
 const g=init();g.store.set(KEY,old);await g.run('start({})');
 const committed=g.store.get(KEY);
 g.run('S.__b1Loop = S;');
 const res=g.run('persist0()');
 assert.equal(res.ok,false);
 assert.equal(res.status,'serialization');
 assert.equal(g.store.get(KEY),committed);
 g.run('delete S.__b1Loop');
 seen('S13','serialization fault returns explicit failure; last durable bytes preserved');
}

// S14: write failure after startup returns typed status; no false ok.
for(const [kind,status] of [['QuotaExceededError','quota'],['SecurityError','security']]){
 const g=init();g.store.set(KEY,old);await g.run('start({})');
 const before=g.store.get(KEY),initial=state(g).solari;
 const ops=fault(g,{write:kind});
 const res=g.run('S.solari += 17; persist()');
 assert.equal(res.ok,false);
 assert.equal(res.status,status);
 assert.equal(state(g).solari,initial+17);
 assert.equal(g.store.get(KEY),before);
 assert.ok(ops.includes('set:'+KEY));
 seen('S14-'+kind,'write fails explicitly; in-memory mutation cannot masquerade as durable');
}

// S15: startup write failure must block before normal game/render loop.
for(const kind of ['QuotaExceededError','SecurityError']){
 const g=init();g.store.set(KEY,old);
 let timers=0;
 g.ctx.setInterval=()=>{timers++;return 0};
 const ops=fault(g,{write:kind});
 assert.doesNotThrow(()=>g.run('start({})'));
 assert.equal(g.store.get(KEY),old);
 assert.equal(timers,0,'blocked boot did not schedule normal gameplay resource timer');
 assert.ok(ops.includes('set:'+KEY));
 seen('S15-'+kind,'failed initial commit prevents normal game startup');
}

// Guard: a failed writer session is one-way blocked, even after external
// repair; ONLY a fresh JS realm may reload repaired storage under a new lock.
{
 const g=init();
 g.store.set(KEY,'{"broken"');
 assert.equal((await g.run('start({})')).status,'corrupt');
 assert.equal(g.store.get(KEY),'{"broken"');
 g.store.set(KEY,old);
 assert.equal((await g.run('start({})')).status,'session-blocked');
 assert.equal(g.run('typeof S'),'undefined');
 const fresh=init();fresh.store.set(KEY,old);
 assert.equal((await fresh.run('start({})')).status,'started');
 assert.equal(state(fresh).solari,JSON.parse(old).solari);
 seen('RETRY','manual repair requires a fresh writer realm; stale one remains blocked');
}

assert.equal(new Set(check).size,check.length);
assert.equal(check.length,23,'complete B1 read/write fault acceptance matrix');
console.log('ARCH-02B1: SAFE PASS '+check.length+' fault and compatibility observations on '+html+
 '; VM storage only, no browser profile; transaction atomicity and multi-tab conflicts remain ARCH-02C.');
