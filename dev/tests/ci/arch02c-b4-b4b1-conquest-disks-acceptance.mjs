// ARCH-02C-B4-B4b1: weekly disk rewards and transient feat notes.
// Normal mandatory native Web Locks boot; real compiled PWA and HTML artifact.
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
const pass=(id,s)=>{passed.push(id);console.log('  '+id+' '+s);};
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
async function boot(raw=fixture){
 const listeners={};
 const g=loadGame(html,{seed:67,onDocumentListener:(type,fn)=>{
  (listeners[type]??=[]).push(fn);
 }});
 g.store.set(KEY,raw);g.ctx.navigator={locks:new Locks()};
 assert.equal((await g.run('start({})')).status,'started');
 assert.equal(g.run('loadSave.writer.state().status'),'owned');
 g.listeners=listeners;
 return g;
}
const disk=g=>JSON.parse(g.store.get(KEY));
const ram=g=>JSON.parse(g.run('JSON.stringify(S)'));
const blocked=g=>g.run('start.writerLifecycle().blocked');
const notes=g=>g.run('NOTES.length');
function spy(g,inject){
 const old=g.ctx.localStorage.setItem,puts=[];
 g.ctx.localStorage.setItem=(k,v)=>{
  puts.push(k);if(inject)inject(k,v,old);else old(k,v);
 };
 return puts;
}
function click(g,kind,choice){
 const button={dataset:{[kind]:String(choice)}};
 const event={target:{closest:selector=>
  selector==='button, [data-fxu], .unit.tgt, .detail'?button:null},
  preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
 assert.ok(g.listeners.click?.length);
 for(const handle of g.listeners.click)handle(event);
}
function readyDifficulty(g) {
 g.run('S.acc.lvl=20;persist()');
}
function readyStart(g) {
 g.run("(function(){S.acc.lvl=20;const C=cq();C.diff='easy';C.pick=cqDiskPick('start');persist()})()");
 return g.run('cq().pick[0]');
}
function readyNode(g) {
 return g.run("(function(){const C=cq();C.diff='easy';C.pick=null;const a=cqLayout(0).find(x=>x.type==='disk');const prev=cqLayout(0).find(x=>x.L===3&&x.next.includes(a.key));C.done[prev.key]=1;persist();return a.key+':'+cqNodeDisks(a)[0]})()");
}
function seedFeat(g){
 return g.run("(function(){const C=cq();C.diff='easy';const ks=Object.keys(CQ_DISKS);C.disks=ks.slice(0,7).map(k=>({k,on:0}));C.pick=[ks[7]];C.fp={};C.fd={};C.pts=0;persist();return ks[7]})()");
}

// B441: selecting a difficulty and seeded initial choice is a single verified commit.
{
 const g=await boot();readyDifficulty(g);
 const before=g.store.get(KEY),writes=spy(g);
 click(g,'cqdiff','easy');
 const next=disk(g);
 assert.equal(next.conq.diff,'easy');
 assert.ok(next.conq.pick.length>0);
 assert.equal(writes.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 pass('B441','difficulty and seeded first disk offer commit together');
 g.run('loadSave.writer.release()');
}
// B442: a stale difficulty button must not switch chosen mode or reroll.
{
 const g=await boot();readyDifficulty(g);click(g,'cqdiff','easy');
 const raw=g.store.get(KEY),writes=spy(g);
 click(g,'cqdiff','normal');click(g,'cqdiff','easy');
 assert.equal(g.store.get(KEY),raw);
 assert.equal(writes.length,0);
 pass('B442','stale difficulty request cannot replace existing choice');
 g.run('loadSave.writer.release()');
}
// B443: first disk is added and offer cleared with exactly one checkpoint.
{
 const g=await boot(),key=readyStart(g),before=g.store.get(KEY),writes=spy(g);
 click(g,'cqdisk',key);
 const next=disk(g);
 assert.equal(next.conq.pick,null);
 assert.equal(next.conq.disks.filter(x=>x.k===key).length,1);
 assert.equal(writes.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 pass('B443','starting disk, feat state and pick clearing commit once');
 g.run('loadSave.writer.release()');
}
// B444: old starting disk choice cannot duplicate disk or feats.
{
 const g=await boot(),key=readyStart(g);click(g,'cqdisk',key);
 const raw=g.store.get(KEY),w=spy(g);
 click(g,'cqdisk',key);
 assert.equal(g.store.get(KEY),raw);assert.equal(w.length,0);
 pass('B444','repeated starting disk input is idempotent');
 g.run('loadSave.writer.release()');
}
// B445: quota after a feat-triggering disk rolls back NOTES as well as S.
{
 const g=await boot(),key=seedFeat(g),old=ram(g),before=g.store.get(KEY),oldNotes=notes(g);
 spy(g,(k,v,put)=>{
  if(k===BACKUP)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});
  put(k,v);
 });
 click(g,'cqdisk',key);
 assert.deepEqual(ram(g),old);
 assert.equal(g.store.get(KEY),before);
 assert.equal(notes(g),oldNotes);
 assert.equal(blocked(g),true);
 pass('B445','quota discards disk, feat points and transient notification');
}
// B446: a disk-cache choice and route are recorded in one checked commit.
{
 const g=await boot(),spec=readyNode(g),before=g.store.get(KEY),w=spy(g);
 const [key,choice]=spec.split(':');
 assert.ok(choice);
 click(g,'cqnd',spec);
 const C=disk(g).conq;
 assert.equal(C.done[key],1);
 assert.equal(C.disks.filter(x=>x.k===choice).length,1);
 assert.equal(C.route[0][4],key);
 assert.equal(w.filter(k=>k===KEY).length,1);
 assert.equal(JSON.parse(g.store.get(BACKUP)).raw,before);
 pass('B446','node disk reward, spent node and route checkpoint together');
 g.run('loadSave.writer.release()');
}
// B447: stale, unoffered or malformed node requests cannot mint a disk.
{
 const g=await boot(),spec=readyNode(g);
 const offered=g.run("cqNodeDisks(cqNode('"+spec.split(':')[0]+"')).join(':')").split(':');
 click(g,'cqnd',spec);
 const raw=g.store.get(KEY),w=spy(g);
 click(g,'cqnd',spec);
 click(g,'cqnd',spec.split(':')[0]+':'+offered[1]);
 click(g,'cqnd','__invalid__:disk');
 assert.equal(g.store.get(KEY),raw);
 assert.equal(w.length,0);
 pass('B447','stale/invalid node cannot bypass one-time disk grant');
 g.run('loadSave.writer.release()');
}
// B448: failed node grant must not advance its route, set done or keep NOTES.
{
 const g=await boot(),spec=readyNode(g),before=g.store.get(KEY),old=ram(g),oldNotes=notes(g);
 spy(g,(k,v,put)=>{
  if(k===BACKUP)throw Object.assign(new Error('security'),{name:'SecurityError'});
  put(k,v);
 });
 click(g,'cqnd',spec);
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(notes(g),oldNotes);
 assert.equal(blocked(g),true);
 pass('B448','SecurityError rolls back route, disk and notifications');
}
// B449: after-write ambiguous disk cannot be claimed twice after cold boot.
{
 const g=await boot(),key=readyStart(g),before=g.store.get(KEY),old=ram(g);
 let injected=false;
 spy(g,(k,v,put)=>{
  put(k,v);
  if(k===KEY&&!injected){injected=true;throw Object.assign(new Error('afterwrite'),{name:'QuotaExceededError'});}
 });
 click(g,'cqdisk',key);
 assert.equal(injected,true);
 assert.deepEqual(ram(g),old);
 assert.equal(blocked(g),true);
 const raw=g.store.get(KEY);
 assert.notEqual(raw,before);
 const re=await boot(raw),w=spy(re);
 assert.equal(disk(re).conq.disks.filter(x=>x.k===key).length,1);
 assert.equal(disk(re).conq.pick,null);
 click(re,'cqdisk',key);
 assert.equal(w.length,0);
 re.run('loadSave.writer.release()');
 pass('B449','uncertain post-write blocks realm and cold boot prevents reroll');
}
// B450: a lost lease forbids all disk actions without touching RAM.
{
 const g=await boot(),key=readyStart(g),before=g.store.get(KEY),old=ram(g),oldNotes=notes(g);
 g.run('loadSave.writer.release()');
 click(g,'cqdisk',key);
 click(g,'cqnd','0-4-0:'+key);
 click(g,'cqdiff','easy');
 assert.equal(g.store.get(KEY),before);
 assert.deepEqual(ram(g),old);
 assert.equal(notes(g),oldNotes);
 assert.equal(blocked(g),true);
 pass('B450','lease loss denies difficulty and disk actions');
}
assert.deepEqual(passed,['B441','B442','B443','B444','B445','B446','B447','B448','B449','B450']);
console.log('ARCH-02C-B4-B4b1: '+passed.length+' Conquest disk settlement cases on '+html);
