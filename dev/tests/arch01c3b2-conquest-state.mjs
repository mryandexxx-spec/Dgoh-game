// ARCH-01C3b2 B1 — execute the real compiled PWA or HTML artifact.
// Exact live-state, global/local/boss feat, NOTES and persistence compatibility.
import assert from 'node:assert/strict';
import { loadGame, FIXED_NOW } from './lib/load.mjs';

const file=process.argv[2]||'dist/pwa/index.html';
const g=loadGame(file,{seed:17}),run=x=>g.run(x);
const asJson=expr=>JSON.parse(run('JSON.stringify('+expr+')'));
assert.equal(run('typeof cqBump'),'function');
assert.equal(run('typeof cqScore'),'function');
assert.equal(run('typeof cqFeats'),'function');
assert.equal(run('typeof cq'),'function');
assert.equal(run('typeof persist0'),'function');

run('set_S(newSave())');
run('cq()');
assert.equal(run('cqScore()'),0);
assert.equal(run('NOTES.length'),0);
assert.equal(run('S.conq.pts'),0);

// First partial progress notifies exactly once, same queue and payload.
let out=asJson("cqBump('win',null,1)");
assert.equal(out.length,1);assert.equal(out[0].F.key,'g:win');
assert.equal(out[0].v,1);
assert.equal(run('S.conq.fp["g:win"]'),1);
assert.equal(run('S.conq.pts'),0);
assert.equal(run('NOTES.length'),1);
let note=asJson('NOTES[0]');
assert.equal(note.kind,'cqf');assert.equal(note.F.key,'g:win');assert.equal(note.v,1);
assert.ok(typeof note.id==='string'&&note.id.length>0);
const id=note.id;

// Absolute value caps at need; gives 15 points exactly once.
out=asJson("cqBump('win',null,30,true)");
assert.equal(out.length,1); assert.equal(out[0].v,30);
assert.equal(run('S.conq.fp["g:win"]'),30);
assert.equal(run('S.conq.fd["g:win"]'),1);
assert.equal(run('S.conq.pts'),15);
assert.equal(run('cqScore()'),15);
assert.equal(run('NOTES.length'),2);
assert.notEqual(asJson('NOTES[1]').id,id);
assert.deepEqual(asJson("cqBump('win',null,2)"),[],'completed feat must not increment or notify');
assert.equal(run('NOTES.length'),2);

// A local sector completion contributes sector points without replaying completed global feat.
out=asJson("cqBump('win',0,6)");
assert.equal(out.length,1);
assert.equal(out[0].F.key,'0:win');assert.equal(out[0].v,6);
assert.equal(run('S.conq.fd["0:win"]'),1);
assert.equal(run('S.conq.pts'),18);
assert.equal(run('cqScore()'),18);
assert.equal(asJson('NOTES[2]').F.key,'0:win');
assert.deepEqual(asJson("cqBump('win',0,6)"),[]);
assert.equal(run('NOTES.length'),3);

// Boss global feat, absolute counter, sector-specific boss feat.
out=asJson("cqBump('boss',null,5,true)");
assert.equal(out.length,1);
assert.equal(out[0].F.key,'g:boss');assert.equal(out[0].v,5);
assert.equal(run('S.conq.pts'),33);
out=asJson("cqBump('boss1',4,1)");
assert.equal(out.length,1);assert.equal(out[0].F.key,'4:b1');
assert.equal(run('S.conq.pts'),36);
assert.equal(run('NOTES.length'),5);
assert.equal(new Set(asJson('NOTES.map(n=>n.id)')).size,5,'notification IDs must be unique');

// Stars are still part of the score; notes queue is owned by shared core.
run('S.conq.stars=7');
assert.equal(run('cqScore()'),43);
assert.equal(asJson('NOTES.map(n=>n.kind)').every(x=>x==='cqf'),true);

// Persist and re-load a v1 save: no schema change, points and completed feats survive.
run('persist0()');
const saved=run('localStorage.getItem(SAVE_KEY)');
assert.ok(saved.includes('"conq"'));
const old=JSON.parse(saved);
assert.equal(old.conq.pts,36);assert.equal(old.conq.fp['g:win'],30);
run('set_S(loadSave())');
assert.equal(run('cqScore()'),43);
assert.equal(run('S.conq.fd["4:b1"]'),1);
assert.deepEqual(asJson("cqBump('boss1',4,1)"),[]);
run('set_S(fillSave(JSON.parse(localStorage.getItem(SAVE_KEY))))');
assert.equal(run('cqScore()'),43);
assert.equal(run('NOTES.length'),5,'replacing S does not replace the core queue');

// Replace with a new save, then repeat partial event; no stale old S reference.
run('set_S(newSave());cq()');
assert.equal(run('cqScore()'),0);
assert.equal(run('S.conq.fp["g:win"]||0'),0);
out=asJson("cqBump('win',null,2)");
assert.equal(out.length,1);assert.equal(run('S.conq.fp["g:win"]'),2);
assert.equal(run('NOTES.length'),6);

// Monday weekly rollover replaces only week-scoped Conquest progress.
run('S.conq.stars=9; S.conq.pts=12; S.conq.diff="easy"; S.cqUnlock={easy:"legacy"}');
const oldWeek=run('cqWeek()');
g.setNow(FIXED_NOW+7*24*60*60*1000);
assert.notEqual(run('cqWeek()'),oldWeek);
assert.equal(run('cqScore()'),0,'new local Monday wipes old weekly points');
assert.equal(run('S.conq.fd["g:win"]||0'),0);
assert.equal(run('S.conq.fp["g:win"]||0'),0);
assert.equal(run('S.cqUnlock.easy'),'legacy','permanent difficulty unlock survives reset');
out=asJson("cqBump('win',null,3)");
assert.equal(out[0].v,3);
assert.equal(run('S.conq.fp["g:win"]'),3);
assert.equal(run('NOTES.length'),7);

// Refill costs/date key unchanged after shift; original C3b1 also runs separately.
assert.equal(run('cqRfCost()'),50);
assert.equal(run('cqRfN()'),0);
assert.equal(run('CQ_EN.max'),100);
assert.equal(run('CQ_EN.sec'),180);
assert.equal(run('CQ_RF.amt'),50);
console.log('ARCH-01C3b2 real Conquest state: PASS; fresh/imported/replaced saves, Monday reset, score/feats, 7 NOTES, id, weekly unlocks, same PWA/artifact API; '+file);
