# ARCH-01C3b2 Stage A — Conquest live dependencies: AST/ESM/TDZ diagnosis

**17 November 2026 — DIAGNOSTIC ONLY.** [Tracker #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132). Starting main SHA: 45f6524c63e2a416d67063a3e0a9ac2cd32a8fd4, after docs PR #156 merged. Main CI [#44055432245 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44055432245). Published v130 remains immutable root 4297132fe9fc9deee00445f2580a6d265959c9ba, SW f97ab7c7da, official publish #44050433689 and independent Pages #44051694332. **No merge or publication is authorized.**

## Responsibility audit

**Data layer:** dev/src/data/conquest-data.js owns CQ_DIFF / CQ_SECT / CQ_DISKS / CQ_GF and pure cqFeats(s), but still incorrectly holds live cqK, cqModD, cqScore and cqBump. It imports cq from logic/conquest, NOTES and an unused S binding from core/state, and an execution-order predecessor from ui/overlays/celebrate. The sole functional state reference in data is the NOTES.push() inside cqBump. Removing this direct import without moving its effects is invalid.

**Logic layer:** dev/src/logic/conquest.js already imports S from core/state, economy/refill, feat/data definitions, RNG and progress. cq() lazily creates or migrates S.conq, resets it on the local Monday week key, and retains week-scoped routes. cqAddDisk and reward/track logic use cqBump and cqScore. The C3b1 byte-identical cqRfN/cqRfCost calculations already live in this module; do not relocate or re-price them.

**Core and UI:** core/state exports live replaceable S (set_S) and a single NOTES queue; core imports save for bootstrap order. ui/views/conq consumes both data and logic selectors, applies battle events, buys energy, invokes persist and renders feat progress. UI must not become the state/notification owner.

cqBump increments capped global and sector feat progress, sets completed fd keys once, adds feat points and enqueues one kind=cqf note per progress event using the same Math.random ID generation. cqScore = stars + pts. cqK reads cq().diff with default 1, and cqModD uses that multiplier. cqFeats is pure. No weekly reset, saved state, purchase or notification semantics can change.

## Actual in-memory production esbuild study

The test-only file dev/tests/ci/arch01c3b2-virtual-live.mjs is wired into the existing mandatory tests/ci/arch-init-graph.mjs. It uses production entry src/main.js and exact build.mjs esbuild switches: bundle, write=false, format=esm, treeShaking=false, charset=utf8, legalComments=none, target=esnext, commonjs-variable-in-esm override. Only onLoad memory overrides simulate candidate files. All dev/src, baseline, SPLIT, golden, version and PWA files are read-only.

Before trials, it asserts 173 JS modules, 167 exact historical ESM markers in SPLIT order, 898 named module exports, six old reverse edges, zero unresolved imports and two previous SCC (Conquest SCC 106). It emits full Conquest SCC membership, named consumers and AST state-reference sites. Every run prints moved/missing/extra markers, original SCC equality, introduced/deleted graph edges, added/removed exported names and exact source export count.

Virtual candidates:

1. **Delete only the state import:** negative control with unbound NOTES; cannot be implemented.
2. **Move original cqBump to logic and keep data export through the existing logic import:** three placements. Retains the old data symbol, no new graph dependency, but adds a named export in logic (expected public API count 898→899). This must fail an exact API gate even if all markers match.
3. **Add notification via a mutable cq.notifyFeats function-property side channel:** two placements, aiming at exact export count. Treat as a design/TDZ NO-GO even if markers match, due to a new mutable top-level initialization interface.
4. **Move cqK/cqModD/cqScore/cqBump to logic and retarget existing Conquest UI imports:** three placements; removes old data symbols/API and potentially reshapes the 106-module SCC. Requires independent review, not automatic approval even at 167 marker equality.

For each, strict eligibility requires moved=0, missing=[], extra=[], same two SCC members, no new graph edge or modules, and exact per-module 898 export list. A virtual pass is *necessary, not sufficient*: it does not verify in-browser TDZ, notifications, save migration, week rollover or purchases.

## Proposed implementation gate (no implementation here)

Only proceed in a separate Stage B Draft if this read-only proof identifies an ownership change that preserves the old module API and bootstrap ordering. Stage B requires actual PWA+artifact tests for freshly initialized and imported save, local week reset and late week switch, feats and boss points (once only), same NOTES queue/id count, cqScore/cqK/multiplier, energy refill cost/day rollover/limit, persist, route unlock and reward track, unchanged immutable SHA/golden, offline PWA, phone DOM and WebGL MED/LOW/HIGH. Real Safari/iPhone v130 acceptance is still open.

**Other NO-GO blocks remain:** Conquest data→ui/celebrate (35/35 virtual variants reordered, best 47 moves; direct removal 162) and story→assets/models (39/39 reorder and risk b3Pre(loadAssets3)). Camp completely protected; Campaign 2.0 21 maps and 210 missions protected. No SPLIT, baseline, economy, UI, assets, golden, 3D, version, save schema or root published PWA edits.

## Outcome

**Pending exact diagnostic CI run/results at initial commit.** Final Stage A GO/NO-GO will be appended after evidence, also to Issue #132. If there is no safe candidate, keep legacy count at 6 and investigate boss→skills or looks→battle/ai separately.
