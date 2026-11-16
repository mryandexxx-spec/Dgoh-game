// Node-only regression tests for the ARCH-01 Acorn boundary validator.
import assert from 'node:assert/strict';
import { analyzeSource, compareWithBaseline } from '../../tools/check-arch-imports.mjs';

const edges = (code, from = 'logic/sample.js') => analyzeSource(code, from).map(v => v.edge);
const expect = (code, list, from) => assert.deepEqual(edges(code, from), list);

// Ordinary, side-effect and multiline imports are all checked.
expect("import { x } from '../ui/foo.js';", ['logic/sample.js -> ui/foo.js']);
expect("import '../ui/foo.js';", ['logic/sample.js -> ui/foo.js']);
expect("import {\n  x,\n} from '../ui/foo.js';", ['logic/sample.js -> ui/foo.js']);
expect("export { x } from '../ui/foo.js';", ['logic/sample.js -> ui/foo.js']);
expect("export * from '../ui/foo.js';", ['logic/sample.js -> ui/foo.js']);

// Dynamic imports are checked, and computed imports cannot hide a new dependency.
expect("await import('../ui/foo.js');", ['logic/sample.js -> ui/foo.js']);
expect("await import(prefix + '/foo.js');", ['logic/sample.js -> <dynamic>']);

// Ignore comments and strings; never grep strings as import statements.
expect("// import '../ui/foo.js';\nconst str = \"import '../ui/foo.js'\";", []);

// Allowed dependency direction and core boot exception.
expect("import '../data/chars.js'; import './stats.js'; import '../core/state.js';", []);
expect("import '../ui/router.js';", [], 'core/boot.js');
expect("import '../ui/router.js';", ['core/save.js -> ui/router.js'], 'core/save.js');

// data must not import logic/core/assets/3D, including side-effect imports.
expect("import '../logic/conquest.js'; import '../core/state.js'; import '../assets/models.js';", [
  'data/cq.js -> logic/conquest.js',
  'data/cq.js -> core/state.js',
  'data/cq.js -> assets/models.js',
], 'data/cq.js');
expect("import * as B from '@babylonjs/core';", [
  'logic/sample.js -> @babylonjs/core',
]);
expect("import { x } from '../data/chars.js';", [], 'logic/sample.js');

// Baseline is a shrinking ledger: any new edge or stale entry fails CI.
const violations = analyzeSource("import '../ui/a.js'; import '../ui/b.js';", 'logic/x.js');
assert.deepEqual(compareWithBaseline(violations, ['logic/x.js -> ui/a.js']), {
  introduced: [violations[1]],
  legacy: [violations[0]],
  stale: [],
});
assert.deepEqual(compareWithBaseline([violations[0]], [
  'logic/x.js -> ui/a.js', 'logic/x.js -> ui/b.js',
]).stale, ['logic/x.js -> ui/b.js']);

// Invalid JS is not silently skipped.
assert.throws(() => analyzeSource('import {', 'data/broken.js'), SyntaxError);

console.log('ARCH-01 import-boundary tests: PASS');
