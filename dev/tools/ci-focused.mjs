// CI-OPT-03: compiled, system-specific regression on BOTH game artifacts.
// No filename-derived exemptions: the signed CI plan was derived from the
// complete git diff by ci-plan, and the same deterministic policy is checked
// again before any test is launched.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { classify, validatePlan, systemsForPaths, uiHudAcceptanceForPaths } from './ci-policy.mjs';

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
  // Tiny source-level VFX contract: only run for shield-related changes,
  // not for every unrelated graphics refactor or model update.
  const shieldPaths = new Set([
    'dev/src/render3d/vfx/shield-rules.js',
    'dev/src/render3d/vfx/shield-impact.js',
    'dev/src/render3d/scenes/arena.js',
    'dev/src/render3d/babylon.js',
    'dev/tests/ci/shield-vfx-acceptance.mjs',
  ]);
  if(plan.paths.some(p=>shieldPaths.has(p)))
    add('tests/ci/shield-vfx-acceptance.mjs');
  // BATTLE-REENTRY: run tiny VM acceptance only when entry/retreat guards changed.
  // Does not expand unrelated content, economy or 3D PRs.
  const reentryPaths = new Set([
    'dev/src/ui/battle/battle-ui.js',
    'dev/src/ui/overlays/squad-select.js',
    'dev/src/ui/wiring.js',
    'dev/tests/ci/battle-reentry-acceptance.mjs',
  ]);
  if (plan.paths.some(p=>reentryPaths.has(p)))
    for(const artifact of ARTIFACTS)
      add('tests/ci/battle-reentry-acceptance.mjs',[artifact]);
  // Only HUD/shared UI changes require the HUD-specific Chromium acceptance.
  if (plan.systems.includes('ui') && uiHudAcceptanceForPaths(plan.paths))
    for (const artifact of ARTIFACTS)
      add('tests/ci/hud01-resource-acceptance.mjs',[artifact]);
  // UI-02: cover the assembled profile + HUD + existing buttons in Chromium,
  // only when its source, presentation or acceptance is touched.
  if (plan.paths.some(p=>[
    'dev/src/ui/views/lobby.js','dev/src/ui/overlays/profile.js',
    'dev/src/styles/ui02-unified-header.css','dev/src/styles/index.css',
    'dev/tests/ci/ui02-unified-header-acceptance.mjs'
  ].includes(p)))
    for (const artifact of ARTIFACTS)
      add('tests/ci/ui02-unified-header-acceptance.mjs',[artifact]);
  // UI-03e: mandatory real raster + fallback check only when daily art or its
  // two source files are touched. No broad 3D test suite for 2D props.
  if (plan.paths.some(p => [
    'dev/src/ui/views/daily.js', 'dev/src/ui/calendar-icons.js',
    'dev/src/styles/ui03-daily-calendar.css',
    'dev/assets/img/choam-supply-closed.webp',
    'dev/assets/img/choam-supply-opened.webp',
    'dev/tests/ci/ui03-choam-art-acceptance.mjs',
  ].includes(p)))
    add('tests/ci/ui03-choam-art-acceptance.mjs');
  // UI-04: verify the same hashed Solari artwork in both production formats.
  if (plan.paths.some(p => [
    'dev/assets/img/solari-stack.webp', 'dev/src/core/format.js',
    'dev/src/ui/calendar-icons.js','dev/tests/ci/ui04-solari-asset-acceptance.mjs',
    'dev/tools/build.mjs',
  ].includes(p))) for (const artifact of ARTIFACTS)
    add('tests/ci/ui04-solari-asset-acceptance.mjs',[artifact]);
  // UI-01: run the actual Water WebP compiled-artifact contract only when
  // relevant source, asset, or its own acceptance was changed.
  const waterFiles = new Set([
    'dev/assets/img/water-literjon.webp',
    'dev/assets/img/candle-glowglobe.webp',
    'dev/tests/ci/ui01-candle-glowglobe-acceptance.mjs',
    'dev/src/core/format.js',
    'dev/tests/ci/ui01-water-literjon-acceptance.mjs',
  ]);
  if(plan.paths.some(p=>waterFiles.has(p)))
    for(const artifact of ARTIFACTS)
      add('tests/ci/ui01-water-literjon-acceptance.mjs',[artifact]);
  if(plan.paths.some(p=>['dev/assets/img/candle-glowglobe.webp', 'dev/tests/ci/ui01-candle-glowglobe-acceptance.mjs', 'dev/src/core/format.js', 'dev/tools/build.mjs'].includes(p)))
    for(const artifact of ARTIFACTS)
      add('tests/ci/ui01-candle-glowglobe-acceptance.mjs',[artifact]);
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
