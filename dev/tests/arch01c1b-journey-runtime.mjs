// ARCH-01C1b: exercise real production bundle via the existing deterministic VM loader.
// The bridge must work BEFORE start(), with exactly the same live state and unlock semantics.
import assert from 'node:assert/strict';
import { loadGame } from './lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const g = loadGame(html);
const R = expr => g.run(expr);
R("S = newSave(); metaFill(S); S.jKey = 'muaddib'; S.journeys = {};");
assert.equal(R("JK()"), 'muaddib', 'selected journey lookup should work before first render');
assert.equal(R("JR() === JOURNEYS.muaddib"), true, 'JR should return the exact shared data object');
assert.equal(R("JP() === S.journeys.muaddib"), true, 'JP must initialize the legacy save slot on call');
assert.equal(R("JP() === S.journeys.muaddib"), true, 'JP must preserve the save object identity');
assert.equal(R("Object.keys(S.journeys.muaddib).length"), 0, 'opening journey must not claim rewards or tiers');
assert.equal(R("jGateReady('muaddib')"), false, 'a starter roster must not bypass requirements');
assert.equal(R("jReady('muaddib', 0)"), false, 'first tier must stay locked when 11 requirements fail');

R("for (const id of JOURNEYS.muaddib.req) { const p = S.roster[id]; p.stars = 7; p.gear = MAX_GEAR; p.relic = JREQ.muaddib[id]; } S.roster.muaddib.stars = 0;");
assert.equal(R("JOURNEYS.muaddib.req.length"), 11, 'all 11 original heroes required');
assert.equal(R("MAX_GEAR"), 13, 'gear cap unchanged');
assert.equal(R("jGateReady('muaddib')"), true, 'all 11 completed requirements open the journey');
assert.equal(R("jReady('muaddib', 0)"), true, 'first journey tier opens after full preparation');
assert.equal(R("jReady('muaddib', 4)"), true, 'four-hero final tier gate is preserved');
assert.equal(R("jSelectedReady('muaddib', 4, ['paul','duncan','leto','jessica'])"), true, 'valid final 4-hero selection');
assert.equal(R("jSelectedReady('muaddib', 4, ['paul','paul','leto','jessica'])"), false, 'duplicate selection rejected');
assert.equal(R("jSelectedReady('muaddib', 4, ['paul','duncan','leto','jessica','gurney'])"), false, 'five-hero selection rejected');
assert.equal(R("jSelectedReady('muaddib', 4, ['paul','duncan','leto','robot'])"), false, 'non-journey hero rejected');

R("S.roster.paul.gear = MAX_GEAR - 1;");
assert.equal(R("jHeroOk('muaddib', 'paul', 4)"), false, 'gear XII must fail the final tier');
assert.equal(R("jGateReady('muaddib')"), false, 'dropping one of 11 below XIII closes initial gate');
assert.equal(R("jReady('muaddib', 4)"), false, 'without legend unlock tier remains closed');
R("S.roster.muaddib.stars = 7;");
assert.equal(R("jGateReady('muaddib')"), true, 'old unlocked legend grandfathering maintained');
assert.equal(R("jReady('muaddib', 4)"), true, 'grandfathered legend can replay tier');
assert.equal(R("jSelectedReady('muaddib', 4, ['paul','duncan','leto','jessica'])"), true, 'grandfathering permits previously eligible path characters');

R("S.jKey = 'unknown-key';");
assert.equal(R("JK()"), 'muaddib', 'unknown historical save key still falls back to Muad-Dib');
const expected = [70,75,80,85,85];
const levels = JSON.parse(R("JSON.stringify(JOURNEYS.muaddib.tiers.map(x => x.el))"));
assert.deepEqual(levels, expected, 'eager tier normalization must remain unchanged');
const foes = JSON.parse(R("JSON.stringify(jFoes('muaddib', 4))"));
assert.equal(foes.length, 5, 'final enemy roster unchanged');
assert.ok(foes.every(f => f.gear === 13 && f.stars === 7 && f.lvl === 85), 'final tier enemies unchanged');
console.log('ARCH-01C1b runtime: PASS; 11 heroes, XIII, relic/7-star, four-select, grandfathered save, old bridge API');
