// B4-B3b: trial attempts, RNG, rewards and account XP are one writer commit.
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
const pass=(id,n)=>{passed.push(id);console.log('  '+id+' '+n);};
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
 const g=loadGame(html,{seed:47});
 g.store.set(KEY,raw);g.ctx.navigator={locks:new Locks()};
 assert.equal((await g.run('start({})')).status,'started');
 assert.equal(g.run('loadSave.writer.state().status'),'owned');
 return g;
}
const disk=g=>JSON.parse(g.store.get(KEY));
const ram=g=>JSON.parse(g.run('JSON.stringify(S)'));
function setup(g,multi=false){
 g.run("S.trials.folio={0:3};S.trialRuns={d:todayKey(),n:{}};persist()");
 if(multi)g.run("S.trials.pl={0:3};persist()");
}
function spy(g,inject){
 const puts=[],original=g.ctx.localStorage.setItem;
 g.ctx.localStorage.setItem=(k,v)=>{
  puts.push(k);
  if(inject)inject(k,v,original);else original(k,v);
 };
 return puts;
}
// B425: one click atomically advances daily attempts, random rewards and XP.
{
 const g=await boot();setup(g);
 const before=g.store.get(KEY),old=ram(g),puts=spy(g);
 g.run("trialSimClick('folio:0:2')");
 const next=disk(g);
 assert.equal(next.trialRuns.n.folio,2);
 assert.equal(next.folio>old.folio,true);
 assert.equal((next.stats.trialRuns||0),(old.stats.trialRuns||0)+2);
 assert.equal(puts.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 assert.deepEqual(ram(g),next);
 pass('B425','single trial sim commits attempts, RNG rewards and XP together');
 g.run('loadSave.writer.release()');
}
// B426: stale and oversized button cannot mint more than current daily limit.
{
 const g=await boot();setup(g);
 g.run("trialSimClick('folio:0:999')");
 const first=g.store.get(KEY);
 assert.equal(disk(g).trialRuns.n.folio,3);
 const puts=spy(g);
 g.run("trialSimClick('folio:0:3')");
 assert.equal(g.store.get(KEY),first);
 assert.equal(puts.length,0);
 pass('B426','outdated repeat action cannot overrun capped daily attempts');
 g.run('loadSave.writer.release()');
}
// B427: failed backup write denies trial reward and does not acknowledge a win.
{
 const g=await boot();setup(g);
 const before=g.store.get(KEY),old=ram(g);
 spy(g,(k,v,write)=>{
  if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
  write(k,v);
 });
 g.run("trialSimClick('folio:0:2')");
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(g.run('start.writerLifecycle().blocked'),true);
 pass('B427','quota during trial checkpoint rolls back attempts and rewards');
}
// B428: all eligible trials share a *single* validated candidate checkpoint.
{
 const g=await boot();setup(g,true);
 const before=g.store.get(KEY),puts=spy(g);
 g.run('trialMulti()');
 const next=disk(g);
 assert.equal(next.trialRuns.n.folio,3);
 assert.equal(next.trialRuns.n.pl,3);
 assert.equal((next.stats.trialRuns||0),6);
 assert.equal(puts.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 pass('B428','multi-trial payout verified once with all available attempts');
 g.run('loadSave.writer.release()');
}
// B429: ambiguous post-write failure blocks old realm; re-boot never auto-rolls.
{
 const g=await boot();setup(g);
 const old=ram(g),before=g.store.get(KEY);
 let fired=false;
 spy(g,(k,v,write)=>{
  write(k,v);
  if(k===KEY&&!fired){fired=true;throw Object.assign(new Error('after-write'),{name:'QuotaExceededError'});}
 });
 g.run("trialSimClick('folio:0:2')");
 assert.equal(fired,true);
 assert.equal(g.run('start.writerLifecycle().blocked'),true);
 assert.deepEqual(ram(g),old);
 const raw=g.store.get(KEY);
 assert.notEqual(raw,before);
 const re=await boot(raw);
 assert.equal(disk(re).trialRuns.n.folio,2);
 assert.equal(re.run('BT === null'),true);
 re.run('loadSave.writer.release()');
 pass('B429','ambiguous primary does not replay trial rolls after reload');
}
// B430: no writer means no attempted sim award, including UI-free multi path.
{
 const g=await boot();setup(g,true);
 const before=g.store.get(KEY),old=ram(g);
 g.run('loadSave.writer.release()');
 g.run("trialSimClick('folio:0:2')");
 g.run('trialMulti()');
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 pass('B430','lost native lock rejects single and multi-trial payout');
}
assert.deepEqual(passed,['B425','B426','B427','B428','B429','B430']);
console.log('ARCH-02C-B4-B3b: '+passed.length+' trial settlement cases on '+html);
