// ARCH-02C-B3-B1b lifecycle prototype acceptance on compiled PWA + HTML.
// Proves fail-closed session behavior for cooperating opt-in clients ONLY.
// Does not solve cached old v140 writers, checkpoint recovery or real iOS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html=process.argv[2] || 'dist/pwa/index.html';
const KEY='dune-goh-v1', BACKUP=KEY+'.backup';
const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json');
const original=JSON.stringify(JSON.parse(fs.readFileSync(file,'utf8')));
const money=raw=>JSON.parse(raw).solari;
const ids=[];
function done(id,description,unsafe=false) {
  ids.push(id);
  console.log('  '+id+(unsafe?' [UNSAFE old client] ':' [OPT-IN] ')+description);
}
class LockManager {
  constructor(){this.busy=false;this.calls=0;}
  request(name,options,cb){
    assert.equal(name,KEY+'.writer');
    assert.equal(options.mode,'exclusive');
    assert.equal(options.ifAvailable,true);
    this.calls++;
    if(this.busy)return Promise.resolve().then(()=>cb(null));
    this.busy=true;
    return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.busy=false;});
  }
}
function origin(raw=original){
  const store=new Map(raw===null?[]:[[KEY,raw]]),manager=new LockManager();
  function tab(hasLocks=true) {
    const w=new Map(),d=new Map();
    const collect=(map,type,handler)=>{
      if(!map.has(type))map.set(type,[]);
      map.get(type).push(handler);
    };
    const g=loadGame(html,{seed:7,onDocumentListener:(type,listener)=>collect(d,type,listener)});
    g.ctx.addEventListener=(type,fn)=>collect(w,type,fn);
    g.ctx.navigator=hasLocks?{locks:manager}:{};
    const ls=g.ctx.localStorage;
    ls.getItem=k=>store.has(k)?store.get(k):null;
    ls.setItem=(k,v)=>store.set(k,String(v));
    ls.removeItem=k=>store.delete(k);
    const dispatch=(map,type,e={})=>{
      const event={key:undefined,persisted:false,cancelable:true,
        target:{closest:()=>null},preventDefault(){this.prevented=true;},
        stopImmediatePropagation(){this.stopped=true;},...e};
      for(const fn of map.get(type)||[])fn(event);
      return event;
    };
    return {
      g,w,d,ls,manager,
      start:()=>g.run('start.writer({})'),
      phase:()=>g.run('start.writerLifecycle()'),
      state:()=>g.run('loadSave.writer.state()'),
      stop:()=>g.run('loadSave.writer.release()'),
      change:n=>{g.ctx.__plus=n;return g.run('S.solari += __plus; persist0()');},
      hasS:()=>g.run('S !== undefined'),
      win:(type,e)=>dispatch(w,type,e),
      doc:(type,e)=>dispatch(d,type,e),
    };
  }
  return {store,manager,tab};
}
const flush=async()=>{for(let n=0;n<10;n++)await Promise.resolve();};
const blocked=t=>assert.equal(t.phase().blocked,true);

