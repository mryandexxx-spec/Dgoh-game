# ARCH-02C-B4-B3 — verified campaign simulation + manual Raid cashout

Date: 2026-11-20. Base `main=96b247c7e9202cb0067371c86b9d064ea15c3c21` after #222. **DRAFT, NO MERGE OR RELEASE**.

## Context and invariants

Read `dev/ARCHITECTURE.md`, B4-B1 and B4-B2 reports, `core/save.js`, `logic/rewards.js`, `ui/overlays/sim.js`, `ui/events.js`, `ui/views/trials.js`, and pinned B0 characterization. Mandatory native Web Locks holds a sole writer. The exact v1 save schema, backup-first byte-verified checkpoint, strict ESM dependency graph, frozen Conquest source, battle goldens, PWA/offline and recovery UI are unchanged.

## Risk map

| Entry | Prior order / failure | Change in this PR |
|---|---|---|
| `doXSim(spec)` | `enSpend` / `simCore` random drops, shard unlock, pity, XP / unchecked `persist` / rewardWin | Single synchronous writer snapshot, cost/validation + RNG rewards in the **same** verified checkpoint. Result/focus built **after** success |
| `runSim()` | Normal modal simulation spent energy and generated loot before unchecked save, then rendered win | Same transaction; explicit count and unlock preflight, no result on failed/uncertain write |
| `data-raidend` | Direct partial payout + `S.raid=null` before unchecked save, victory overlay even after failure | Compute `raidPct`, all currency/fragments, and remove active raid in the **same** checked snapshot; result UI only after commit |
| `trialSimClick` / `trialMulti` | Attempts/random reward/XP before unchecked save | **NOT YET COVERED**; separate B4-B3b slice |
| Conquest chest/one-time `cqClick` | Direct mutations; source is SHA-frozen | **NOT COVERED**; must preserve frozen source and route through a carefully reviewed new seam |
| B5 daily / B6 purchases | Separate claim/purchase risks | Out of scope |

## Synchronous, fail-closed design

B4-B2 introduced `loadSave.writer.transact(stage)` using a detached `JSON`-compatible v1 save and an existing single verified checkpoint. B4-B3 extends its **optional second parameter** to accept `rewardHooks` so that shard-unlock and 7★ conversion **presentation only** is queued during candidate generation and flushed only after success. Core receives an explicit UI-provided hooks object rather than importing `logic` or `ui`; no extra ESM edge/named exports. On failure/uncertainty, hooks are restored without flushing and the writer is retired, requiring a clean boot. A presentation hook exception after success never rolls back a durable commit.

Only the game's gated path uses this new transaction in the changed UI functions. Existing ungated forensic baseline and game economy remain unchanged. The two campaign sim entry points and raid cashout are all synchronous. There is no blind retry, refund, changed RNG draw order, or new save token/ledger. `ACC_UPS` remains a transient queue and on failed write the old session is fenced.

## Acceptance

`dev/tests/ci/arch02c-b4-b3-reward-checkpoint-acceptance.mjs` is required for both compiled `dist/pwa/index.html` and `dist/artifact.html`, under ordinary mandatory writer boot:

- B417 focus simulation single checkpoint covers energy, randomized loot, quests and account XP;
- B418 backup-quota failure does not acknowledge loot or update RAM/primary;
- B419 lost writer cannot grant simulated rewards;
- B420 ambiguous primary write blocks old JS realm; cold boot sees exactly stored result, no reroll;
- B421 normal popup simulation commits before result overlay;
- B422 manual partial Raid award and raid deletion are one primary/backup verified commit;
- B423 backup quota during cashout keeps durable Raid and resources;
- B424 duplicate cashout cannot pay twice.

Full strict architecture, old B0 (intentionally ungated), B1/B2/B3/B4-B1/B4-B2, native Web Locks and all golden/CI gates continue to apply.

## Known limits / no-publish

Daily trial simulations remain an unchecked payout path, as do Conquest claims, free daily rewards and purchases. This PR does not claim transactional coverage for those paths. Physical iPhone PWA proof will be a separate user acceptance after an explicitly approved release. Do not merge, bump version, publish, clear site data or reinstall PWA without owner authorization.
