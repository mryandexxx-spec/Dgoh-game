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
  const extra = order.filter(name=>!wanted.includes(name));
  const observed = order.filter(name=>wanted.includes(name));
  const deltas = wanted.map(name=>({name,old:wanted.indexOf(name),now:observed.indexOf(name)}))
    .filter(x=>x.old!==x.now);
  const first = wanted.findIndex((name,i)=>observed[i]!==name);
  return {length:order.length,extras:extra,firstMismatch:first,
    expected:wanted[first],actual:observed[first],
    displaced:deltas.length,adjacentSwapCost:deltas.reduce((n,x)=>n+Math.abs(x.old-x.now),0)/2,
    targeted:targets.map(name=>({name,was:wanted.indexOf(name),now:observed.indexOf(name)})),
    largest:deltas.sort((a,b)=>Math.abs(b.now-b.old)-Math.abs(a.now-a.old)).slice(0,8)};
}

async function probe(name, patches, variants={}) {
  const accountCore=path.join(src,'logic','account-core.js');
  const accountCine=path.join(src,'logic','account-cine.js');
  const statsCounter=path.join(src,'logic','stat-counters.js');
  const pureAccount=fs.readFileSync(path.join(src,'logic','account.js'),'utf8')
    .replace(removal['logic/account.js'],'');
  const cineMatch=pureAccount.match(/^const CINE_OFF = .*;$/m);
  if (!cineMatch) throw Error('Expected account CINE_OFF definition missing');
  const pureCine=cineMatch[0]+"\nexport { CINE_OFF };\n";
  const partitionedAccount=pureAccount.replace(cineMatch[0]+"\n",'').replace(', CINE_OFF','');
  const statIncDeclaration='function statInc(k, n = 1) { S.stats[k] = (S.stats[k] || 0) + n; }';
  const pureCounter="import { S } from '../core/state.js';\n" + statIncDeclaration +
    "\nexport { statInc };\n";
  const statIncCallers=new Set([
    'ui/overlays/sim.js','ui/battle/battle-ui.js','ui/views/trials.js',
    'ui/views/conq.js','logic/conquest.js',
  ]);
  const plugin = {
    name:'order-probe',
    setup(build) {
      if (variants.accountSplit || variants.accountPartition) {
        // Virtual sources must resolve even though no physical file is created.
        build.onResolve({filter:/account-core\.js$/},args=>({path:accountCore}));
        if (variants.accountPartition)
          build.onResolve({filter:/account-cine\.js$/},args=>({path:accountCine}));
        build.onResolve({filter:/account\.js$/},args=>{
          if (!args.path.startsWith('.')) return;
          if (path.resolve(path.dirname(args.importer),args.path)!==path.join(src,'logic','account.js')) return;
          const from=path.relative(src,args.importer).split(path.sep).join('/');
          if (from==='ui/fx-text.js') return;
          if (variants.accountPartition && (
              from==='render3d/scenes/arena.js' || from==='ui/overlays/battle-settings.js'))
            return {path:accountCine};
          return {path:accountCore};
        });
        build.onLoad({filter:/account-core\.js$/},()=>({
          contents:variants.accountPartition?partitionedAccount:pureAccount,
          loader:'js',resolveDir:path.dirname(accountCore),
        }));
        if (variants.accountPartition)
          build.onLoad({filter:/account-cine\.js$/},()=>({
            contents:pureCine,loader:'js',resolveDir:path.dirname(accountCine),
          }));
      }
      if (variants.statsSplit) {
        build.onResolve({filter:/stat-counters\.js$/},args=>({path:statsCounter}));
        build.onResolve({filter:/stats\.js$/},args=>{
          if (!args.path.startsWith('.')) return;
          if (path.resolve(path.dirname(args.importer),args.path)!==path.join(src,'logic','stats.js')) return;
          if (!statIncCallers.has(path.relative(src,args.importer).split(path.sep).join('/'))) return;
          return {path:statsCounter};
        });
        build.onLoad({filter:/stat-counters\.js$/},()=>({
          contents:pureCounter,loader:'js',resolveDir:path.dirname(statsCounter),
        }));
      }
      build.onLoad({ filter:/[\\/]src[\\/].*\.js$/ }, args => {
        const rel=path.relative(src,args.path).split(path.sep).join('/');
        let text=fs.readFileSync(args.path,'utf8');
        const patch=patches?.[rel];
        if (patch) text=patch(text);
        if (variants.accountSplit && rel==='logic/account.js')
          text="export * from './account-core.js';\n";
        if (variants.accountPartition && rel==='logic/account.js')
          text="export * from './account-core.js';\nexport * from './account-cine.js';\nconst __archAccountAdapter = true;\n";
        if (variants.statsSplit && rel==='logic/stats.js') {
          if (!text.includes(statIncDeclaration)) throw Error('Missing original statInc declaration');
          text=text.replace(removal[rel],'')
            .replace(statIncDeclaration,"import { statInc } from './stat-counters.js';");
        }
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
  {name:'split stats counter',patches:{},variants:{statsSplit:true}},
  {name:'split full account',patches:{},variants:{accountSplit:true}},
  {name:'split both with pure cores',patches:{},variants:{accountSplit:true,statsSplit:true}},
  {name:'drop stats with feat bootstrap import',patches:{
    'logic/stats.js':without('logic/stats.js'),
    'ui/views/feats.js':t=>"import './trials.js'; // virtual UI init\n"+t,
  }},
  {name:'partition account CINE_OFF',patches:{},variants:{accountPartition:true}},
  {name:'partition account + drop stats with feats bootstrap',patches:{
    'logic/stats.js':without('logic/stats.js'),
    'ui/views/feats.js':t=>"import './trials.js'; // virtual UI init\n"+t,
  },variants:{accountPartition:true}},
];
console.log('ARCH01B2: '+JSON.stringify({
  modules:graph.modules,staticImports:graph.staticImports,
  scc:graph.cycles.map(c=>({size:c.length,contains:targets.filter(t=>c.includes(t))})),
  incoming:Object.fromEntries([...incoming].map(([key,edges])=>
    [key,edges.sort((a,b)=>a.relativeOrder-b.relativeOrder)])),
}));
for (const c of cases) {
  try { console.log('ORDER-PROBE '+JSON.stringify(await probe(c.name,c.patches,c.variants))); }
  catch(err){ console.error('ORDER-PROBE FAIL '+c.name+': '+err.message);process.exitCode=1; }
}

if (process.argv.includes('--search')) {
  const uiModules=allFiles(path.join(src,'ui'))
    .map(p=>path.relative(src,p).split(path.sep).join('/'))
    .sort();
  function prependUI(from,target) {
    const a=path.posix.relative(path.posix.dirname(from),target);
    const imp=(a.startsWith('.')?a:'./'+a);
    return t=>"import '"+imp+"'; // ARCH-01B2 virtual order probe\n"+t;
  }
  const sort=(a,b)=>a.displaced-b.displaced||a.adjacentSwapCost-b.adjacentSwapCost;
  const experiments=[
    {label:'stats',file:'logic/stats.js',target:'ui/views/trials.js'},
    {label:'account',file:'logic/account.js',target:'ui/wiring.js'},
  ];
  const bestCandidates={};
  for(const e of experiments) {
    const found=[];
    for(const ui of uiModules) {
      if(ui===e.target)continue;
      const patches={
        [e.file]:without(e.file),
        [ui]:prependUI(ui,e.target),
      };
      try {
        const m=await probe(e.label+':'+ui,patches);
        found.push({ui,displaced:m.displaced,
          swap:m.adjacentSwapCost,firstMismatch:m.firstMismatch});
      } catch(err) {
        console.log('ORDER-SEARCH-ERROR '+e.label+':'+ui+' '+err.message.slice(0,180));
      }
    }
    found.sort((a,b)=>a.displaced-b.displaced||a.swap-b.swap);
    bestCandidates[e.label]=found.slice(0,5);
    console.log('ORDER-SEARCH '+JSON.stringify({type:e.label,tried:found.length,top:found.slice(0,10)}));
  }
  const combos=[];
  for(const a of bestCandidates.stats)
    for(const b of bestCandidates.account) {
      if(a.ui===b.ui)continue;
      const patches={
        'logic/stats.js':without('logic/stats.js'),
        'logic/account.js':without('logic/account.js'),
        [a.ui]:prependUI(a.ui,'ui/views/trials.js'),
        [b.ui]:prependUI(b.ui,'ui/wiring.js'),
      };
      try {
        const m=await probe('both:'+a.ui+'+'+b.ui,patches);
        combos.push({statsUI:a.ui,accountUI:b.ui,
          displaced:m.displaced,swap:m.adjacentSwapCost,first:m.firstMismatch});
      }catch(err){console.log('ORDER-COMBO-ERROR '+err.message.slice(0,180));}
    }
  combos.sort((a,b)=>a.displaced-b.displaced||a.swap-b.swap);
  console.log('ORDER-COMBO '+JSON.stringify({tried:combos.length,top:combos.slice(0,10)}));
}
