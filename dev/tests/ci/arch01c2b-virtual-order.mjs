// ARCH-01C2b: in-memory ESM order probe. No production file is ever changed.
// Simulates a logic-owned nodeOpen rule with the previous data API and boot wiring.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree } from '../../tools/arch-init-graph.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(DEV, 'src');
const read = file => fs.readFileSync(path.join(SRC, file), 'utf8');
const oldOrder = SPLIT.map(([, name]) => name);
const markerNames = text => [...text.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
  .map(m => m[1]).filter(name => name !== 'main.js');

const stateImport = "import { S } from '../core/state.js';";
const originalRule = 'function nodeOpen(i) { const n = NODES[i], prev = i - 1; return (prev < 0 || NODES[prev].camp !== n.camp) ? true : !!S.cleared[prev]; }';
const delegate = [
  '// ARCH-01C2b: original callable API remains available to all legacy importers.',
  'let nodeOpenRuntime = null;',
  'function bindNodeOpenRuntime(rule) {',
  "  if (nodeOpenRuntime) throw new Error('Campaign nodeOpen runtime already initialized');",
  '  nodeOpenRuntime = rule;',
  '}',
  'function nodeOpen(i) {',
  "  if (!nodeOpenRuntime) throw new Error('Campaign nodeOpen runtime not initialized');",
  '  return nodeOpenRuntime(i);',
  '}',
].join('\n');

const newRule = [
  "import { NODES, bindNodeOpenRuntime } from '../data/campaigns.js';",
  "import { S } from '../core/state.js';",
  '// Exactly the original rule; no state read until a consumer invokes nodeOpen.',
  'function nodeOpenRule(i) { const n = NODES[i], prev = i - 1; return (prev < 0 || NODES[prev].camp !== n.camp) ? true : !!S.cleared[prev]; }',
  'bindNodeOpenRuntime(nodeOpenRule);',
].join('\n');

function simulatedSources() {
  const campaigns = read('data/campaigns.js');
  const boot = read('core/boot.js');
  const predecessor = "import '../logic/journey-gates.js'; // ARCH-01C1b: register journey logic before start() renders the camp";
  assert.ok(campaigns.includes(stateImport), 'missing state edge in campaigns');
  assert.ok(campaigns.includes(originalRule), 'original nodeOpen source changed');
  assert.ok(campaigns.includes('export { S0, '), 'expected legacy export list not found');
  assert.ok(boot.includes(predecessor), 'boot composition predecessor changed');
  return new Map([
    ['data/campaigns.js',
      campaigns.replace(stateImport + '\n', '')
        .replace(originalRule, delegate)
        .replace('export { S0, ', 'export { bindNodeOpenRuntime, S0, ')],
    ['core/boot.js',
      boot.replace(predecessor, predecessor + "\nimport '../logic/campaign-gates.js'; // ARCH-01C2b: register callable node-open rules before start()")],
  ]);
}

async function compile(virtual) {
  const patched = virtual ? simulatedSources() : new Map();
  const plugins = virtual ? [{
    name: 'arch01c2b-memory-only',
    setup(build) {
      build.onResolve({ filter: /campaign-gates\.js$/ }, () =>
        ({ path: 'campaign-gates', namespace: 'arch-c2b' }));
      build.onLoad({ filter: /.*/, namespace: 'arch-c2b' }, () =>
        ({ contents: newRule, loader: 'js', resolveDir: path.join(SRC, 'logic') }));
      build.onLoad({ filter: /\.js$/ }, args => {
        const relative = path.relative(SRC, args.path).split(path.sep).join('/');
        if (!patched.has(relative)) return;
        return { contents: patched.get(relative), loader: 'js', resolveDir: path.dirname(args.path) };
      });
    },
  }] : [];
  const result = await esbuild.build({
    absWorkingDir: DEV, entryPoints: ['src/main.js'],
    bundle: true, write: false, format: 'esm', treeShaking: false,
    charset: 'utf8', legalComments: 'none', target: 'esnext', logLevel: 'silent',
    logOverride: { 'commonjs-variable-in-esm': 'silent' }, plugins,
  });
  return markerNames(result.outputFiles[0].text);
}

const tree = analyzeTree(DEV);
assert.equal(tree.unresolved.length, 0);
assert.equal(tree.modules, 170);
const legacy = JSON.parse(fs.readFileSync(path.join(DEV, 'tools/arch-import-baseline.json'), 'utf8')).legacy;
assert.equal(legacy.length, 13, 'C2b must begin at the published v127 source baseline');
assert.ok(legacy.includes('data/campaigns.js -> core/state.js'));
const original = await compile(false);
assert.deepEqual(original, oldOrder, 'current production esbuild must equal unchanged SPLIT');
const simulated = await compile(true);
const lost = oldOrder.filter(f => !simulated.includes(f));
const added = simulated.filter(f => !oldOrder.includes(f));
const relocated = oldOrder.filter((f, i) => simulated.indexOf(f) !== i);
const first = oldOrder.findIndex((f, i) => simulated[i] !== f);
console.log('ARCH-01C2b virtual state extraction: existing=' + oldOrder.length +
  ', moved=' + relocated.length + ', missing=' + JSON.stringify(lost) +
  ', extra=' + JSON.stringify(added) + ', first=' +
  (first < 0 ? 'none' : first + ':' + oldOrder[first] + ' → ' + simulated[first]) +
  ', movedPreview=' + JSON.stringify(relocated.slice(0, 12)));
console.log('ARCH-01C2b diagnostic: virtual composition root only; no src, SPLIT, baseline or golden changed');
