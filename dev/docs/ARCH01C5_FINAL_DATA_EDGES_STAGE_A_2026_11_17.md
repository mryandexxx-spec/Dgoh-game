# ARCH-01C5 Stage A — two final data→runtime predecessors (2026-11-17)

Source of truth: [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132); frozen base `main=b3d65303130dbd385caaac299f1f2dfc0473cd8c`. v134 publicly validated via [official publish #44161378209](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44161378209) and [independent root Pages #44165643624](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44165643624), public root `a057ea05ebc115cf5deca0222a4bb5aa5164ab48`, SW `a93dcde641`; cleanup PR #174 merged. Current main validate [#44167816926 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44167816926) applies safely bounded reuse for docs-only changes. Physical Safari/iPhone field acceptance remains OPEN.

## Frozen exact baseline

- 173 source JS (GitHub recursive tree on frozen main); 1000 static imports; 167 exact historical `SPLIT` ESM markers, 898 public global export names; two SCCs [106,6]; 2 forbidden data imports, no introduced/stale ledger entries. These are strict observed source contracts, not targets to be rewritten to pass.
- `data/conquest-data.js → ui/overlays/celebrate.js`: exact order-only import, first declaration in Conquest data. `celebrate.js` imports UI reward tiles, notifications, story biographies, 2D figures, combat/stats, plus defines `CELEB` and queue handlers; Conquest data uses **no UI value**. Live conquest selectors, refill, feat notifications, persistence and named APIs were already moved/verified in prior released C3b packages and are not part of this stage.
- `data/story.js → assets/models.js`: exact order-only import; Story exports `STORY,BIOS`, imports no used value from models. Models imports `render3d/scenes/baker.js` first; baker imports protected camp and models' named exports; `assets/models.js` initializes `MODEL_DATA`, asset map and `b3Pre(loadAssets3)` top-level hook. Early 3D initialization and possible cyclic TDZ must not be moved unproven.
- Explicit root `boot.js` first imports `data/gear-cap.js → logic/cinematic-preference.js → logic/battle/ai.js → ui/views/conq.js`, the ARCH-01C4c B1 proven predecessor chain.
- Frozen real SPLIT positional facts: `assets/models.js` #52 (0-based), `data/story.js` #53; `ui/overlays/celebrate.js` #162, `data/conquest-data.js` #163, `logic/conquest.js` #164, `ui/views/conq.js` #165, `boot.js` #166.

## Why earlier NO-GO still binds

**Story C2d [Draft #144](https://github.com/mryandexxx-spec/Dgoh-game/pull/144), [CI #43963186676](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43963186676):** 0/39 real production esbuild virtual exact orders; remove-only 81 marker positions moved at prior 166 marker baseline; best `render2d/figures.js` insertion 77 moved, `ui/router.js` 78; root-first 161–165 moved. Presence of `b3Pre` and baker/camp model cycles forbids naive lazy-load or data re-export. Earlier `~60` was a different pre-C2d snapshot, not the final 39-case value.

**Conquest C3b0 [Draft #152](https://github.com/mryandexxx-spec/Dgoh-game/pull/152), [CI #44036071756](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44036071756):** 0/35 virtual exact orders; remove-only 162 moved, best `ui/views/conq.js:first` 47 at that baseline. Celebration is not simply removable because its **transitive ESM prerequisites** are reached before Conquest data. Both historical virtual suites were based on earlier source graphs/versions, and their results remain explicit NO-GO until a newer actual esbuild proof.

## New read-only experiment — no implementation

`dev/tests/ci/arch01c5-dual-order-probe.mjs` runs in mandatory architecture CI. It asserts frozen 173/1000/167 and exact 2-edge ledger, then builds unchanged production `src/main.js` with actual esbuild in memory, comparing all SPLIT markers. It tests 16 variants **without writing any `dev/src/` file**:
- Separate direct deletions.
- Story root slots that differ from earlier first/last experiments: after AI / after cinematic setting / before cinematic setting / before and after Conquest root entry; Story/UI celebration-local `models` imports.
- Conquest new-current-main root and UI insertion slots after the ARCH-01C4c root changes.
- Combined story+Conquest root composition, both insertion orders, and celebration-owned models plus root celebration.

For **every** candidate print exact ESM markers/movements, first mismatch, missing/extra, total static imports, actual virtual Acorn SCC member identity, forbidden data→runtime edges and architectural-go classification. A hit of `exact=true` alone does **not** prove runtime correctness. Only `virtualGo=true` with no newly forbidden layer and unchanged SCC is eligible for a new isolated Stage B1 proposal. No artificial SPLIT/golden/AST baseline edits, no speculative TDZ safety claim.

## Stage A technical decision gates

**GO for a *separately approved implementation* only after:** a valid layer-legal virtual exact candidate (all 167 markers, all 898 names, old SCC membership intact, 0 new/stale forbidden edges); explicit proof of unchanged (b3Pre) registration timing, no ESM/TDZ/early scene error and matched cold/warm real PWA+HTML VM; replacement/fresh saves, Conquest weekly reset, level/sector/boss feats, CELEB/NOTES queue and reward order, story/Campaign 210 NODES checksum, UI interactions, offline/SW, WebGL MED/LOW/HIGH phone/desktop strict lifecycle including protected camp; final complete 19-job CI and owner signoff. Even then Stage B1 is a new feature branch/Draft and not a release authorization.

**NO-GO:** no candidate preserving constraints, or any TDZ/registration/save/UI/3D/regression failure. Prefer leaving the final 2 historic debts visible over moving an illegal import to a different forbidden layer. If tests fail because the diagnostic is brittle, correct test evidence, never game/golden to fit it.

**Scope:** diagnostic-only test, mandatory architecture hook, this report. No game implementation, version increment, SPLIT, baseline, assets, golden, save, economy, Campaign 2.0/21 maps, protected camp, root PWA/SW. **No merge or publish** without the owner's separate approval.

## Results from current-head CI

PENDING: populate only from observed diagnostic PR Actions execution and exact final diagnostic HEAD; do not infer GO from historical C2d/C3b0.
