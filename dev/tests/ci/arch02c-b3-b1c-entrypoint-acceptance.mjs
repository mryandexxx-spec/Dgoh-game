// B3-B1c-A0: actual application composition-root startRuntime() writer-preview.
// 7 scenarios * both built PWA and HTML. Mode is deliberately OFF by default.
// The runtime path must fail closed and must not transform the old v140 build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';
const html=process.argv[2] || 'dist/pwa/index.html';
const KEY='dune-goh-v1';
const save=JSON.stringify(JSON.parse(fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)),
    '../fixtures/saves/01-legacy-v1.json'),'utf8')));
const ids=[];
const done=(id,description)=>{ids.push(id);console.log('  '+id+' '+description);};
class NativeLock {
  constructor(){this.held=false;}
  request(name,opts,fn) {
    assert.equal(name,KEY+'.writer');
    assert.equal(opts.mode,'exclusive');
    assert.equal(opts.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>fn(null));
    this.held=true;
    return Promise.resolve().then(()=>fn({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
function origin(initial=save) {
  const store=new Map(initial===null?[]:[[KEY,initial]]);
  const locks=new NativeLock();
  function tab(withLocks=true) {
    const g=loadGame(html,{seed:18}),local=g.ctx.localStorage;
    local.getItem=k=>store.has(k)?store.get(k):null;
    local.setItem=(k,v)=>store.set(k,String(v));
    local.removeItem=k=>store.delete(k);
    g.ctx.navigator=withLocks?{locks}:{};
    return {
      g,
      mode:v=>{g.ctx.__DGOH_B3_B1C_BOOT_MODE__=v;},
      start:data=>{g.ctx.__b3StartupArg=data??{};return g.run('startRuntime(__b3StartupArg)');},
      state:()=>g.run('loadSave.writer.state()'),
      release:()=>g.run('loadSave.writer.release()'),
      phase:()=>g.run('startRuntime.writerLifecycle()'),
      ram:()=>g.run('S === undefined ? undefined : S.solari'),
      increase:n=>{g.ctx.__plus=n;return g.run('S.solari += __plus;persist0()');},
    };
  }
  return {tab,store,locks};
}
const spin=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
// C01 legacy mode is default; strictly no writer lease in old automatic path.
{
  const o=origin(),t=o.tab(false);
  t.start();
  assert.equal(t.state().gated,false);
  assert.equal(typeof t.ram(),'number');
  assert.equal(t.increase(2).ok,true);
  done('C01','default legacy composition-root semantics unchanged (UNSAFE)');
}
// C02 explicit preview with no Web Locks: never initializes game RAM.
{
  const o=origin(),t=o.tab(false);
  t.mode('writer-preview');
  assert.equal((await t.start()).status,'unsupported');
  assert.equal(t.ram(),undefined);
  assert.equal(t.state().gated,true);
  assert.equal(t.phase().blocked,true);
  done('C02','preview without native lock fails closed, never boots');
}
// C03 preview from real entry successfully owns Web Lock and verified commit.
{
  const o=origin(),t=o.tab();
  t.mode('writer-preview');
  assert.equal((await t.start()).status,'started');
  assert.equal(t.phase().blocked,false);
  assert.equal(t.state().status,'owned');
  const before=JSON.parse(o.store.get(KEY)).solari;
  assert.equal(t.increase(12).verified,'committed');
  assert.equal(JSON.parse(o.store.get(KEY)).solari,before+12);
  t.release();await spin();
  done('C03','real entry delegates to held writer and checkpoint commit');
}
// C04 two actual independent JS realms use same origin and native lock.
{
  const o=origin(),a=o.tab(),b=o.tab();
  a.mode('writer-preview');b.mode('writer-preview');
  assert.equal((await a.start()).status,'started');
  assert.equal((await b.start()).status,'busy');
  assert.equal(b.ram(),undefined);
  assert.equal(b.phase().blocked,true);
  a.release();await spin();
  assert.equal((await b.start()).status,'session-blocked');
  const fresh=o.tab();fresh.mode('writer-preview');
  assert.equal((await fresh.start()).status,'started');
  fresh.release();await spin();
  done('C04','busy secondary cannot boot or revive after lock release');
}
// C05 injected hot-reload RAM may not bypass checkpoint verification.
{
  const o=origin(),t=o.tab(),injected=JSON.parse(save);
  t.mode('writer-preview');
  assert.equal((await t.start({save:injected})).status,'hot-reload-unsupported');
  assert.equal(t.ram(),undefined);
  assert.equal(t.state().gated,false);
  done('C05','preview refuses hot-reload RAM injection before gate');
}
// C06 an opted-in start cannot fall back to legacy when missing locks.
{
  const o=origin(),t=o.tab(false),original=o.store.get(KEY);
  t.mode('writer-preview');
  assert.equal((await t.start()).status,'unsupported');
  t.mode(undefined);
  assert.equal(t.g.run('persist0()').status,'not-owner');
  assert.equal(o.store.get(KEY),original);
  done('C06','removing preview flag cannot reopen legacy persist');
}
// C07 callback keeps test-time ABI for B1b and lifecycle diagnostics.
{
  const o=origin(),t=o.tab();
  assert.equal(t.g.run('startRuntime.writer === start.writer'),true);
  assert.equal(t.g.run('startRuntime.writerLifecycle === start.writerLifecycle'),true);
  assert.equal(t.g.run('typeof startRuntime'), 'function');
  done('C07','B1b hot-host callback methods stay compatible');
}
assert.deepEqual(ids,Array.from({length:7},(_,i)=>'C'+String(i+1).padStart(2,'0')));
console.log('[ARCH-02C-B3-B1c-A0] 7/7 preview composition-root cases; NOT LIVE');
