// ARCH-02C-B4-B4a: Conquest one-time track claims on real compiled artifacts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1', BACKUP=KEY+'.backup';
const fixture=JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(
 path.dirname(fileURLToPath(import.meta.url)),
 '../fixtures/saves/01-legacy-v1.json'),'utf8')));
const passed=[];
const pass=(n,desc)=>{passed.push(n);console.log('  '+n+' '+desc);};
class Locks {
 constructor(){this.held=false;}
 request(name,opts,cb){
  assert.equal(name,KEY+'.writer');
  assert.equal(opts.mode,'exclusive');
  assert.equal(opts.ifAvailable,true);
  if(this.held)return Promise.resolve().then(()=>cb(null));
  this.held=true;
  return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
   .finally(()=>{this.held=false;});
 }
}
async function boot(raw=fixture){
 const overlay={innerHTML:'<p>unclaimed</p>'}, listeners={};
 const g=loadGame(html,{seed:59,
  onQuerySelector:s=>s==='#overlay'?overlay:null,
  onDocumentListener:(type,fn)=>{(listeners[type]??=[]).push(fn);}
 });
 g.store.set(KEY,raw);g.ctx.navigator={locks:new Locks()};
 assert.equal((await g.run('start({})')).status,'started');
 assert.equal(g.run('loadSave.writer.state().status'),'owned');
 g.overlay=overlay;g.listeners=listeners;
 return g;
}
function prepared(g){
 g.run("cq().diff='easy';cq().stars=999;persist()");
 return g.store.get(KEY);
}
const disk=g=>JSON.parse(g.store.get(KEY));
const ram=g=>JSON.parse(g.run('JSON.stringify(S)'));
const blocked=g=>g.run('start.writerLifecycle().blocked');
function spy(g,inject){
 const puts=[],old=g.ctx.localStorage.setItem;
 g.ctx.localStorage.setItem=(k,v)=>{
  puts.push(k);if(inject)inject(k,v,old);else old(k,v);
 };
 return puts;
}
// Dispatch through the real document listener, not directly into the helper:
 // a reentrant/stale DOM event must be intercepted before frozen cqClick.
