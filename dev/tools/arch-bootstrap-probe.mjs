// ARCH-01B2 read-only order probe. Uses esbuild in memory; NEVER writes to src or dist.
// Compare dependency order after hypothetical removal of the two legacy reverse imports.
// Usage: cd dev && node tools/arch-bootstrap-probe.mjs
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { SPLIT } from './split.config.mjs';
import { importEdges, analyzeTree } from './arch-init-graph.mjs';

const src = path.resolve('src');
const wanted = SPLIT.map(x => x[1]);
const targets = ['logic/stats.js', 'logic/account.js', 'ui/wiring.js',
  'ui/views/trials.js', 'logic/trials.js', 'data/cosmetics.js', 'ui/views/feats.js'];
const removal = {
  'logic/stats.js': "import '../ui/views/trials.js'; // порядок исполнения\n",
  'logic/account.js': "import '../ui/wiring.js'; // порядок исполнения\n",
};
const graph = analyzeTree(process.cwd());
function allFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir,e.name);
    return e.isDirectory() ? allFiles(p) : e.isFile() && p.endsWith('.js') ? [p] : [];
  });
}
const incoming = new Map(targets.map(t => [t, []]));
for (const file of allFiles(src)) {
  const from = path.relative(src,file).split(path.sep).join('/');
  for (const e of importEdges(fs.readFileSync(file,'utf8'),from)) {
    if (incoming.has(e.to)) incoming.get(e.to).push({ from:e.from,line:e.line,kind:e.kind,
      relativeOrder:wanted.indexOf(e.from) });
  }
}

function orderMeasure(order) {
  const moved = wanted.filter((name,i)=>order.indexOf(name)!==i);
  const deltas = wanted.map(name=>({name,old:wanted.indexOf(name),now:order.indexOf(name)}))
    .filter(x=>x.old!==x.now);
  const first = wanted.findIndex((name,i)=>order[i]!==name);
  return {length:order.length,firstMismatch:first,
    expected:wanted[first],actual:order[first],
    displaced:deltas.length,adjacentSwapCost:deltas.reduce((n,x)=>n+Math.abs(x.old-x.now),0)/2,
    targeted:targets.map(name=>({name,was:wanted.indexOf(name),now:order.indexOf(name)})),
    largest:deltas.sort((a,b)=>Math.abs(b.now-b.old)-Math.abs(a.now-a.old)).slice(0,8)};
}

async function probe(name, patches) {
  const plugin = {
    name:'order-probe',
    setup(build) {
      build.onLoad({ filter:/[\\/]src[\\/].*\.js$/ }, args => {
        const rel=path.relative(src,args.path).split(path.sep).join('/');
        let text=fs.readFileSync(args.path,'utf8');
        const patch=patches?.[rel];
        if (patch) text=patch(text);
        return {contents:text,loader:'js',resolveDir:path.dirname(args.path)};
      });
    },
  };
  const r=await esbuild.build({
    entryPoints:[path.join(src,'main.js')],bundle:true,write:false,format:'esm',
    treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',
    logLevel:'silent',plugins:[plugin],
  });
  const order=[...r.outputFiles[0].text.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
    .map(m=>m[1]).filter(f=>f!=='main.js');
  return { name,...orderMeasure(order)};
}

function without(moduleName) {
  return text => {
    if (!text.includes(removal[moduleName]))throw Error('Expected import missing: '+moduleName);
    return text.replace(removal[moduleName],'');
  };
}
const cases = [
  {name:'baseline',patches:{}},
  {name:'drop stats->ui',patches:{'logic/stats.js':without('logic/stats.js')}},
  {name:'drop account->ui',patches:{'logic/account.js':without('logic/account.js')}},
  {name:'drop both',patches:{
    'logic/stats.js':without('logic/stats.js'),
    'logic/account.js':without('logic/account.js'),
  }},
];
console.log('ARCH01B2: '+JSON.stringify({
  modules:graph.modules,staticImports:graph.staticImports,
  scc:graph.cycles.map(c=>({size:c.length,contains:targets.filter(t=>c.includes(t))})),
  incoming:Object.fromEntries([...incoming].map(([key,edges])=>
    [key,edges.sort((a,b)=>a.relativeOrder-b.relativeOrder)])),
}));
for (const c of cases) {
  try { console.log('ORDER-PROBE '+JSON.stringify(await probe(c.name,c.patches))); }
  catch(err){ console.error('ORDER-PROBE FAIL '+c.name+': '+err.message);process.exitCode=1; }
}
