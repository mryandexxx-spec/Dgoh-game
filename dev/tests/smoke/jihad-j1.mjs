// Jihad J1: progression, permanent unlocks, branch exclusivity, repeat rewards and save migration.
import assert from 'node:assert/strict';
import { loadGame } from '../lib/load.mjs';

const game = loadGame(process.argv[2] || 'dist/pwa/index.html');
const run = source => game.run(source);
const json = source => JSON.parse(JSON.stringify(run(source)));

run('S = newSave(); metaFill(S); S.acc.lvl = 85;');
assert.equal(run('CQ_CHESTS[6]'), 320);
assert.deepEqual(json('CQ_CHESTS.slice(0,6)'), [25,60,100,150,210,280]);
assert.equal(run('cqDifficultyAccess("easy")'), true);
assert.equal(run('cqDifficultyAccess("normal")'), false);
assert.equal(run('cqDifficultyAccess("hard")'), false);

run('cq().diff = "easy"; cq().pick = null;');
assert.equal(run('cqRecordFinalBoss(cqNode("3-11-0"))'), false, 'sector 4 boss is insufficient');
assert.equal(run('cqRecordFinalBoss(cqNode("4-11-0"))'), true, 'sector 5 boss unlocks next week');
assert.equal(run('S.cqUnlock.easy === cq().wk'), true);
assert.equal(run('cqDifficultyAccess("normal")'), false, 'same week is still locked');
run('S.cqUnlock.easy = "previous-week";');
assert.equal(run('cqDifficultyAccess("normal")'), true, 'next week can select normal');
run('cq().diff = "normal";');
assert.equal(run('cqRecordFinalBoss(cqNode("4-11-0"))'), true);
assert.equal(run('cqDifficultyAccess("hard")'), false);
run('S.cqUnlock.normal = "previous-week";');
assert.equal(run('cqDifficultyAccess("hard")'), true);
run('S.acc.lvl = 34;');
assert.equal(run('cqDifficultyAccess("normal")'), false, 'level 35 remains required');
run('S.acc.lvl = 54;');
assert.equal(run('cqDifficultyAccess("hard")'), false, 'level 55 remains required');

const migration = json(`(() => {
 const s = newSave(); s.conq = {wk:'old-week',diff:'hard',done:{'4-11-0':3}};
 delete s.migrations.jihadJ1; fillSave(s); const one = [s.cqUnlock.easy,s.cqUnlock.normal];
 fillSave(s); return [one, s.cqUnlock.easy, s.cqUnlock.normal, s.migrations.jihadJ1];
})()`);
assert.deepEqual(migration, [['legacy','legacy'],'legacy','legacy',1]);
const migratedEasyBoss = json(`(() => {
 const s=newSave(); s.conq={wk:'old-week',diff:'easy',done:{'4-11-0':1}};
 delete s.migrations.jihadJ1; fillSave(s);
 return [s.cqUnlock.easy,s.cqUnlock.normal || null];
})()`);
assert.deepEqual(migratedEasyBoss,['old-week',null]);

run('S = newSave(); metaFill(S); S.acc.lvl = 85; cq().diff = "easy"; cq().pick = null;');
assert.equal(run('cqOpen(cqNode("0-0-0"))'), true);
assert.equal(run('cqOpen(cqNode("0-1-0"))'), false);
run('cq().done["0-0-0"] = 3; cqCommitRoute(cqNode("0-0-0"));');
assert.equal(run('cqOpen(cqNode("0-1-0"))'), true);
assert.equal(run('cqOpen(cqNode("0-1-1"))'), true);
run('cq().done["0-1-0"] = 3; cqCommitRoute(cqNode("0-1-0"));');
assert.equal(run('cqOpen(cqNode("0-1-0"))'), true, 'chosen node replayable');
assert.equal(run('cqOpen(cqNode("0-1-1"))'), false, 'alternative cannot be entered');
assert.equal(run('cqRouteBlocked(cqNode("0-1-1"))'), true);

