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
const blocked = (g, raw, kind) => {
  const ops = fault(g);
  g.store.set(KEY, raw);
  const read = details(g);
  assert.equal(read.status,kind);
  assert.equal(g.run('loadSave()'),null,'legacy API returns null, but never authorizes newSave');
  assert.doesNotThrow(() => g.run('start({})'));
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
  g.run('start({})');
  assert.equal(JSON.parse(g.store.get(KEY)).v,1);
  assert.equal(JSON.parse(g.store.get(KEY)).solari,state(g).solari);
  assert.ok(ops.includes('set:'+KEY));
  seen('S01','only confirmed missing primary creates a starter account');
}
for(const [id,name] of [['S02','01-legacy-v1.json'],['S03','02-mid.json'],['S04','03-late.json']]){
  const g=init(),raw=readFixture(name),was=JSON.parse(raw);
  g.store.set(KEY,raw);
  assert.equal(details(g).status,'ok');
  assert.equal(details(g).save.water,was.water, 'loaded resource remains exact before tickWater');
  g.run('start({})');
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
  g.run('start({})');
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
 const result=blocked(g,raw,kind);
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
 g.run('start({})');
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

// S13: no serialization error may report an acknowledged write.
{
 const g=init();g.store.set(KEY,old);g.run('start({})');
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
 const g=init();g.store.set(KEY,old);g.run('start({})');
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

// Guard: an unavailable/malformed primary remains blocked even on repeated start.
// A subsequent manual repair by an outside tool can be retried with no auto-reset.
{
 const g=init();
 g.store.set(KEY,'{"broken"');
 g.run('start({})');
 assert.equal(g.store.get(KEY),'{"broken"');
 g.store.set(KEY,old);
 g.run('start({})');
 assert.equal(state(g).solari,JSON.parse(old).solari);
 seen('RETRY','manual repair permits later valid load without a destructive reset');
}

assert.equal(new Set(check).size,check.length);
assert.equal(check.length,22,'complete B1 read/write fault acceptance matrix');
console.log('ARCH-02B1: SAFE PASS '+check.length+' fault and compatibility observations on '+html+
 '; VM storage only, no browser profile; transaction atomicity and multi-tab conflicts remain ARCH-02C.');
