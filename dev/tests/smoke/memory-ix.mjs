// Пакет 12: проверка арифметики, защиты и миграции Утилизатора Икса.
import assert from 'node:assert/strict';
import { loadGame } from '../lib/load.mjs';

const game = loadGame(process.argv[2] || 'dist/pwa/index.html');
const run = code => game.run(code);

run('S = newSave(); metaFill(S); S.acc.lvl = 85;');
assert.equal(run('MEM_COSTS[7].null_cell'), 6);
assert.equal(run('MEM_COSTS[3].blood_echo'), 16);
assert.equal(run('scrapPoint("tleilax_matrix","emitter12")'), 23);
assert.equal(run('scrapPoint("null_cell","emitter12")'), 8);
assert.equal(run('scrapPoint("null_cell","knife13")'), 24);
assert.equal(run('scrapPoint("ix_plate","mask2")'), 3);
assert.equal(run('scrapPoint("ix_plate","mask12")'), 0);
const arithmetic = run('(() => { S.inv.mask2 = 10; S.scrapCarry.ix_plate = 5; S.squad=[]; S.squadC=[]; S.squadD=[]; S.raidPick=[]; return scrapCommit(S,"ix_plate",[{id:"mask2",count:10}]); })()');
assert.equal(arithmetic.ok, true);
assert.equal(arithmetic.output, 1);
assert.equal(arithmetic.remainder, 11);
assert.equal(run('S.inv.mask2'), 0);
assert.equal(run('S.ix_plate'), 1);
assert.equal(run('S.scrapCarry.ix_plate'), 11);
const before = run('JSON.stringify(S)');
assert.equal(run('scrapCommit(S,"ix_plate",[{id:"knife13",count:999}]).ok'), false);
assert.equal(run('JSON.stringify(S)'), before);
const locked = run('(() => { S.inv.mask3 = 40; S.scrapLocks.mask3=true; return scrapAvailable(S,"mask3") })()');
assert.equal(locked, 0);
run('S.scrapLocks.mask3=false;');
const held = run('(() => { S.roster.leto.stars=7; S.roster.leto.gear=3; S.roster.leto.eq=[false,false,false,false,false,false]; S.squad=["leto"]; S.squadC=[]; S.squadD=[]; return protectedStock(S) })()');
assert.equal(typeof held, 'object');
assert.equal(Object.keys(held).length > 0, true);
const migration = run('(() => { const s = newSave(); s.core=20; s.ix_plate=3; delete s.memoryEconomyV2; fillSave(s); const first=s.ix_plate; fillSave(s); return [first,s.ix_plate,s.core,s.memoryEconomyV2] })()');
assert.deepEqual(JSON.parse(JSON.stringify(migration)),[23,23,0,1]);
const relic = run('(() => { S = newSave(); metaFill(S); S.acc.lvl=85; const p=S.roster.leto; Object.assign(p,{stars:7,gear:13,eq:[true,true,true,true,true,true],relic:0}); S.ix_plate=8; S.blood_echo=6; S.solari=30000; const a=relicBuy(S,"leto",p); return [a.ok,p.relic,S.ix_plate,S.blood_echo,S.solari] })()');
assert.deepEqual(JSON.parse(JSON.stringify(relic)),[true,1,0,0,0]);
const noMoney = run('(() => { const p=S.roster.leto; const at=p.relic; const before=JSON.stringify([S.ix_plate,S.blood_echo,S.solari]); const a=relicBuy(S,"leto",p); return [a.ok,p.relic===at,before===JSON.stringify([S.ix_plate,S.blood_echo,S.solari])] })()');
assert.deepEqual(JSON.parse(JSON.stringify(noMoney)),[false,true,true]);
console.log('PASS memory-ix: recipes, atomicity, locks, reserve, carry, migration, relic purchase');
