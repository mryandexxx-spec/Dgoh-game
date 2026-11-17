# ARCH-01C5a-A2 — Conquest→celebrate: earliest import traversal, UI ownership and SCC

**Scope:** Stage A2 read-only diagnosis, **no implementation**. GitHub [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132). Frozen **v134 main `b3d65303130dbd385caaac299f1f2dfc0473cd8c`**, published root `a057ea05ebc115cf5deca0222a4bb5aa5164ab48`, SW `a93dcde641`. Source of truth: [v134 release handoff](ARCH01C4C_V134_RELEASE_HANDOFF_2026_11_17.md), [ARCH-01C5 Stage A1](https://github.com/mryandexxx-spec/Dgoh-game/pull/175) completed in Draft, code CI [#44172694461 SUCCESS 19/19 attempt 2](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44172694461), final docs CI [#44174888637 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44174888637).

## Question and rationale

After 15/17 forbidden data→runtime dependencies have been removed, the exact remaining Conquest violation is **`data/conquest-data.js → ui/overlays/celebrate.js`**; it imports no used UI values, only forces ESM execution. Stage A1 actual v134 read-only virtual deletion moved **144 of 167 ESM markers** and changed SCC `[106,6]→[105,6]`; best single `ui/views/conq.js:first` replacement still moved **47** markers. Story `data/story.js→assets/models.js` remains independent higher-risk NO-GO (old C2d 0/39 and current Stage A1 0/16; removal fragments large SCC and 3D preloader).

SCC shrink itself is not automatically a regression: in C4a `boss→skills` an **explicitly approved** SCC 9→6 change passed real PWA+artifact and golden before release. This is precedent for *analyzing*, not automatically accepting, Conquest 106→105. ESM markers and named exports remain strict until real safety evidence exists.

## New reproducible diagnostic

Mandatory `dev/tests/ci/arch01c5a-a2-conquest-dfs.mjs` (not imported into production) does:
1. Fail-closed assertions: v134 **173 modules/1000 static imports/0 dynamic/167 historical SPLIT markers/old SCC [106,6]**, exact 2-edge ledger and no missing source. It uses source Acorn import declaration order from `tools/arch-init-graph.mjs` rather than guesswork.
2. DFS from `src/main.js`, separately recording **first import-visit paths** to `data/conquest-data.js` and `ui/overlays/celebrate.js`, common ancestors and incoming dependencies, plus first-visit indices and actual SCC members. Pin actual side effects of `ui/reward-tiles.js` (`MutationObserver`), celebrate notification queue, Story→models and `b3Pre(loadAssets3)`.
3. Actual **production-equivalent esbuild** build with *all* original 167 SPLIT module markers exactly equal before any experiments.
4. In-memory-only Conquest edge removal plus broad UI-owned candidate search across **existing `ui/**` modules** and allowed explicit boot roots. For each candidate place `import '<relative ui/overlays/celebrate.js>'` first, after last, adjacent to existing named Conquest imports if present. Also test five **two-import rearrangements**: `ui/views/conq` first + named Conquest data/logic import swap, root preload, notifications promotion, router swap, celebrate reward predecessor order.
5. For every patch reconstruct actual Acorn import graph, count static imports, compare exact **SCC member identities**, forbid **all introduced `data→runtime`** edges, run production esbuild in memory, report moved/first/missing/extra, strongest valid candidates. Crucially, an ESM-perfect but SCC-changed variant is separately labeled **`conditional`**, not misreported as strict GO.

No production `src` file is written; no changes to `SPLIT`, test golden, baseline, version, save schema, graphics, `app.js`, `sw.js`, Campaign 2.0, the protected Camp, or the server/publish workflow.

## Decision gates

**Strict virtual GO** requires **0 moved/missing/extra ESM markers**, original SCC member set, architecture-legal UI ownership and no new forbidden imports. Even then, B1 needs owner's explicit acceptance plus separate real runtime PWA+HTML and CI.

**Conditional research**: If 167/167 ESM exact but SCC 106→105, identify exactly which module left the SCC and prove by code AST and in-memory instrumented VM (never modifying production sources) that all top-level state, queues, event listeners, DOM node creation, named exports and 3D readiness have identical lifecycle timing. This is only a possible next Stage A3 (not B1) until completely verified.

**NO-GO** if new matrix cannot find a strict/conditional candidate, or any candidate changes old module order without explicit owner-approved, comprehensive TDZ/runtime evidence. Never edit `SPLIT` or golden simply to make a candidate green. Preserve historical ledger as exact two forbidden edges if no safe proof.

**Future runtime B1 gate, only after separate owner approval:** cold/warm boot, actual Conquest sector/route/difficulty/weekly reset, all feats, CELEB and NOTES queue order, star-up/hero unlock celebrations, double popup protection, new/imported/replaced saves, refill n0–20 and local day rollover, 210 Campaign SHA, golden 200 battles/1560 meta/4 saves/41+ screens, PWA+standalone HTML/offline, iPhone DOM, WebGL MED/LOW/HIGH and 3D lifecycle with protected camp. No gameplay/formulas/save/visual changes authorized.

## Actual v134 diagnostics — final current code SHA and CI receipt

**Frozen base `main=b3d65303130dbd385caaac299f1f2dfc0473cd8c`; source/ledger/public PWA unchanged.** Diagnostic source head **`6af5ad5772c2d114207b9fd424ceddb32d59263d`**. The original [CI #44178892580](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44178892580) architecture/build job passed, but the workflow was subsequently **CANCELLED** automatically after correcting a diagnostic-only SCC reporter defect; it must NOT be claimed full green.

[**Final code HEAD CI #44179761265 completed SUCCESS, attempt 1, all 19 mandatory jobs + final gate SUCCESS**](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44179761265), `Publish verified PWA to GitHub Pages` intentionally SKIPPED. Actual production-equivalent **esbuild+Acorn** diagnostics ran in mandatory architecture/build job `134381364194`, SUCCESS. The mandatory v134 structural test also confirmed **173 JS / 1000 static imports / exact 167 original ESM markers / 898 exported names / SCC [106,6] / exactly 2 known forbidden data edges, 0 new/stale**. Full unchanged v134 build passes Golden, WebGL HIGH/MED/LOW, PWA+HTML checks, Campaign 210, Conquest, offline/SW, phone E3 DOM, protected Camp performance, lifecycle/resource budgets. No game code or immutable golden was altered.

**Observed first topological DFS entry path** (Acorn static-import order, first visit, not guessed from runtime stack):

`main.js → boot.js → ui/views/conq.js → logic/conquest.js → data/conquest-data.js → ui/overlays/celebrate.js`.

First visits: Conquest data `#24` and celebration `#25`. The **only UI ancestor** visited on that path *before* data is `ui/views/conq.js`; importing celebration from later UI nodes is too late to preserve the original traversal.

**Actual in-memory production esbuild matrix: 100 candidates, 0 strict GO, 0 conditional GO, 0 exact ESM**. The 100 tests include direct remove-only, sweep of legal UI-owned predecessor slots on existing UI files and allowed composition roots, plus two-import combinations targeting Conquest named import order, notifications, router and celebration reward predecessor. All preserve module presence (`missing=0, extra=0`) and create no new forbidden data→runtime edges, but **none preserves the original 167 ESM positions**:

| Candidate on v134 | Moved original ESM slots | First mismatch | SCC after removal |
| --- | ---: | --- | --- |
| Raw Conquest→celebrate deletion | **144** | #20 `data/looks.js → data/conquest-data.js` | [105,6] |
| Best `ui/views/conq.js:first` / `before-conquest` | **47** | #118 `logic/trials.js → data/conquest-data.js` | [105,6] |
| `ui:first` + swap data/logic named imports | **47** | #118 | [105,6] |
| `ui:first` + promote notifications→celebrate | **47** | #118 | [105,6] |
| `ui:first` + swap router imports | **47** | #118 | [105,6] |
| `ui:first` + defer celebrate→reward-tiles | **56** | #109 | [105,6] |

**SCC correction and actual graph identity:** removal of `data/conquest-data.js → ui/overlays/celebrate.js` leaves an old **105-member** SCC and ejects exactly **`data/conquest-data.js`** from the original 106-member component. The original diagnostic erroneously tried to find the post-removal SCC *containing Conquest data*, which no longer exists; this yielded a false 106-item expelled print. Corrected fail-closed test uses the **maximum component overlap** and asserts `expelled = ['data/conquest-data.js']` and `retained = 105`; [final CI #44179761265](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44179761265) confirms both. This was exclusively a diagnostic reporting fix, no product source or game graph mutation.

### Decision: Stage A2 NO-GO for all tested legal UI import relocation strategies

**Do not authorize Stage B1.** The data→UI edge is still present in `dev/src/data/conquest-data.js`; two historical violations still remain in baseline. The result narrows the problem: a legal UI owner exists on the first import path (`ui/views/conq.js`), but moving its early UI import causes **premature evaluation of Conquest data through transitive UI→data paths**, shifting 47 historical modules. SCC 106→105 is not itself a reason to reject a refactor forever (see independently accepted C4a 9→6), but here the **ESM order condition fails**, so no runtime equivalence has been claimed or tested for the 100 virtual candidates.

**If pursuing a separate ARCH-01C5a-A3 read-only study**, do not repeat UI import permutations. Inspect and instrument the transitive early import cut-set `celebrate → reward-tiles/notifications/squad-select/router → conquest-data`; look for an architecture-legal way to separate pure Conquest tables from runtime-sensitive UI initialization without changing protected camp, gameplay, rewards, difficulty, save schema, or the old 167-marker order. Consider runtime equivalence of *explicitly reviewed* SCC shrink only with extra full PWA+HTML cold/warm VM, TDZ, CELEB/NOTES, imported/replaced saves, weekly reset and complete offline/WebGL/golden proof; no B1 before independent owner approval.

**No merge, release, version increment or publish in Stage A2.** Physical Safari/iPhone field acceptance OPEN.
