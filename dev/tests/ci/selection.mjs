import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { classify,groupsFor,JOBS,validatePlan } from '../../tools/ci-policy.mjs';
import { inputs,inputsAt,changedPaths,campaignRegistryOnly } from '../../tools/ci-inputs.mjs';
import { planForEvent } from '../../tools/ci-plan.mjs';
import { checkGate } from '../../tools/ci-gate.mjs';

assert.equal(classify(['dev/docs/a.md','README.md']).mode,'docs');
assert.equal(classify(['dev/version.json']).mode,'release');
assert.equal(classify(['dev/src/pwa/sw.js']).mode,'pwa');
assert.equal(classify(['dev/src/render3d/scenes/campaign-map.js','dev/src/styles/campaign20.css','dev/version.json']).mode,'campaign');
assert.deepEqual(classify(['dev/tests/smoke/3d.mjs']).groups,['build','golden','pwa','three-d','three-d-desktop']);
assert.deepEqual(classify(['dev/tests/smoke/dom.mjs']).groups,['build','golden','pwa','ui','ui-arena']);
for(const paths of [[],['dev/src/render3d/engine-host.js'],['dev/src/render3d/quality.js'],['dev/src/logic/battle/engine.js'],['dev/src/assets/models.js'],['dev/assets/new.glb'],['dev/tests/lib/load.mjs'],['dev/tests/fixtures/a.json'],['.github/workflows/validate-pwa.yml'],['dev/tools/build.mjs'],['dev/package-lock.json'],['sw.js'],['unknown.md'],['dev/docs/script.js'],['dev/src/render3d/scenes/campaign-map.js','dev/src/render3d/quality.js']])assert.equal(classify(paths).mode,'full',paths.join(','));
assert.equal(classify(['README.md'],{forceFull:true}).mode,'full');
assert.equal(classify(['dev/tools/split.config.mjs']).mode,'full');
assert.equal(classify(['dev/tools/split.config.mjs','dev/src/render3d/scenes/campaign-new.js'],{campaignRegistry:true}).mode,'campaign');

