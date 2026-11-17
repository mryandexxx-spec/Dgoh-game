// ARCH-01C3b3 B1 — REAL built PWA and portable HTML artifact,
// not a virtual esbuild candidate: TDZ, 3 difficulties, every boss text,
// all classic modifiers, thresholds, saves, weekly rollover, feats and refills.
import assert from 'node:assert/strict';
import { loadGame, FIXED_NOW } from './lib/load.mjs';

const file=process.argv[2]||'dist/pwa/index.html';
const g=loadGame(file,{seed:43});
const run=expression=>g.run(expression);
const json=expression=>JSON.parse(run('JSON.stringify('+expression+')'));

for(const name of ['cq','cqK','cqMod','cqModD','cqScore','cqBump','cqWeek','cqTrack','cqCanClaim','cqStCan','cqRfN','cqRfCost','persist0','loadSave','fillSave']){
 assert.equal(run('typeof '+name),'function','original global callable after actual bundle init: '+name);
}
run('set_S(newSave());cq()');
assert.equal(run('cqScore()'),0,'fresh score zero');
assert.equal(run('cqK()'),1,'unselected difficulty falls back to one');
assert.equal(run('NOTES.length'),0,'no bootstrap side effects or early notification');

const bosses=['b0a','b0b','b1a','b1b','b2a','b2b','b3a','b3b','b4a','b4b'];
assert.deepEqual(json('Object.keys(CQ_BMOD)'),bosses,'all ten original boss modifier rules retained');
const classic=json('Object.keys(CQ_MODS)');
assert.deepEqual(classic,['rage','armor','haste','regen','ambush','will','shield','crit'],'all eight static modifiers retained');
for(const [diff,mult] of [[null,1],['easy',1],['normal',1.25],['hard',1.5],['legacy-unknown',1]]){
 run('S.conq.diff='+JSON.stringify(diff));
 assert.equal(run('cqK()'),mult,'difficulty multiplier: '+diff);
 // Source of truth is unchanged immutable data catalog. Logic now owns only
 // multiplier/state selection and descriptive application, not the text.
 for(const id of bosses){
  const got=run("cqModD('"+id+"')");
  const expected=run("CQ_BMOD['"+id+"'].d("+mult+")");
  assert.equal(got,expected,'byte-identical modifier description '+id+' / '+diff);
  assert.equal(typeof got,'string');
 }
 for(const id of classic)assert.equal(run("cqModD('"+id+"')"),run("CQ_MODS['"+id+"'].d"),'immutable classic text '+id+' / '+diff);
}
run("S.conq.diff='easy'");
assert.equal(run("cqModD('b0a')"),'Все враги +20% здоровья и +15% урона; лидер — ещё +30% здоровья.');
run("S.conq.diff='normal'");
assert.equal(run("cqModD('b0a')"),'Все враги +25% здоровья и +19% урона; лидер — ещё +38% здоровья.');
run("S.conq.diff='hard'");
assert.equal(run("cqModD('b0a')"),'Все враги +30% здоровья и +22% урона; лидер — ещё +45% здоровья.');

// Seven immutable chest checkpoints, five-sector route and intermediate track.
const chests=json('CQ_CHESTS');
assert.deepEqual(chests,[25,60,100,150,210,280,320]);
const track=json('cqTrack()');
assert.equal(track.length,35,'4 intermediate milestone and a chest per checkpoint');
assert.equal(track[0].at,5);
run("S.conq.diff='easy'");
for(let i=0;i<chests.length;i++){
 const at=chests[i];
 run('S.conq.tk={};S.conq.stars='+String(at-1)+';S.conq.pts=0');
 assert.equal(run('cqCanClaim('+i+')'),false,'chest locked below '+at);
 run('S.conq.pts=1');
 assert.equal(run('cqScore()'),at,'stars plus feat points counted');
 assert.equal(run('cqCanClaim('+i+')'),true,'chest becomes claimable at '+at);
 run("S.conq.tk['c"+i+"']=1");
 assert.equal(run('cqCanClaim('+i+')'),false,'claimed chest not repeated');
}
run('S.conq.tk={};S.conq.stars=4;S.conq.pts=0');
assert.equal(run('cqStCan(0)'),false,'first intermediate reward below five');
run('S.conq.pts=1');
assert.equal(run('cqStCan(0)'),true,'first intermediate reward at five');
run("S.conq.tk['s0']=1");
assert.equal(run('cqStCan(0)'),false,'intermediate reward once-only');

