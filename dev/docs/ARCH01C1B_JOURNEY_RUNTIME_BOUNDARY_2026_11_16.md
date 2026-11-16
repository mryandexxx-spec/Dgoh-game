# ARCH-01C1b — Journey state/progression isolation; legacy UI untouched

**Base:** post-C1a main commit 9336e67e6f344fdcd17bd608815bec6caa9a7706. **Date:** 2026-11-16. Related: [ARCH-01C #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [C1a merged PR #135](https://github.com/mryandexxx-spec/Dgoh-game/pull/135), [C0 diagnostic #134](https://github.com/mryandexxx-spec/Dgoh-game/pull/134).

## Why C1b needs an explicit compatibility port

The camp is **owner-locked**: dev/src/ui/views/lobby.js, styles, 3D, buttons, navigation and interactions must not change. But lobby.js directly imports JOURNEYS, JP, JR and jReady from data/journeys.js. A simplistic move that rewires the lobby import is forbidden. The same old interface is used by legend.js, events.js, battle-ui.js and squad-select.js; their runtime behavior must not change.

Therefore **C1b uses a temporary dependency-injection compatibility port inside data/journeys.js**. The module keeps declarative tables JOURNEYS/JREQ and pure jRelic/jFoes. Its seven legacy functions jHeroOk, jGateReady, jReady, jSelectedReady, JK, JR, JP are thin delegates to exactly-once registered callbacks. They contain **no direct import of core/state or logic/progress** and never initialize or access the saved state at import time. A missing callback throws, never silently grants access.

The actual saved-state/progress rules are moved bit-for-bit to new logic/journey-gates.js, which imports data/journeys, data/gear-cap, core/state and logic/progress (permitted). The existing core/boot.js composition root registers them after its original ui/events predecessor and before the game's start() UI render. This preserves unchanged imports in lobby.js, avoids a new data→ui edge, and keeps the data boundary compliant with the import AST gate. The compatibility bridge is deliberate **temporary legacy API debt**, not a recommended new pattern for future pure data modules. It may be retired only after separate owner permission to update the camp UI import; until then it remains tested.

## Exact changes / nonchanges

- data/journeys.js removes only data→core/state and data→logic/progress (2 legacy edges), replacing seven callable bodies with bridge delegates; retains all public names and initialized tier data.
- logic/journey-gates.js holds old formulas unchanged: 11 required heroes, 7 stars, XIII gear, relic thresholds, four selected for tiers IV/V, unlock grandfather rule, JK default and JP ??= save slot.
- core/boot.js adds only explicit bootstrap import after its original predecessor; no changes to start(), saves, UI, camp or events.
- tools/arch-import-baseline.json 16→14, no new/stale; SPLIT adds only one new module marker, all older 162 (including 159 original) must retain relative order. If actual esbuild needs moving the NEW module marker, never reorder legacy entries to hide the difference.
- tests/ci/arch01c1b-journey-runtime.mjs validates import graph/registration/legacy export names; tests/arch01c1b-journey-runtime.mjs verifies real bundled PWA and artifact with deterministic VM. CI adds both builds to existing architecture/build gate. Golden and other jobs stay intact.

## Risk register and acceptance

1. ESM/TDZ: registering callbacks at module evaluation must not read S or prog, and legacy callers must never execute before registration. Require exact previous 162-marker order, no new SCC, no uncaught error.
2. Camp: **DO NOT CHANGE** dev/src/ui/views/lobby.js, dev/src/render3d/scenes/camp.js, dev/src/ui/views/camp.js, styles/lobby.css, navigation, buttons, scene or visual layout. Only the already approved compatibility interface is used from these modules.
3. Journey: preserve the old functions and all relevant outputs (11 required heroes, all five normalized tiers, relic & gear XIII thresholds, known and unknown journey keys, replay when unlocked, exactly four unique selected heroes, JP lazy save mutation). No save migrations or new keys.
4. ARCH AST: **14 forbidden, 14 existing baseline, 0 new/stale**. Build/check-bundle: 163 modules, original 162 in identical relative order, all named exports still present. Use existing full golden battles/meta/saves/41 screens on PWA and artifact; full mobile/desktop WebGL, offline/SW, DOM and J1 smoke remain required.
5. No dev/version.json bump, new gameplay, Campaign 2.0, economy, balance, rewards, UI changes, or published PWA. Physical Safari iPhone acceptance of v125 still outstanding. Merge/release require explicit separate owner approval.

## Handoff

When CI reports outcomes, attach the measured AST/SCC, actual esbuild placement, test results and any failures to Issue #132 and this document. The next major packet is ARCH-01C2, only after independent acceptance of this C1b.
