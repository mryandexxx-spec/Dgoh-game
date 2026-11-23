// CI-OPT-03: compiled, system-specific regression on BOTH game artifacts.
// No filename-derived exemptions: the signed CI plan was derived from the
// complete git diff by ci-plan, and the same deterministic policy is checked
// again before any test is launched.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { classify, validatePlan, systemsForPaths } from './ci-policy.mjs';

export const CASES = Object.freeze({
  ci: [],
  pwa: [],
  storage: [
    'arch02b1-storage-acceptance',
    'arch02c-b1-checkpoint-acceptance',
    'arch02c-b2-transfer-acceptance',
    'arch02c-b3-b1c-b3-mandatory-boot-acceptance',
  ],
  clock: [
    'arch02d-b2-gameclock-daily-acceptance',
    'arch02d-b3-regen-clock-acceptance',
    'arch02d-b4-offline-clock-characterization',
  ],
  economy: ['econ01-energy-acceptance','econ01-daily-acceptance'],
  daily: ['arch02c-b5a-daily-claims-acceptance','arch02c-b5b-login-calendar-acceptance'],
  battle: [
    'arch02c-b4-b1-battle-commit-acceptance',
    'arch02c-b4-b2-entry-checkpoint-acceptance',
    'arch02c-b4-b3-reward-checkpoint-acceptance',
  ],
  conquest: [
    'arch02c-b4-b4a-conquest-claims-acceptance',
    'arch02c-b4-b4b1-conquest-disks-acceptance',
    'arch02c-b4-b4b2-conquest-economy-acceptance',
    'arch02d-b4b1-conquest-week-retention',
    'arch02d-b4b1b-archive-pressure',
  ],
  progression: [
    'arch02c-b6a-market-recycler-acceptance',
    'arch02c-b6b-upgrade-crafting-acceptance',
    'arch02c-b6c-feat-raid-acceptance',
  ],
  content: [],
  ui: [],
  render3d: [],
});
export const CONTENT_CASES = ['tests/arch01c2a-energy.mjs','tests/arch01c2b-node-open.mjs','tests/arch01c2c-nodes-digest.mjs'];
const ARTIFACTS = ['dist/pwa/index.html','dist/artifact.html'];

export function commandsFor(plan) {
  if(!plan || plan.mode!=='focused' || plan.scope!=='focused')throw Error('Not a focused CI plan');
  validatePlan(plan);
  const expected=classify(plan.paths,{focused:true});
  if(expected.scope!=='focused' || JSON.stringify(expected.groups)!==JSON.stringify(plan.groups) ||
     JSON.stringify(systemsForPaths(plan.paths))!==JSON.stringify(plan.systems))
    throw Error('Focused plan differs from actual path policy');
  const commands=[];
  const add=(file,args=[])=>{
    const key=JSON.stringify([file,args]);
    if(!commands.some(c=>JSON.stringify(c)===key))commands.push([file,args]);
  };
  // A short real compiled startup is mandatory even for CI-only source changes.
  for(const artifact of ARTIFACTS)
    add('tests/ci/arch02c-b3-b1c-b3-mandatory-boot-acceptance.mjs',[artifact]);
  for(const system of plan.systems) {
    if(!Object.prototype.hasOwnProperty.call(CASES,system))throw Error('No test contract for '+system);
    for(const test of CASES[system])for(const artifact of ARTIFACTS)
      add('tests/ci/'+test+'.mjs',[artifact]);
    if(system==='content')for(const file of CONTENT_CASES)for(const artifact of ARTIFACTS)add(file,[artifact]);
  }
  return commands;
}
export function runFocused(plan, runner=(file,args)=>execFileSync(process.execPath,[file,...args],{stdio:'inherit',env:process.env})) {
  const commands=commandsFor(plan);
  console.log('Focused systems:',plan.systems.join(', '),'—',commands.length,'compiled checks; no full regression');
  for(const [file,args] of commands)runner(file,args);
  return commands.length;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  if(!process.env.CI_PLAN)throw Error('Missing signed CI planning output');
  runFocused(JSON.parse(process.env.CI_PLAN));
}
