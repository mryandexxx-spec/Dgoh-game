// ARCH-01C2d: read-only ESM order diagnosis of STORY→assets/models order-only edge.
// Every scenario is implemented as an in-memory esbuild transform; never edit src.
// Do not lower check-bundle strictness or update golden/SPLIT to fit a new ordering.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { SPLIT } from '../../tools/split.config.mjs';
import { analyzeTree, importEdges } from '../../tools/arch-init-graph.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(DEV,'src');
const read = rel => fs.readFileSync(path.join(SRC,rel),'utf8');
const oldNames=SPLIT.map(([,name])=>name);
const storyFile='data/story.js', modelFile='assets/models.js';
const originalStory=read(storyFile);
const forbiddenOrderOnly="import '../assets/models.js'; // порядок исполнения\n";
assert.ok(originalStory.includes(forbiddenOrderOnly),
  'must probe original edge, not an already removed link');
const legacy=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8')).legacy;
assert.equal(legacy.length,11,'C2d baseline should start at 11');
assert.ok(legacy.includes('data/story.js -> assets/models.js'));
assert.ok(read(modelFile).includes('b3Pre(loadAssets3);'),
  'models registration is observable: not safe to drop or defer');
assert.ok(read(modelFile).includes("import '../render3d/scenes/baker.js'; // порядок исполнения"),
  '3D bakery predecessor is part of module-order contract');

const cleanStory=originalStory.replace(forbiddenOrderOnly,'');
const noChange=new Map();
const removedOnly=new Map([[storyFile,cleanStory]]);
const markers=s=>[...s.matchAll(/^\/\/ src\/(.+\.js)$/gm)]
  .map(m=>m[1]).filter(name=>name!=='main.js');

const inputs=[
  // Side-effect models import from an already existing non-data entry:
  ['render3d/scenes/hero.js','../../assets/models.js'],
  ['render3d/scenes/base-scene.js','../../assets/models.js'],
  ['render3d/scenes/camp.js','../../assets/models.js'],
  ['render3d/scenes/baker.js','../../assets/models.js'],
  ['render3d/engine-host.js','../assets/models.js'],
  ['render3d/base.js','../assets/models.js'],
  ['render3d/characters/procedural.js','../../assets/models.js'],
  ['render3d/characters/mocap.js','../../assets/models.js'],
  ['render3d/scenes/arena.js','../../assets/models.js'],
  ['render2d/figures.js','../assets/models.js'],
  ['ui/router.js','../assets/models.js'],
  ['ui/overlays/squad-select.js','../../assets/models.js'],
  ['core/boot.js','../assets/models.js'],
];
const scenarios=[{label:'remove-only',patches:removedOnly}];
for(const [p,spec] of inputs){
  const source=read(p);
  const lines=source.split('\n');
  const lastImport=lines.findLastIndex(l=>/^import /.test(l));
  assert.ok(lastImport>=0,'missing import location for '+p);
  for(const kind of ['first','after']){
    const transformed=lines.slice();
    const importLine="import '"+spec+"'; // ARCH-01C2d virtual candidate only";
    const idx=kind==='first'?lines.findIndex(l=>/^import /.test(l)):lastImport+1;
    transformed.splice(idx,0,importLine);
    scenarios.push({
      label:p+':'+kind+(source.includes('from \''+spec+'\'')?' [already-imports-models]':''),
      patches:new Map([[storyFile,cleanStory],[p,transformed.join('\n')]]),
    });
  }
}

// Module graph context: find first importers of story/models and cycles.
function allSourceFiles(dir,out=[]){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const f=path.join(dir,e.name);
    if(e.isDirectory())allSourceFiles(f,out);
    else if(e.isFile()&&e.name.endsWith('.js'))out.push(f);
  }
  return out;
}
const edges=allSourceFiles(SRC).flatMap(f=>{
  const p=path.relative(SRC,f).split(path.sep).join('/');
  return importEdges(fs.readFileSync(f,'utf8'),p).filter(x=>x.kind==='static');
});
for(const target of [storyFile,modelFile,'render3d/scenes/baker.js','render3d/scenes/camp.js']){
 const from=edges.filter(e=>e.to===target).map(e=>e.from);
 console.log('ARCH-01C2d incoming '+target+': '+JSON.stringify(from));
}
const g=analyzeTree(DEV);
assert.equal(g.modules,172);
assert.equal(g.unresolved.length,0);
console.log('ARCH-01C2d original SCC '+JSON.stringify(g.cycles.map(c=>({size:c.length,head:c.slice(0,6)}))));

async function order(patches){
  const plugins=patches.size?[{
    name:'arch01c2d-memory-only',
    setup(build){
      build.onLoad({filter:/\.js$/},args=>{
        const relative=path.relative(SRC,args.path).split(path.sep).join('/');
        if(!patches.has(relative))return;
        return {contents:patches.get(relative),loader:'js',resolveDir:path.dirname(args.path)};
      });
    },
  }]:[];
  const out=await esbuild.build({
    absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,
    format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',
    target:'esnext',logLevel:'silent',
    logOverride:{'commonjs-variable-in-esm':'silent'},plugins,
  });
  return markers(out.outputFiles[0].text);
}
const reference=await order(noChange);
assert.deepEqual(reference,oldNames,
 'published post-C2c ESM order must equal all 166 real SPLIT markers');
for(const s of scenarios){
  try{
    const observed=await order(s.patches);
    const lost=oldNames.filter(x=>!observed.includes(x));
    const extra=observed.filter(x=>!oldNames.includes(x));
    const preserved=oldNames.filter(x=>observed.includes(x));
    let prev=-1,reverse=0;
    for(const m of preserved){
      const at=observed.indexOf(m);
      if(at<prev)reverse++;
      prev=at;
    }
    const moved=oldNames.filter((x,i)=>observed.indexOf(x)!==i);
    const first=oldNames.findIndex((x,i)=>observed[i]!==x);
    const exact=lost.length===0&&extra.length===0&&moved.length===0;
    console.log('ARCH-01C2d candidate '+JSON.stringify({
      label:s.label,exact,old:oldNames.length,observed:observed.length,
      moved:moved.length,missing:lost,extra,relativeInversions:reverse,
      first:first<0?'none':first+':'+oldNames[first]+' -> '+observed[first],
      movedPreview:moved.slice(0,9),
    }));
  }catch(e){
    console.log('ARCH-01C2d candidate '+s.label+' ERROR: '+String(e.message).slice(0,400));
  }
}
console.log('ARCH-01C2d result is diagnostic only; no actual game module, dependency or baseline was touched');
