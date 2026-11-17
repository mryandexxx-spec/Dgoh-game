// ARCH-01C3b1: exact legacy refill pricing/date/state behavior on real PWA
// and portable HTML artifact. No fixture/golden modifications or mocking API.
import assert from 'node:assert/strict';
import { loadGame, FIXED_NOW } from './lib/load.mjs';

const file=process.argv[2]||'dist/pwa/index.html';
const g=loadGame(file);
const run=expression=>g.run(expression);

assert.equal(run('typeof cqRfN'),'function','old name remains globally callable');
assert.equal(run('typeof cqRfCost'),'function','old name remains globally callable');
assert.equal(run('typeof cqBump'),'function','Conquest feat progress API retained');
assert.equal(run('typeof cqScore'),'function','Conquest track score API retained');
assert.equal(run('typeof refillPrice'),'function','actual economy remains authoritative');
assert.equal(run('typeof todayKey'),'function','local-day rule remains unchanged');
assert.equal(run("CQ_RF.amt"),50,'refill reward amount fixed');
assert.equal(run("CQ_EN.max"),100,'energy cap unchanged');
assert.equal(run("CQ_EN.sec"),180,'energy recovery rate unchanged');

run('set_S(newSave())');
assert.equal(run('cqRfN()'),0,'fresh save has zero daily refills');
assert.equal(run('cqRfCost()'),50,'fresh player cost is 50 crystals');

const table=[];
for(let n=0;n<=20;n++){
 run('S.cqRf={d:todayKey(),n:'+n+'}');
 const got=run('cqRfCost()'),count=run('cqRfN()');
 const expected=50*2**Math.floor(n/3);
 assert.equal(count,n,'same-day counter n='+n);
 assert.equal(got,expected,'exact old economy price at n='+n);
 assert.equal(got,run('refillPrice(cqRfN())'),'old refillPrice selector unchanged');
 table.push([n,count,got]);
}
for(const invalid of [null,undefined]){
 run('S.cqRf='+String(invalid));
 assert.equal(run('cqRfN()'),0,'missing saved refill must reset to zero');
 assert.equal(run('cqRfCost()'),50);
}
run('S.cqRf={d:todayKey(),n:9}');
g.setNow(FIXED_NOW+24*3600*1000);
assert.equal(run('cqRfN()'),0,'following local date resets counter, without editing S');
assert.equal(run('cqRfCost()'),50,'following local date uses first price');
g.setNow(FIXED_NOW-24*3600*1000);
assert.equal(run('cqRfN()'),0,'previous local date cannot reuse future refill');
g.setNow(FIXED_NOW);
assert.equal(run('cqRfN()'),9,'old same-date saved state is read live');
assert.equal(run('cqRfCost()'),400);

run('set_S(newSave())');
assert.equal(run('cqRfN()'),0,'replacing a save resets daily refill selector immediately');
run('S.cqRf={d:todayKey(),n:3}');
assert.equal(run('cqRfCost()'),100,'new save uses its own independent live state');
run('S.cqRf.n=6');
assert.equal(run('cqRfCost()'),200,'mutation is observed without caching old state');

run('set_S(newSave())');
run('cq()');
assert.equal(run('cqScore()'),0,'fresh weekly Conquest score unchanged');
const oldNotes=run('NOTES.length');
run("cqBump('win',null,30)");
assert.equal(run("S.conq.fp['g:win']"),30,'global win feat count unchanged');
assert.equal(run("S.conq.fd['g:win']"),1,'global win feat completion unchanged');
assert.equal(run('cqScore()'),15,'original global feat points are unchanged');
assert.equal(run('NOTES.length'),oldNotes+1,'feat notification still reaches original NOTES service');

console.log('ARCH-01C3b1 real runtime: PASS; 21 identical refill prices (n 0..20), day rollover, save replacement, score/feat/NOTES; '+file);
