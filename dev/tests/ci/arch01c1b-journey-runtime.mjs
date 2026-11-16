// ARCH-01C1b: data boundary, init-order and public journey bridge contracts.
// No game boot, DOM or golden fixture mutation in this AST-only check.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const read = name => fs.readFileSync('src/' + name, 'utf8');
const edges = name => importEdges(read(name), name).map(e => e.to);
const baseline = JSON.parse(fs.readFileSync('tools/arch-import-baseline.json', 'utf8')).legacy;

assert.deepEqual(edges('data/journeys.js'), ['data/gear-cap.js','data/glyphs.js'],
  'journey data must use only pure data and preserve the glyph predecessor');
assert.deepEqual(edges('logic/journey-gates.js'), [
  'data/journeys.js','data/gear-cap.js','core/state.js','logic/progress.js',
], 'journey rules must be owned entirely by logic');
assert.deepEqual(edges('core/boot.js').slice(0, 2), [
  'ui/events.js','logic/journey-gates.js',
], 'bootstrap retains the UI predecessor then registers journey rules before start');
const data = read('data/journeys.js'), logic = read('logic/journey-gates.js');
assert.ok(data.includes('function bindJourneyRuntime(handlers)'), 'compatibility port must remain explicit');
assert.ok(data.includes("throw new Error('Journey runtime not initialized: ' + name)"),
  'a missing startup registration must never silently make a journey available');
assert.ok(logic.includes('bindJourneyRuntime({'), 'logic must wire runtime exactly once');
for (const name of ['jHeroOk','jGateReady','jReady','jSelectedReady','JK','JR','JP']) {
  assert.ok(data.includes("journeyCall('" + name + "'"),
    name + ' must remain callable via the old data export');
}
assert.ok(logic.includes('prog(k).stars > 0 || jHeroOkRule(k, id, t)'),
  'already unlocked legend must keep the four-hero grandfather rule');
assert.ok(logic.includes('(S.journeys[JKRule()] ??= {})'),
  'JP must create saved journey progress only when invoked');
assert.ok(logic.includes('p.stars >= 7 && p.gear >= MAX_GEAR'),
  '7-star and gear-XIII prerequisites cannot move');
assert.ok(data.includes('const jFoes = ') && data.includes('const jRelic = '),
  'static journey enemy/relic declarations remain in data');

assert.equal(baseline.length, 11, 'ARCH-01C2c leaves exactly 11 legacy reverse imports');
assert.ok(!baseline.some(e => e.startsWith('data/journeys.js -> ')),
  'journeys must have no remaining reverse edges');
const source = SPLIT.filter(([,name]) => name === 'logic/journey-gates.js');
assert.equal(source.length, 1, 'the new logic module must have exactly one SPLIT marker');
assert.equal(SPLIT.length, 166, 'C1a/b, C2a/b retained plus pure seeded RNG');
const graph = analyzeTree(process.cwd());
assert.equal(graph.modules, 172, 'seeded RNG adds one module after C2b');
assert.equal(graph.unresolved.length, 0, 'no unresolved ESM imports');
assert.ok(graph.cycles.length <= 2, 'new journey runtime must not introduce a third ESM SCC');
console.log('ARCH-01C1b journey runtime boundary: PASS; 14 baseline edges, explicit bootstrap, old UI bridge intact');
