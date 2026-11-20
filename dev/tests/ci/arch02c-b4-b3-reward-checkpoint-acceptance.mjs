// ARCH-02C-B4-B3: campaign simulations + manual Raid cashout.
// All tests use normal mandatory-Web-Locks start(), the compiled PWA or
// artifact, and the production B1 byte-verified backup-first writer.
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
function pass(id,desc){passed.push(id);console.log('  '+id+' '+desc);}
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
async function boot(raw=fixture) {
 const listeners={};
 const g=loadGame(html,{seed:43,onDocumentListener:(type,fn)=>{listeners[type]=fn;},onQuerySelector:selector=>selector==='#simn'?{value:'2',focus(){}}:null});
 g.store.set(KEY,raw);
 g.ctx.navigator={locks:new Locks()};
 const started=await g.run('start({})');
 assert.equal(started.status,'started');
 assert.equal(g.run('loadSave.writer.state().status'),'owned');
 g.listeners=listeners;
 return g;
}
const ram=g=>JSON.parse(g.run('JSON.stringify(S)'));
const disk=g=>JSON.parse(g.store.get(KEY));
const blocked=g=>g.run('start.writerLifecycle().blocked');
function spy(g,onWrite){
 const old=g.ctx.localStorage.setItem,writes=[];
 g.ctx.localStorage.setItem=(k,v)=>{writes.push(k);if(onWrite)onWrite(k,v,old);else old(k,v);};
 return writes;
}
function setupRaid(g) {
 g.run('S.raid={tier:0,hp:700,maxHp:1000,used:["leto"],log:[]};S.raidPick=[];persist()');
}
function raidEnd(g){
 const button={dataset:{raidend:'1'},textContent:''};
 const e={target:{closest(selector){
  return selector==='button, [data-fxu], .unit.tgt, .detail'?button:null;
 }}};
 assert.equal(typeof g.listeners.click,'function');
 g.listeners.click(e);
 assert.equal(button.dataset.confirm,'1');
 g.listeners.click(e);
}

// B417: sim core RNG/shards/pity/quests/account XP and cost are one commit.
{
 const g=await boot(), before=g.store.get(KEY), old=ram(g), writes=spy(g);
 g.run("doXSim('0:2')");
 const next=disk(g);
 assert.equal(writes.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 assert.equal(next.water,old.water-2*g.run('nodeCost(0)'));
 assert.equal(next.stats.wins,(old.stats.wins||0)+2);
 assert.ok(next.solari>old.solari);
 assert.ok(next.acc.xp!==old.acc.xp||next.acc.lvl!==old.acc.lvl);
 assert.equal(ram(g).water,next.water);
 assert.equal(g.run('loadSave.writer.check().ok'),true);
 pass('B417','focus campaign simulation commits resource, RNG rewards and XP once');
 g.run('loadSave.writer.release()');
}
// B418: quota denies entire random reward, no result acknowledged.
{
 const g=await boot(), before=g.store.get(KEY), old=ram(g);
 const writes=spy(g,(k,v,put)=>{
  if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
  put(k,v);
 });
 g.run("doXSim('0:2')");
 assert.ok(writes.includes(BACKUP));
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 pass('B418','campaign simulation backup quota rolls back all RAM rewards');
}
// B419: lost writer denies simulation without using old RAM.
{
 const g=await boot(), before=g.store.get(KEY), old=ram(g);
 g.run('loadSave.writer.release()');
 g.run("doXSim('0:2')");
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 pass('B419','lost writer cannot simulate or grant rewards');
}
// B420: ambiguous after-write must never roll again in the old realm.
{
 const g=await boot(), before=g.store.get(KEY), old=ram(g);
 let injected=false;
 spy(g,(k,v,put)=>{
  put(k,v);
  if(k===KEY&&!injected){injected=true;throw Object.assign(new Error('after write'),{name:'QuotaExceededError'});}
 });
 g.run("doXSim('0:2')");
 assert.ok(injected);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 const raw=g.store.get(KEY);
 assert.notEqual(raw,before);
 const re=await boot(raw);
 assert.deepEqual(disk(re),JSON.parse(raw));
 assert.equal(re.run('BT === null'),true);
 re.run('loadSave.writer.release()');
 pass('B420','ambiguous simulation write cannot replay RNG on cold boot');
}
// B421: normal popup simulation uses the same verified settlement.
{
 const g=await boot(),before=g.store.get(KEY),old=ram(g),writes=spy(g);
 g.run('openSim(0)');
 g.run('runSim()');
 const after=disk(g);
 assert.equal(writes.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 assert.ok(after.water<old.water);
 assert.ok(after.stats.wins>(old.stats.wins||0));
 pass('B421','regular campaign simulation persists before result overlay');
 g.run('loadSave.writer.release()');
}
// B422: partial raid cashout and setting S.raid=null are in one commit.
{
 const g=await boot();setupRaid(g);
 const before=g.store.get(KEY),old=ram(g),writes=spy(g);
 raidEnd(g);
 const next=disk(g);
 assert.equal(next.raid,null);
 assert.equal(next.teeth,old.teeth+Math.round(g.run('RAID_REWARD[0].teeth')*.3));
 assert.ok(next.solari>old.solari);
 assert.equal(writes.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 pass('B422','manual Raid cashout and raid deletion share one verified checkpoint');
 g.run('loadSave.writer.release()');
}
// B423: backup quota must leave the raid open with no payout.
{
 const g=await boot();setupRaid(g);
 const before=g.store.get(KEY),old=ram(g);
 const writes=spy(g,(k,v,put)=>{
  if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
  put(k,v);
 });
 raidEnd(g);
 assert.ok(writes.includes(BACKUP));
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 pass('B423','failed Raid cashout leaves durable raid and currencies unchanged');
}
// B424: a repeated raidend event cannot grant cashout twice.
{
 const g=await boot();setupRaid(g);
 raidEnd(g);
 const settled=g.store.get(KEY);
 raidEnd(g);
 assert.equal(g.store.get(KEY),settled);
 pass('B424','repeated Raid confirmation cannot pay twice');
 g.run('loadSave.writer.release()');
}
assert.deepEqual(passed,['B417','B418','B419','B420','B421','B422','B423','B424']);
console.log('ARCH-02C-B4-B3: '+passed.length+' reward checkpoint cases on '+html);