// E01: owner active, no block, primary persisted through verified checkpoint.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).status,'started');
  assert.equal(a.phase().armed,true);
  assert.equal(a.phase().blocked,false);
  assert.equal(a.phase().reason,'active');
  assert.equal(a.change(5).ok,true);
  a.stop();await flush();
  done('E01','active opt-in owner maintains verified storage');
}
// E02: secondary never initializes S or gameplay, receives visible busy signal.
{
  const o=origin(),a=o.tab(),b=o.tab();
  assert.equal((await a.start()).ok,true);
  assert.equal((await b.start()).status,'busy');
  assert.equal(b.hasS(),false);
  blocked(b);
  assert.equal(b.phase().reason,'busy');
  assert.equal(b.g.run('persist0().status'),'not-owner');
  assert.equal((await b.start()).status,'session-blocked');
  a.stop();await flush();
  done('E02','busy secondary blocked without mutable game state');
}
// E03: pagehide releases native lock and permanently denies old RAM.
{
  const o=origin(),a=o.tab(),b=o.tab();
  assert.equal((await a.start()).ok,true);
  const base=o.store.get(KEY);
  a.win('pagehide');
  blocked(a);
  assert.equal(a.phase().reason,'pagehide');
  assert.equal(a.change(111).status,'session-stale');
  assert.equal(o.store.get(KEY),base);
  await flush();
  assert.equal((await b.start()).ok,true);
  assert.equal(b.change(7).ok,true);
  assert.equal(a.change(1).status,'session-stale');
  b.stop();await flush();
  done('E03','pagehide frees authority but never permits old session writing');
}
// E04: a BFCache pageshow with persisted=true denies even active tab.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).ok,true);
  const before=o.store.get(KEY);
  a.win('pageshow',{persisted:true});
  blocked(a);
  assert.equal(a.phase().reason,'bfcache-resume');
  assert.equal(a.change(11).status,'session-stale');
  assert.equal(o.store.get(KEY),before);
  await flush();
  done('E04','BFCache wake is blocked until full reload/revalidation');
}
// E05: document freeze and subsequent resume do not reacquire.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).ok,true);
  a.doc('freeze');
  blocked(a);
  assert.equal(a.phase().reason,'frozen');
  a.doc('resume');
  assert.equal(a.phase().reason,'frozen');
  assert.equal(a.change(11).status,'session-stale');
  await flush();
  done('E05','freeze releases and resume remains blocked');
}
// E06: real uncooperative old writer can alter primary; storage event
// detects it after the fact, blocks cooperating owner and releases lock.
{
  const o=origin(),a=o.tab(),old=o.tab(false);
  assert.equal((await a.start()).ok,true);
  old.g.run('set_S(loadSave()); S.solari += 9; persist0()');
  const external=o.store.get(KEY);
  a.win('storage',{key:KEY,newValue:external});
  blocked(a);
  assert.equal(a.phase().reason,'external-save-change');
  assert.equal(a.change(100).status,'session-stale');
  assert.equal(o.store.get(KEY),external);
  await flush();
  done('E06','old PWA still writes; reactive detection is NOT fencing',true);
}
// E07: benign storage event with exact original bytes does not block.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).ok,true);
  const current=o.store.get(KEY);
  a.win('storage',{key:KEY,newValue:current});
  assert.equal(a.phase().blocked,false);
  assert.equal(a.change(1).ok,true);
  a.stop();await flush();
  done('E07','unchanged primary does not spuriously invalidate session');
}
// E08: an untrusted backup sidecar event conservatively stops session.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).ok,true);
  a.win('storage',{key:BACKUP,newValue:'bad'});
  blocked(a);
  assert.equal(a.phase().reason,'external-save-change');
  await flush();
  done('E08','external backup write triggers protective stop');
}
// E09: settings/UI storage events don't terminate a writer.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).ok,true);
  a.win('storage',{key:'dune-gfx',newValue:'{}'});
  assert.equal(a.phase().blocked,false);
  a.stop();await flush();
  done('E09','unrelated storage does not invalidate gameplay writer');
}
// E10: pagehide DURING pending async acquire cancels late lock grant.
{
  const o=origin(),a=o.tab();
  const starting=a.start();
  a.win('pagehide');
  assert.equal((await starting).status,'cancelled');
  assert.equal(a.hasS(),false);
  blocked(a);
  assert.equal(a.phase().reason,'pagehide');
  await flush();
  assert.equal(o.manager.busy,false);
  assert.equal((await a.start()).status,'session-blocked');
  done('E10','pagehide cancels pending acquire, cannot late-start S');
}
// E11: while blocked input capture refuses game actions.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).ok,true);
  a.win('pagehide');
  const event=a.win('click');
  assert.equal(event.prevented,true);
  assert.equal(event.stopped,true);
  done('E11','blocked input capture suppresses game click handlers');
}
// E12: overlay copy/reload actions remain clickable in blocked state.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).ok,true);
  a.win('pagehide');
  const event=a.win('click',{target:{closest:()=>({id:'save-writer-blocked'})}});
  assert.equal(event.prevented,undefined);
  assert.equal(event.stopped,undefined);
  done('E12','blocked overlay controls remain usable');
}
// E13: active owner capture does not block any normal gameplay events.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).ok,true);
  const event=a.win('click');
  assert.equal(event.prevented,undefined);
  assert.equal(event.stopped,undefined);
  a.stop();await flush();
  done('E13','active owner UX unchanged');
}
// E14: failed native acquisition displays a blocked diagnostic.
{
  const o=origin(),a=o.tab(false);
  assert.equal((await a.start()).status,'unsupported');
  blocked(a);
  assert.equal(a.phase().reason,'unsupported');
  assert.equal(a.hasS(),false);
  done('E14','unsupported Web Locks refuses gameplay with clear block');
}
// E15: a boot checkpoint write failure releases lock and denies all progress.
{
  const o=origin(),a=o.tab(),previous=o.store.get(KEY),set=a.ls.setItem;
  a.ls.setItem=(k,v)=>{
    if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
    set(k,v);
  };
  assert.equal((await a.start()).status,'boot-incomplete');
  blocked(a);
  assert.equal(a.phase().reason,'boot-incomplete');
  assert.equal(a.change(7).status,'session-stale');
  assert.equal(o.store.get(KEY),previous);
  await flush();
  assert.equal(o.manager.busy,false);
  done('E15','failed boot blocks UI and releases writer authority');
}
// E16: once blocked, a normal pageshow cannot revive the session.
{
  const o=origin(),a=o.tab();
  assert.equal((await a.start()).ok,true);
  a.win('pagehide');
  a.win('pageshow',{persisted:false});
  assert.equal(a.phase().reason,'pagehide');
  assert.equal(a.change(4).status,'session-stale');
  done('E16','post-background pageshow never revives old S');
}
// E17: UI-owned blocked overlay presents ONLY exact verified storage.
// Fake DOM is used to inspect text/value; live Safari rendering still unproven.
{
  const o=origin(),a=o.tab(),g=a.g,nodes=[];
  const make=tag=>{
    const element={tag,id:'',style:{},children:[],hidden:false,readOnly:false,
      setAttribute(){},remove(){},focus(){},select(){},
      addEventListener(type,fn){this['on'+type]=fn;},
      appendChild(child){this.children.push(child);return child;}};
    nodes.push(element);return element;
  };
  const originalDocument=g.ctx.document;
  const body=make('body');
  g.ctx.document=new Proxy(originalDocument,{get(target,key){
    if(key==='createElement')return make;
    if(key==='body')return body;
    if(key==='getElementById')return id=>
      id==='save-writer-blocked'?null:target.getElementById(id);
    return target[key];
  }});
  g.ctx.unescape=unescape;
  g.run('set_S(loadSave()); S.solari += 999; metaFill.showWriterBlocked({status:"busy"})');
  assert.equal(body.children.length,1);
  assert.equal(body.children[0].id,'save-writer-blocked');
  const text=nodes.filter(x=>x.tag==='p').map(x=>x.textContent).join(' ');
  assert.match(text,/не очищайте данные/i);
  const field=nodes.find(x=>x.tag==='textarea');
  assert.ok(field);
  assert.equal(field.readOnly,true);
  assert.equal(field.value,Buffer.from(o.store.get(KEY),'utf8').toString('base64'));
  assert.equal(JSON.parse(Buffer.from(field.value,'base64')).solari,money(original));
  done('E17','blocked UI exports storage-confirmed bytes, never mutated RAM');
}
// E18: corrupt stored primary does not get labelled verified export.
{
  const o=origin('{BROKEN'),a=o.tab(),g=a.g,nodes=[];
  const make=tag=>{
    const element={tag,style:{},children:[],setAttribute(){},
      remove(){},addEventListener(){},appendChild(child){this.children.push(child);}};
    nodes.push(element);return element;
  };
  const d=g.ctx.document,body=make('body');
  g.ctx.document=new Proxy(d,{get(t,k){
    if(k==='createElement')return make;
    if(k==='getElementById')return id=>null;
    if(k==='body')return body;
    return t[k];
  }});
  g.run('metaFill.showWriterBlocked({status:"corrupt"})');
  assert.equal(nodes.some(x=>x.tag==='textarea'),false);
  assert.equal(body.children.length,1);
  done('E18','corrupt primary is never exported as verified');
}
assert.deepEqual(ids,Array.from({length:18},(_,i)=>'E'+String(i+1).padStart(2,'0')));
console.log('[ARCH-02C-B3-B1b-LIFECYCLE] 18/18 opt-in lifecycle cases; '+
  'legacy cached v140 remains UNFENCED; real two-page/Safari proof REQUIRED.');
