// ARCH-01B: topology diagnostic tests; no dependency on built PWA.
import assert from 'node:assert/strict';
import { stronglyConnected, importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';

const cycles = stronglyConnected({
  'a.js': ['b.js'],
  'b.js': ['c.js'],
  'c.js': ['a.js'],
  'alone.js': [],
  'self.js': ['self.js'],
  'tail.js': ['a.js'],
});
assert.deepEqual(cycles, [
  ['a.js', 'b.js', 'c.js'],
  ['self.js'],
]);

assert.deepEqual(stronglyConnected({
  'first.js': ['second.js'],
  'second.js': [],
}), []);
assert.deepEqual(stronglyConnected({
  'a.js': ['b.js', 'b.js'],
  'b.js': ['a.js'],
}), [['a.js', 'b.js']]);

const edges = importEdges([
  "import '../ui/screen.js';",
  "import { x } from '../logic/stats.js';",
  "export * from '../data/ids.js';",
  "await import('../ui/lazy.js');",
  "const y = 'import ../ui/not-an-edge.js';",
  "// import '../ui/comment.js';",
].join('\n'), 'logic/example.js');
assert.deepEqual(edges.map(e => [e.to, e.kind]), [
  ['ui/screen.js', 'static'],
  ['logic/stats.js', 'static'],
  ['data/ids.js', 'static'],
  ['ui/lazy.js', 'dynamic'],
]);
assert.ok(edges.every(e => e.line >= 1));
assert.throws(() => importEdges('import {', 'data/broken.js'), SyntaxError);

// On the real source tree, graph analysis must be deterministic and non-mutating.
const first = analyzeTree(process.cwd());
const second = analyzeTree(process.cwd());
assert.equal(first.modules, second.modules);
assert.deepEqual(first.cycles, second.cycles);
assert.ok(first.modules >= 100, 'unexpectedly short production module graph');
assert.ok(first.staticImports >= 100, 'static imports unexpectedly missing');
console.log('ARCH-01B topology diagnostics: PASS; ' + first.modules + ' modules, ' + first.cycles.length + ' SCCs');

// ARCH-01C1a: only the independent pure gear-cap boundary is being revised.
await import('./arch01c1a-gear-cap.mjs');
