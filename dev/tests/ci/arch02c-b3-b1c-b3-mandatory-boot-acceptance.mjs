// ARCH-02C-B3-B1c-B3: MANDATORY, unflagged composition-root startup.
// Both actual compiled PWA and HTML artifact, never an opt-in-only substitute.
// Deterministic locks are supplemented by required real Chromium native tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1',BACKUP=KEY+'.backup';
const fixture=JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8')));
const ids=[],pass=(id,msg)=>{ids.push(id);console.log('  '+id+' '+msg);};
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
class Locks {
  constructor(){this.held=false;this.requests=0;this.reject=false;}
  request(name,options,callback){
    assert.equal(name,KEY+'.writer');
    assert.equal(options.mode,'exclusive');
    assert.equal(options.ifAvailable,true);
    this.requests++;
    if(this.reject)return Promise.reject(new Error('NativeWebLocksFailure'));
    if(this.held)return Promise.resolve().then(()=>callback(null));
    this.held=true;
    return Promise.resolve().then(()=>callback({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
function origin(raw=fixture){
  const store=new Map(raw===null?[]:[[KEY,raw]]);
  const logs=[],locks=new Locks();
  function tab(support=true){
    const fields=new Map([['#savecode',{value:''}],
      ['#overlay2',{innerHTML:''}],['#overlay2 .acts',{insertAdjacentHTML(){}}]]);
    const events=new Map();
    const g=loadGame(html,{seed:33,onQuerySelector:selector=>fields.get(selector)});
    g.ctx.addEventListener=(type,fn)=>{
      if(!events.has(type))events.set(type,[]);
      events.get(type).push(fn);
    };
    const local=g.ctx.localStorage;
    local.getItem=k=>{logs.push(['get',k]);return store.has(k)?store.get(k):null;};
    local.setItem=(k,v)=>{logs.push(['set',k]);store.set(k,String(v));};
    local.removeItem=k=>{logs.push(['remove',k]);store.delete(k);};
    local.clear=()=>{logs.push(['clear']);store.clear();};
    g.ctx.navigator=support?{locks}:{};
    return {
      g,fields,events,
      start:data=>{g.ctx.__mandatoryData=data??{};return g.run('start(__mandatoryData)');},
      phase:()=>g.run('start.writerLifecycle()'),
      state:()=>g.run('loadSave.writer.state()'),
      ram:()=>g.run('S===undefined?undefined:S.solari'),
      commit:n=>{g.ctx.__mandatoryPlus=n;return g.run('S.solari+=__mandatoryPlus;persist0()');},
      persist:()=>g.run('persist0()'),
      release:()=>g.run('loadSave.writer.release()'),
      event:(type,extra={})=>{
        const e={persisted:false,key:undefined,
          target:{closest:()=>null},preventDefault(){},stopImmediatePropagation(){},
          ...extra};
        for(const fn of events.get(type)||[])fn(e);
      },
      preview:candidate=>{
        fields.get('#savecode').value=Buffer.from(JSON.stringify(candidate),'utf8').toString('base64');
        return g.run('metaClick({saveload:1})');
      },
      confirm:()=>g.run('metaClick({saveconfirm:1})')
    };
  }
  return {tab,store,locks,logs};
}
// B301: default unflagged start MUST be writer-only and checkpoint-backed.
{
  const o=origin(),a=o.tab(),before=o.store.get(KEY);
  assert.equal((await a.start()).status,'started');
  assert.equal(a.phase().armed,true);
  assert.equal(a.phase().blocked,false);
  assert.equal(a.state().status,'owned');
  assert.equal(o.locks.requests,1);
  // Initial boot may migrate/normalize the legacy v1 fixture under the lock.
  // Backup from the NEXT transaction must preserve exact most recent bytes,
  // not the old pre-migration fixture.
  const beforeCommit=o.store.get(KEY);
  assert.equal(a.commit(9).verified,'committed');
  assert.equal(JSON.parse(o.store.get(KEY)).solari,JSON.parse(before).solari+9);
  assert.equal(JSON.parse(o.store.get(BACKUP)).raw,beforeCommit);
  a.release();await flush();
  pass('B301','ordinary startup obtains native lease and verified commit');
}
// B302: no Web Locks means zero progress reads or writes, not a fresh save.
{
  const o=origin(),a=o.tab(false),original=o.store.get(KEY);
  assert.equal((await a.start()).status,'unsupported');
  assert.equal(a.phase().blocked,true);
  assert.equal(a.ram(),undefined);
  assert.equal(a.state().gated,true);
  assert.equal(o.logs.length,0,'unsupported preboot must not touch storage');
  assert.equal(a.persist().ok,false);
  assert.equal(o.store.get(KEY),original);
  pass('B302','unflagged unsupported API reads and writes zero save bytes');
}
// B303: acquisition is asynchronous; no RAM or storage before callback.
{
  const o=origin(),a=o.tab();
  let grant;
  o.locks.request=(name,options,callback)=>{
    assert.equal(name,KEY+'.writer');
    assert.equal(options.ifAvailable,true);
    return new Promise(resolve=>{
      grant=()=>resolve(Promise.resolve(callback({name,mode:'exclusive'})));
    });
  };
  const starting=a.start();
  assert.equal(a.phase().reason,'acquiring');
  assert.equal(a.phase().blocked,true);
  assert.equal(a.ram(),undefined);
  assert.equal(o.logs.length,0);
  assert.equal(typeof grant,'function');
  grant();
  assert.equal((await starting).status,'started');
  assert.equal(a.phase().blocked,false);
  assert.ok(o.logs.some(e=>e[0]==='get'&&e[1]===KEY));
  a.release();await flush();
  pass('B303','pending lock leaves RAM empty and primary untouched');
}
// B304: competing second tab cannot read/load/start; fresh tab can later boot.
{
  const o=origin(),a=o.tab(),b=o.tab();
  assert.equal((await a.start()).status,'started');
  const count=o.logs.length;
  assert.equal((await b.start()).status,'busy');
  assert.equal(o.logs.length,count,'busy writer may not read even its own primary');
  assert.equal(b.ram(),undefined);
  assert.equal(b.phase().blocked,true);
  assert.equal(b.persist().status,'not-owner');
  assert.equal((await b.start()).status,'session-blocked');
  const prior=o.store.get(KEY);
  a.release();await flush();
  const fresh=o.tab();
  assert.equal((await fresh.start()).status,'started');
  assert.equal(o.store.get(KEY),prior);
  fresh.release();await flush();
  pass('B304','second realm busy/blocked and fresh cold boot safe');
}
// B305: duplicated normal composition-root callback never clears live S.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).status,'started');
  const saved=a.ram(),raw=o.store.get(KEY);
  assert.equal(a.start().status,'session-blocked');
  assert.equal(a.ram(),saved);
  assert.equal(a.phase().blocked,false);
  assert.equal(o.store.get(KEY),raw);
  a.release();await flush();
  pass('B305','hot-host duplicate preserves RAM and refuses second bootstrap');
}
// B306: release is irreversible even if another tab changes the primary.
{
  const o=origin(),a=o.tab(),b=o.tab();
  assert.equal((await a.start()).status,'started');
  a.release();await flush();
  assert.equal(a.phase().blocked,true);
  assert.equal((await b.start()).status,'started');
  b.commit(25);
  const latest=o.store.get(KEY);
  assert.equal(a.persist().status,'session-stale');
  assert.equal(a.start().status,'session-blocked');
  assert.equal(o.store.get(KEY),latest);
  b.release();await flush();
  pass('B306','released writer cannot overwrite another session');
}
// B307: pagehide revokes owned writer and BFCache cannot revive its RAM.
{
  const o=origin(),a=o.tab(),b=o.tab();
  assert.equal((await a.start()).status,'started');
  a.event('pagehide',{persisted:true});
  assert.equal(a.phase().reason,'pagehide');
  assert.equal(a.persist().status,'session-stale');
  await flush();
  assert.equal((await b.start()).status,'started');
  const raw=o.store.get(KEY);
  a.event('pageshow',{persisted:true});
  assert.equal(a.phase().blocked,true);
  assert.equal(a.persist().status,'session-stale');
  assert.equal(o.store.get(KEY),raw);
  b.release();await flush();
  pass('B307','pagehide and BFCache never reattach stale writer');
}
// B308: native rejection is fail-closed with zero progress reads.
{
  const o=origin(),a=o.tab();
  o.locks.reject=true;
  assert.equal((await a.start()).status,'unavailable');
  assert.equal(a.ram(),undefined);
  assert.equal(a.phase().blocked,true);
  assert.equal(o.logs.length,0);
  assert.equal(a.persist().ok,false);
  pass('B308','rejected native Web Locks API cannot use legacy persist');
}
// B309: initial missing storage without native locks never initializes v1.
{
  const o=origin(null),a=o.tab(false);
  assert.equal((await a.start()).status,'unsupported');
  assert.equal(o.store.size,0);
  assert.equal(a.ram(),undefined);
  pass('B309','unsupported empty-origin startup cannot create account');
}
// B310: corrupt primary refuses boot; old bytes are never rewritten.
{
  const o=origin('{BROKEN'),a=o.tab();
  assert.equal((await a.start()).status,'corrupt');
  assert.equal(a.ram(),undefined);
  assert.equal(o.store.get(KEY),'{BROKEN');
  assert.equal(o.logs.filter(([op])=>op==='set').length,0);
  pass('B310','corruption cannot silently turn into a new account');
}
// B311: host-injected hot snapshot cannot bypass disk revalidation.
{
  const o=origin(),a=o.tab(),before=o.store.get(KEY);
  assert.equal((await a.start({save:JSON.parse(fixture)})).status,'hot-reload-unsupported');
  assert.equal(a.ram(),undefined);
  assert.equal(o.logs.length,0);
  assert.equal(a.start().status,'session-blocked');
  assert.equal(o.store.get(KEY),before);
  pass('B311','untrusted hot snapshot is rejected before storage');
}
// B312: direct checkpoint APIs are closed when mandatory writer is armed.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).status,'started');
  const raw=o.store.get(KEY);
  assert.equal(a.g.run('loadSave.checkpoint.commit({candidate:S,expectedRaw:loadSave.writer.state().raw})').status,'writer-required');
  assert.equal(a.g.run('loadSave.checkpoint.recover({})').status,'writer-required');
  assert.equal(o.store.get(KEY),raw);
  a.release();await flush();
  pass('B312','public checkpoint commit/recover cannot bypass gate');
}
// B313: the ordinary route can confirm an import only under its live lease,
// and must retire old RAM after the verified checkpoint transaction.
{
  const o=origin(),a=o.tab(),base=JSON.parse(fixture);
  assert.equal((await a.start()).status,'started');
  const original=o.store.get(KEY),candidate={...base,solari:base.solari+111};
  assert.equal(a.preview(candidate),true);
  assert.equal(o.store.get(KEY),original);
  assert.equal(a.confirm(),true);
  assert.equal(JSON.parse(o.store.get(KEY)).solari,candidate.solari);
  assert.equal(JSON.parse(o.store.get(BACKUP)).raw,original);
  assert.equal(a.phase().blocked,true);
  assert.equal(a.persist().status,'session-stale');
  await flush();
  const fresh=o.tab();
  assert.equal((await fresh.start()).status,'started');
  assert.equal(fresh.ram(),candidate.solari);
  fresh.release();await flush();
  pass('B313','default boot import is serialized, verified and requires fresh RAM');
}
// B314: no-preview flag, even explicitly set to "legacy", cannot opt out.
{
  const o=origin(),a=o.tab(false);
  a.g.ctx.__DGOH_B3_B1C_BOOT_MODE__='legacy';
  assert.equal((await a.start()).status,'unsupported');
  assert.equal(a.state().gated,true);
  assert.equal(a.ram(),undefined);
  assert.equal(o.logs.length,0);
  pass('B314','legacy flag cannot disable mandatory writer gate');
}
assert.deepEqual(ids,Array.from({length:14},(_,i)=>'B'+String(301+i)));
console.log('[ARCH-02C-B3-B1c-B3] 14/14 mandatory default boot cases; old v140 remains uncooperative');
