// ARCH-01C2c: read-only virtual ESM extraction of core/rng into pure data.
// No source, baseline, SPLIT, golden, HTML or published files are mutated.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree } from '../../tools/arch-init-graph.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(DEV, 'src');
const read = p => fs.readFileSync(path.join(SRC, p), 'utf8');
const oldOrder = SPLIT.map(([, name]) => name);
const markerNames = bundle => [...bundle.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
  .map(m => m[1]).filter(name => name !== 'main.js');
const legacyRngImport = "import { sRng } from '../core/rng.js';";
const domPredecessor = "import './dom.js'; // порядок исполнения";
const pureRngImport = "import { sRng } from '../data/seeded-rng.js';";
const dataRngImport = "import { sRng } from './seeded-rng.js';";

const rng = read('core/rng.js'), campaign = read('data/campaigns.js');
const pureFunction = rng.match(/^function sRng\(seed\) \{.*\}$/m)?.[0];
assert.ok(pureFunction, 'original exact seeded PRNG algorithm not found');
assert.ok(rng.includes(domPredecessor) && rng.includes('export { sRng };'), 'core public API/order changed');
assert.ok(campaign.includes(legacyRngImport), 'old data→core edge missing');
assert.ok(campaign.includes("sRng(ghash(ck + c + ':' + m))"), 'seed/call timing changed');
const pureData = '// ARCH-01C2c pure deterministic generator, bit-identical to core/rng.js\n' +
  pureFunction + '\n\nexport { sRng };\n';

async function bundle(virtual, variant = 'plain') {
  // Existing logic/progress.js already keeps core/rng.js as an order-only predecessor.
  // In the plain re-export variant esbuild drops the empty core module marker;
  // an explicit local alias keeps the old bootstrap slot without a new side effect.
  const coreAdapter = rng.replace(domPredecessor,
    domPredecessor + '\n' + (variant === 'alias'
      ? "import { sRng as pureSRng } from '../data/seeded-rng.js';"
      : pureRngImport))
    .replace(pureFunction + '\n',
      variant === 'alias' ? 'const sRng = pureSRng;\n' : '');
  const patched = virtual ? new Map([
    ['data/campaigns.js', campaign.replace(legacyRngImport, dataRngImport)],
    ['core/rng.js', coreAdapter],
  ]) : new Map();
  const plugins = virtual ? [{
    name: 'arch01c2c-memory-only',
    setup(build) {
      build.onResolve({ filter: /seeded-rng\.js$/ }, () =>
        ({ path: 'seeded-rng', namespace: 'arch-c2c' }));
      build.onLoad({ filter: /.*/, namespace: 'arch-c2c' }, () =>
        ({ contents: pureData, loader: 'js' }));
      build.onLoad({ filter: /\.js$/ }, args => {
        const rel = path.relative(SRC, args.path).split(path.sep).join('/');
        if (!patched.has(rel)) return;
        return { contents: patched.get(rel), loader: 'js', resolveDir: path.dirname(args.path) };
      });
    },
  }] : [];
  const result = await esbuild.build({
    absWorkingDir: DEV, entryPoints: ['src/main.js'],
    bundle: true, write: false, format: 'esm', treeShaking: false,
    charset: 'utf8', legalComments: 'none', target: 'esnext',
    logLevel: 'silent', logOverride: { 'commonjs-variable-in-esm': 'silent' },
    plugins,
  });
  return { old: markerNames(result.outputFiles[0].text),
    text: result.outputFiles[0].text };
}

const graph = analyzeTree(DEV);
const baseline = JSON.parse(fs.readFileSync(path.join(DEV, 'tools/arch-import-baseline.json'), 'utf8')).legacy;
assert.equal(graph.modules, 171, 'C2c starting graph should be post C2b');
assert.equal(graph.unresolved.length, 0);
assert.equal(baseline.length, 12, 'C2c starts at 12 old reverse imports');
assert.ok(baseline.includes('data/campaigns.js -> core/rng.js'),
  'the candidate edge must still exist before implementation');
const actual = await bundle(false);
assert.deepEqual(actual.old, oldOrder,
  'production-option esbuild output must match the current 165-marker SPLIT contract');
for (const variant of ['plain', 'alias']) {
  const simulated = await bundle(true, variant);
  const missing = oldOrder.filter(f => !simulated.old.includes(f));
  const extra = simulated.old.filter(f => !oldOrder.includes(f));
  const moved = oldOrder.filter((f, i) => simulated.old.indexOf(f) !== i);
  const first = oldOrder.findIndex((f,i)=>simulated.old[i]!==f);
  console.log('ARCH-01C2c virtual ' + variant + ' pure-RNG extraction: existing=' + oldOrder.length +
    ', moved=' + moved.length + ', missing=' + JSON.stringify(missing) +
    ', extra=' + JSON.stringify(extra) +
    ', first=' + (first < 0 ? 'none' :
      first + ':' + oldOrder[first] + ' -> ' + simulated.old[first]) +
    ', movedPreview=' + JSON.stringify(moved.slice(0,20)));
}
console.log('ARCH-01C2c rng function exact source bytes=' + pureFunction.length +
  ', core/dom predecessor kept, production files unchanged');
