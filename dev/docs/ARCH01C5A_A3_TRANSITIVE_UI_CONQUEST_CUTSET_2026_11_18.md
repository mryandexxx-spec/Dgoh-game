# ARCH-01C5a-A3 — транзитивные циклы UI → Conquest, graph-cut и lifecycle

**Scope:** Stage A3 independent read-only architectural research. Do **not** change gameplay or propose implementation B1 until an explicit separate owner acceptance. Repository `mryandexxx-spec/Dgoh-game`, frozen main commit **`b3d65303130dbd385caaac299f1f2dfc0473cd8c`**, published **v134** root `a057ea05ebc115cf5deca0222a4bb5aa5164ab48`, SW `a93dcde641`. Required context: [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [A1 Draft #175](https://github.com/mryandexxx-spec/Dgoh-game/pull/175), [A2 Draft #176](https://github.com/mryandexxx-spec/Dgoh-game/pull/176), [A2 report](https://github.com/mryandexxx-spec/Dgoh-game/blob/audit/arch01c5a-a2-conquest-dfs-virtual-20261118/dev/docs/ARCH01C5A_A2_CONQUEST_DFS_STAGE_A_2026_11_18.md). A2 [full CI #44179761265 SUCCESS 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44179761265), final documentation-only [#44182814565 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44182814565). Neither PR merged.

## Frozen fact pattern

- **Two** forbidden `data→runtime` dependencies persist, zero new/stale: `data/conquest-data.js → ui/overlays/celebrate.js` (order-only) and `data/story.js → assets/models.js` (order-only).
- ESM/Acorn invariant: **173 JS, 1000 static imports, 167 original ESM markers, 898 exported names, SCC [106,6]**.
- First static-import DFS reaches Conquest via `main.js → boot.js → ui/views/conq.js → logic/conquest.js → data/conquest-data.js → ui/overlays/celebrate.js`. First visits #24 and #25. This DFS is **not** a runtime event trace; esbuild marker evaluation order is independently checked.
- A2 real esbuild **0/100 exact**; its best UI-owned predecessor moves **47** ESM slots and ejects Conquest data from the 106 SCC; direct remove moves **144**. Thus single/two-import permutations exhausted (NO-GO), no runtime equivalence certified.

## Research questions and fail-closed method

The new `dev/tests/ci/arch01c5a-a3-conquest-transitive-cutset.mjs`, included in the existing mandatory architecture CI hook, audits **the unchanged v134 code** with actual Acorn imports and the unchanged real production esbuild. It does not patch `dev/src`, `SPLIT` or a production build.

1. Reconstruct the **exact ordered 173-node/1000-edge static import graph**, source line, side-effect-only vs **named import/re-export**. Cross-check the two forbidden imports, original strongly-connected members, frozen DFS path and actual production build's 167 ESM markers.
2. For **each outgoing import of `ui/overlays/celebrate.js`**, calculate a shortest path to `data/conquest-data.js`, excluding the one reverse Conquest→celebrate edge. This reveals every independently reachable UI re-entry branch, not just an arbitrary first DFS or one screenshot.
3. Calculate a **minimum directed cut** using residual max-flow from `celebrate` to `conquest-data` under four explicit admissibility rules: cut *any UI-authored imports*; cut *only side-effect-only UI imports*; cut only UI's imports of `logic/conquest` or `data/conquest-data`; cut only UI→UI links. Distinguish feasible from structurally blocked. List every proposed cut's exact file/line and existing imported symbols. **A cut requiring removal of a named import is a conceptual graph cut, NOT executable JavaScript:** that symbol could become undefined and change saves, UI and game. Such candidates are never claimed as B1 implementation or ESM order GO.
4. Independently prove the architectural implication: after removing **both historical reverse edges** *in graph memory only*, each `data/` module imports only `data/`. Consequently no SCC can contain both `data/` and UI/logic/render/assets. Therefore retaining **literal SCC member identity [106,6]** while eliminating all forbidden data imports is **mathematically incompatible** with the mandated layering. The old SCC constraint must be separately, explicitly reviewed for any proposed lawful B1; it must not be silently made green by editing a test.
5. For Conquest alone prove `106→105` ejects exactly `data/conquest-data.js`, leaving the same 105 other members; isolate the **independent** Story→models/3D risk.

## Safety boundary and decision rule

Stage A3 is structural evidence. Even if a graph cut disconnects UI's transitive Conquest pull, **no graph-only cut is runtime executable**; no esbuild evaluation-order equivalence is inferred. A hypothetical future B1 must preserve all imported symbols, registration timing, top-level side effects and behavioral identities, or use explicitly reviewed hooks/ports and reproduce exact cold/warm boot, TDZ and CELEB/NOTES callback order. Required proof: Conquest weekly/reset/difficulty/refills/feats/saves, queues/observer install, imported/replaced saves, full golden 200 battle+1560 meta+save+41 screens, both PWA+standalone HTML and SW/offline, Campaign 210, 3D lifecycle WebGL MED/LOW/HIGH, protected Camp and iPhone DOM. Real iPhone Safari still remains open. Do not touch Story→models loaders or baker/camp.

**The output is a finite constrained research result** to choose whether a new port/lifecycle contract is even worth considering; no source changes, version, release, golden, ledger, or cleanup and no merge/publish.

## Actual production graph results — source HEAD `10c8cf9702a59908eabab6147625e0e91dac8f72`

[**Actual full GitHub Actions #44187715533 SUCCESS 19/19, first attempt for corrected code; final required gate SUCCESS**](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44187715533). Publication step SKIPPED. Build + architecture job **`134408758471` SUCCESS**; actual unchanged v134 production esbuild exactly **167 markers**. Source and runtime: **173 modules, 1000 static declarations, 898 named globals, baseline SCC [106,6], exactly two old data→runtime imports, zero new/stale**. The validated build artifact **`dune-validated-build` ID 14374917691**, digest **`sha256:b84b5e6e8ed69239296009e1725b488094a345d2b7117fd01dda39f283ebe9f4`**. Real full suite covers golden battles/meta/saves/screens, Conquest, 210 Campaign, standalone PWA/HTML+SW/offline, E3 DOM, WebGL MED/LOW/HIGH, protected Camp and 3D lifecycle. This proves unchanged **real** app safety, **not** any counterfactual graph-cut candidate's runtime safety.

The first test-only SHA `ad5d9910d327f0882908138c0195ebc8a1c2e029` had [CI #44187468560 FAILED](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44187468560): the test wrongly required a unique `from→to` static declaration, despite **two historical imports** in `logic/gear-crafting.js→logic/gear.js`. The corrected code retains **all 1000 Acorn import declarations** but deduplicates `from→to` *only in dependency-graph traversal and max-flow*. Actual production source, SPLIT, CI baselines and ESM output never changed. Corrected architecture job + full CI PASS. Do not describe the initial test-only failure as a game regression.

### Exact transitive reachability

`ui/overlays/celebrate.js` contains **16 direct static imports**, of which **12** independently reach `data/conquest-data.js` through existing original dependencies (excluding the reverse Conquest→celebrate edge). The shortest path from each such branch is:

| Celebrate first dependency | Shortest route to Conquest data | Imported value from celebrate |
| --- | --- | --- |
| `ui/reward-tiles.js` | reward-tiles → squad-select → data/conquest-data | order-only |
| `ui/mouse.js` | mouse → notifications → data/conquest-data | `MOUSE_SVG` |
| `ui/notifications.js` | notifications → data/conquest-data | `renderNotes` |
| `ui/hero-window.js` | hero-window → core/boot → data/conquest-data | `heroSnap` |
| `ui/hero-card.js` | hero-card → overlays/detail → notifications → data/conquest-data | `openDetail` |
| `ui/router.js` | router → views/conq → data/conquest-data | `render` |
| `logic/progress.js` | progress → campaigns → story → models → baker → squad-select → data/conquest-data | `prog` |
| `core/state.js` | state → economy → campaigns → story → models → baker → squad-select → data/conquest-data | `BT, set_view, view` |
| `logic/relics.js` | relics → gear → campaigns → story → models → baker → squad-select → data/conquest-data | `ringCol, sideName` |
| `data/story.js` | story → models → baker → squad-select → data/conquest-data | `BIOS` |
| `core/format.js` | format → gear-sources → campaigns → story → models → baker → squad-select → data/conquest-data | `fmt` |
| `core/dom.js` | dom → daily → economy → campaigns → story → models → baker → squad-select → data/conquest-data | `# ARCH-01C5a-A3 — транзитивные циклы UI → Conquest, graph-cut и lifecycle

**Scope:** Stage A3 independent read-only architectural research. Do **not** change gameplay or propose implementation B1 until an explicit separate owner acceptance. Repository `mryandexxx-spec/Dgoh-game`, frozen main commit **`b3d65303130dbd385caaac299f1f2dfc0473cd8c`**, published **v134** root `a057ea05ebc115cf5deca0222a4bb5aa5164ab48`, SW `a93dcde641`. Required context: [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [A1 Draft #175](https://github.com/mryandexxx-spec/Dgoh-game/pull/175), [A2 Draft #176](https://github.com/mryandexxx-spec/Dgoh-game/pull/176), [A2 report](https://github.com/mryandexxx-spec/Dgoh-game/blob/audit/arch01c5a-a2-conquest-dfs-virtual-20261118/dev/docs/ARCH01C5A_A2_CONQUEST_DFS_STAGE_A_2026_11_18.md). A2 [full CI #44179761265 SUCCESS 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44179761265), final documentation-only [#44182814565 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44182814565). Neither PR merged.

## Frozen fact pattern

- **Two** forbidden `data→runtime` dependencies persist, zero new/stale: `data/conquest-data.js → ui/overlays/celebrate.js` (order-only) and `data/story.js → assets/models.js` (order-only).
- ESM/Acorn invariant: **173 JS, 1000 static imports, 167 original ESM markers, 898 exported names, SCC [106,6]**.
- First static-import DFS reaches Conquest via `main.js → boot.js → ui/views/conq.js → logic/conquest.js → data/conquest-data.js → ui/overlays/celebrate.js`. First visits #24 and #25. This DFS is **not** a runtime event trace; esbuild marker evaluation order is independently checked.
- A2 real esbuild **0/100 exact**; its best UI-owned predecessor moves **47** ESM slots and ejects Conquest data from the 106 SCC; direct remove moves **144**. Thus single/two-import permutations exhausted (NO-GO), no runtime equivalence certified.

## Research questions and fail-closed method

The new `dev/tests/ci/arch01c5a-a3-conquest-transitive-cutset.mjs`, included in the existing mandatory architecture CI hook, audits **the unchanged v134 code** with actual Acorn imports and the unchanged real production esbuild. It does not patch `dev/src`, `SPLIT` or a production build.

1. Reconstruct the **exact ordered 173-node/1000-edge static import graph**, source line, side-effect-only vs **named import/re-export**. Cross-check the two forbidden imports, original strongly-connected members, frozen DFS path and actual production build's 167 ESM markers.
2. For **each outgoing import of `ui/overlays/celebrate.js`**, calculate a shortest path to `data/conquest-data.js`, excluding the one reverse Conquest→celebrate edge. This reveals every independently reachable UI re-entry branch, not just an arbitrary first DFS or one screenshot.
3. Calculate a **minimum directed cut** using residual max-flow from `celebrate` to `conquest-data` under four explicit admissibility rules: cut *any UI-authored imports*; cut *only side-effect-only UI imports*; cut only UI's imports of `logic/conquest` or `data/conquest-data`; cut only UI→UI links. Distinguish feasible from structurally blocked. List every proposed cut's exact file/line and existing imported symbols. **A cut requiring removal of a named import is a conceptual graph cut, NOT executable JavaScript:** that symbol could become undefined and change saves, UI and game. Such candidates are never claimed as B1 implementation or ESM order GO.
4. Independently prove the architectural implication: after removing **both historical reverse edges** *in graph memory only*, each `data/` module imports only `data/`. Consequently no SCC can contain both `data/` and UI/logic/render/assets. Therefore retaining **literal SCC member identity [106,6]** while eliminating all forbidden data imports is **mathematically incompatible** with the mandated layering. The old SCC constraint must be separately, explicitly reviewed for any proposed lawful B1; it must not be silently made green by editing a test.
5. For Conquest alone prove `106→105` ejects exactly `data/conquest-data.js`, leaving the same 105 other members; isolate the **independent** Story→models/3D risk.

## Safety boundary and decision rule

Stage A3 is structural evidence. Even if a graph cut disconnects UI's transitive Conquest pull, **no graph-only cut is runtime executable**; no esbuild evaluation-order equivalence is inferred. A hypothetical future B1 must preserve all imported symbols, registration timing, top-level side effects and behavioral identities, or use explicitly reviewed hooks/ports and reproduce exact cold/warm boot, TDZ and CELEB/NOTES callback order. Required proof: Conquest weekly/reset/difficulty/refills/feats/saves, queues/observer install, imported/replaced saves, full golden 200 battle+1560 meta+save+41 screens, both PWA+standalone HTML and SW/offline, Campaign 210, 3D lifecycle WebGL MED/LOW/HIGH, protected Camp and iPhone DOM. Real iPhone Safari still remains open. Do not touch Story→models loaders or baker/camp.

**The output is a finite constrained research result** to choose whether a new port/lifecycle contract is even worth considering; no source changes, version, release, golden, ledger, or cleanup and no merge/publish.

 |

*Table path prefixes are abbreviated relative to `celebrate.js`; the CI log contains exact full source paths. They show a **graph reachability witness**, not a measured ESM execution stack.* Four other direct celebrate dependencies have no reachable path to Conquest in this unchanged graph.

### Exact minimum conceptual UI-authorized cut

Treat one existing distinct source→target dependency pair as one graph arc, assigning **unit capacity** only when the *importer* is a `ui/` module; all other arcs have prohibitive capacity. Max-flow/min-cut yields a **minimum cardinality 8**-edge UI-owned directed cut, sufficient to disconnect `celebrate → conquest-data` in the **in-memory graph**:

| Source UI module → target | Import line | Existing binding contract |
| --- | ---: | --- |
| `ui/battle/battle-ui.js → boot.js` | 3 | named: `hourglass, spiceUser` |
| `ui/hero-window.js → core/boot.js` | 2 | **order-only** |
| `ui/notifications.js → data/conquest-data.js` | 3 | named: `CQ_SECT` |
| `ui/overlays/squad-select.js → logic/conquest.js` | 3 | named: ten `cq*` functions |
| `ui/overlays/squad-select.js → data/conquest-data.js` | 4 | named: `CQ_EN, CQ_SECT, CQ_STA, cqMod` |
| `ui/views/conq.js → logic/conquest.js` | 2 | named: 38 `cq*` functions |
| `ui/views/conq.js → data/conquest-data.js` | 3 | named: 18 `CQ*`/`cq*` values |
| `ui/views/lobby.js → logic/conquest.js` | 3 | named: `cqHot` |

**Seven of these eight imports are real named API dependencies**, not expendable order-only side effects. This cut is **one minimum cut**, not asserted unique. Its 8-unit score ignores differences in product behavior and refactoring cost. **DO NOT delete these eight links:** that would remove legitimate UI→logic/data APIs, break Conquest, lobby/battle, UI controls and potentially save/state flows. `ui/hero-window → core/boot` also carries historical module-registration order even though it is syntax-only.

The constrained flow results are:

| Allowed graph arcs to remove | Can fully disconnect celebrate→Conquest? | Why |
| --- | --- | --- |
| Any UI-authored import arc | **YES — minimum 8** | Seven named APIs + one order-only |
| Only UI-authored *order-only* arcs | **NO** | Witness: `celebrate→notifications→conquest-data` uses named imports |
| Only UI imports of `logic/conquest` / `data/conquest-data` | **NO** | Witness: `celebrate→hero-window→core/boot→conquest-data`; `core/boot` is not UI |
| Only UI→UI arcs | **NO** | Witness: `celebrate→story→models→baker→squad-select→conquest-data` has no UI→UI segment |

No alternative constraint above has a valid cut. These are graph-theoretic impossibility results **under the specified edge restrictions**, not proofs that no possible structural refactor could ever work.

### Mandatory architecture theorem: SCC-member equality cannot be perpetual

The current 106-member SCC contains both `data/conquest-data.js` and `ui/overlays/celebrate.js`; after only the Conquest reverse edge is removed, `data/conquest-data.js` alone exits, leaving **[105,6]**. The complete pure-data thought experiment removes *both* forbidden `data/conquest-data→celebrate` and `data/story→assets/models` **in graph memory only**. On exact frozen v134, every `data/` module then imports only other `data/` modules and **no SCC mixes a data module with a non-data module** (verified by Acorn + Tarjan).

Proof: A strongly-connected component containing both data and runtime must contain a directed path **from data to runtime**; if all data imports stay inside data, no such path can exist. Thus the original mixed SCC **cannot** retain exact member identity after all reverse imports are eliminated. An explicit, carefully tested SCC shrink is *logically necessary*, but **never sufficient** for execution-order or runtime safety. Do not change the baseline SCC contract without an independent owner-reviewed target set and actual product proof.

### Final A3 architecture decision

**A3 research COMPLETE; NO-GO for a naive import-only B1.** The tested minimum cut proves that any approach based on deleting ordering imports alone cannot disconnect the transitive Conquest reachability; a cut of only direct UI→Conquest imports also fails. An apparently simple `data/conquest-data` cleanup can intersect both Story→models 3D initialization and battle/lobby/boot APIs. The full CI validates ONLY the untouched source, **not** any imagined removal of the named API edges.

**Recommended next independent proposal:** ARCH-01C5a-A4 Stage A (design/instrumentation only). Identify an architecture-legal bootstrap/late-initialization contract (UI-owned, no data→UI), preserve the seven public named API relationships and test a **virtual** 47-ESM-marker-shift candidate for TDZ and exact CELEB/NOTES/MutationObserver/Conquest/save/3D first-evaluation timing. Require explicit owner's acceptance before any later Stage B1, including explicit allowed SCC identity changes. Do **not** touch Story→models or Camp in the Conquest package without a separate guarded scope; do not change the 167-marker/golden oracle merely to get green tests.

**No B1, no merge, no release, no source or SAVE schema changes, no PWA/SW publication.** Physical Safari/iPhone field acceptance remains OPEN.

