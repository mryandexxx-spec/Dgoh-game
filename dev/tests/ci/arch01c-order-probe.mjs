// ARCH-01C0: non-mutating ESM order probes against the production esbuild options.
// Candidates are rewritten only in esbuild's onLoad memory buffer. No source / SPLIT / golden changes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree } from '../../tools/arch-init-graph.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(DEV, 'src');
const want = SPLIT.map(x => x[1]);
const snapshots = new Map();

function read(relative) {
  if (!snapshots.has(relative)) snapshots.set(relative, fs.readFileSync(path.join(SRC, relative), 'utf8'));
  return snapshots.get(relative);
}

const orderOnly = [
  ['boss → skills', 'data/boss.js', "import '../logic/battle/skills.js'; // порядок исполнения"],
  ['looks → ai', 'data/looks.js', "import '../logic/battle/ai.js'; // порядок исполнения"],
  ['story → models', 'data/story.js', "import '../assets/models.js'; // порядок исполнения"],
  ['cosmetics → stats', 'data/cosmetics.js', "import '../logic/stats.js'; // порядок исполнения"],
  ['conquest → celebrate', 'data/conquest-data.js', "import '../ui/overlays/celebrate.js'; // порядок исполнения"],
];

const scenarios = [
  ...orderOnly.map(([label, file, statement]) => ({ label, patches: [[file, source => {
    assert.ok(source.includes(statement), 'missing order import: ' + label);
    return source.replace(statement, '');
  }]] })),
  { label: 'journeys → economy / MAX_GEAR shared pure data (virtual)', patches: [
    ['data/journeys.js', source => {
      const before = "import { MAX_GEAR } from '../logic/economy.js';";
      assert.ok(source.includes(before), 'MAX_GEAR import missing');
      return source.replace(before, "import { MAX_GEAR } from './arch01c-gear-cap.js';");
    }],
    ['logic/economy.js', source => {
      const before = 'MAX_LVL = 85, MAX_GEAR = 13,';
      assert.ok(source.includes(before), 'MAX_GEAR declaration missing');
      const predecessor = "import '../data/journeys.js'; // порядок исполнения";
      assert.ok(source.includes(predecessor), 'economy predecessor missing');
      return source.replace(before, 'MAX_LVL = 85,')
        .replace(predecessor, predecessor + "\nimport { MAX_GEAR } from '../data/arch01c-gear-cap.js';");
    }],
  ], virtual: true },
];

function markers(code) {
  return [...code.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
    .map(m => m[1]).filter(f => f !== 'main.js');
}

async function compile(scenario) {
  const patches = new Map(scenario?.patches || []);
  const plugins = !scenario ? [] : [{
    name: 'arch01c-memory-only',
    setup(build) {
      if (scenario.virtual) {
        build.onResolve({ filter: /arch01c-gear-cap\.js$/ }, () => ({ path: 'arch01c-gear-cap', namespace: 'arch01c' }));
        build.onLoad({ filter: /.*/, namespace: 'arch01c' }, () => ({
          contents: 'export const MAX_GEAR = 13;', loader: 'js',
        }));
      }
      build.onLoad({ filter: /\.js$/ }, args => {
        const relative = path.relative(SRC, args.path).split(path.sep).join('/');
        if (!patches.has(relative)) return;
        const original = read(relative);
        return { contents: patches.get(relative)(original), loader: 'js', resolveDir: path.dirname(args.path) };
      });
    },
  }];
  const output = await esbuild.build({
    absWorkingDir: DEV,
    entryPoints: ['src/main.js'],
    bundle: true,
    write: false,
    format: 'esm',
    treeShaking: false,
    charset: 'utf8',
    legalComments: 'none',
    target: 'esnext',
    logLevel: 'silent',
    logOverride: { 'commonjs-variable-in-esm': 'silent' },
    plugins,
  });
  return markers(output.outputFiles[0].text);
}

const topology = analyzeTree(DEV);
const legacy = JSON.parse(fs.readFileSync(path.join(DEV, 'tools/arch-import-baseline.json'), 'utf8')).legacy;
console.log('ARCH-01C0 actual AST topology: ' + topology.modules + ' modules, ' +
  topology.staticImports + ' static imports, ' + topology.dynamicImports + ' dynamic imports; SCC=' +
  topology.cycles.map(c => c.length).join(',') + '; unresolved=' + topology.unresolved.length);
for (const edge of legacy) {
  const [from, to] = edge.split(' -> ');
  const index = topology.cycles.findIndex(c => c.includes(from) && c.includes(to));
  const found = topology.cyclicalEdges.some(e => e.from === from && e.to === to);
  console.log('ARCH-01C0 edge ' + edge + ': SCC=' + (index < 0 ? 'none' : '#' + (index + 1)) +
    ', cyclic=' + found);
}
assert.equal(legacy.length, 17, 'legacy baseline drift: revisit C0');
assert.equal(topology.unresolved.length, 0, 'unresolved imports');

const original = await compile(null);
assert.deepEqual(original, want, 'production-option baseline must exactly match the unmodified SPLIT order');
console.log('ARCH-01C0 esbuild baseline: exact ' + original.length + ' existing module markers, no reorder');
for (const scenario of scenarios) {
  try {
    const next = await compile(scenario);
    const first = want.findIndex((f, i) => f !== next[i]);
    const altered = want.filter((f, i) => next.indexOf(f) !== i);
    const lost = want.filter(f => !next.includes(f));
    const added = next.filter(f => !want.includes(f));
    console.log('ARCH-01C0 esbuild virtual [' + scenario.label + ']: unchanged=' +
      (first === -1 && next.length === want.length) +
      ', first=' + (first < 0 ? 'none' : first + ' expected ' + want[first] + ' got ' + next[first]) +
      ', relocated=' + altered.length +
      ', missing=' + JSON.stringify(lost) + ', extra=' + JSON.stringify(added) +
      ', firstAffected=' + JSON.stringify(altered.slice(0, 8)));
  } catch (error) {
    // Alternative source code is exploratory, not an accepted implementation.
    console.log('ARCH-01C0 esbuild virtual [' + scenario.label + ']: BUILD_ERROR ' + String(error));
  }
}
console.log('ARCH-01C0 order diagnostics completed; no source files modified');
