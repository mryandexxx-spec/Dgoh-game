# ARCH-01C1a — MAX_GEAR single-edge cleanup (Draft)

Date: 2026-11-16. Base source: main 383ba5b5146dba7796aee86469ae1eea4a37c742, published v125. Related: [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [C0 Draft #134](https://github.com/mryandexxx-spec/Dgoh-game/pull/134).

## Scope (only ONE reverse import is removed)

- New pure data module dev/src/data/gear-cap.js defines **MAX_GEAR = 13**, exporting the value.
- data/journeys.js changes only its MAX_GEAR import from logic/economy.js to data/gear-cap.js; all eligibility functions, 11-hero thresholds, 7-star and gear XIII requirements, relics, tier normalization, unlocked-legend grandfather rule, encounters and save behavior stay identical.
- logic/economy.js retains the original side-effect predecessor import of data/journeys.js, consumes the same shared constant, and **re-exports MAX_GEAR through the unchanged public named export list**. No economic formula, price, reward or energy parameter changes.
- Temporary AST baseline removes only data/journeys.js → logic/economy.js: **17 → 16**. No new or stale violations.
- One new pure module added to tools/split.config.mjs. The exact relative order of ALL prior 161 module markers must survive (the old 159 FNV hash is still checked by existing tests); expected marker count is **162**, with one intentional new module and no other reorder.
- New tests/ci/arch01c1a-gear-cap.mjs checks value 13, pure data import, named API, historical predecessor, eligibility and grandfathering source, graph module/SCC counts, exact one-edge baseline shrink and order marker count. It is called from existing architecture CI tests, without weakening any workflows.

## Rationale

The in-memory production-option virtual esbuild probe on C0 [run #43872889541](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43872889541) preserved all 161 original module markers after the same planned MAX_GEAR extraction (zero moved). Five other order-only deletion proposals caused reorders of 3, 58, 60, 2, and 157 old modules respectively, and are therefore **not** part of this implementation. The C0 proof is preliminary: only new PR CI establishes whether the physical implementation passes.

## Required acceptance for the actual C1a Draft PR

1. check-deps, Acorn AST import gate (16 existing, 0 new, 0 stale), ESM graph, strict check-bundle (162 total, original 161 unshifted), named export integrity, explicit no ReferenceError / TDZ.
2. All required CI checks: golden battles (200), economy/meta, saves, 41 screens on BOTH PWA and artifact; journeys, gear XIII, campaign rewards, J1/raid; offline SW, DOM UI, relevant MED/LOW WebGL and 3D lifecycle. Golden updates and reduced gates are forbidden.
3. No changes to game sources except the two import/constant lines and one pure data module; no modifications to Campaign 2.0 (21 maps and 210 missions), gameplay, progression, economy, rewards, save schema or data, art, published PWA or dev/version.json.
4. **DO NOT CHANGE THE CAMP** (UI, 3D, buttons, zonal navigation, placement, styling). Physical iPhone/Safari v125 testing remains unconfirmed.
5. Separate owner instructions required for merge and another for publishing. This diagnostic/implementation Draft PR itself authorizes neither.

After owner acceptance, the remaining 16 reverse edges continue through independently reviewed ARCH-01C1b/C2/C3a/C3b; --strict is not enabled until baseline zero.
