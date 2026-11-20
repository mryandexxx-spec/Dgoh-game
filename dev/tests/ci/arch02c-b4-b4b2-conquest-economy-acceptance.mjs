// ARCH-02C-B4-B4b2: Conquest store, cached route and consumable settlement.
// The same scenarios must pass on the compiled PWA and single-file HTML.
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
const passed=[];
function pass(n,description){passed.push(n);console.log('  '+n+' '+description);}
class Locks{
 constructor(){this.held=false;}
 request(name,options,cb){
  assert.equal(name,KEY+'.writer');
  assert.equal(options.mode,'exclusive');assert.equal(options.ifAvailable,true);
  if(this.held)return Promise.resolve().then(()=>cb(null));
  this.held=true;
  return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
   .finally(()=>{this.held=false;});
 }
}
async function boot(raw=fixture){
 const listeners={},overlay={innerHTML:''};
 const g=loadGame(html,{seed:89,
  onQuerySelector:s=>s==='#overlay'?overlay:null,
  onDocumentListener:(type,fn)=>{(listeners[type]??=[]).push(fn);}
 });
 g.store.set(KEY,raw);g.ctx.navigator={locks:new Locks()};
 assert.equal((await g.run('start({})')).status,'started');
 assert.equal(g.run('loadSave.writer.state().status'),'owned');
 g.listeners=listeners;g.overlay=overlay;
 return g;
}
const disk=g=>JSON.parse(g.store.get(KEY));
const ram=g=>JSON.parse(g.run('JSON.stringify(S)'));
const notes=g=>g.run('NOTES.length');
const blocked=g=>g.run('start.writerLifecycle().blocked');
function spy(g,inject){
 const old=g.ctx.localStorage.setItem,keys=[];
 g.ctx.localStorage.setItem=(key,val)=>{
  keys.push(key);if(inject)inject(key,val,old);else old(key,val);
 };
 return keys;
}
function click(g,kind,val){
 const button={dataset:{[kind]:String(val)}};
 const e={target:{closest:sel=>sel==='button, [data-fxu], .unit.tgt, .detail'?button:null},
  preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
 for(const fn of g.listeners.click||[])fn(e);
}
function prepCache(g){
 return g.run("(function(){const C=cq();C.diff='easy';C.pick=null;C.open=0;const a=cqLayout(0).find(x=>x.type==='cache');const p=cqLayout(0).find(x=>x.L===5&&x.next.includes(a.key));if(!p)throw Error('missing predecessor');C.done[p.key]=1;S.cry=1500;S.solari=500000;S.jt=1500;persist();return a.key})()");
}
function unlockedCache(g){
 const key=prepCache(g);click(g,'cqnode',key);
 assert.equal(disk(g).conq.done[key],1);
 return key;
}
function prepShop(g){
 g.run("(function(){const C=cq();C.diff='easy';C.pick=null;S.jt=2000;S.cry=1500;persist()})()");
}
function prepDisc(g){
 return g.run("(function(){const C=cq();C.diff='easy';C.pick=null;C.disks=[{k:Object.keys(CQ_DISKS)[0],on:1}];C.en=100;C.enTs=Date.now();persist();return C.disks[0].k})()");
}
function verified(g,before,keys){
 assert.equal(keys.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 assert.deepEqual(ram(g),disk(g));
}

// B451: pinned view and new read-only purchase mirror agree exactly.
{
 const g=await boot();prepShop(g);
 const parity=g.run("JSON.stringify([cqShopItems().map(x=>({key:x.key,price:x.price,sold:!!x.sold})),cq.claimRules().cqShopOffer()])");
 const [frozen,mirror]=JSON.parse(parity);
 assert.deepEqual(mirror,frozen);assert.equal(frozen.length,7);
 pass('B451','frozen weekly shop stock, prices and ownership match rule mirror');
 g.run('loadSave.writer.release()');
}
// B452: entering a fresh cache commits route and unlock token together.
{
 const g=await boot(),key=prepCache(g),before=g.store.get(KEY),w=spy(g);
 click(g,'cqnode',key);
 const C=disk(g).conq;
 assert.equal(C.done[key],1);assert.equal(C.route[0][6],key);
 assert.equal(C.sel,key);verified(g,before,w);
 pass('B452','first cache selection and route use one checkpoint');
 g.run('loadSave.writer.release()');
}
// B453: tapping a previously opened cache cannot re-commit it.
{
 const g=await boot(),key=unlockedCache(g),raw=g.store.get(KEY),w=spy(g);
 click(g,'cqnode',key);
 assert.equal(g.store.get(KEY),raw);assert.equal(w.length,0);
 pass('B453','repeated open-cache tap does not write or replay route');
 g.run('loadSave.writer.release()');
}
// B454: cache merchandise debit, item stock and stamina restore share a commit.
{
 const g=await boot(),key=unlockedCache(g);
 const id=g.run('unlockedIds()[0]');
 assert.ok(id);
 g.run("cqStaSet('"+id+"',50);persist()");
 const before=g.store.get(KEY),prior=ram(g),w=spy(g);
 click(g,'cqbuy',key+':0');
 const s=disk(g);
 assert.equal(s.cry,prior.cry-60);
 assert.ok(s.conq.buy[key].includes(0));
 assert.ok(s.conq.sta[id].v>=80);
 verified(g,before,w);
 pass('B454','contraband ration debit, stock, and hero stamina settle together');
 g.run('loadSave.writer.release()');
}
// B455: duplicate contraband purchase does not deduct twice.
{
 const g=await boot(),key=unlockedCache(g);
 click(g,'cqbuy',key+':0');
 const raw=g.store.get(KEY),w=spy(g);
 click(g,'cqbuy',key+':0');
 assert.equal(g.store.get(KEY),raw);assert.equal(w.length,0);
 pass('B455','cache purchase stock prevents stale replay');
 g.run('loadSave.writer.release()');
}
// B456: cache quota fails closed with all resources/stock untouched.
{
 const g=await boot(),key=unlockedCache(g),old=ram(g),raw=g.store.get(KEY),n=notes(g);
 spy(g,(k,v,put)=>{
  if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
  put(k,v);
 });
 click(g,'cqbuy',key+':0');
 assert.equal(g.store.get(KEY),raw);
 assert.deepEqual(ram(g),old);assert.equal(notes(g),n);
 assert.equal(blocked(g),true);
 pass('B456','backup quota revokes contraband payment and stock');
}
// B457: contraband's deterministic grant list is checkpointed with cost.
{
 const g=await boot(),key=unlockedCache(g);
 const index=g.run("cqGoods('"+key+"').findIndex(x=>x.rw&&x.rw.length>0)");
 assert.ok(index>=2);
 const before=g.store.get(KEY),old=ram(g),w=spy(g),
  chosen=JSON.parse(g.run("JSON.stringify(cqGoods('"+key+"')["+index+"])"));
 click(g,'cqbuy',key+':'+index);
 const next=disk(g);
 assert.equal(next.conq.buy[key].includes(index),true);
 const res=chosen.cost[0],price=chosen.cost[1];
 assert.equal(res==='sol'?next.solari:next[res],(res==='sol'?old.solari:old[res])-price);
 verified(g,before,w);
 pass('B457','randomized cache inventory pays fixed resource grant only on commit');
 g.run('loadSave.writer.release()');
}
// B458: shop medkits are repeatable, but each payment is verified.
{
 const g=await boot();prepShop(g);
 const before=g.store.get(KEY),old=ram(g),w=spy(g);
 click(g,'cqjbuy','med');
 const next=disk(g);
 assert.equal(next.jt,old.jt-30);assert.equal(next.cqMed,(old.cqMed||0)+1);
 verified(g,before,w);
 pass('B458','first Jihad medkit is debited once with inventory');
 g.run('loadSave.writer.release()');
}
// B459: three-medkit bundle uses its original price and count.
{
 const g=await boot();prepShop(g);
 const before=g.store.get(KEY),old=ram(g),w=spy(g);
 click(g,'cqjbuy','med3');
 assert.equal(disk(g).jt,old.jt-80);
 assert.equal(disk(g).cqMed,(old.cqMed||0)+3);
 verified(g,before,w);
 pass('B459','three-medkit pack costs 80 trophies and grants three');
 g.run('loadSave.writer.release()');
}
// B460: weekly offered shop disk debit, mark, and ownership are atomic.
{
 const g=await boot();prepShop(g);
 const chosen=g.run("cqShopItems().find(x=>x.key.startsWith('d:')).key");
 const price=g.run("cqShopItems().find(x=>x.key==='"+chosen+"').price");
 const before=g.store.get(KEY),old=ram(g),w=spy(g);
 click(g,'cqjbuy',chosen);
 const next=disk(g);
 assert.equal(next.jt,old.jt-price);
 assert.ok(next.conq.disks.some(x=>x.k===chosen.slice(2)));
 assert.equal(next.cqShop.b[chosen],1);
 verified(g,before,w);
 pass('B460','weekly shop disk debit, sold token and disk ownership commit together');
 g.run('loadSave.writer.release()');
}
// B461: replay of sold disk cannot mint another or charge twice.
{
 const g=await boot();prepShop(g);
 const chosen=g.run("cqShopItems().find(x=>x.key.startsWith('d:')).key");
 click(g,'cqjbuy',chosen);
 const raw=g.store.get(KEY),w=spy(g);
 click(g,'cqjbuy',chosen);
 assert.equal(g.store.get(KEY),raw);assert.equal(w.length,0);
 pass('B461','weekly unique disk cannot be bought twice');
 g.run('loadSave.writer.release()');
}
// B462: quota after 8th disk's feat trigger discards transient NOTES too.
{
 const g=await boot();prepShop(g);
 const chosen=g.run("cqShopItems().find(x=>x.key.startsWith('d:')).key");
 g.run("(function(){const k='"+chosen.slice(2)+"',C=cq();C.disks=Object.keys(CQ_DISKS).filter(x=>x!==k).slice(0,7).map(x=>({k:x,on:0}));C.fp={};C.fd={};C.pts=0;persist()})()");
 const old=ram(g),n=notes(g),raw=g.store.get(KEY);
 spy(g,(k,v,put)=>{
  if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
  put(k,v);
 });
 click(g,'cqjbuy',chosen);
 assert.deepEqual(ram(g),old);assert.equal(notes(g),n);
 assert.equal(g.store.get(KEY),raw);assert.equal(blocked(g),true);
 pass('B462','failed shop feat rolls back trophy debit, ownership and NOTES');
}
// B463: applying medkit consumes inventory and commits stamina exactly once.
{
 const g=await boot();prepShop(g);
 const id=g.run('unlockedIds()[0]');
 assert.ok(id);
 g.run("S.cqMed=1;cqStaSet('"+id+"',25);persist()");
 const before=g.store.get(KEY),w=spy(g);
 click(g,'cqmed',id);
 const s=disk(g);
 assert.equal(s.cqMed,0);assert.equal(s.conq.sta[id].v,75);
 verified(g,before,w);
 pass('B463','medkit application and stamina restoration commit together');
 g.run('loadSave.writer.release()');
}
// B464: recharge cost, refill counter and energy settle in one transaction.
{
 const g=await boot();prepShop(g);
 g.run("(function(){const C=cq();C.en=20;C.enTs=Date.now();S.cqRf={d:todayKey(),n:0};persist()})()");
 const cost=g.run('cqRfCost()'),before=g.store.get(KEY),old=ram(g),w=spy(g);
 click(g,'cqrf',10);
 const s=disk(g);
 assert.equal(s.cry,old.cry-cost);assert.equal(s.cqRf.n,1);
 assert.ok(s.conq.en>=old.conq.en+50);
 verified(g,before,w);
 pass('B464','recharge crystal debit, daily quota and energy commit together');
 g.run('loadSave.writer.release()');
}
// B465: storage failure cannot charge crystals or advance refill quota.
{
 const g=await boot();prepShop(g);
 const old=ram(g),raw=g.store.get(KEY),n=notes(g);
 spy(g,(k,v,put)=>{
  if(k===BACKUP)throw Object.assign(new Error('security'),{name:'SecurityError'});
  put(k,v);
 });
 click(g,'cqrf',0);
 assert.equal(g.store.get(KEY),raw);assert.deepEqual(ram(g),old);
 assert.equal(notes(g),n);assert.equal(blocked(g),true);
 pass('B465','failed recharge preserves exact currency, quota, and energy');
}
// B466: daily refill cap prohibits additional paid replenishment.
{
 const g=await boot();prepShop(g);
 g.run("S.cqRf={d:todayKey(),n:15};persist()");
 const raw=g.store.get(KEY),w=spy(g);
 click(g,'cqrf',0);
 assert.equal(g.store.get(KEY),raw);assert.equal(w.length,0);
 pass('B466','daily refill cap is rechecked in detached candidate');
 g.run('loadSave.writer.release()');
}
// B467: removing a disk debits energy and changes equipped state atomically.
{
 const g=await boot(),key=prepDisc(g),before=g.store.get(KEY),w=spy(g);
 click(g,'cqdoff',key);
 const C=disk(g).conq;
 assert.equal(C.disks.find(x=>x.k===key).on,0);
 assert.equal(C.en,75);verified(g,before,w);
 pass('B467','unequip debits 25 Resolve only with verified state');
 g.run('loadSave.writer.release()');
}
// B468: equipping a disk is checked and stale clicks cannot duplicate saves.
{
 const g=await boot(),key=prepDisc(g);
 click(g,'cqdoff',key);
 const before=g.store.get(KEY),w=spy(g);
 click(g,'cqdon',key);
 assert.equal(disk(g).conq.disks.find(x=>x.k===key).on,1);
 verified(g,before,w);
 const raw=g.store.get(KEY),again=spy(g);
 click(g,'cqdon',key);
 assert.equal(g.store.get(KEY),raw);assert.equal(again.length,0);
 pass('B468','equip is saved once and replayed input is inert');
 g.run('loadSave.writer.release()');
}
// B469: changing visible sector is checked against the current unlocked limit.
{
 const g=await boot();prepShop(g);
 g.run("cq().open=1;persist()");
 const before=g.store.get(KEY),w=spy(g);
 click(g,'cqsec',1);
 assert.equal(disk(g).conq.sec,1);verified(g,before,w);
 const raw=g.store.get(KEY),again=spy(g);
 click(g,'cqsec',4);
 assert.equal(g.store.get(KEY),raw);assert.equal(again.length,0);
 pass('B469','sector selection cannot bypass unlocked sectors');
 g.run('loadSave.writer.release()');
}
// B470: forged item ids, unknown hero, malformed node never bypass validation.
{
 const g=await boot();prepShop(g);
 const raw=g.store.get(KEY),w=spy(g);
 click(g,'cqbuy','999-6-0:0');
 click(g,'cqbuy','0-6-0:-1');
 click(g,'cqnode','999-6-0');
 click(g,'cqjbuy','d:does-not-exist');
 click(g,'cqmed','__unknown__');
 click(g,'cqsec','-1');
 assert.equal(g.store.get(KEY),raw);assert.equal(w.length,0);
 assert.equal(g.run('loadSave.writer.check().ok'),true);
 pass('B470','forged cache/shop/item action is rejected before payment or write');
 g.run('loadSave.writer.release()');
}
// B471: ambiguous after-write shop disk remains once-owned after cold boot.
{
 const g=await boot();prepShop(g);
 const item=g.run("cqShopItems().find(x=>x.key.startsWith('d:')).key"),
  before=g.store.get(KEY),old=ram(g);
 let thrown=false;
 spy(g,(key,val,put)=>{
  put(key,val);
  if(key===KEY&&!thrown){
   thrown=true;throw Object.assign(new Error('after-write'),{name:'QuotaExceededError'});
  }
 });
 click(g,'cqjbuy',item);
 assert.equal(thrown,true);assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 const raw=g.store.get(KEY);
 assert.notEqual(raw,before);
 const cold=await boot(raw),w=spy(cold);
 assert.equal(disk(cold).cqShop.b[item],1);
 click(cold,'cqjbuy',item);
 assert.equal(w.length,0);
 cold.run('loadSave.writer.release()');
 pass('B471','uncertain shop payment is not replayed after cold bootstrap');
}
// B472: release of native writer denies all payable operations without fallback.
{
 const g=await boot();prepShop(g);
 const old=ram(g),raw=g.store.get(KEY),n=notes(g);
 g.run('loadSave.writer.release()');
 click(g,'cqjbuy','med');
 click(g,'cqrf',0);
 click(g,'cqmed','duncan');
 click(g,'cqnode','0-6-0');
 assert.equal(g.store.get(KEY),raw);assert.deepEqual(ram(g),old);
 assert.equal(notes(g),n);assert.equal(blocked(g),true);
 pass('B472','native lease loss forbids spending, reward and cache progress');
}
assert.deepEqual(passed,Array.from({length:22},(_,i)=>'B'+(451+i)));
console.log('ARCH-02C-B4-B4b2: '+passed.length+' store/refill/consumable cases on '+html);
