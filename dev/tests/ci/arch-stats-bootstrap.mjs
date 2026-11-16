// ARCH-01B2 regression: statistics counters must stay independent of UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as acorn from 'acorn';
import { SPLIT } from '../../tools/split.config.mjs';
import { importEdges } from '../../tools/arch-init-graph.mjs';

const src = file => fs.readFileSync('src/' + file, 'utf8');
const edges = file => importEdges(src(file), file);
const target = 'logic/stat-counters.js';
const counters = src(target);
const stats = src('logic/stats.js');
assert.ok(counters.includes('function statInc(k, n = 1) { S.stats[k] = (S.stats[k] || 0) + n; }'),
  'statInc must retain its pre-extraction formula');
assert.ok(!counters.includes('document.') && !counters.includes('window.'),
  'stat counters must not access browser DOM');
assert.deepEqual(edges(target).map(e => e.to), ['core/state.js'],
  'stat counters must depend only on state');
assert.ok(!edges('logic/stats.js').some(e => e.to.startsWith('ui/')),
  'statistics rules must not import UI');
assert.ok(edges('logic/stats.js').some(e => e.to === target));

for (const consumer of [
  'ui/overlays/sim.js', 'ui/battle/battle-ui.js',
  'ui/views/trials.js', 'ui/views/conq.js', 'logic/conquest.js',
]) {
  const imports = edges(consumer).map(e => e.to);
  assert.ok(imports.includes(target), consumer + ' must import statInc from pure counters');
  assert.ok(!imports.includes('logic/stats.js'),
    consumer + ' should not accidentally pull full statistics into early boot');
}
const featsAST = acorn.parse(src('ui/views/feats.js'), {
  ecmaVersion: 'latest', sourceType: 'module',
});
const first = featsAST.body.find(n => n.type === 'ImportDeclaration');
assert.equal(first.source.value, './trials.js',
  'feats UI must establish trials order before importing cosmetics/statistics');
assert.deepEqual(
  SPLIT.filter(x => x[1] === target).map(x => x[1]), [target],
  'counter must be registered exactly once',
);
const position = name => SPLIT.findIndex(x => x[1] === name);
assert.equal(position(target) + 1, position('ui/overlays/sim.js'),
  'new pure counter must be immediately before its first UI consumer');
assert.ok(position('ui/views/trials.js') < position('logic/stats.js'),
  'historical trials/statistics evaluation order must remain stable');
assert.ok(position('logic/stats.js') < position('data/cosmetics.js'),
  'historical cosmetics/statistics order must remain stable');
assert.ok(!edges('logic/account.js').some(e => e.to.startsWith('ui/')),
  'ARCH-01B3 account no longer imports UI after decoupling');
assert.ok(edges('logic/account.js').some(e => e.to === 'logic/account-rules.js'),
  'ARCH-01B3 compatibility adapter must delegate to pure rules');
console.log('ARCH-01B2 stats initialization contract: PASS');
