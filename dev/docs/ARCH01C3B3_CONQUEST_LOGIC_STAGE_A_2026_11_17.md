# ARCH-01C3b3 Stage A — Conquest data→logic: virtual ESM/TDZ assessment

**17 November 2026. ANALYSIS ONLY, not a production change or release.** Owner: «Проблем пока не вижу. Давай дальше по плану». Tracker [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).

## Source of truth and safe baseline

v131 is **officially published**: release source `9d60bca8abae8531b6ef548168554cb23444c03a`, production root `522f0035126b1d757091e671e18849132b3199ea`, Service Worker `25cfd6ff90`, 188 SHA-256 files; [official publish #44073950763 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44073950763) and [independent Pages #44075082409 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44075082409). [Issue receipt](https://github.com/mryandexxx-spec/Dgoh-game/issues/132#issuecomment-6948232387). Docs-only cleanup [PR #160 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/160), full [CI #44085210028 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44085210028), `main=78baa2f9d26e67d3250d7c2850a3e8d4437cc592` at Stage A start. Original published PWA bytes unchanged by cleanup. Unconfirmed: **physical Safari/iPhone**.

On actual v131 main AST: **173 JS, 1000 static imports, 167 original named ESM module markers, 898 canonical named exports, two previous SCC sizes 106/9, five forbidden data→* edges, no new/stale imports**.

Remaining edges:
```
data/boss.js -> logic/battle/skills.js
data/conquest-data.js -> logic/conquest.js
data/conquest-data.js -> ui/overlays/celebrate.js
data/looks.js -> logic/battle/ai.js
data/story.js -> assets/models.js
```
C3b0 `data/conquest-data → ui/overlays/celebrate` is **NO-GO after 35/35 virtual failures** and must preserve its side-effect predecessor; C2d `data/story → assets/models` likewise **NO-GO after 39/39 failures** due to `b3Pre(loadAssets3)`. Neither should be bundled with the next migration.

## Responsibility analysis

`data/conquest-data.js` still imports `cq` from `logic/conquest.js`. Only its three dynamic selectors use `cq`, directly or transitively:

- `cqK = () => ({ easy:1, normal:1.25, hard:1.5 })[cq().diff] || 1`: difficulty multiplier, including no-difficulty default.
- `cqModD(m)`: describes a boss modifier `cqMod(m)` at `cqK()`, but text-only static modifiers keep their original strings.
- `cqScore = () => { const C=cq(); return C.stars+(C.pts||0); }`: Conquest reward/track progress.

The stateful `cqBump`, original global/local/boss feats, `NOTES.push` and exact refill functions `cqRfN/cqRfCost` already belong to `logic/conquest.js` after v130/v131. `logic/conquest.js` currently imports `cqScore` from data and calls it for milestone/track chest readiness; `ui/views/conq.js` imports `cqK`, `cqModD`, `cqScore` from data. No other named consumers should be rewired; the new mandatory CI virtual test enumerates **every** imported client from the AST and fails on any unaccounted importer.

All table catalogs (`CQ_DIFF`, `CQ_BMOD`, `CQ_MODS`, `CQ_DISKS`, `CQ_SECT`, `CQ_GF`, `cqFeats`, `cqMod`, etc.) remain in **data**.

## Virtual matrix and stop rules

The new mandatory `dev/tests/ci/arch01c3b3-virtual-conquest.mjs` uses **the exact production esbuild config** (`src/main.js`, bundle, ESM, no treeshaking, charset, target, comments), with only `onLoad` in-memory source overlays. Every scenario computes actual:

- All original **167** markers with **zero moved, missing or extra**; no silent ESM/TDZ chain shift.
- Same exact SCC module membership (106/9), no new modules/imports and no unresolved named consumers.
- **898** canonical named global exports and exact original name multiset; per-module change of export owner recorded, not hidden.
- Precise difference in directed import graph: the **only** allowed real removed edge is `data/conquest-data.js → logic/conquest.js`; would shrink **5→4** in hypothetical implementation without adding edges.
- The original **byte-for-byte** three selector bodies; no duplicated `cq` state cache, side-effect initialization or mutable runtime injection.

Eight in-memory candidates: removal-only negative control (selectors unbound); **three insertion positions for relocation of all three selectors** into existing logic owner with new named imports from the existing UI logic module edge; two compatibility reexports (additive named exports and retain debt edge); a two-selector partial migration retaining the reverse `cqK` import; an explicit side-effect predecessor import that retains old debt. These provide both GO/NO-GO evidence.

A structural virtual pass is **not** equivalent to a tested runtime implementation. The three selectors change their **module-specific export owner** from data to logic; old canonical global names might remain 898 but external path-specific consumers must be audited explicitly.

## Proposed Stage B1 if and only if a verified GO exists

A separate implementation PR must relocate exactly the three byte-identical selector bodies `cqK`, `cqModD`, `cqScore` into `logic/conquest.js`, import existing pure `cqMod` from data, remove data's import of `cq` and their old data exports, and redirect the existing Conquest UI named imports. No other Conquest definitions are in scope. Shrink ledger 5→4 in that same implementation PR.

Mandatory real PWA and artifact behavioral tests: `cqK` for no difficulty, easy, normal, hard, invalid/legacy; every `CQ_BMOD` modifier description under all difficulties including exact percentages, and plain `CQ_MODS` text; `cqScore=stars+points`, immediate save replacement and Monday weekly rollover, feat point awards and `NOTES` ordering/polling; rewards/chests/route threshold/callers, daily refill prices 0..20 and date reset, the untouched `cqBump` body, all 210 missions SHA, golden battles/meta/saves/41 screen snapshots on PWA/artifact, idle DOM, offline/SW, and desktop+phone WebGL HIGH/MED/LOW lifecycle and budgets. **No new UI, economy, save schema, game balance, Campaign 2.0, camp, 3D or asset changes.** Do not change `SPLIT` or tests/golden to make the build pass.

**State of this document:** Stage A design and scope only; virtual outcomes and CI receipts must be appended from actual CI logs, not inferred. Implementation/merge/publish require separate review and explicit approval.

## Measured Stage A outcome (actual GitHub Actions production esbuild)

[Initial diagnostic Actions #44091622186](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44091622186), build job `134068079262`, ran production `esbuild` and the entire matrix on the actual v131-derived source. **All 8 candidate builds preserved the precise 167/167 original ESM markers** (`moved=0`, `missing=[]`, `extra=[]`). Every tested candidate retained exact 2 SCC with membership sizes 106 and 9, **no introduced static edges**, no module additions. Original source graph: 173 JS, 1000 static imports, 5 forbidden edges, 898 named global exports. This is necessary, **not** evidence of in-browser TDZ compatibility by itself.

| Variant | ESM / SCC | Exports | Edge removed | Decision |
| --- | --- | ---: | --- | --- |
| `delete-import-only` | exact | 898 | Yes | **NO-GO**: unbound `cq` selector references (global fallback risk) |
| `relocate-three-0` | exact | 898 | **Yes, data→logic ONLY** | **VIRTUAL GO**; 999 original static imports after relocation |
| `relocate-three-1` | exact | 898 | **Yes, data→logic ONLY** | **VIRTUAL GO**; same SCC |
| `relocate-three-2` | exact | 898 | **Yes, data→logic ONLY** | **VIRTUAL GO**; same SCC |
| `compatibility-reexport-0` | exact | **901** | No | **NO-GO**: re-export adds 3 public entries and leaves forbidden import |
| `compatibility-reexport-1` | exact | **901** | No | **NO-GO**: same debt and API expansion |
| `half-transfer-retains-edge` | exact | 898 | No | **NO-GO**: `cqModD` still needs reverse import of `cqK` |
| `side-effect-predecessor-retains-edge` | exact | 898 | No | **NO-GO**: same forbidden static predecessor remains |

**Strict virtual GO: 3/8.** The positive variants remove precisely `data/conquest-data.js -> logic/conquest.js`, with 0 newly introduced edges, preserved original 106+9 SCC members, same 898 *global name multiset*, and no missing named importers. The new AST consumer enumeration confirmed **exactly four** path-specific current imports of the migrated names: `logic/conquest:cqScore`, `ui/views/conq:cqK`, `ui/views/conq:cqModD`, `ui/views/conq:cqScore`; all are retargeted through **existing** `logic/conquest` import paths. This leaves the order-sensitive `data/conquest-data→ui/overlays/celebrate` edge **unchanged**.

**Important API caveat:** although the combined 898 symbol names stay unchanged, the three module-scoped export origins change from `data/conquest-data` to `logic/conquest`. Any external direct ESM importer of those paths would require an explicit review; the production app AST found only the four internal imports above. The semantically invalid removal-only variant also had 167/167 markers: **ESM marker equality alone never justifies GO.**

**Verdict: Stage A VIRTUAL GO for narrow three-selector transfer only, not approval to change production.** Stage B1 requires a separate implementation Draft PR, live PWA+artifact TDZ/runtime/score/difficulty/modifier text, persistence/save swap/weekly and reward thresholds, unchanged golden/campaign/offline/WebGL and a shrinking 5→4 ledger. This diagnostic PR has **zero edits to production game source, `SPLIT`, baseline, version, saves, assets, golden or published root**. CI aggregate result should be confirmed for the final updated head before any acceptance.
