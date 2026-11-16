# ARCH-01C0 — 17 data dependencies: factual diagnosis and phased implementation plan

**Date:** 2026-11-16. **Analyzed main SHA:** 383ba5b5146dba7796aee86469ae1eea4a37c742. **Decision context:** Issues [#120](https://github.com/mryandexxx-spec/Dgoh-game/issues/120), [#121](https://github.com/mryandexxx-spec/Dgoh-game/issues/121), [#132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132) and [v125 handoff](ARCH01C_V125_NEXT_CHAT_HANDOFF_2026_11_16.md). C0 makes NO game/source/production/version/SPLIT/baseline/golden changes. No merge or release authorization.

## 1. Verified source graph

- Diff from validated v125 root commit c40d4de2c37a185391abaf559c96a53fd7b74dc7 to analyzed main HEAD consists only of docs and retired one-shot release workflow. All dev/src code and tooling are unchanged.
- On the same production sources, [implementation CI run #43844594742](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43844594742): **167 source JS modules, 992 static imports, zero literal dynamic imports; two SCCs of 104 modules / 753 internal edges, and 9 modules / 26 edges**. Baseline AST gate: 17 forbidden = 17 existing, zero new/stale. Zero logic → ui. v125 check-bundle: original 161 markers in expected order.
- Exact 17-edge source of truth is dev/tools/arch-import-baseline.json. Historic 102/9 SCC figures must not be copied as current.
- Diagnostic branch tests an up-to-date AST/SCC graph plus six **virtual in-memory esbuild alternatives**, matching production build options (src/main.js, bundle, ESM, treeShaking false). Only a real CI run of this branch will establish their actual order deltas; findings must be recorded in Issue #132. The probe never rewrites source, SPLIT or golden.

## 2. Full inventory and first consumption

| From dev/src/data | Target (line) | Classification, first read or effect | Risk |
|---|---|---|---|
| boss.js | logic/battle/skills.js (2) | order-only predecessor; boss.js:7 eagerly registers CH.worm = WORM | HIGH: raid registration, battle SCC/TDZ |
| campaigns.js | core/rng.js (7) | top-level sRng for deterministic NODES generation at 154–165 | HIGH: all 210 enemy setups |
| campaigns.js | core/state.js (3) | live S.cleared, only called by nodeOpen at 168 | HIGH: unlocked chapters/save |
| campaigns.js | logic/economy.js (4) | BATTLE_WATER/CANDLE_COST, only nodeCost at 171 | HIGH: campaign energy |
| conquest-data.js | core/state.js (4) | S.cqRf for cqRfN at 88; NOTES.push from cqBump at 71–81 | HIGH: daily refills, feat notifications |
| conquest-data.js | logic/conquest.js (2) | cq() used by cqK:27, cqScore:70, cqBump:71 | VERY HIGH: explicit two-way import |
| conquest-data.js | logic/economy.js (5) | todayKey/refillPrice only in cqRfN/cqRfCost at 88–89 | HIGH: time and prices |
| conquest-data.js | ui/overlays/celebrate.js (3) | order-only predecessor of Jihad data | VERY HIGH: UI init cycles/rewards |
| cosmetics.js | assets/models.js (5) | WORM_IMG.ava eagerly changes EMBLEMS.worm.svg/bg at 19 | HIGH: asset URL and visual identity |
| cosmetics.js | core/state.js (4) | S.unlocks only inside unlocked at 30 | MED/HIGH: legacy unlocks |
| cosmetics.js | logic/progress.js (3) | prog(id).stars inside unlocked at 30 | MED/HIGH: hero-avatar ownership |
| cosmetics.js | logic/stats.js (2) | order-only predecessor | VERY HIGH: earlier ARCH-01B reorder failure |
| journeys.js | core/state.js (3) | JK/JP at 36–38, including lazy S.journeys[JK()] ??= {} | HIGH: save state and TDZ |
| journeys.js | logic/economy.js (4) | ONLY MAX_GEAR, used by jHeroOk/jGateReady at 24–27 | LOWEST of 17, recommended pilot |
| journeys.js | logic/progress.js (2) | prog for journey eligibility 24–34 | HIGH: 7-star, XIII, relic and unlocked-legend |
| looks.js | logic/battle/ai.js (2) | order-only predecessor | HIGH: combat init/battle SCC |
| story.js | assets/models.js (2) | order-only predecessor; models.js first imports render3d/scenes/baker.js | HIGH: asset and boot order |

**Top-level effects / temporal coupling.** boss eagerly mutates a singleton CH, not a local value. campaigns constructs all NODES eagerly, seeded with ghash/sRng, including special Rabban correction; changing the code is not a data-only refactor. journeys eagerly normalizes tier levels, enemy power and relic requirements at line 22. cosmetics eagerly patches worm SVG and background from a resolved asset URL. conquest-data eagerly constructs constants and closures, but cq(), NOTES and economy/state reads are deferred to invoked functions. story and looks have simple declarative bodies but their import predecessors are NOT necessarily inert. core/state.js declares a live let S initialized only by set_S later; never replace lazy accesses with eager S/prog/cq/refill evaluation. logic/economy.js explicitly imports data/journeys.js for predecessor ordering; logic/conquest.js imports data/conquest-data.js by name. Each is a cycle/TDZ hotspot.

## 3. Four separately accepted implementation packets

Checkpoints: 17 → 14 → 10 → 6 → 0, with intermediate **17 → 16** after the first pilot. These are planned targets, not completed removals. One authorized feature/Draft PR per package; break a risky package into another PR if it cannot be proven safe. Never rewrite SPLIT just to approve a reorder.

### C1: ARCH-01C1, Journeys: 3 edges, 17 → 14

**C1a pilot, precisely one edge, 17 → 16.** Move only MAX_GEAR = 13 to new pure data/gear-cap.js. data/journeys.js consumes it from data, logic/economy.js imports/re-exports it under the **unchanged** economy export. Preserve the existing economy predecessor import and all other journey imports, reward/energy numbers and logic. In-memory virtual esbuild probe must demonstrate the original 161 modules keep their relative order (new pure module may be added with a documented legitimate SPLIT entry). If probe fails, do NOT implement or cosmetically change SPLIT. Acceptance: gear XIII / 7-star / relic / legendary-gate fixtures including an already unlocked Muad'Dib, no TDZ, same goldens and save semantics, 16 baseline edges, zero new/stale.

**C1b follow-on, two further edges.** Keep JOURNEYS/JREQ, pure jRelic/jFoes and eager tier normalization in data/journeys.js. Move S/prog-dependent JK/JR/JP and eligibility methods to a new logic/journey-gates.js, update each named importer of moved exports, never create a reverse data re-export facade. Preserve mutation-on-call JP and the 11-hero gate/grandfather rule exactly; compare public APIs and esbuild before touching sources. C1b is independently rejectable if importer rewiring or order shift is too wide.

Paths: data/journeys.js, logic/economy.js, data/gear-cap.js (new), logic/journey-gates.js (new if C1b approved), named journey consumers, tools/split.config.mjs for documented NEW modules and arch-import-baseline.json only after verified edge removal. Focus tests: journey unlock, gear XIII, relic, tier normalization, save goldens, existing 161 module sequence.

### C2: ARCH-01C2, Campaign and story: 4 edges, 14 → 10

Paths: data/campaigns.js, data/story.js; core/rng.js, core/state.js, logic/economy.js, assets/models.js; pure data seeded helper and logic-owned mission gate/cost methods if necessary, named UI/campaign consumers and explicit permitted bootstrap importer if justified. Do not duplicate a second random algorithm. Eliminate S and economy from data by moving callable nodeOpen/nodeCost to logic without a reverse facade. For RNG, use a **bit-identical** shared pure helper in data and retain existing deterministic semantics. Only remove story → models predecessor after virtual esbuild and proving assets preload/boot behavior is preserved.

High risk: 210 NODES, mission index stability, rewards, enemy teams, Rabban special override, start order of assets/models and 3D. Acceptance: deep-equal serialized 210 NODES and all mission eligibility / water-candle cost fixtures before/after, battle/meta/save goldens, no changes to Campaign 2.0 scenes/content, MED/LOW/3D and offline boot.

### C3a: ARCH-01C3a, Cosmetics: 4 edges, 10 → 6

Paths: data/cosmetics.js; assets/models.js, core/state.js, logic/progress.js, logic/stats.js, ui/overlays/profile.js and ui/views/feats.js, new logic/cosmetics-unlocks.js and UI-owned image adapter if needed. Leave EMBLEMS/FRAMES/TITLES/FREE as pure data. Move state/progression-based unlocked to logic and update named importers. Move WORM_IMG-based SVG assembly to permitted UI/asset boundary, guaranteed to occur **before first visible avatar**; test old identical URL, background and markup. The stats predecessor import is removed only after independently proving a proper UI composition root and exact legacy module order in virtual esbuild.

High risk: profile state, feat claims, 41 screen goldens, worm avatar; no UI/3D camp changes. Acceptance: identical avatar and entitlement snapshots including old saves; DOM tests, 41 screens and offline PWA, no TDZ or unexpected order changes.

### C3b: ARCH-01C3b, Conquest plus remaining battle predecessors: 6 edges, 6 → 0

Paths: data/conquest-data.js, logic/conquest.js, core/state.js, logic/economy.js, ui/overlays/celebrate.js; isolated order-only micro-changes to data/boss.js, data/looks.js, logic/battle/skills.js and logic/battle/ai.js, with any explicit permitted-layer boot importers. Keep static conquest sector/disk/feat tables in data. Move cq(), scoring/bump, refresh/day/price and NOTES mutation to logic-owned services; UI celebration registration remains UI-owned. Do not create data callbacks importing UI. Prove CH.worm registration exactly once before any boss/raid consumer. For both boss → skills and looks → ai, independently simulate removing the order edge; if a large SCC or module order changes, do not combine these with the conquest migration in an unreviewable refactor—split under fresh owner approval.

High/critical risk: weekly rollover, migrations and existing saved Jihad routes/disks, purchase limits, feat rewards, raid and AI. Acceptance: J1/weekly/migration, price/refill/notification tests, boss phase and combat golden, saves/41 screens/offline + WebGL, exactly zero legacy/new/stale forbidden imports. Only after this is the separate ARCH-01D strict zero-baseline gate eligible to be proposed.

## 4. Universal gates and scope lock

1. Refetch actual main HEAD before each implementation. Work only in branch + Draft PR; C0 does not authorize implementation, merge, publication or version bump.
2. Run read-only production-option esbuild virtual variants BEFORE any predecessor deletion. Require exact order of previous 161 modules and assess in-SCC edges, eager effects and TDZ. No mass SPLIT rewrites, no lowering CI/AST/check-bundle/golden gates.
3. Run check-deps, tests/ci/arch-imports, check-arch-imports, tests/ci/arch-init-graph, arch-init-graph, check-bundle on built PWA, focused tests and all required CI golden battle/meta/saves/41 screens on PWA and artifact, DOM, offline SW and relevant MED/LOW WebGL lifecycle. Never use golden --update as an escape hatch.
4. Preserve every one of 210 campaign missions / 21 maps, game economics, rewards, balance, growth, save schemas and existing public APIs until separately agreed.
5. **CAMP IS IMMUTABLE**: no changes to camp UI, 3D, zonal navigation, button layout, styles or visual assets.
6. Physical Safari/iPhone validation of v125 is STILL PENDING and must not be counted as passed.

## 5. C0 diagnostic branch and follow-up

Branch: audit/arch01c0-esbuild-order-diagnostics. The read-only tests/ci/arch01c-order-probe.mjs executes through existing tests/ci/arch-init-graph.mjs; zero changes to production source, SPLIT, AST baseline, CI strength, PWA or version. It prints SCC membership for all 17 existing edges and order diffs for five single order-only deletions plus a **virtual** C1a MAX_GEAR move. Record exact CI result in Issue #132 and determine a go/no-go for the C1a implementation; failed variants stay virtual. Merge/release requires a separate explicit owner instruction.