assert.ok(run('cqDetail(cqNode("0-1-1"))').includes('Маршрут закрыт'),
  'UI explains why the alternative is locked');
assert.ok(run('cqDetail(cqNode("0-1-0"))').includes('Повторить бой'),
  'a three-star chosen point exposes replay');

run('cq().done["0-1-1"] = 3;');
assert.equal(run('cqOpen(cqNode("0-1-1"))'), true, 'legacy completed node remains replayable');

run('S = newSave(); metaFill(S); S.acc.lvl = 85; cq().diff = "easy"; cq().pick = null;');
const repeat = json(`(() => {
 const C = cq(), a = cqNode('0-0-0'), cfg = { squad:['leto'], cq: {key:a.key,idx:[0],mods:[],fresh:true} };
 const B = { units:[{side:'A',def:CH.leto,alive:true},{side:'B',def:CH.trooper,alive:false}] };
 const before = [S.solari,S.jt,C.stars];
 cqFinish(B,cfg,true);
 const first = [S.solari,S.jt,C.stars];
 cqFinish(B,cfg,true);
 const second = [S.solari,S.jt,C.stars];
 return {before,first,second,done:C.done[a.key],live:cqLive(a).foes.length,route:C.route[0][0]};
})()`);
assert.ok(repeat.first[0] > repeat.before[0]);
assert.ok(repeat.first[1] > repeat.before[1]);
assert.equal(repeat.first[2], 3);
assert.deepEqual(repeat.first, repeat.second, 'one-time rewards and best stars do not duplicate');
assert.equal(repeat.done,3);
assert.ok(repeat.live > 0, 'completed point spawns fresh opponents for replay');
assert.equal(repeat.route, '0-0-0');

const replayLoss = json(`(() => {
 const C=cq(), a=cqNode('0-0-0'), cfg={squad:['leto'],cq:{key:a.key,idx:[0],mods:[],fresh:false}};
 C.foe[a.key]=[{h:0.2,s:0}];
 const B={units:[{side:'A',def:CH.leto,alive:false},{side:'B',def:CH.trooper,alive:true,hp:50,maxHp:100,maxShield:0}]};
 const before=[S.solari,S.jt,C.done[a.key]];
 cqFinish(B,cfg,false);
 const after=[S.solari,S.jt,C.done[a.key]];
 return [before,after,C.foe[a.key] || null,cqLive(a).st || null];
})()`);
assert.deepEqual(replayLoss[0], replayLoss[1], 'defeated replay preserves best result and resources');
assert.equal(replayLoss[2],null, 'defeated replay cannot bank enemy wounds');
assert.equal(replayLoss[3],null, 'next replay starts from full health');


const bossFeat = json(`(() => {
 S = newSave(); metaFill(S); S.acc.lvl = 85;
 const C=cq(); C.diff='easy'; C.open=4; C.sec=4; C.pick=null;
 const a=cqNode('4-11-0');
 const B={units:[{side:'A',def:CH.leto,alive:true},{side:'B',def:CH.erasmus,alive:false}]};
 const cfg={squad:['leto'],cq:{key:a.key,idx:[0],mods:[],fresh:false}};
 cqFinish(B,cfg,true);
 const unlocked=S.cqUnlock.easy === C.wk, first=C.fd['4:boss1'] || 0;
 cfg.cq.fresh = true;
 cqFinish(B,cfg,true);
 return [unlocked,first,C.fd['4:boss1'] || 0];
})()`);
assert.deepEqual(bossFeat,[true,0,0], 'repeat must not retroactively grant first-try boss feat');

run('S = newSave(); metaFill(S); S.acc.lvl = 85; cq().diff = "easy";');
const desert = json('cqFoes(cqNode("2-11-0")).map(x=>x.id)');
assert.ok(desert.includes('kynes'), 'the sector 3 boss includes ordinary Kynes');
assert.equal(desert.includes('liet'),false);
console.log('PASS Jihad J1: unlocks, route, replay, score, legacy migration, desert boss');
