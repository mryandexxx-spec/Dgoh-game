// Positive scope rules. Any unrecognised input keeps the complete regression suite.
export const JOBS = ['build','golden','pwa','ui','ui-campaign','campaign-lifecycle','ui-heroes','ui-arena','three-d','three-d-desktop','perf','bh8-preview','bh98-procedural','md-ult1','arena-animation','arena-ab'];
export const RELEASE = ['build','golden','pwa'];
export const CAMPAIGN = [...RELEASE,'ui-campaign','campaign-lifecycle','perf'];
export const isDoc = p => /^(?:README\.md|dev\/(?:README|ARCHITECTURE|CHANGES_STATUS)\.md)$/.test(p)
  || /^dev\/docs\/.+\.(?:md|html|png|jpg|jpeg|webp|svg)$/.test(p)
  || p === 'dev/docs/ci/AUDIT_EVIDENCE_2026_11_14.json';
export const isCampaign = p => /^dev\/src\/render3d\/scenes\/campaign-[\w-]+\.js$/.test(p)
  || ['dev/src/data/campaign-map-presets.js','dev/src/ui/views/campaign20.js','dev/src/styles/campaign20.css','dev/tests/smoke/campaign20.mjs','dev/tests/campaign-gestures.mjs'].includes(p);
const TEST_GROUPS = {
  'sw-install-stall.mjs':['pwa'], 'smoke/sw.mjs':['pwa'], 'smoke/core-model-stall.mjs':['pwa'], 'smoke/optional-model-boot.mjs':['pwa'],
  'smoke/gear-e3-dom.mjs':['ui'], 'smoke/memory-ix-dom.mjs':['ui'], 'smoke/dom.mjs':['ui','ui-arena'],
  'smoke/campaign20.mjs':['ui-campaign'], 'campaign-gestures.mjs':['ui-campaign'], 'smoke/campaign-lifecycle.mjs':['campaign-lifecycle'],
  'smoke/duncan-meshy-webgl.mjs':['ui-heroes'], 'smoke/duncan-meshy-arena.mjs':['ui-heroes'], 'smoke/muad-dib.mjs':['ui-heroes'], 'smoke/young-baron.mjs':['ui-heroes'],
  'smoke/pkg8-layout.mjs':['ui-arena'], 'smoke/arena-framing-preview.mjs':['ui-arena'], 'smoke/pkg9-hud.mjs':['ui-arena'],
  'smoke/3d.mjs':['three-d','three-d-desktop'], 'smoke/perf.mjs':['perf'], 'smoke/ab.mjs':['arena-ab'],
  'smoke/baron-legend-gl.mjs':['bh8-preview'], 'smoke/baron-legend-card.mjs':['bh8-preview'],
  'smoke/bh97-procedural-mobile.mjs':['bh98-procedural'], 'smoke/bh99-public-journey.mjs':['bh98-procedural'],
  'smoke/md-ult1.mjs':['md-ult1'], 'smoke/arena-animation-recovery.mjs':['arena-animation'],
};
const testGroups = p => p.startsWith('dev/tests/') ? TEST_GROUPS[p.slice(10)] : null;
export function groupsFor(scope, paths=[]) {
  if(scope==='tests') {
    const code=paths.filter(p=>!isDoc(p));
    if(!code.length||code.some(p=>!testGroups(p)))throw Error('Unknown focused test dependency');
    const selected=new Set([...RELEASE,...code.flatMap(testGroups)]);
    return JOBS.filter(k=>selected.has(k));
  }
  const groups = { docs: [], release: RELEASE, pwa: RELEASE, campaign: CAMPAIGN, full: JOBS }[scope];
  if (!groups) throw Error('Unknown CI scope: ' + scope);
  return [...groups];
}
export function classify(paths, { forceFull = false, campaignRegistry = false } = {}) {
  const code = paths.filter(p => !isDoc(p));
  let scope = 'full';
  if (!forceFull && paths.length) {
    if (!code.length) scope = 'docs';
    else if (code.every(p => p === 'dev/version.json')) scope = 'release';
    else if (code.every(p => p === 'dev/src/pwa/sw.js' || p === 'dev/version.json')) scope = 'pwa';
    else if (code.every(p => testGroups(p))) scope = 'tests';
    else if (code.every(p => isCampaign(p) || p === 'dev/version.json' || (p === 'dev/tools/split.config.mjs' && campaignRegistry))) scope = 'campaign';
  }
  return { mode: scope, scope, groups: groupsFor(scope,paths), coverage: groupsFor(scope,paths), paths, reason: 'Scope: ' + scope };
}
export function validatePlan(plan) {
  if (!plan || !['docs','release','pwa','tests','campaign','full','reuse'].includes(plan.mode)) throw Error('Missing/invalid CI mode');
  const required = groupsFor(plan.scope,plan.paths);
  const selected = plan.mode === 'reuse' ? ['build'] : groupsFor(plan.mode,plan.paths);
  if (JSON.stringify(plan.groups) !== JSON.stringify(selected)) throw Error('Invalid selected jobs');
  if (!Array.isArray(plan.coverage) || new Set(plan.coverage).size !== plan.coverage.length || plan.coverage.some(k => !JOBS.includes(k)) || required.some(k => !plan.coverage.includes(k))) throw Error('Incomplete validation coverage');
  if (plan.proof || plan.mode === 'reuse' || plan.mode !== plan.scope) {
    const p = plan.proof;
    if (!p || !Number.isSafeInteger(p.run_id) || p.run_id <= 0 || !/^[a-f0-9]{64}$/.test(plan.fingerprint || '') || p.behavior !== plan.behavior || required.some(k => !p.coverage.includes(k))) throw Error('Invalid reuse proof');
    if (JSON.stringify(plan.coverage)!==JSON.stringify(p.coverage)) throw Error('Forged inherited coverage');
    if (!Number.isSafeInteger(p.artifact_id) || p.artifact_id<=0 || !/^sha256:[a-f0-9]{64}$/.test(p.artifact_digest||'')) throw Error('Missing immutable artifact proof');
    if (plan.mode === 'reuse' && p.fingerprint !== plan.fingerprint) throw Error('Artifact inputs changed');
    if (!['reuse','release'].includes(plan.mode)) throw Error('Unsupported proof mode');
  } else if (JSON.stringify(plan.coverage)!==JSON.stringify(required) || required.some(k => !plan.groups.includes(k))) throw Error('Unproven skipped job/coverage');
  return plan;
}
