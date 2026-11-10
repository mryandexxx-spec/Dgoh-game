// Targeted smoke: node tests/smoke/v83-v85.mjs dist/pwa/index.html
// No golden regeneration; verifies approved mechanics with the existing VM loader.
import assert from 'node:assert/strict';
process.on('uncaughtException', e => { console.error('FOCUSED SMOKE ERROR:', e.name, e.message, e.stack?.split('\n').slice(0,3).join(' | ')); process.exitCode = 1; });
import { loadGame } from '../lib/load.mjs';

const html = process.argv[2];
if (!html) throw new Error('Usage: node tests/smoke/v83-v85.mjs dist/pwa/index.html');
let g;
try { g = loadGame(html); } catch (error) {
  console.error('VM compilation failed:', error.name, error.message);
  process.exit(1);
}
const R = g.run;
const run = expr => R(expr);
run('S = newSave(); metaFill(S)');

// v83: retired hero cannot appear in active roster or journeys
assert.equal(run("!!CH.liet"), false);
assert.equal(run("!!JOURNEYS.liet"), false);
assert.equal(run("!!CH.kynes"), true);
assert.equal(run("activeDaily().length"), 10);
run('S.acc.lvl = 51');
assert.equal(run("activeDaily().length"), 9);
assert.equal(run("activeDaily().some(q => q.k === 'skill')"), false);

// v83: old save is migrated once, with no resource compensation
const old = JSON.parse(JSON.stringify(run("({ ...S, roster: { ...S.roster, liet: { stars: 7, lvl: 85, gear: 13 } }, journeys: { ...S.journeys, liet: { 0: true } }, squad: ['liet', 'leto'], jKey: 'liet' })")));
const migrated = R('fillSave')(old);
assert.equal(migrated.roster.liet, undefined);
assert.equal(migrated.squad.includes('liet'), false);
assert.equal(migrated.jKey, 'muaddib');
assert.ok(migrated.retiredLiet.hero);

// v84: 4 selected heroes must be individually qualified for tier 4
run("S = newSave()");
run("for (const id of JOURNEYS.muaddib.req.slice(0, 4)) Object.assign(prog(id), { stars: 7, gear: 13, relic: 7 })");
assert.equal(run("jReady('muaddib', 3)"), true);
assert.equal(run("jSelectedReady('muaddib', 3, JOURNEYS.muaddib.req.slice(0, 4))"), true);
assert.equal(run("jSelectedReady('muaddib', 3, JOURNEYS.muaddib.req.slice(0, 3))"), false);

// v85: 2 -> 5 -> 1, all ally objects and HP survive, no early victory
const unit = id => ({ id, lvl: 60, stars: 7, gear: 13 });
const waves = [
  ['trooper', 'rabban'].map(unit),
  ['trooper', 'piter', 'feyd', 'rabban', 'legion'].map(unit),
  ['shaddam'].map(unit),
];
const B = R('createBattle')([unit('leto'), unit('paul')], waves[0], { seed: 7, waves: waves.slice(1) });
assert.equal(B.wave.total, 3);
const orig = B.units.filter(u => u.side === 'A'), oldHp = orig[0].hp - 123;
orig[0].hp = oldHp;
for (let n = 0; n < waves.length; n++) {
  const enemies = B.units.filter(u => u.side === 'B');
  assert.equal(enemies.length, waves[n].length);
  for (const u of enemies) R('kill')(B, u, null);
  if (n < waves.length - 1) {
    assert.equal(B.over, null);
    assert.equal(B.wavePending, true);
    const change = R('advanceWave')(B);
    assert.equal(change.enemies.length, waves[n + 1].length);
    assert.equal(B.units[0], orig[0]);
    assert.equal(B.units[0].hp, oldHp);
  }
}
assert.equal(B.over, 'A');
console.log('v83–v85 focused smoke OK');
