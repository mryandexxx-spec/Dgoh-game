// ARCH-01C4a: CONDITIONAL virtual candidate with exact 167 ESM slots
// but an intentional legacy SCC 9→6 reduction. Boot it in the real test VM
// and run immutable golden regressions, WITHOUT modifying actual game files.
// Diagnostics intentionally record a runtime NO-GO without treating a failed
// virtual candidate as a production CI error. Baseline boot must succeed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { loadGame } from '../lib/load.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const SRC=path.join(DEV,'src');
const bossPath=path.join(SRC,'data/boss.js');
const statsPath=path.join(SRC,'logic/battle/stats.js');
const boss=fs.readFileSync(bossPath,'utf8');
const stats=fs.readFileSync(statsPath,'utf8');
function once(s,original,next){
 assert.equal(s.split(original).length,2,'expected unique frozen code anchor: '+original);
 return s.replace(original,next);
}
const nextBoss=once(boss,"import '../logic/battle/skills.js'; // порядок исполнения\n",'');
const before="import { STAR_MULT } from '../../data/boss.js';\n";
const later="import { SK_KEYS, autoSk } from './skills.js';\n";
let nextStats=once(stats,later,'');
nextStats=once(nextStats,before,later+before);
assert.ok(nextBoss.includes('CH.worm = WORM;'));
assert.ok(nextStats.includes('const ZERO_GEAR_BONUS = Object.freeze('));
assert.ok(!nextBoss.includes("import '../logic/battle/skills.js';"));
assert.ok(!nextStats.includes(later+later));

const overrides=new Map([['data/boss.js',nextBoss],['logic/battle/stats.js',nextStats]]);
async function build(patch){
 const plugin={name:'arch01c4a-runtime-virtual',setup(b){
  b.onLoad({filter:/\.js$/},args=>{
   const key=path.relative(SRC,args.path).split(path.sep).join('/');
   if(patch.has(key))return {contents:patch.get(key),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }};
 const result=await esbuild.build({
  absWorkingDir:DEV,entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',
  treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext',logLevel:'silent',
  logOverride:{'commonjs-variable-in-esm':'silent'},plugins:patch.size?[plugin]:[]
 });
 assert.equal(result.outputFiles.length,1);
 const js=result.outputFiles[0].text;
 const marks=[...js.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(x=>x[1]).filter(x=>x!=='main.js');
 assert.deepEqual(marks,SPLIT.map(([,p])=>p),'exact markers required to test candidate');
 return js;
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dune-arch01c4a-'));
const makeGame=(key,code)=>{
 const dir=path.join(temp,key);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'virtual.js'),code,'utf8');
 const html=path.join(dir,'index.html');
 fs.writeFileSync(html,'<!DOCTYPE html><html><head></head><body><script src="virtual.js"></script></body></html>','utf8');
 return html;
};
function validateBoot(html){
 const game=loadGame(html,{seed:77});
 const run=expr=>game.run(expr);
 assert.equal(run("typeof WORM"),'object');
 assert.equal(run("typeof CH"),'object');
 assert.equal(run("CH.worm === WORM"),true,'WORM mutation must be the same object');
 assert.equal(run("CH.worm.id"),'worm');
 assert.equal(run("WORM.boss"),true);
 for(const fn of ['skMax','skLv','autoSk','abFor','dunGuard','dunShielded','aiPlan',
   'computeIntents','createBattle','nextActor','startTurn','act','endTurn','bossPlan','bossTurn'])
  assert.equal(run("typeof "+fn),'function',fn+' must be callable after cold boot');
 assert.equal(run("skMax(CH.duncan, 'passive')"),7,'Duncan special skill ownership unchanged');
 assert.equal(run("skLv({sk:{basic:6}},'basic')"),6);
 assert.equal(run("skLv({sk:{}},'special')"),1);
 assert.equal(run("phaseOf(0.8)"),1);
 assert.equal(run("phaseOf(0.1)"),4);
 return {
  CHsize:run("Object.keys(CH).length"),
  worm:JSON.parse(run("JSON.stringify(CH.worm)")),
  ai:run("typeof aiPlan"),
  skills:run("skMax(CH.duncan, 'passive')"),
  raid:run("phaseOf(0.1)")
 };
}
let status={virtualCandidate:'boss-delete-stats-skills-first',sccFrom:[106,9],sccTo:[106,6],
 candidateESMExact:true,checks:[],runtimeGo:false,sourceChanged:false};
try{
 const baselinePath=makeGame('baseline',await build(new Map()));
 const candidatePath=makeGame('candidate',await build(overrides));
 const original=validateBoot(baselinePath);
 status.checks.push({check:'baseline-boot',status:'PASS'});
 try{
  const candidate=validateBoot(candidatePath);
  assert.deepEqual(candidate,original,'cold boot output must equal unchanged baseline');
  status.checks.push({check:'candidate-boot-and-worm-skills-raid',status:'PASS'});
  for(const script of ['tests/golden/battles.mjs','tests/golden/meta.mjs',
   'tests/golden/saves.mjs','tests/arch01c3b3-conquest-selectors.mjs']){
   try{
    const output=execFileSync(process.execPath,[script,candidatePath],{
      cwd:DEV,encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024
    });
    status.checks.push({check:script,status:'PASS',detail:output.trim().slice(-300)});
    console.log('ARCH-01C4a GOLDEN '+JSON.stringify(status.checks.at(-1)));
   }catch(e){
    status.checks.push({check:script,status:'NO-GO',error:String(e.stderr||e.message).slice(0,1000)});
    break;
   }
  }
  status.runtimeGo=status.checks.every(x=>x.status==='PASS');
 }catch(e){
  status.checks.push({check:'candidate-boot-and-worm-skills-raid',status:'NO-GO',error:String(e.stack||e).slice(0,1400)});
 }
 console.log('ARCH-01C4a RUNTIME '+JSON.stringify(status));
}finally{
 fs.rmSync(temp,{recursive:true,force:true});
}
console.log('ARCH-01C4a Stage A runtime analysis completed; no production code, saved data, SPLIT or golden modified.');
