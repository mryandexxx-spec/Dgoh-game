// ARCH-02D-B4b1 — lossless inactive Conquest week retention on clock-forward reads.
// Real built PWA and standalone HTML, native-shape exclusive Web Locks writer,
// local Mondays in 3 timezones. Archived runs NEVER authorize paid claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html', KEY='dune-goh-v1';
const fixture=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8'));
const DAY=86400000, zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const at=(y,m,d,h=12)=>new Date(y,m-1,d,h).getTime();
let passed=0;
const pass=(id,summary)=>{passed++;console.log('  '+id+' '+summary+' ['+zone+']');};
class Locks{
  constructor(){this.held=false;}
  request(name,opts,cb){
    assert.equal(name,KEY+'.writer');assert.equal(opts.mode,'exclusive');
    assert.equal(opts.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>cb(null));
    this.held=true;
    return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
async function boot(now,save=fixture){
  const g=loadGame(html,{seed:1024,now}),mono={value:1000};
  g.ctx.performance.now=()=>mono.value;
  g.store.set(KEY,typeof save==='string'?save:JSON.stringify(save));
  g.ctx.navigator={locks:new Locks()};
  g.ctx.fetch=()=>{throw Error('offline test must never request remote time');};
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  return g;
}
function close(g){g.run('loadSave.writer.release()');}
function checkpoint(g){
  assert.equal(g.run('persist().ok'),true);
  return g.store.get(KEY);
}
const snapshot=(g,expr)=>JSON.parse(g.run('JSON.stringify('+expr+')'));
function mark(g,id='old'){
  g.run('(()=>{const C=cq(); C.diff="easy"; C.stars=123; C.done['+
    JSON.stringify(id)+']=1; C.tk['+JSON.stringify(id)+']=1; C.route[0]={0:"0-0-0"}; C.disks.push({k:"stam",on:1});})()');
  const run=snapshot(g,'S.conq');
  return {wk:run.wk,run,raw:checkpoint(g)};
}

// B418: a forward-week read opens the new week's empty run, but retains the
// original FULL state, including claimed track markers, route and disks.
{
  const start=at(2026,11,10),first=await boot(start);
  const before=mark(first);close(first);
  const g=await boot(start+8*DAY,before.raw),disk=g.store.get(KEY);
  const next=snapshot(g,'cq()');
  assert.notEqual(next.wk,before.wk);
  assert.equal(next.diff,null);
  assert.equal(next.done.old,undefined);
  assert.equal(next.weekArchive.length,1);
  assert.deepEqual(next.weekArchive[0],before.run);
  assert.equal(next.weekArchive[0].weekArchive,undefined);
  assert.equal(g.store.get(KEY),disk,'RAM rollover is not a storage write');
  close(g);pass('B418','read-only forward rollover retains complete old week');
}

// B419: a subsequent verified checkpoint persists the archived prior week.
// Rolling the device back MUST NOT make the archive a second claim source.
{
  const start=at(2026,11,10),old=await boot(start);
  const before=mark(old);close(old);
  const forward=await boot(start+8*DAY,before.raw);
  forward.run('cq()');
  const later=checkpoint(forward),stored=JSON.parse(later);
  assert.equal(stored.v,1);
  assert.deepEqual(stored.conq.weekArchive[0],before.run);
  close(forward);
  const back=await boot(start,later);
  assert.notEqual(back.run('cq().wk'),before.wk);
  assert.equal(back.run('cq().tk.old'),undefined);
  assert.equal(back.run('cqCanClaim(0)'),false);
  assert.equal(back.run('cqOpen(cqNode("0-0-0"))'),false);
  assert.deepEqual(snapshot(back,'S.conq.weekArchive[0]'),before.run);
  assert.deepEqual(JSON.parse(checkpoint(back)).conq.weekArchive[0],before.run);
  close(back);pass('B419','verified new-week save retains inactive old run on rollback');
}

// B420: two sequential legitimate Mondays retain each earlier FULL run.
// History remains flat; no nested recursively expanding copies.
{
  const start=at(2026,11,10),old=await boot(start);
  const first=mark(old,'week0');close(old);
  const g=await boot(start+8*DAY,first.raw);
  g.run('cq().diff="normal";cq().done.week1=1;cq().tk.week1=1');
  const middle=snapshot(g,'S.conq'),one=checkpoint(g);
  assert.equal(middle.weekArchive.length,1);
  g.setNow(start+16*DAY);
  const current=snapshot(g,'cq()'),two=checkpoint(g);
  assert.equal(current.weekArchive.length,2);
  assert.deepEqual(current.weekArchive[0],first.run);
  const middleWithoutHistory={...middle}; delete middleWithoutHistory.weekArchive;
  assert.deepEqual(current.weekArchive[1],middleWithoutHistory);
  assert.equal(current.weekArchive[1].weekArchive,undefined);
  assert.equal(JSON.parse(two).conq.weekArchive.length,2);
  assert.notEqual(one,two);
  close(g);pass('B420','multiweek history is append-only and flat');
}

// B421: normal Sunday-to-Monday rollover remains immediately usable and
// J1's NEXT-week difficulty unlock stays tied to the historical local Monday.
{
  const sunday=at(2026,11,8,23),monday=at(2026,11,9,1);
  const g=await boot(sunday),old=mark(g);
  g.run('S.acc.lvl=99;S.cqUnlock.easy=S.conq.wk');
  checkpoint(g);
  g.setNow(monday);
  const next=snapshot(g,'cq()');
  assert.notEqual(next.wk,old.wk);
  assert.equal(next.wk,g.run('cqWeek()'));
  assert.equal(g.run('cqDifficultyAccess("normal")'),true);
  assert.equal(g.run('cqCanClaim(0)'),false);
  assert.equal(next.weekArchive[0].done.old,1);
  assert.equal(next.weekArchive[0].tk.old,1);
  close(g);pass('B421','local Monday and J1 forward progression unchanged');
}

// B422: existing same-week v1 saves have no new history/migration fields.
// Importing a previous-week archive preserves the v1 schema and all bytes.
{
  const start=at(2026,11,10),g=await boot(start);
  const original=snapshot(g,'S');
  g.run('cq()');
  assert.equal(g.run('S.conq.weekArchive'),undefined);
  const a=checkpoint(g);
  assert.equal(JSON.parse(a).v,1);
  assert.deepEqual(Object.keys(JSON.parse(a)).sort(),Object.keys(original).sort());
  close(g);
  const first=await boot(start,a),before=mark(first);close(first);
  const next=await boot(start+8*DAY,before.raw);
  next.run('cq()');
  const exported=checkpoint(next);
  close(next);
  const imported=await boot(start+8*DAY,exported);
  assert.equal(imported.run('S.v'),1);
  assert.deepEqual(snapshot(imported,'S.conq.weekArchive[0]'),before.run);
  assert.deepEqual(Object.keys(JSON.parse(exported)).sort(),Object.keys(original).sort());
  close(imported);
  pass('B422','legacy v1 + export/import keep optional week history stable');
}

// B423: invalid imported history must NOT be overwritten with empty history.
// Preserve the old run and B1's inactive-week spending/claim fail-closed rule.
{
  const start=at(2026,11,10),g=await boot(start);
  mark(g);
  g.run('S.conq.weekArchive="invalid-import-archive"');
  const previous=snapshot(g,'S.conq'),disk=checkpoint(g);
  g.setNow(start+8*DAY);
  assert.equal(g.run('cq().wk'),previous.wk);
  assert.deepEqual(snapshot(g,'S.conq'),previous);
  assert.equal(g.run('cqCanClaim(0)'),false);
  assert.equal(g.store.get(KEY),disk);
  close(g);pass('B423','invalid history cannot cause progress loss or claims');
}

// B424: archive creation inside a verified writer transaction commits BOTH
// old claim markers and the new run atomically, without a second store.
{
  const start=at(2026,11,10),g=await boot(start);
  const old=mark(g);
  g.setNow(start+8*DAY);
  const tx=g.run('loadSave.writer.transact(()=>{const C=cq();C.diff="normal";C.done.newweek=1;return 7;})');
  assert.equal(tx.ok,true);
  assert.equal(tx.value,7);
  const saved=JSON.parse(g.store.get(KEY));
  assert.equal(saved.conq.done.newweek,1);
  assert.equal(saved.conq.diff,'normal');
  assert.deepEqual(saved.conq.weekArchive[0],old.run);
  assert.equal(g.run('S.conq.weekArchive.length'),1);
  close(g);pass('B424','verified writer transaction retains old and new weeks');
}
assert.equal(passed,7);
console.log('ARCH-02D-B4b1 '+passed+' Conquest week-retention scenarios PASS: '+html+' TZ='+zone);