function claim(g,kind,n){
 const button={dataset:{[kind]:String(n)}};
 const e={target:{closest:selector=>
  selector==='button, [data-fxu], .unit.tgt, .detail'?button:null},
  preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
 assert.ok(g.listeners.click?.length>0);
 for(const handler of g.listeners.click)handler(e);
 return true;
}

// B431: intermediate claim and all grants use exactly one verified checkpoint.
{
 const g=await boot(),before=prepared(g),old=ram(g),writes=spy(g);
 assert.equal(claim(g,'cqst',0),true);
 const after=disk(g);
 assert.equal(after.conq.tk.s0,1);
 assert.ok(after.solari>old.solari);
 assert.ok(after.jt>old.jt);
 assert.equal(writes.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 assert.deepEqual(ram(g),after);
 pass('B431','track claim token and resources are committed together');
 g.run('loadSave.writer.release()');
}
// B432: a stale or repeated intermediate button may not grant twice.
{
 const g=await boot();prepared(g);
 claim(g,'cqst',0);
 const raw=g.store.get(KEY),writes=spy(g);
 claim(g,'cqst',0);
 assert.equal(g.store.get(KEY),raw);
 assert.equal(writes.length,0);
 pass('B432','stale intermediate button cannot pay again');
 g.run('loadSave.writer.release()');
}
// B433: random chest payout and claim token commit together before modal.
{
 const g=await boot(),before=prepared(g),old=ram(g),writes=spy(g);
 assert.equal(claim(g,'cqopen',0),true);
 const after=disk(g);
 assert.equal(after.conq.tk.c0,1);
 assert.equal(after.solari,old.solari+10000);
 assert.ok([40,90].includes(after.cry-old.cry));
 assert.equal(writes.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 assert.equal(ram(g).conq.tk.c0,1);
 assert.ok(g.overlay.innerHTML.includes('Сундук Джихада'));
 pass('B433','chest token, fixed rewards and one RNG draw precede result modal');
 g.run('loadSave.writer.release()');
}
// B434: repeated or malformed chest button is denied without RNG or IO.
{
 const g=await boot();prepared(g);claim(g,'cqopen',0);
 const raw=g.store.get(KEY),writes=spy(g);
 for(const spec of [-1,0,1000,'NaN','1.2'])claim(g,'cqopen',spec);
 assert.equal(g.store.get(KEY),raw);
 assert.equal(writes.length,0);
 pass('B434','replayed/invalid chest clicks cannot mint another payout');
 g.run('loadSave.writer.release()');
}
// B435: backup quota fails closed, no intermediate grant or false success.
{
 const g=await boot(),before=prepared(g),old=ram(g);
 spy(g,(k,v,put)=>{
  if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
  put(k,v);
 });
 claim(g,'cqst',0);
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 pass('B435','backup quota rejects intermediate grant and retires writer');
}
// B436: backup SecurityError cannot expose uncommitted random chest result.
{
 const g=await boot(),before=prepared(g),old=ram(g);
 spy(g,(k,v,put)=>{
  if(k===BACKUP)throw Object.assign(new Error('blocked storage'),{name:'SecurityError'});
  put(k,v);
 });
 claim(g,'cqopen',0);
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 assert.ok(!g.overlay.innerHTML.includes('Сундук Джихада'));
 pass('B436','SecurityError denies chest without prize presentation');
}
// B437: ambiguous primary after-write cannot reroll, cold boot sees token.
{
 const g=await boot(),before=prepared(g),old=ram(g);
 let hit=false;
 spy(g,(k,v,put)=>{
  put(k,v);
  if(k===KEY&&!hit){hit=true;throw Object.assign(new Error('after-write'),{name:'QuotaExceededError'});}
 });
 claim(g,'cqopen',0);
 assert.equal(hit,true);
 assert.notEqual(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 assert.ok(!g.overlay.innerHTML.includes('Сундук Джихада'));
 const next=g.store.get(KEY),re=await boot(next);
 assert.equal(disk(re).conq.tk.c0,1);
 const writes=spy(re);
 claim(re,'cqopen',0);
 assert.equal(writes.length,0);
 re.run('loadSave.writer.release()');
 pass('B437','uncertain primary blocks old realm and cold boot cannot reroll');
}
// B438: losing exclusive writer lease denies either kind of claim.
{
 const g=await boot(),before=prepared(g),old=ram(g);
 g.run('loadSave.writer.release()');
 claim(g,'cqst',0);claim(g,'cqopen',0);
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 pass('B438','lost Web Locks lease cannot grant track or chest loot');
}
// B439: final chest achievement counter and payout are one-time.
{
 const g=await boot();prepared(g);
 const old=ram(g);
 claim(g,'cqopen',6);
 const next=disk(g),writes=spy(g);
 assert.equal(next.conq.tk.c6,1);
 assert.equal(next.stats.cqMax,(old.stats.cqMax||0)+1);
 claim(g,'cqopen',6);
 assert.equal(writes.length,0);
 assert.equal(disk(g).stats.cqMax,next.stats.cqMax);
 pass('B439','last chest statistic and payout cannot duplicate');
 g.run('loadSave.writer.release()');
}
// B440: primary read SecurityError prevents any attempted claim write.
{
 const g=await boot(),before=prepared(g),old=ram(g);
 const previous=g.ctx.localStorage.getItem;
 g.ctx.localStorage.getItem=k=>{if(k===KEY)throw Object.assign(new Error('denied'),{name:'SecurityError'});return previous(k);};
 const writes=spy(g);
 claim(g,'cqopen',0);
 assert.equal(writes.length,0);
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 pass('B440','unavailable primary read is fail-closed before RNG');
}
assert.deepEqual(passed,['B431','B432','B433','B434','B435','B436','B437','B438','B439','B440']);
console.log('ARCH-02C-B4-B4a: '+passed.length+' track claim cases on '+html);
