// ARCH-01B3 read-only ESM bootstrap experiment. No source/dist writes.
// Invoke from dev/: node tools/arch-account-order-probe.mjs
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { SPLIT } from './split.config.mjs';

const dir=path.resolve('src');
const baseline=SPLIT.map(row=>row[1]);
const reverse="import '../ui/wiring.js'; // порядок исполнения\n";
const arenaAccount="import { CINE_OFF } from '../../logic/account.js';";
const arenaBattle="import { DLG } from '../../ui/battle/battle-ui.js';";
const cineSrc="const CINE_OFF = () => { try { return !!JSON.parse(localStorage.getItem('dune-cine-off') || 'true'); } catch (e) { return true; } };\nexport { CINE_OFF };\n";
const read=(f)=>fs.readFileSync(path.join(dir,f),'utf8');
const replace=(old,what)=>t=>{
  if(!t.includes(old))throw Error('Expected pattern not found: '+old);
  return t.replace(old,what);
};
const prepend=s=>t=>s+"\n"+t;
const removeAccount=replace(reverse,'');
const patchCine=(text,file)=> {
  if(file==='render3d/scenes/arena.js')return replace(arenaAccount,"import { CINE_OFF } from '../../logic/cinematic-preference.js';")(text);
  if(file==='ui/overlays/battle-settings.js')return replace("import { CINE_OFF } from '../../logic/account.js';",
    "import { CINE_OFF } from '../../logic/cinematic-preference.js';")(text);
  if(file==='logic/account.js')return replace(reverse,'')(text);
  return text;
};
function measurement(order) {
  const observed=order.filter(x=>baseline.includes(x));
  const extras=order.filter(x=>!baseline.includes(x));
  const moved=baseline.map((name,i)=>({name,was:i,now:observed.indexOf(name)})).filter(x=>x.was!==x.now);
  const first=baseline.findIndex((x,i)=>observed[i]!==x);
  return {modules:order.length, extras, extraPositions:extras.map(name=>({name,index:order.indexOf(name)})), displaced:moved.length,
    firstMismatch:first, expected:baseline[first]??null, actual:observed[first]??null,
    swapCost:moved.reduce((s,x)=>s+Math.abs(x.now-x.was),0)/2,
    positions:['logic/account.js','ui/wiring.js','ui/overlays/profile.js','ui/fx-text.js','ui/battle/battle-ui.js',
      'render3d/scenes/arena.js','core/boot.js','data/fx.js','ui/views/trials.js','logic/stats.js'].map(name=>({name,old:baseline.indexOf(name),now:observed.indexOf(name)})),
    largest:moved.sort((a,b)=>Math.abs(b.now-b.was)-Math.abs(a.now-a.was)).slice(0,6)};
}
async function run(name,patches={},cine=false,rulesMode='') {
  const plugin={
    name:'boot-order-probe',
    setup(build){
      if(rulesMode){
        build.onResolve({filter:/account-rules\.js$/},()=>({path:path.join(dir,'logic/account-rules.js')}));
        build.onLoad({filter:/[\\/]src[\\/]logic[\\/]account-rules\.js$/},()=>({
          contents:read('logic/account.js').replace(reverse,''),loader:'js',resolveDir:path.join(dir,'logic')
        }));
      }
      if(cine){
        build.onResolve({filter:/^.*cinematic-preference\.js$/},args=>({path:path.join(dir,'logic/cinematic-preference.js')}));
        build.onLoad({filter:/[\\/]src[\\/]logic[\\/]cinematic-preference\.js$/},()=>({
          contents:cineSrc, loader:'js',resolveDir:path.join(dir,'logic')
        }));
      }
      build.onLoad({filter:/[\\/]src[\\/].*\.js$/},args=>{
        const relative=path.relative(dir,args.path).split(path.sep).join('/');
        let text=fs.readFileSync(args.path,'utf8');
        if(cine)text=patchCine(text,relative);
        else if(relative==='logic/account.js'&&name!=='baseline')text=removeAccount(text);
        if(rulesMode){
          if(relative==='logic/account.js'&&rulesMode==='all'){
            text="export * from './account-rules.js';\nconst __accountLegacyAdapter = true;\n";
          }else if(relative!=='ui/fx-text.js'&&relative!=='logic/account.js'){
            const shouldRedirect=rulesMode==='all' ||
              (rulesMode==='rewards'&&relative==='logic/rewards.js') ||
              (rulesMode==='rewards-events'&&(relative==='logic/rewards.js'||relative==='ui/events.js'));
            if(shouldRedirect)text=text.replace(/(from\s+['"][^'"]*?)account\.js(['"])/g,
              (_all,prefix,suffix)=>prefix+'account-rules.js'+suffix);
          }
        }
        if(patches[relative])text=patches[relative](text);
        return {contents:text,resolveDir:path.dirname(args.path),loader:'js'};
      });
    }
  };
  const r=await esbuild.build({entryPoints:[path.join(dir,'main.js')],bundle:true,write:false,
    format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',
    logLevel:'silent',plugins:[plugin]});
  const order=[...r.outputFiles[0].text.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m=>m[1]).filter(x=>x!=='main.js');
  return {name,...measurement(order)};
}
const reorderArena=replace(arenaAccount+"\n"+arenaBattle, arenaBattle+"\n"+arenaAccount);
const reorderUI=replace("import '../views/rules.js'; // порядок исполнения",
  "import '../wiring.js'; // ARCH-01B3 UI composition\nimport '../views/rules.js'; // порядок исполнения");
