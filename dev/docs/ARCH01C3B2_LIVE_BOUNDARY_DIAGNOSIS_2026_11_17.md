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
3. **Preferred: move only byte-identical cqBump into existing logic/conquest.js, retarget its two existing named consumers in logic and ui/views/conq.js:** three placements; the data file drops NOTES/S. Retain the same globally named cqBump symbol and precisely 898 public names, but transfer its module export owner data→logic (all internal named importers are rewired). A path-specific external importer of data/cqBump would need migration; this is not an invisible per-module API-preserving change. Candidate for separately authorized Stage B1 only.
4. **Add notification via a mutable cq.notifyFeats function-property side channel:** two placements, aiming at exact export count. Treat as a design/TDZ NO-GO even if markers match, due to a new mutable top-level initialization interface.
5. **Move cqK/cqModD/cqScore/cqBump to logic and retarget existing Conquest UI imports:** three placements; removes old data symbols/API and potentially reshapes the 106-module SCC. Requires independent review, not automatic approval even at 167 marker equality.

For each, strict eligibility requires moved=0, missing=[], extra=[], same two SCC members, no new graph edge or modules, and exact per-module 898 export list. A virtual pass is *necessary, not sufficient*: it does not verify in-browser TDZ, notifications, save migration, week rollover or purchases.

## Proposed implementation gate (no implementation here)

Only proceed in a separate Stage B Draft if this read-only proof identifies an ownership change that preserves the old module API and bootstrap ordering. Stage B requires actual PWA+artifact tests for freshly initialized and imported save, local week reset and late week switch, feats and boss points (once only), same NOTES queue/id count, cqScore/cqK/multiplier, energy refill cost/day rollover/limit, persist, route unlock and reward track, unchanged immutable SHA/golden, offline PWA, phone DOM and WebGL MED/LOW/HIGH. Real Safari/iPhone v130 acceptance is still open.

**Other NO-GO blocks remain:** Conquest data→ui/celebrate (35/35 virtual variants reordered, best 47 moves; direct removal 162) and story→assets/models (39/39 reorder and risk b3Pre(loadAssets3)). Camp completely protected; Campaign 2.0 21 maps and 210 missions protected. No SPLIT, baseline, economy, UI, assets, golden, 3D, version, save schema or root published PWA edits.

## Outcome

### Confirmed virtual build evidence (read from GitHub Actions job output)

**Latest executed matrix:** [mandatory Actions run #44058961880](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44058961880), feature source head ee333271fce416551a6b7d82665859570246861d, build job 133955949697 **SUCCESS**. The real production esbuild virtual matrix executed **12/12 scenarios** without touching game sources.

**Exact invariants:** 173 source JS modules, 1001 static imports, six existing data→runtime violations, 167/167 original ESM SPLIT markers with moved=0/missing=[]/extra=[] **for all 12 scenarios**. Both SCCs have identical member lists and sizes **106 / 9**; zero new imports/modules/cycles in every simulation. Frozen public SPLIT export count **898**, full AST export corpus 947. The production build and check-bundle were independently SUCCESS; existing PWA and artifact Conquest refill/feat/NOTES checks also SUCCESS. These are structural and existing-game confirmations, **not virtual-candidate runtime TDZ tests**.

| Virtual family | Count / 167/167 ESM | Existing SCC | API effect | Verdict |
| --- | --- | --- | --- | --- |
| Remove state import, leave NOTES unresolved | 1/1 exact | Unchanged | 898 names, **but ReferenceError on feat** | **NO-GO** |
| Move cqBump to logic, re-export through old data symbol | 3/3 exact | Unchanged | **899** named exports (adds logic:cqBump) | **NO-GO** under strict 898 |
| Move only cqBump and retarget existing consumers (state-move-0/1/2) | **3/3 exact** | Unchanged | **898** global named exports; old data export migrated to existing logic module, no added names | **VIRTUAL GO**, implementation pending |
| Mutate cq.notifyFeats as hidden notification port | 2/2 exact | Unchanged | 898 count, same module names; new top-level mutable side-channel | **DESIGN NO-GO** (TDZ/ownership) |
| Rehome four live selectors into logic | 3/3 exact | Unchanged | 898 total, four existing data module symbols change owner | **DEFER**: broad API/save/multiplier surface |

**Chosen candidate: state-move-0 (or equivalent insertion slot).** Remove precisely ONE reverse edge data/conquest-data.js → core/state.js; leave existing data→logic/conquest.js and blocked data→ui/overlays/celebrate.js. This is **virtual implementation GO** only: future baseline 6→5 **after** real code, runtime proof and separate review. Preserve exact original body of cqBump; data keeps cqFeats, cqK, cqModD, cqScore, CQ_*; logic imports NOTES along its existing S import and cqFeats along its existing data import, exports cqBump in the old global name slot; UI changes the named importer owner without adding dependencies. Ensure old external module-path API is explicitly reviewed: **per-module export origin changes even though global name count is frozen**.

**Stage B1 obligatory acceptance:** on separate implementation Draft, real built PWA AND artifact must check fresh/new/imported save, S replacement, cqWeek local Monday transition and new-week state, global/local/boss feat counts and only-once pts, cqScore, original NOTES queue id/payload/order, NOTIFICATION polling and persist, refill n=0..20 and rollover, route/trophy/chest unlocks, exact 167 module order / 898 names, six→five ledger no new/stale, same two SCC, full golden/offline/WebGL MED/LOW/HIGH/3D lifecycle/camp protect checks. No source implementation in current PR. Physical Safari/iPhone acceptance of v130 still open.

**Stage A decision: GO (virtual-only, narrow cqBump ownership move), NO-GO for naive state import deletion / 899-export bridge / mutable cq notifier.** Broader four-selector move is architecturally plausible but must be separately staged. C3b0 celebrate and C2d story/models remain blocked. Do not merge or publish Stage A.

