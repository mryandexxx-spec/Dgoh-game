# ARCH-02C-B4-B3b — verified Trial simulation reward settlement

Date: 2026-11-20. Parent: merged #223 at `main=19a699afca8606b828e11c27403a08c95de20678`. **Draft scope: no merge, release, version bump or migration.**

## Source audit

Read `dev/ARCHITECTURE.md`, B4-B3 reward checkpoint design, `ui/views/trials.js`, `logic/trials.js`, `core/save.js`, `logic/rewards.js`, and previous compiled-artifact acceptance. Existing `trialSimClick` and `trialMulti` mutate `S.trialRuns`, stats, currencies/fragments/shards and account XP in RAM before unchecked `persist()` and always show a success overlay. A failed or ambiguous save could acknowledge an unpaid/random result, leave stale local state, or permit a repeated tap to reroll. `trialRunsToday()` has a day reset side effect; all daily checks must run on the detached staged save.

## Implementation

- In the mandatory Web Locks boot, `trialSimClick` validates trial ID/tier and positive integer request before entering a single `loadSave.writer.transact(...,rewardHooks)`. The candidate rechecks current day, 3★, tier accessibility and actual remaining attempts. Oversized requests are capped to the remaining attempts inside the stage. The staged `trialSim` rolls the same RNG rewards, updates attempts, trial/win counters, earned materials/shards and XP in the same B1 backup-first verified checkpoint. No reward overlay appears if the candidate is rejected or storage write is uncertain.
- `trialMulti` discovers all currently available 3★ tiers inside the candidate and commits every trial's attempts/rolls/XP together, rather than checkpointing each trial separately. After successful commit it renders the same aggregate reward UI.
- Shard unlock and 7★ conversions use the B4-B3 deferred `rewardHooks` option: no presentation before verified commit. No data-table/RNG/balance changes, B0 historical ungated behavior retained.
- No `trialFinish`/normal combat-victory changes. B4-B1 already owns normal battle reward settlement. No new save schema/key, no changed Conquest source, and no modifications of pinned reference goldens.

## Acceptance

Required `dev/tests/ci/arch02c-b4-b3b-trials-checkpoint-acceptance.mjs` on actual built PWA and artifact, under ordinary native Web Locks-compatible startup:

- B425 regular trial sim commits attempts, random reward and account XP in one verified backup-first commit;
- B426 stale/oversized clicks cannot exceed daily attempt cap or reroll when exhausted;
- B427 backup-quota failure keeps original RAM and primary and blocks old realm;
- B428 multiple eligible trials settle in one verified commit with all attempt totals;
- B429 ambiguous primary write after-write exception fences old realm and cold boot does not auto-roll;
- B430 writer lease loss rejects single and multi paths.

Existing strict ESM imports, dependency guards, B0–B4-B3, combat/metadata/save golden, PWA/offline and 3D budgets remain mandatory.

## Limits and next

Conquest chests/one-time claims remain outside this B4-B3b; `ui/views/conq.js` is frozen. B5 daily claims, B6 purchases/upgrades, and `doRefill` remain separately auditable. An interrupted successful transaction is durable and not replayed; the game intentionally has no automatic refund or compensation without new explicit design. CI and real-device acceptance must precede any release.
