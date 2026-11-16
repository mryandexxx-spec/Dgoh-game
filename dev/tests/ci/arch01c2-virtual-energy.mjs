// ARCH-01C2 diagnostics: production-equivalent virtual esbuild extraction, never edit src.
// Reports the exact 163 historical ESM marker positions before any campaign change.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree } from '../../tools/arch-init-graph.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(DEV, 'src');
const previous = SPLIT.map(x => x[1]);
const read = name => fs.readFileSync(path.join(SRC, name), 'utf8');
const markerNames = contents => [...contents.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m => m[1]).filter(s => s !== 'main.js');
const energyImport = "import { BATTLE_WATER, CANDLE_COST } from '../logic/economy.js';";
const costLine = "const MAX_LVL = 85, WATER_BASE = 150, WATER_SEC = 20, BATTLE_WATER = 6, CANDLE_BASE = 120, CANDLE_SEC = 30, CANDLE_COST = 8, CANDLE_REFILL = 100;";
const energyData = "const BATTLE_WATER = 6, CANDLE_COST = 8;\nexport { BATTLE_WATER, CANDLE_COST };";
async function build(virtual = false) {
  const patched = new Map();
  if (virtual) {
    const campaign = read('data/campaigns.js'), economy = read('logic/economy.js');
    assert.ok(campaign.includes(energyImport) && economy.includes(costLine), 'production source anchors changed');
    patched.set('data/campaigns.js', campaign.replace(energyImport, "import { BATTLE_WATER, CANDLE_COST } from './campaign-energy.js';"));
    patched.set('logic/economy.js', economy.replace(costLine,
      'const MAX_LVL = 85, WATER_BASE = 150, WATER_SEC = 20, CANDLE_BASE = 120, CANDLE_SEC = 30, CANDLE_REFILL = 100;')
      .replace("import '../data/journeys.js'; // порядок исполнения",
        "import '../data/journeys.js'; // порядок исполнения\nimport { BATTLE_WATER, CANDLE_COST } from '../data/campaign-energy.js';"));
  }
  const plugins = virtual ? [{
    name: 'virtual-campaign-energy',
    setup(build) {
      build.onResolve({ filter: /campaign-energy\.js$/ }, () => ({ path: 'virtual-campaign-energy', namespace: 'campaign-energy' }));
      build.onLoad({ filter: /.*/, namespace: 'campaign-energy' }, () => ({ contents: energyData, loader: 'js' }));
      build.onLoad({ filter: /\.js$/ }, args => {
        const relative = path.relative(SRC, args.path).split(path.sep).join('/');
        if (!patched.has(relative)) return;
        return { contents: patched.get(relative), loader: 'js', resolveDir: path.dirname(args.path) };
      });
    }
  }] : [];
  const result = await esbuild.build({
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
  return markerNames(result.outputFiles[0].text);
}

const graph = analyzeTree(DEV);
console.log('ARCH-01C2 actual topology: modules=' + graph.modules +
  ', static=' + graph.staticImports +
  ', SCC=' + graph.cycles.map(x => x.length).join(',') +
  ', unresolved=' + graph.unresolved.length);
const original = await build(false);
assert.deepEqual(original, previous, 'unmodified main must match strict SPLIT');
const simulated = await build(true);
const removed = previous.filter(x => !simulated.includes(x));
const extra = simulated.filter(x => !previous.includes(x));
const relocated = previous.filter((x,i) => simulated.indexOf(x) !== i);
const first = previous.findIndex((x,i) => simulated[i] !== x);
console.log('ARCH-01C2 virtual energy extraction: preserve-legacy-order=' +
  (first === -1 && original.length === simulated.length) +
  ', relocated=' + relocated.length + ', missing=' + JSON.stringify(removed) +
  ', extra=' + JSON.stringify(extra) +
  ', first=' + (first === -1 ? 'none' : first + ':' + previous[first] + '→' + simulated[first]) +
  ', preview=' + JSON.stringify(relocated.slice(0,12)));
console.log('ARCH-01C2 diagnostic complete: no source, SPLIT, baseline or golden modified');
