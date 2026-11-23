// Positive scope rules. Any unrecognised input keeps the complete regression suite.
export const JOBS = ['build','golden','pwa','ui','ui-campaign','campaign-lifecycle','ui-heroes','ui-arena','three-d','three-d-desktop','perf','bh8-preview','bh98-procedural','md-ult1','arena-animation','arena-ab'];
export const RELEASE = ['build','golden','pwa'];
export const CAMPAIGN = [...RELEASE,'ui-campaign','campaign-lifecycle','perf'];
// Economy/daily changes still receive full compiled safety, golden and PWA
// coverage, but do not gate on unrelated WebGL, 3D or performance jobs.
export const ECONOMY = [...RELEASE];
// UI-copy is selected only after AST-backed, byte-strict diff proof in ci-ui-copy.mjs.
// This does NOT exempt whole paths or allow executable/HTML attribute edits.
export const UI_COPY = [...RELEASE];

// CI-OPT-03: every automatic source PR must have an explicit subsystem owner.
// This is deliberately independent of ui-copy's strict AST/byte proof.
// Unknown input is BLOCKED, never silently considered UI or sent to a giant
// automatic full regression.
const FOCUSED_ORDER = ['ci','pwa','storage','clock','economy','daily','battle','conquest','progression','content','ui','render3d'];
export function systemsForPaths(paths) {
  const found=new Set();
  const add=(...items)=>items.forEach(x=>found.add(x));
  for(const p of paths) {
    if(isDoc(p)||p==='dev/version.json')continue;
    if (/^\.github\/workflows\/.+\.ya?ml$/.test(p) ||
        /^dev\/(?:tools\/|tests\/lib\/|tests\/ci\/(?:selection|proof|resource-growth|ui-copy-proof)\.mjs$|package(?:-lock)?\.json$)/.test(p)) {add('ci');continue;}
    if (/^(?:sw\.js|dev\/src\/(?:pwa\/|index\.html$))/.test(p)) {add('pwa');continue;}
    if (p==='dev/src/core/format.js') {add('ui','economy');continue;}
    if (/^dev\/src\/(?:boot\.js|main\.js|core\/)/.test(p)) {add('storage','clock');continue;}
    if (/^dev\/src\/logic\/(?:economy|daily)\.js$/.test(p)) {add('economy','daily');continue;}
    if (/^dev\/src\/ui\/views\/conquest/.test(p)) {add('conquest','ui');continue;}
    if (/^dev\/src\/ui\/views\/daily/.test(p)) {add('economy','daily','ui');continue;}
    if (/^dev\/src\/ui\/(?:hero-window|craft|recycler-screen|skill-window|hero-card|reward-tiles|rewards)\.js$/.test(p)) {add('progression','ui');continue;}
    if (/^dev\/src\/logic\/(?:conquest|trials|journey-gates)\.js$/.test(p)) {add('conquest');continue;}
    if (/^dev\/src\/ui\/battle\//.test(p)) {add('battle','ui');continue;}
    if (/^dev\/src\/logic\/(?:battle\/|baron-bh9-battle|bh94-story-battle|rewards|campaign-gates|campaign-map)/.test(p)) {add('battle');continue;}
    if (/^dev\/src\/logic\//.test(p)) {add('progression');continue;}
    if (/^dev\/src\/data\//.test(p)) {
      add('content');
      if(/(?:hero|ability|battle|enemy|skill|kit)/.test(p))add('battle');
      continue;
    }
    if (/^dev\/assets\/(?:img|icons|ui|font)\//.test(p) ||
        /^dev\/src\/assets\/(?:img|icons|ui)\//.test(p)) {add('ui');continue;}
    if (/^dev\/src\/(?:render3d\/|assets\/)/.test(p) || /^dev\/assets(?:-src)?\//.test(p)) {add('render3d');continue;}
    if (/^dev\/src\/(?:ui\/|render2d\/|styles\/)/.test(p)) {add('ui');continue;}
    if (/^dev\/tests\/ci\/(?:econ01-|arch02c-b5a-)/.test(p) ||
        /^dev\/tests\/economy\//.test(p)) {add('economy','daily');continue;}
    if (/^dev\/tests\/ci\/arch02c-b4-b4/.test(p) ||
        /^dev\/tests\/ci\/arch02d-b(?:1-|4b)/.test(p)) {add('conquest');continue;}
    if (/^dev\/tests\/ci\/arch02c-b4-/.test(p)) {add('battle');continue;}
    if (/^dev\/tests\/ci\/arch02d-/.test(p)) {add('clock','storage');continue;}
    if (/^dev\/tests\/ci\/arch02(?:b|c-b[123])/.test(p)) {add('storage');continue;}
    if (/^dev\/tests\/ci\/arch02c-b[56]/.test(p)) {add('progression');continue;}
    if (/^dev\/tests\/smoke\/(?:3d|ab|perf|baron|muad|young-baron|bh9|md-ult1|arena-animation)/.test(p)) {add('render3d');continue;}
    if (/^dev\/tests\/smoke\/sw\.mjs$/.test(p)) {add('pwa');continue;}
    if (/^dev\/tests\/(?:golden\/|dom\/|smoke\/|ci\/(?:ui-copy-dom-smoke|ui01-|hud01-|ui02-))/.test(p)) {add('ui');continue;}
    if (/^dev\/tests\//.test(p)) {add('ci');continue;}
    throw Error('No safe CI subsystem mapping for: '+p);
  }
  if(!found.size && paths.length && paths.every(p=>isDoc(p)||p==='dev/version.json'))add('pwa');
  if(!found.size)throw Error('No subsystem selected for a source change');
  return FOCUSED_ORDER.filter(x=>found.has(x));
}


// CI-OPT-04: explicit UI browser-test ownership. Unknown/shared UI paths
// conservatively run every existing UI acceptance. Pure HUD assets/styles
// are already covered by the compiled HUD-01 Chromium test in ci-focused.
// Classify the ENTIRE diff, never an individual filename in isolation.
export const UI_BROWSER_CASES = Object.freeze(['gear','recycler','item']);
const UI_HUD_ONLY = new Set([
  'dev/src/styles/hud-resources.css',
  'dev/assets/font/inter-variable.woff2',
  'dev/tests/ci/hud01-resource-acceptance.mjs',
]);
const UI_GEAR_ONLY = new Set([
  'dev/src/ui/craft.js',
  'dev/src/ui/hero-window.js',
  'dev/tests/smoke/gear-e3-dom.mjs',
]);
const UI_RECYCLER_ONLY = new Set([
  'dev/src/ui/recycler-screen.js',
  'dev/tests/smoke/memory-ix-dom.mjs',
]);
const UI_ITEM_ONLY = new Set([
  'dev/tests/smoke/dom.mjs',
]);
// The HUD-01 Chromium test belongs to HUD/shared UI changes, not to
// positively isolated gear, recycler, or item changes.
export function uiHudAcceptanceForPaths(paths) {
  if (!Array.isArray(paths) || !paths.length) throw Error('HUD paths required');
  return paths.some(p => {
    if (isDoc(p) || p === 'dev/version.json') return false;
    if (p.startsWith('.github/workflows/') || p.startsWith('dev/tools/') ||
        p === 'dev/tests/ci/focused.mjs' || p === 'dev/tests/ci/selection.mjs') return false;
    return !(UI_GEAR_ONLY.has(p) || UI_RECYCLER_ONLY.has(p) || UI_ITEM_ONLY.has(p));
  });
}
export function uiBrowserCasesForPaths(paths) {
  if (!Array.isArray(paths) || !paths.length) throw Error('UI diff paths required');
  const selected = new Set();
  for (const p of paths) {
    if (isDoc(p) || p === 'dev/version.json') continue;
    // CI-only changes are separately verified by the CI contract tests;
    // they do not grant a UI filename exemption in a mixed code diff.
    if (/^\.github\/workflows\/.+\.ya?ml$/.test(p) ||
        /^dev\/(?:tools\/|tests\/ci\/(?:selection|focused|proof|resource-growth|ui-copy-proof)\.mjs$)/.test(p)) continue;
    if (UI_HUD_ONLY.has(p)) continue;
    if (UI_GEAR_ONLY.has(p)) { selected.add('gear'); continue; }
    if (UI_RECYCLER_ONLY.has(p)) { selected.add('recycler'); continue; }
    if (UI_ITEM_ONLY.has(p)) { selected.add('item'); continue; }
    // Includes shared renderer, common JS, events, layouts, unknown paths:
    // the safe response is all legacy UI checks, not silently skipping any.
    return [...UI_BROWSER_CASES];
  }
  return UI_BROWSER_CASES.filter(k => selected.has(k));
}

const ECONOMY_PATHS = new Set([
  'dev/src/logic/economy.js',
  'dev/src/logic/daily.js',
  'dev/src/ui/views/daily.js',
  'dev/tests/economy/acceptance.mjs',
  'dev/tests/ci/econ01-energy-acceptance.mjs',
  'dev/tests/ci/econ01-daily-acceptance.mjs',
  'dev/tests/ci/arch02c-b5a-daily-claims-acceptance.mjs',
]);
const isEconomy = p => ECONOMY_PATHS.has(p);
export const isDoc = p => /^(?:README\.md|dev\/(?:README|ARCHITECTURE|CHANGES_STATUS)\.md)$/.test(p)
  || /^\.agents\/skills\/(?:README\.md|(?:game-ui-ux|game-feel|create-game-assets|rpg|performance-optimization|ai-behavior-trees-utility-ai|audio-design)\/SKILL\.md)$/.test(p)
  // Only approved Babylon Markdown references are docs; executable/unknown files fail closed.
  || /^\.agents\/skills\/babylonjs\/(?:SKILL\.md|references\/(?:rendering-and-assets|visual-proof)\.md)$/.test(p)
  || /^dev\/docs\/.+\.(?:md|txt|html|png|jpg|jpeg|webp|svg)$/.test(p)
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
  if(scope==='focused') {
    const systems=systemsForPaths(paths);
    const selected=new Set(RELEASE);
    // The existing browser-native safety checks live in the UI runner.
    // Select it for storage/conquest/PWA changes as well; individual steps
    // below have system-specific guards, while pure UI skips unrelated suites.
    if(systems.some(s=>['storage','conquest','pwa'].includes(s)) ||
       (systems.includes('ui') && uiBrowserCasesForPaths(paths).length))
      selected.add('ui');
    if(systems.includes('render3d')){selected.add('three-d');selected.add('three-d-desktop');}
    return JOBS.filter(k=>selected.has(k));
  }
  if(scope==='tests') {
    const code=paths.filter(p=>!isDoc(p));
    if(!code.length||code.some(p=>!testGroups(p)))throw Error('Unknown focused test dependency');
    const selected=new Set([...RELEASE,...code.flatMap(testGroups)]);
    return JOBS.filter(k=>selected.has(k));
  }
  const groups = { docs: [], release: RELEASE, pwa: RELEASE, economy: ECONOMY, 'ui-copy': UI_COPY, campaign: CAMPAIGN, full: JOBS }[scope];
  if (!groups) throw Error('Unknown CI scope: ' + scope);
  return [...groups];
}
export function classify(paths, { forceFull = false, campaignRegistry = false, verifiedUiCopy = false, focused = false } = {}) {
  const code = paths.filter(p => !isDoc(p));
  let scope = 'full';
  if (!forceFull && paths.length) {
    if (!code.length) scope = 'docs';
    else if (verifiedUiCopy && code.length === paths.length &&
             code.some(p => p !== 'dev/version.json') &&
             code.every(p => p === 'dev/version.json' || /^dev\/src\/ui\/[\w/-]+\.js$/.test(p) ||
               ['dev/src/data/campaigns.js','dev/src/logic/economy.js','dev/src/logic/rewards.js'].includes(p)))
      scope = 'ui-copy';
    else if (code.every(p => p === 'dev/version.json')) scope = 'release';
    else if (code.every(p => p === 'dev/src/pwa/sw.js' || p === 'dev/version.json')) scope = 'pwa';
    else if (code.some(isEconomy) && code.every(p => isEconomy(p) || p === 'dev/version.json')) scope = 'economy';
    else if (code.every(p => testGroups(p))) scope = 'tests';
    else if (code.every(p => isCampaign(p) || p === 'dev/version.json' || (p === 'dev/tools/split.config.mjs' && campaignRegistry))) scope = 'campaign';
  }
  // Every automatic non-doc, non-proven-copy change uses the same scoped
  // baseline. No legacy PWA/campaign/release/economy/test route may sneak
  // back into the 200-battle full Golden.
  if(focused && scope!=='docs' && scope!=='ui-copy' && !forceFull) {
    systemsForPaths(paths);
    scope='focused';
  }
  return { mode: scope, scope, ...(scope==='focused'?{systems:systemsForPaths(paths)}:{}), groups: groupsFor(scope,paths), coverage: groupsFor(scope,paths), paths, reason: 'Scope: ' + scope };
}
export function validatePlan(plan) {
  if (!plan || !['docs','release','pwa','economy','ui-copy','tests','campaign','focused','full','reuse'].includes(plan.mode)) throw Error('Missing/invalid CI mode');
  const required = groupsFor(plan.scope,plan.paths);
  if(plan.scope==='focused' && JSON.stringify(plan.systems)!==JSON.stringify(systemsForPaths(plan.paths)))throw Error('Forged focused subsystem mapping');
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