const arenaFirstUI=prepend("import '../../ui/wiring.js'; // diagnostic only: illegal render → ui");
const uiFxPrepend=prepend("import './wiring.js'; // ARCH-01B3 UI composition");
const profilePrepend=prepend("import '../wiring.js'; // ARCH-01B3 UI composition");
const coreFirst=prepend("import '../ui/wiring.js'; // composition root");
const uiBattleFirst=prepend("import '../wiring.js'; // UI composition");
const uiFXReplace=replace("import '../logic/account.js'; // порядок исполнения",
  "import './wiring.js'; // order composited inside UI\nimport '../logic/account.js';");
const cases=[
  ['baseline',{}],
  ['drop account',{}],
  ['drop+arena reorder',{'render3d/scenes/arena.js':reorderArena}],
  ['drop+UI battle imports wiring',{'ui/battle/battle-ui.js':reorderUI}],
  ['drop+arena reorder+UI battle wiring',{'render3d/scenes/arena.js':reorderArena,
    'ui/battle/battle-ui.js':reorderUI}],
  ['drop+UI battle wiring before all',{'ui/battle/battle-ui.js':uiBattleFirst}],
  ['drop+UI fx orders wiring',{'ui/fx-text.js':uiFXReplace}],
  ['drop+UI profile orders wiring',{'ui/overlays/profile.js':profilePrepend}],
  ['drop+core boot first wiring',{'core/boot.js':coreFirst}],
  ['drop+arena wiring before all (diagnostic illegal)',{'render3d/scenes/arena.js':arenaFirstUI}],
  ['cine extracted (account no reverse)',{},true],
  ['cine extracted +UI battle first wiring',{'ui/battle/battle-ui.js':uiBattleFirst},true],
  ['cine extracted +UI fx orders wiring',{'ui/fx-text.js':uiFXReplace},true],
  ['cine extracted +UI profile orders wiring',{'ui/overlays/profile.js':profilePrepend},true],
  ['cine extracted +core first wiring',{'core/boot.js':coreFirst},true],
  ['rules rewards only + cine + fx wire',{'ui/fx-text.js':uiFXReplace},true,'rewards'],
  ['rules rewards/events + cine + fx wire',{'ui/fx-text.js':uiFXReplace},true,'rewards-events'],
  ['rules all + cine + fx wire',{'ui/fx-text.js':uiFXReplace},true,'all'],
  ['rules all + cine, fx untouched',{},true,'all'],
];

function allJS(path0) {
  return fs.readdirSync(path0,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(path0,e.name);
    return e.isDirectory()?allJS(p):e.isFile()&&e.name.endsWith('.js')?[p]:[];
  });
}
const importers=[];
for(const file of allJS(dir)){
  const source=fs.readFileSync(file,'utf8');
  for(const line of source.split('\n').filter(x=>/^import\s/.test(x)&&/account\.js/.test(x))){
    if(/['"][^'"]*account\.js['"]/.test(line))importers.push({
      source:path.relative(dir,file).replaceAll('\\','/'),import:line.trim()
    });
  }
}
console.log('ARCH-B3-ACCOUNT-IMPORTERS '+JSON.stringify(importers));

for(const [name,patches,cine,rulesMode] of cases){
 try{console.log('ARCH-B3-PROBE '+JSON.stringify(await run(name,patches,!!cine,rulesMode)));}
 catch(e){console.log('ARCH-B3-ERROR '+name+': '+e.message);process.exitCode=1;}
}
