# ARCH-01C5b-A2 — явный bootstrap 3D-ассетов, архитектурное решение (v135)
**18 ноября 2026 · Draft, только исследование; ни source implementation, ни merge, ни release не разрешены.**

## 0. Источники и несдвигаемая база
- Published `main` = `372d915fdd7f7b06fa5c3b23ce97b3a74dcf6753` (v135; independent Pages checked); A1 [Draft PR #184](https://github.com/mryandexxx-spec/Dgoh-game/pull/184) OPEN, NOT MERGED. A2 [Draft PR #185](https://github.com/mryandexxx-spec/Dgoh-game/pull/185) based directly on `main`, not on the A1 branch.
- Source truth: `dev/ARCHITECTURE.md`, `dev/docs/PROJECT_INSTRUCTIONS.md`, `dev/CHANGES_STATUS.md` § «Открыто», `dev/docs/PRODUCT_AUDIT_ROADMAP_2026_11_16.md`, Issue #132, A1 report.
- Baseline: 173 `src/*.js`, 1000 static / zero dynamic imports, SCC sizes [105,6], 167 approved ESM markers, 898 named exports. Only forbidden legacy edge: `data/story.js → assets/models.js`. A1 on v135: **57 in-memory esbuild probes; 0 exact; remove-only shifts 62 of 167; UI-router order-only shifts 59**. Historical v127 C2d numbers are not interchangeable.
- No `dev/src`, `dev/tools/split.config.mjs`, architecture ledger, `dev/version.json`, release root, `dev/CHANGES_STATUS.md`, game assets, graphical profiles, saved games or golden are changed by A2.

## 1. Real source initialization contract (from v135 source, not a proposed replacement)
```text
main.js
  └─ boot.js                            entry, static imports then top-level start(...)
      ├─ ui/views/conq.js               preceding UI chain
      └─ core/boot.js                    imports ui/events.js, UI runtime, state, etc.
           └─ start(data)               FIRST statement set_S(...); then metaFill, persist, render(), splashOff()
                                            render() can mount 3D camp → loadB3()
data/campaigns.js  ──named STORY──> data/story.js ──ORDER-ONLY──> assets/models.js
assets/models.js   ──first side-effect──> render3d/scenes/baker.js
render3d/scenes/baker.js ──first side-effect──> render3d/scenes/camp.js
camp.js/baker.js   ──named assets/models.js──> [existing cyclic ESM relationships]
models.js          ──named b3Pre──> render3d/base.js
```
The schematic is **not** a claim that the tree above is the full chronological ESM evaluation chain. The original and virtual esbuild module markers, first source-import DFS paths, incoming edges and SCC are independently emitted by `tests/ci/arch01c5b-a2-bootstrap-virtual.mjs`. In SCCs, shortest paths and source import traversal alone do not prove TDZ/evaluation order.

### Observable side effects and deadlines
1. `assets/models.js`: `const MODEL_DATA = {}` (initially empty), KTX2 data cache and two single-flight promises are initialized; `b3Pre(loadAssets3)` is called **once** at module top level. `loadAssets3` does not start fetching just because it is registered.
2. `render3d/base.js`: `const B3_PRE=[]`; `b3Pre(fn)` pushes the function; `loadB3()` snapshots `B3_PRE.map(...)` **at its first call**, then starts Babylon script asynchronously. Asset readiness has a 7000 ms deadline; Babylon script a separate 12000 ms deadline; WebGL absence returns a 2D fallback, not an engine.
3. `render3d/scenes/baker.js`: top-level `set_figureSVG(...)` and a 1200 ms timer to `bakePortraits()` (unless perf guard); `bakePortraits()` calls `loadB3()` when IndexedDB is available. `render3d/scenes/camp.js` has a top-level 400 ms `hostKick()` interval and `mountCampStage()` uses `loadB3()` during 3D first render.
4. `boot.js`: the actual top-level `start(...)` or hot-ready callback initiates the save and UI sequence. `core/boot.js` begins `start()` with `set_S`, registers UI update paths during import evaluation and calls `render()` before splash off.
5. Other initialization contracts are live: `ui/notifications.js` uses `onPersist(notePoll)`; `ui/overlays/squad-select.js` uses `rewardHooks.unlock`; `baker.js` installs the portrait renderer; `data/campaigns.js` uses `STORY` to define `S0/CAMP_DEF/NODES`. All of these must continue to be initialized before consumers use them.
6. Warm PWA and Safari differ from cold boot via SW cache, IndexedDB baked portrait state, KTX2/wasm fetches, asynchronous Babylon chunk, `loadAssets3` single-flight, `__B3` and context recovery. A changed ordering can cause a registration miss even if the app starts and screenshots initially look correct.

**Critical invariant:** exactly one 3D asset loader registration, *before the earliest possible `loadB3()`*, with `render3d/base.js` initialized; *before any `start()`-initiated render*; no TDZ read of `MODEL_DATA`, `B3_PRE`, `STORY`, `NODES` or UI hooks.

## 2. A2 virtual alternatives (not production changes)
All virtual mutations remove only the forbidden Story order-import. The registration-moving candidates also delete `b3Pre(loadAssets3)` from the in-memory variant of `assets/models.js` and place exactly one registration in a permitted non-data owner. The production module source remains unchanged.

| Scenario | Proposed non-data owner | Direction/layer | Intended registration point | Main risk |
| --- | --- | --- | --- | --- |
| N0 remove-only | none | eliminates forbidden edge | remains in models module | A1 proves 62 reordered markers; implicit timing not guaranteed |
| N1 A1 UI router import | `ui/router.js` side effect | UI→assets allowed | remains top-level models | A1 best UI candidate still shifts 59 positions; UI cycles |
| V1 explicit root | `boot.js` (composition root) | root→assets/base | top-level immediately **before start()** | changed ESM graph; models can evaluate via deep cycle before registration; must prove first load |
| V2 core composition | `core/boot.js` | core boot exception→assets/base, subject to review | module top-level after function declarations | core boot has UI/3D cyclic consumers; TDZ/hook order and cyclic early load |
| V3 UI router function wiring | `ui/router.js` | UI→assets/base allowed | UI router module body | risk of registration before initialized base/models and re-entry in huge SCC |
| V4 dedicated UI bridge | virtual `ui/bootstrap/asset-bootstrap.js`, imported by `boot.js` | root→UI→assets/base | bootstrap module body | one new module / marker; app startup cycle and SPLIT reapproval |

V1 is the **preferred architectural direction to investigate for B1** because the owner is an actual composition root, with a clear pre-`start()` registration barrier and no new module; V4 has the clearest ownership boundary but needs an additional marker and could enlarge SCC. Neither is approved without real esbuild order and executable browser proof. V2/V3 are fallback experiments, not recommendations.

### Why moving registration is safer in principle than only relocating an import
Moving a side-effect import preserves a hidden obligation ("somebody importing models must do setup first"). Explicitly invoking `b3Pre(loadAssets3)` in the app composition root documents who owns registration and creates a testable single call site. It is still **not safe solely by inspection**: module cycles can defer initialization, and any earlier `loadB3` irrevocably samples the preloader array at its first call. No new scheduler, extra Engine, parallel rAF or dynamic 3D chunk is introduced.

## 3. Read-only tests and acceptance boundaries
The A2 test is wired to the mandatory `tests/ci/arch-init-graph.mjs` suite. It enforces the original real-source 173/1000/SCC [105,6]/167 pinned ESM order/baseline 1; extracts actual first DFS dependency paths; in-memory `esbuild.build({bundle:true,format:'esm',treeShaking:false,charset:'utf8',legalComments:'none',target:'esnext'})`, matching production ordering options; checks virtual layering, SCC, missing/added ESM markers and precise order changes for six scenarios. It fails closed if real production v135 inputs drift from source contract. The only file added outside this report is the diagnostic test; the CI suite imports it.

The in-memory result **does not** execute modified app code, load real DGM/KTX2, prove Safari/IndexedDB/network deadlines, validate all TDZ accesses, or exercise EngineHost. Full CI runs existing game behavior on unchanged real sources, so its passing verifies the **diagnostic package**, not virtual B1 runtime behavior.

Before any B1 source change or any new ESM-order approval, require:
- Exact frozen **old and proposed new** 167 markers (168 if V4 used), individual moved-module list and a dedicated owner-approved controlled-migration record. Do **not** edit SPLIT or approved order during A2; no automatic acceptance of reordered names.
- AST graph and dependency gates: **no forbidden data→* edges**, no new illegal edges, SCC membership diff, fail-closed TDZ/bootstrap instrumented traces including `B3_PRE`, `MODEL_DATA`, `STORY`, `NODES`, registrations, `set_S/start`, first `loadB3` and first rendered 3D frame.
- A disposable isolated modified-artifact browser proof, cold/warm PWA/standalone/offline, 844×390 and 667×375, MED and LOW phone WebGL, 5 actual DGM/KTX2 and fallback, first-use and retry, 3 consecutive EngineHost wake/sleep/dispose cycles, Campaign 2.0 210 mission nodes, CELEB/NOTES, goldens/screens/4 saves and bundle/build/API gates.
- Physical iPhone Safari/WebKit remains **OPEN**, separately from Chromium, regardless of CI.
- No changes to protected Camp UI/scenes/navigation, Campaign 2.0, quality profiles, save schema, rewards/balance, golden or `SPLIT` for an unapproved reorder. No change to one-debt ledger before the real edge disappears.
- Only after a separately approved and proven B1 reaches baseline 0 can **ARCH-01D** propose permanent `check-deps --strict`.

## 4. Stage decision / next step
**A2 may endorse a future minimal V1 root-composition B1 only after the virtual matrix is reviewed; at this stage: NO-GO for real implementation/merge/release.** Even a zero forbidden virtual graph is not permission to touch game source or change the ESM contract.

Suggested B1 minimal reversible edit (NOT implemented): remove only Story order-only import; move exactly one `b3Pre(loadAssets3)` from models module to non-data `boot.js` composition root with necessary named imports; add single-registration and pre-`start()` runtime contracts; freeze reviewed candidate order; remove baseline entry only after verified real source elimination. If the resulting SCC or TDZ evidence is unfavorable, choose V4 or remain NO-GO.

**CI evidence completed:** [A2 run #44277463897](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44277463897) COMPLETED SUCCESS attempt 2, 19 checks + final gate. First build [#44277061081](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44277061081) failed because the diagnostic-only synthetic resolver did not resolve its two relative imports; fixed with no source change. The initial full run failed one Arena animation/HUD ~3px drift on unchanged code; targeted rerun of only that job succeeded, and final gate then succeeded. Pages publication SKIPPED. This validates the read-only A2 package, NOT candidate runtime behavior.

### Frozen read-only A2 in-memory matrix: measured on actual v135 source

| Variant | Static imports | SCC | Markers | Changed pre-existing positions | Notes |
| --- | ---: | --- | --- | ---: | --- |
| Current v135 | 1000 | [105,6] | 167 | 0 | One Story debt |
| Delete only | 999 | [60,11,6,3] | 167 | 62 | First 0-based difference #20 |
| UI router side-effect | 1000 | [60,11,6,3] | 167 | 59 | A1 reference |
| **Root boot explicit registration** | **1001** | **[60,11,6,3]** | **167** | **62** | Owner at index 166; base 54, models 71 |
| Core boot explicit registration | 1001 | [60,11,6,3] | 167 | 62 | Registration at index 146 |
| UI router explicit registration | 1001 | [60,11,6,3] | 167 | 59 | Registration at index 79 |
| Synthetic UI bootstrap | 1002 | [61,11,6,3] | 168 | 166 old positions | New module at index 166; not preferred |

For the proposed root variant, `data/story.js` advances from ESM marker 53 to 20, `render3d/base.js` moves 25→54, `assets/models.js` moves 52→71, while `boot.js` remains 166. There are **0 exact** cases and no lost original modules, no new forbidden `data→*` imports or unresolved static imports. This changes the old large SCC 105 into cyclic groups 60+11+3 with 31 previously cyclic members no longer in those components. That is a substantial TDZ/side-effect risk, not automatically safe.

**Separate, not-yet-approved architectural justification:** [Controlled ESM migration decision](ARCH01C5B_A2_CONTROLLED_ESM_MIGRATION_2026_11_18.md). It defines the minimum reversible source B1 and requirement to pin *complete* proposed old/new orders before approval. A2 deliberately did **not** modify SPLIT, the approved snapshot or the baseline.

**First real 3D route:** `core/state.js` initializes `view='lobby'`; `boot.js→start→render→renderLobby→mountCampStage→loadB3()`, with a separate `baker.js` top-level timer (1200 ms). The owner in `boot.js` would register before the synchronous `start()` call, but this is not yet demonstrated on a modified runtime artifact.  Reference: [A1 PR #184](https://github.com/mryandexxx-spec/Dgoh-game/pull/184), [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).
