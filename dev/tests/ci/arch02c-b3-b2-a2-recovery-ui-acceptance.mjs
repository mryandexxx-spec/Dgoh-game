// ARCH-02C-B3-B2-A2: user-confirmed recovery UI and lifecycle negative cases.
// Both compiled PWA and HTML artifact; VM lock is deterministic, real browser
// native Web Locks covered independently by the separate Chromium CI test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html', KEY='dune-goh-v1';
const BACKUP=KEY+'.backup';
const fixture=fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8');
const initial=JSON.stringify(JSON.parse(fixture));
const flush=async()=>{for(let i=0;i<15;i++) await Promise.resolve();};
const cases=[];
function pass(id,desc){cases.push(id);console.log('  '+id+' [A2 RECOVERY UI] '+desc);}
class NativeLocks {
  constructor(){this.owner=false;this.calls=0;}
  request(name,opts,cb){
    assert.equal(name,KEY+'.writer');
    assert.equal(opts.mode,'exclusive');assert.equal(opts.ifAvailable,true);
    this.calls++;
    if(this.owner)return Promise.resolve().then(()=>cb(null));
    this.owner=true;
    return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.owner=false;});
  }
}
function fakeDocument(g) {
  const original=g.ctx.document,win=new Map(),doc=new Map(),all=[];
  const listeners=(map,type,fn)=>{
    if(!map.has(type))map.set(type,[]);map.get(type).push(fn);
  };
  const node=tag=>{
    const element={tag,id:'',style:{},children:[],handlers:{},
      hidden:false,disabled:false,isConnected:true,readOnly:false,
      textContent:'',value:'',
      setAttribute(){},focus(){},select(){},
      addEventListener(type,fn){this.handlers[type]=fn;},
      appendChild(child){this.children.push(child);child.isConnected=true;return child;},
      remove(){this.isConnected=false;body.children=body.children.filter(x=>x!==this);}};
    all.push(element);return element;
  };
  const body=node('body');
  const find=(n,id)=>n.id===id?n:
    n.children.map(x=>find(x,id)).find(Boolean)||null;
  let hidden=false;
  g.ctx.document=new Proxy(original,{get(target,key){
    if(key==='body')return body;
    if(key==='visibilityState')return hidden?'hidden':'visible';
    if(key==='createElement')return node;
    if(key==='getElementById')return id=>find(body,id);
    if(key==='addEventListener')return(type,fn)=>listeners(doc,type,fn);
    return target[key];
  }});
  g.ctx.addEventListener=(type,fn)=>listeners(win,type,fn);
  const event=(map,type,more={})=>{
    const e={type,key:undefined,persisted:false,
      target:{closest:()=>null},cancelable:true,
      preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...more};
    for(const fn of map.get(type)||[])fn(e);
  };
  return {find:id=>find(body,id),press:async id=>{
    const b=find(body,id);assert.ok(b,'missing control '+id);
    assert.equal(b.hidden,false,'hidden control '+id);
    if(b.disabled)return;
    return b.handlers.click?.();
  },win:(t,e)=>event(win,t,e),doc:(t,e)=>event(doc,t,e),
  hide:()=>{hidden=true;event(doc,'visibilitychange');},
  body,all};
}
function origin(raw=initial){
  const store=new Map(raw===null?[]:[[KEY,raw]]),locks=new NativeLocks();
  function tab(){
    const g=loadGame(html,{seed:33}),local=g.ctx.localStorage;
    local.getItem=k=>store.has(k)?store.get(k):null;
    local.setItem=(k,v)=>store.set(k,String(v));
    local.removeItem=k=>store.delete(k);
    local.clear=()=>store.clear();
    g.ctx.navigator={locks};
    const ui=fakeDocument(g);
    return {g,local,ui,start:()=>g.run('start.writer({})'),
      phase:()=>g.run('start.writerLifecycle()'),
      writer:()=>g.run('loadSave.writer.state()'),
      change:n=>{g.ctx.__plus=n;return g.run('S.solari+=__plus;persist0()');},
      release:()=>g.run('loadSave.writer.release()'),
      ram:()=>g.run('S===undefined?undefined:JSON.stringify(S)')};
  }
  return {store,locks,tab};
}
async function damaged(primary='{BROKEN'){
  const o=origin(),first=o.tab();
  assert.equal((await first.start()).status,'started');
  assert.equal(first.change(18).ok,true);
  const backup=o.store.get(BACKUP);
  assert.equal(JSON.parse(backup).raw!==o.store.get(KEY),true);
  first.release();await flush();
  o.store.set(KEY,primary);
  return {...o,backup};
}
// U01: no recovery occurs on boot, even with valid backup.
{
  const o=await damaged(),t=o.tab();
  assert.equal((await t.start()).status,'corrupt');
  assert.equal(t.ram(),undefined);
  assert.equal(t.phase().blocked,true);
  assert.ok(t.ui.find('save-recover-prepare'));
  assert.equal(t.ui.find('save-recover-confirm').hidden,true);
  assert.equal(o.store.get(KEY),'{BROKEN');
  pass('U01','corrupt primary prompts inspection but NEVER auto-restores');
}
// U02: preview requires a real lease; approved confirmation restores and
// leaves this very same heap blocked until a fresh load.
{
  const o=await damaged(),t=o.tab(),expected=JSON.parse(o.backup).raw;
  assert.equal((await t.start()).status,'corrupt');
  await t.ui.press('save-recover-prepare');
  assert.equal(o.locks.owner,true);
  assert.equal(t.writer().status,'owned');
  assert.equal(t.ram(),undefined);
  assert.equal(t.ui.find('save-recover-confirm').hidden,false);
  assert.match(t.ui.find('save-recover-preview').textContent,/ПРЕДЫДУЩАЯ копия v1/);
  assert.equal(o.store.get(KEY),'{BROKEN','preview must not mutate primary');
  await t.ui.press('save-recover-confirm');await flush();
  assert.equal(o.store.get(KEY),expected);
  assert.equal(o.store.get(BACKUP),o.backup);
  assert.equal(t.ram(),undefined);
  assert.equal(t.writer().status,'session-stale');
  assert.match(t.ui.find('save-writer-title').textContent,/Резервная копия восстановлена/);
  const fresh=o.tab();
  assert.equal((await fresh.start()).status,'started');
  assert.equal(JSON.parse(fresh.ram()).solari,JSON.parse(expected).solari);
  fresh.release();await flush();
  pass('U02','explicit under-lock preview and second click restore, new heap only');
}
// U03: cancellation never writes, releases Web Lock and is sticky.
{
  const o=await damaged(),t=o.tab();
  assert.equal((await t.start()).status,'corrupt');
  await t.ui.press('save-recover-prepare');
  await t.ui.press('save-recover-cancel');await flush();
  assert.equal(o.store.get(KEY),'{BROKEN');
  assert.equal(o.locks.owner,false);
  assert.equal(t.writer().status,'session-stale');
  assert.equal(t.ui.find('save-recover-confirm').hidden,true);
  pass('U03','cancel confirms no write and retires native authority');
}
// U04: pagehide while user is reading preview cancels recovery-only lock.
{
  const o=await damaged(),t=o.tab();
  assert.equal((await t.start()).status,'corrupt');
  await t.ui.press('save-recover-prepare');
  assert.equal(o.locks.owner,true);
  t.ui.win('pagehide');await flush();
  assert.equal(o.locks.owner,false);
  assert.equal(t.phase().reason,'pagehide');
  assert.equal(t.writer().status,'session-stale');
  assert.equal(o.store.get(KEY),'{BROKEN');
  pass('U04','pagehide evicts recovery owner even from blocked preboot screen');
}
// U05: freeze/BFCache/hidden revoke the recovery-only lease.
for(const [id,kind] of [['U05','freeze'],['U06','hidden'],['U07','bfcache']]){
  const o=await damaged(),t=o.tab();
  assert.equal((await t.start()).status,'corrupt');
  await t.ui.press('save-recover-prepare');
  if(kind==='freeze')t.ui.doc('freeze');
  if(kind==='hidden')t.ui.hide();
  if(kind==='bfcache')t.ui.win('pageshow',{persisted:true});
  await flush();
  assert.equal(o.locks.owner,false);
  assert.equal(t.writer().status,'session-stale');
  assert.equal(o.store.get(KEY),'{BROKEN');
  pass(id,kind+' after preview cannot keep native Web Lock');
}
// U08: pending acquisition cancelled on pagehide, never reopens a lease.
{
  const o=await damaged(),t=o.tab();
  assert.equal((await t.start()).status,'corrupt');
  const attempt=t.ui.press('save-recover-prepare');
  t.ui.win('pagehide');
  await attempt;await flush();
  assert.equal(o.locks.owner,false);
  assert.equal(t.writer().status,'session-stale');
  assert.equal(t.ui.find('save-recover-confirm'),null);
  assert.equal(o.store.get(KEY),'{BROKEN');
  pass('U08','pagehide during recovery acquisition rejects delayed grant');
}
// U09: future v2 is never offered an automatic old-version rollback.
{
  const o=await damaged(JSON.stringify({...JSON.parse(initial),v:2})),t=o.tab();
  assert.equal((await t.start()).status,'unsupported');
  assert.equal(t.ui.find('save-recover-prepare'),null);
  assert.equal(t.ram(),undefined);
  assert.equal(o.store.get(KEY),JSON.stringify({...JSON.parse(initial),v:2}));
  pass('U09','future save requires external review, no recovery action');
}
// U10: no verified backup stops before any replacement.
{
  const o=origin('{BROKEN'),t=o.tab();
  assert.equal((await t.start()).status,'corrupt');
  await t.ui.press('save-recover-prepare');
  assert.match(t.ui.find('save-recover-status').textContent,/no-verified-backup/);
  assert.equal(o.store.get(KEY),'{BROKEN');
  assert.equal(t.ui.find('save-recover-confirm').hidden,true);
  pass('U10','missing backup fails closed with zero writes');
}
// U11: missing primary plus valid backup must go through same two-click UX.
{
  const o=await damaged(''),t=o.tab();
  o.store.delete(KEY);
  assert.equal((await t.start()).status,'recovery-required');
  await t.ui.press('save-recover-prepare');
  assert.equal(t.ui.find('save-recover-confirm').hidden,false);
  assert.equal(o.store.has(KEY),false);
  await t.ui.press('save-recover-confirm');await flush();
  assert.equal(o.store.get(KEY),JSON.parse(o.backup).raw);
  assert.equal(t.ram(),undefined);
  pass('U11','missing-primary old backup requires explicit confirmation');
}
// U12: concurrent old writer mutates primary AFTER preview; user confirmation
// must refuse overwrite and retire authority, even under native lock.
{
  const o=await damaged(),t=o.tab();
  assert.equal((await t.start()).status,'corrupt');
  await t.ui.press('save-recover-prepare');
  o.store.set(KEY,'OUTSIDER');
  await t.ui.press('save-recover-confirm');await flush();
  assert.equal(o.store.get(KEY),'OUTSIDER');
  assert.equal(t.writer().status,'session-stale');
  assert.match(t.ui.find('save-writer-title').textContent,/Игровой сеанс остановлен/);
  pass('U12','outsider mutation defeats stale recovery confirmation');
}
// U13: backup sidecar changed after preview fails exact envelope check.
{
  const o=await damaged(),t=o.tab();
  assert.equal((await t.start()).status,'corrupt');
  await t.ui.press('save-recover-prepare');
  o.store.set(BACKUP,'TAMPERED');
  await t.ui.press('save-recover-confirm');await flush();
  assert.equal(o.store.get(KEY),'{BROKEN');
  assert.equal(o.store.get(BACKUP),'TAMPERED');
  assert.equal(t.writer().status,'session-stale');
  pass('U13','stale backup envelope cannot be replayed');
}
// U14: second confirm on original button cannot invoke a second restore.
{
  const o=await damaged(),t=o.tab();
  assert.equal((await t.start()).status,'corrupt');
  await t.ui.press('save-recover-prepare');
  const originalButton=t.ui.find('save-recover-confirm');
  await t.ui.press('save-recover-confirm');await flush();
  const snapshot=o.store.get(KEY),sidecar=o.store.get(BACKUP);
  originalButton.handlers.click();
  assert.equal(o.store.get(KEY),snapshot);
  assert.equal(o.store.get(BACKUP),sidecar);
  pass('U14','old confirmation cannot replay after the first attempt');
}
assert.deepEqual(cases,Array.from({length:14},(_,i)=>
  'U'+String(i+1).padStart(2,'0')));
console.log('[ARCH-02C-B3-B2-A2] '+cases.length+'/14 recovery UI and lifecycle checks on '+html+
  ' (native browser proof is a separate required CI step).');
