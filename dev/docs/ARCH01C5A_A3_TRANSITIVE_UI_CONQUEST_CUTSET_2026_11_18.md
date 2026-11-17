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

## Actual GitHub CI receipt and conclusions

PENDING — report exact actual CI job output: number of distinct reachability branches, individual shortest paths, constrained min-cut sizes (or blocked rules), effects of required named imports, formal SCC theorem, and final SHA. No fabricated GO. 
