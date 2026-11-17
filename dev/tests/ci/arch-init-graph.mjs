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
// ARCH-01C1b: verify real data/logic boundary and explicit bootstrap service wiring.
await import('./arch01c1b-journey-runtime.mjs');

// ARCH-01C2a: new pure energy module and exact baseline reduction.
await import('./arch01c2a-campaign-energy.mjs');

// ARCH-01C2b: virtual order was proven on v127; now validate the real logic boundary.
await import('./arch01c2b-campaign-open.mjs');

// ARCH-01C2c: virtual order proved with local core alias; enforce real pure RNG, public API and 4096 samples.
await import('./arch01c2c-pure-rng.mjs');

// ARCH-01C3a1: virtual 166/166 ESM proof passed; now validate the real late UI-owned logic boundary.
await import('./arch01c3a1-cosmetics-boundary.mjs');

// ARCH-01C3a2: virtual order proof recorded; require the actual UI-owned SVG and preserved model bootstrap.
await import('./arch01c3a2-worm-boundary.mjs');

// ARCH-01C3a3: enforce exact feat/statistics order and absence of data→stats edge.
await import('./arch01c3a3-stats-boundary.mjs');

// ARCH-01C3b1: preserve live Conquest refill selectors and SCC after moving to logic.
await import('./arch01c3b1-refill-boundary.mjs');

// ARCH-01C3b2 Stage A virtual matrix is retained historically; its pre-move assertions
// do not run after the independently verified Stage B1 implementation.
await import('./arch01c3b2-boundary.mjs');

// ARCH-01C3b3 B1: exactly three unchanged live Conquest selectors, new logic owner, no reverse data edge.
await import('./arch01c3b3-boundary.mjs');

// ARCH-01C4a Stage B1: real boss→skills edge removal and explicitly reviewed battle SCC 9→6.
await import('./arch01c4a-b1-boundary.mjs');

// ARCH-01C4c B1: real root composition, frozen source bodies, AST graph/SCC invariants.
await import('./arch01c4c-b1-boundary.mjs');
// ARCH-01C5a-A2: read-only v134 Conquest ESM DFS + legal UI ownership matrix.
await import('./arch01c5a-a2-conquest-dfs.mjs');