// Old feat, star/point, notes and persistent week semantics unchanged.
run('S.conq.stars=7;S.conq.pts=0;S.conq.tk={};S.conq.fp={};S.conq.fd={};NOTES.length=0');
const feat=json("cqBump('win',null,30,true)");
assert.equal(feat.length,1);assert.equal(feat[0].F.key,'g:win');
assert.equal(run('cqScore()'),22,'star plus 15 points from completed global feat');
assert.equal(run('S.conq.fd["g:win"]'),1);
assert.equal(run('NOTES.length'),1);
const notification=json('NOTES[0]');
assert.equal(notification.kind,'cqf');assert.equal(notification.F.key,'g:win');assert.equal(notification.v,30);
assert.equal(typeof notification.id,'string');assert.ok(notification.id.length>0);
assert.deepEqual(json("cqBump('win',null,1)"),[]);
assert.equal(run('NOTES.length'),1,'no duplicate completed notifications');

run("S.conq.diff='normal'");
assert.equal(run('cqK()'),1.25);
run('persist0()');
const saved=JSON.parse(run('localStorage.getItem(SAVE_KEY)'));
assert.equal(saved.conq.pts,15);
assert.equal(saved.conq.stars,7);
assert.equal(saved.conq.fd['g:win'],1);
run('set_S(loadSave())');
assert.equal(run('cqScore()'),22);
assert.equal(run('cqK()'),1.25);
run('set_S(fillSave(JSON.parse(localStorage.getItem(SAVE_KEY))))');
assert.equal(run('cqScore()'),22,'old save schema still fills');
assert.equal(run('cqK()'),1.25,'difficulty re-read from imported live state');
run('set_S(newSave());cq()');
assert.equal(run('cqScore()'),0,'new S immediately replaces old score');
assert.equal(run('cqK()'),1,'new S has no previous difficulty');
run("S.conq.diff='hard';S.conq.stars=13;S.conq.pts=2");
assert.equal(run('cqScore()'),15);assert.equal(run('cqK()'),1.5);
const week=run('cqWeek()');
g.setNow(FIXED_NOW+7*24*3600*1000);
assert.notEqual(run('cqWeek()'),week);
assert.equal(run('cqScore()'),0,'local Monday rollover clears week score');
assert.equal(run('cqK()'),1,'local Monday rollover resets chosen difficulty');
assert.equal(run('S.conq.fd["g:win"]||0'),0);
assert.equal(run('NOTES.length'),1,'weekly reset does not replace global NOTES queue');

// Same refill economy, daily counter and todayKey; old 21-point test still gates it.
assert.equal(run('cqRfN()'),0);
assert.equal(run('cqRfCost()'),50);
run('S.cqRf={d:todayKey(),n:9}');
assert.equal(run('cqRfN()'),9);assert.equal(run('cqRfCost()'),400);
g.setNow(FIXED_NOW+8*24*3600*1000);
assert.equal(run('cqRfN()'),0);assert.equal(run('cqRfCost()'),50);
assert.equal(run('CQ_EN.max'),100);assert.equal(run('CQ_EN.sec'),180);
console.log('ARCH-01C3b3 LIVE PASS: PWA/artifact '+file+'; 5 difficulty states, 10 boss descriptions × 5, 8 static mods × 5, 7 chests, 35 track steps, NOTES, fresh/imported/replaced saves, Monday week, daily refill');