function needs(plan){return {plan:{result:'success',outputs:{decision:JSON.stringify(plan)}},...Object.fromEntries(JOBS.map(k=>[k,{result:plan.groups.includes(k)?'success':'skipped'}]))};}
for(const p of [['README.md'],['dev/version.json'],['dev/src/pwa/sw.js'],['dev/src/styles/campaign20.css'],['dev/tests/smoke/dom.mjs'],['unknown']]){
 const plan=classify(p);assert.equal(checkGate(needs(plan)).mode,plan.mode);
 for(const key of JOBS){
  let n=needs(plan);delete n[key];assert.throws(()=>checkGate(n));
  for(const result of ['failure','cancelled',plan.groups.includes(key)?'skipped':'success']){n=needs(plan);n[key].result=result;assert.throws(()=>checkGate(n));}
 }
 const n=needs(plan);n.plan.result='failure';assert.throws(()=>checkGate(n));
}
assert.throws(()=>validatePlan({...classify(['unknown']),groups:['build']}));
assert.throws(()=>validatePlan({...classify(['dev/version.json']),coverage:JOBS}),'fresh release cannot certify tests it did not run');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dune-ci-selection-'));
const git=args=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(p,text)=>{fs.mkdirSync(path.dirname(path.join(dir,p)),{recursive:true});fs.writeFileSync(path.join(dir,p),text);};
const commit=()=>{git(['add','.']);git(['commit','-qm','fixture']);return git(['rev-parse','HEAD']);};
try {
 git(['init','-q']);git(['config','user.name','CI test']);git(['config','user.email','ci@example.invalid']);
 write('dev/docs/file with spaces.md','doc');write('dev/src/game.js','const game=1;');write('dev/version.json','{"v":1}');write('sw.js','baseline');
 const registry="export const SPLIT = [\n  [1, 'data/game.js'],\n];\n";write('dev/tools/split.config.mjs',registry);
 const base=commit(),key=inputs(dir);assert.deepEqual(key,inputsAt(base,dir));
 write('dev/docs/file with spaces.md','changed');const docs=commit();assert.deepEqual(inputs(dir),key);
 assert.deepEqual(changedPaths(base,docs,dir),['dev/docs/file with spaces.md']);
 assert.equal((await planForEvent('push',{before:base},docs,dir,{lookup:async()=>null})).mode,'docs');
 assert.equal((await planForEvent('workflow_dispatch',{},docs,dir)).mode,'full');
 assert.equal((await planForEvent('push',{before:'0'.repeat(40)},docs,dir,{lookup:async()=>null})).mode,'full');
 const proof={run_id:42,...key,coverage:JOBS,artifact_id:17,artifact_digest:'sha256:'+'a'.repeat(64),exact:true};
 const event={pull_request:{base:{sha:base},head:{sha:docs}}};
 // An existing code PR followed by docs must reuse an exact proven input set.
 const mode=await planForEvent('pull_request',{pull_request:{base:{sha:'f'.repeat(40)}}},docs,dir,{lookup:async()=>proof});
 assert.equal(mode.mode,'reuse');assert.equal(checkGate(needs(mode)).mode,'reuse');
 assert.throws(()=>checkGate(needs({...mode,proof:{...proof,fingerprint:'b'.repeat(64)}})));
 write('dev/version.json','{"v":2}');const version=commit(),versionKey=inputs(dir);
 assert.notEqual(versionKey.fingerprint,key.fingerprint);assert.equal(versionKey.behavior,key.behavior);
 const metadata=await planForEvent('pull_request',event,version,dir,{lookup:async()=>({...proof,exact:false})});
 // Its cumulative diff contains only docs/version, so release remains minimal.
 assert.equal(metadata.mode,'release');assert.deepEqual(metadata.groups,groupsFor('release'));
 write('dev/src/game.js','const game=2;');const code=commit();assert.notEqual(inputs(dir).behavior,key.behavior);
 const fallback=await planForEvent('push',{before:version},code,dir,{lookup:async()=>{throw Error('unavailable');}});assert.equal(fallback.mode,'full');
 // Dirty code cannot be certified using stale git blob IDs.
 write('dev/src/game.js','dirty');assert.throws(()=>inputs(dir));git(['checkout','--','dev/src/game.js']);
 write('sw.js','new baseline');commit();assert.notEqual(inputs(dir).behavior,versionKey.behavior);
 write('dev/tools/split.config.mjs',registry.replace('];',"  [2, 'render3d/scenes/campaign-new.js'],\n];"));const added=commit();assert.equal(campaignRegistryOnly(base,added,dir),true);
 write('dev/tools/split.config.mjs',registry.replace("[1, 'data/game.js']","[9, 'data/game.js']"));const changed=commit();assert.equal(campaignRegistryOnly(base,changed,dir),false);
 fs.mkdirSync(path.join(dir,'dev/src'),{recursive:true});git(['mv','dev/docs/file with spaces.md','dev/src/moved.js']);const moved=commit();assert.equal(classify(changedPaths(changed,moved,dir)).mode,'full');
 git(['mv','dev/src/moved.js','dev/docs/moved.md']);const back=commit();assert.equal(classify(changedPaths(moved,back,dir)).mode,'full');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
console.log('PASS CI scope/gate/input keys: docs-after-code, version-only behavior inheritance, mixed/unknown, registry changes, renames, dirty inputs and baseline changes.');

// GitHub inserts implicit success() unless a status-check function is present.
// A reuse run has intentionally skipped ancestors; publication must depend on
// the explicit plan/gate results, while still refusing canceled workflows.
const workflow=fs.readFileSync(new URL('../../../.github/workflows/validate-pwa.yml',import.meta.url),'utf8');
const deploy=workflow.match(/^  deploy-pages:\n[\s\S]*?^    if: \$\{\{ (.*?) \}\}$/m)?.[1];
assert.ok(deploy,'publication condition exists');
assert.match(deploy,/!\s*cancelled\(\)/,'override implicit success() for skipped ancestors');
assert.match(deploy,/needs\.plan\.result == 'success'/);
assert.match(deploy,/needs\.gate\.result == 'success'/);
const publish=Function('github','needs','cancelled','return ('+deploy+')');
const github={event_name:'push',ref:'refs/heads/main'};
const ready={plan:{result:'success',outputs:{mode:'reuse'}},gate:{result:'success'},golden:{result:'skipped'},renderer:{result:'skipped'}};
assert.equal(publish(github,ready,()=>false),true,'validated reuse may publish despite skipped ancestors');
assert.equal(publish(github,ready,()=>true),false,'canceled workflow cannot publish');
for(const mode of ['full','campaign','release','pwa','tests'])assert.equal(publish(github,{...ready,plan:{...ready.plan,outputs:{mode}}},()=>false),true);
assert.equal(publish(github,{...ready,plan:{...ready.plan,outputs:{mode:'docs'}}},()=>false),false);
for(const key of ['plan','gate'])for(const result of ['failure','cancelled','skipped'])assert.equal(publish(github,{...ready,[key]:{...ready[key],result}},()=>false),false);
assert.equal(publish({...github,event_name:'pull_request'},ready,()=>false),false);
assert.equal(publish({...github,ref:'refs/heads/feature'},ready,()=>false),false);
console.log('PASS publication condition: explicit status override, successful plan/gate, reuse skips, cancellation, docs, PR and non-main refusals.');
