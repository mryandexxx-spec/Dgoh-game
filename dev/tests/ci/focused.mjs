import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classify, systemsForPaths, validatePlan, JOBS } from '../../tools/ci-policy.mjs';
import { commandsFor, runFocused, CASES } from '../../tools/ci-focused.mjs';
import { checkGate } from '../../tools/ci-gate.mjs';

function focus(path) {
  const plan=classify(Array.isArray(path)?path:[path],{focused:true});
  assert.equal(plan.mode,'focused');
  assert.deepEqual(validatePlan(plan),plan);
  assert.deepEqual(plan.coverage,plan.groups);
  assert.ok(plan.groups.includes('build') && plan.groups.includes('golden') && plan.groups.includes('pwa'));
  assert.ok(!plan.groups.includes('perf'));
  assert.ok(!plan.groups.includes('arena-ab'));
  return plan;
}
const coverage={
  ci:['.github/workflows/validate-pwa.yml','dev/tools/ci-policy.mjs'],
  pwa:['dev/src/pwa/sw.js','sw.js'],
  storage:['dev/src/core/store.js','dev/src/boot.js'],
  clock:['dev/src/core/gameclock.js'],
  economy:['dev/src/logic/economy.js','dev/tests/ci/econ01-energy-acceptance.mjs'],
  daily:['dev/src/logic/daily.js'],
  battle:['dev/src/logic/battle/engine.js','dev/src/logic/rewards.js'],
  conquest:['dev/src/logic/conquest.js','dev/tests/ci/arch02d-b4b1b-archive-pressure.mjs'],
  progression:['dev/src/logic/recycler.js','dev/src/logic/gear-crafting.js'],
  content:['dev/src/data/heroes.js','dev/src/data/campaigns.js'],
  ui:['dev/src/ui/common.js','dev/src/styles/game.css','dev/assets/img/water-literjon.webp','dev/tests/ci/ui01-water-literjon-acceptance.mjs'],
  render3d:['dev/src/render3d/quality.js','dev/assets/models/hero.glb'],
};
for(const [system,paths] of Object.entries(coverage)){
  for(const path of paths){
    const sy=systemsForPaths([path]);
    assert.ok(sy.includes(system),path+' must select '+system);
    const plan=classify([path],{focused:true});
    if(plan.scope==='focused'){
      const commands=commandsFor(plan);
      assert.ok(commands.some(([f])=>f.includes('mandatory-boot')),path+' requires startup');
      assert.equal(commands.length,new Set(commands.map(JSON.stringify)).size,path+' duplicate tests');
    }
  }
}
assert.equal(classify(['dev/src/ui/common.js'],{verifiedUiCopy:true,focused:true}).mode,'ui-copy');
assert.equal(classify(['dev/src/logic/daily.js'],{focused:true}).mode,'focused');
assert.equal(classify(['dev/version.json'],{focused:true}).mode,'focused');
assert.deepEqual(classify(['dev/version.json'],{focused:true}).systems,['pwa']);
assert.deepEqual(classify(['dev/src/pwa/sw.js'],{focused:true}).systems,['pwa']);
assert.deepEqual(classify(['dev/src/logic/daily.js'],{focused:true}).systems,['economy','daily']);
assert.equal(classify(['dev/docs/roadmap.md'],{focused:true}).mode,'docs');
for(const path of ['unknown.txt','dev/src/game.js','dev/src/random-unsafe-area/file.js'])
  assert.throws(()=>classify([path],{focused:true}),/No safe CI subsystem mapping/);
const mixed=focus(['dev/src/logic/conquest.js','dev/src/render3d/quality.js']);
assert.ok(mixed.systems.includes('conquest') && mixed.systems.includes('render3d'));
assert.ok(mixed.groups.includes('three-d') && mixed.groups.includes('three-d-desktop'));
assert.deepEqual(mixed.groups.filter(x=>!['build','golden','pwa','three-d','three-d-desktop'].includes(x)),[]);
const storage=focus('dev/src/core/store.js');
const commands=commandsFor(storage);
assert.ok(commands.some(([p])=>p.includes('storage-acceptance')));
const run=[];
assert.equal(runFocused(storage,(p,args)=>run.push([p,args])),commands.length);
assert.deepEqual(run,commands);
for(const patch of [{systems:['ui']},{paths:['unknown']},{groups:['build']},{coverage:['build']}])
  assert.throws(()=>commandsFor({...storage,...patch}));
assert.throws(()=>commandsFor(classify(['dev/src/ui/common.js'])));

function needs(plan){
 return {plan:{result:'success',outputs:{decision:JSON.stringify(plan)}},
 'arch-strict':{result:'success'},
 ...Object.fromEntries(JOBS.map(k=>[k,{result:plan.groups.includes(k)?'success':'skipped'}]))};
}
assert.equal(checkGate(needs(storage)).mode,'focused');
const bad=needs(storage);bad.golden.result='skipped';
assert.throws(()=>checkGate(bad),/golden/);
const skipped=needs(mixed);skipped['three-d'].result='skipped';
assert.throws(()=>checkGate(skipped),/three-d/);

const workflow=fs.readFileSync(new URL('../../../.github/workflows/validate-pwa.yml',import.meta.url),'utf8');
const fast=fs.readFileSync(new URL('../../../.github/workflows/arch02c-b3-fast-acceptance.yml',import.meta.url),'utf8');
const fastTriggers=fast.split('\npermissions:')[0];
assert.match(fastTriggers,/on:\n  workflow_dispatch:/);
assert.doesNotMatch(fastTriggers,/pull_request:/);
assert.match(workflow,/full_regression:/);
assert.match(workflow,/node tools\/ci-focused\.mjs/);
assert.match(workflow,/scope == 'focused' \|\| needs.plan.outputs.scope == 'ui-copy'|scope == 'ui-copy' \|\| needs.plan.outputs.scope == 'focused'/);
assert.match(workflow,/scope == 'focused' && contains\(needs.plan.outputs.decision, '"storage"'\)/);
assert.match(workflow,/node tests\/smoke\/sw\.mjs \.\. dist\/pwa/);
assert.match(workflow,/node dev\/tools\/ci-gate\.mjs/);
assert.match(workflow,/node tools\/ci-artifact\.mjs rehearse/);
assert.match(workflow,/github.event_name == 'workflow_dispatch' && inputs.publish == true/);
const build=workflow.split('\n  build:\n')[1].split('\n  golden:\n')[0];
const legacyHeavy=build.match(/- if: \$\{\{[^\n]*scope != 'focused'[^\n]*\}\}/g)||[];
assert.ok(legacyHeavy.length>=65,'all legacy heavy build suites must be disabled on focused PRs');
assert.equal(commandsFor(focus('dev/src/ui/common.js')).some(([path])=>path.endsWith('tests/run.mjs')),false);
console.log('PASS CI-OPT-03 focused policy, touched-system matrix, smoke, fail closed, manual full, immutable gate and native-only storage.');
