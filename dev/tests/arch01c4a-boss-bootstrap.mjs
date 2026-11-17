// ARCH-01C4a B1: execute real production-built PWA and standalone HTML
// artifact in the exact same Node VM used by the game's golden test suites.
// Guard boss registration, original battle/AI/skill API, raid boss metadata,
// immutable save/gameplay and bootstrap against TDZ/ReferenceError.
import assert from 'node:assert/strict';
import { loadGame } from './lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const g=loadGame(html,{seed:77});
const run=e=>g.run(e);
const clone=e=>JSON.parse(run('JSON.stringify('+e+')'));
for(const name of ['CH','CHARS','WORM','STAR_MULT','SK_KEYS','autoSk','skMax','skLv','abFor',
 'dunBuff','dunGuard','dunShielded','aiPlan','computeIntents',
 'createBattle','nextActor','startTurn','act','endTurn','bossPlan','bossTurn',
 'phaseOf','RAID_TIERS','MOVES','PHASES','unitStats','unitPower','newSave']){
 assert.notEqual(run('typeof '+name),'undefined','real global available after built game boot: '+name);
}
assert.equal(run('CH.worm === WORM'),true,'register unique Shai-Hulud into CH, same identity');
assert.equal(run("CH.worm.id"),'worm');
assert.equal(run("WORM.boss"),true);
assert.equal(run("CH.worm.role"),'tank');
assert.equal(run("CH.worm.basic.m"),1.3);
assert.equal(run("CH.worm.special.tgt"),'self');
assert.deepEqual(clone('WORM.immune'),['poison','fear','voiced']);
assert.equal(run('CHARS.some(c=>c.id==="worm")'),false,'do not insert boss into player hero roster');
assert.equal(run("skMax(CH.duncan,'passive')"),7);
assert.equal(run("skLv({sk:{basic:6}},'basic')"),6);
assert.equal(run("skLv({sk:{}},'special')"),1);
assert.equal(run("autoSk(1).basic"),1);
assert.equal(run("autoSk(25).basic"),6);
assert.equal(run("typeof abFor"),'function');
assert.equal(run("typeof aiPlan"),'function');
assert.equal(run("typeof computeIntents"),'function');
assert.equal(run("typeof bossTurn"),'function');
for(const [fraction,phase] of [[1,1],[.8,1],[.75,2],[.6,2],[.5,3],[.3,3],[.25,4],[.1,4],[0,4]]){
 g.ctx.__phaseFrac=fraction;
 assert.equal(run("phaseOf(__phaseFrac)"),phase,'raid HP phase boundary '+fraction);
}
assert.deepEqual(clone('Object.keys(PHASES)'),['1','2','3','4']);
assert.equal(run("MOVES.bite"),'Удар пасти');
assert.equal(run("MOVES.devour"),'Поглощение');
assert.equal(run("RAID_TIERS.length"),3);
assert.deepEqual(clone('RAID_TIERS.map(t=>t.hp)'),[150000,450000,1400000]);
assert.deepEqual(clone('RAID_TIERS.map(t=>t.dmg)'),[380,650,1000]);
assert.equal(run("STAR_MULT.length"),8);
assert.equal(run("STAR_MULT[7]"),2.05);
assert.equal(run("typeof unitStats"),'function');
assert.equal(run("typeof unitPower"),'function');
const base=clone("unitStats(CH.duncan,{lvl:50,stars:7,gear:10,eq:[],relic:0})");
assert.ok(base.maxHp>0 && base.dmg>0 && base.spd>0);
const p=clone("unitPower(CH.duncan,{lvl:50,stars:7,gear:10,eq:[],relic:0})");
assert.ok(p>0,'hero power must remain finite and positive');
assert.equal(run("typeof createBattle"),'function');
assert.equal(run("typeof newSave"),'function');
const fresh=clone('newSave()');
assert.ok(fresh&&typeof fresh==='object','save creation still available after reordered ESM');
assert.equal(run('CH.worm === WORM'),true,'raid registration not overwritten by save/ability setup');
console.log('ARCH-01C4a B1 LIVE PASS: '+html+'; real bundle startup, no TDZ, boss CH.worm identity, Shai-Hulud 3 tiers and nine HP-phase boundaries, combat skills, AI, stats, saves');
