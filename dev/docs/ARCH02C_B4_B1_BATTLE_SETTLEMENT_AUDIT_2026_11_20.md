# ARCH-02C-B4-B1 — battle settlement audit and first checkpoint integration

Date: 2026-11-20. Base: `main=667dac3070c842d8fb68db4dc2daab5aa6950651` (published v141 after PR #217). Branch `feature/arch-02c-b4-b1-battle-settlement-20261120`. **CANDIDATE / NO MERGE / NO RELEASE.**

## Ground truth / constraints

Read `dev/ARCHITECTURE.md`, `dev/CHANGES_STATUS.md`, ARCH-02C B0/B1/B2/B3 handoffs, and the *source* in `dev/src`. The normal production boot has mandatory Web Locks, `dune-goh-v1`, a verified checkpoint backed by `dune-goh-v1.backup`, and a one-way blocked lifecycle after lease loss. Keep frozen `dev/src/boot.js`, first AST start action `set_S(initialSave(data))`, approved exports/import order, existing save schema and 200 golden battles unchanged. Do not change the published root PWA or release version in this PR.

The release run #44710145918 is **SUCCESS** at merge SHA `2994eaa`; published `main` HEAD `667dac` has the CI artifact publish commit. No GitHub Releases "latest" object was returned; publication evidence is the Actions run and verified user acceptance, not an invented tag.

## Actual call graph / reward surfaces

| Entry | Mutations / rewards | Persistence and risk prior to B4-B1 |
|---|---|---|
| `ui/battle/battle-ui.js:startBattle` | `enSpend` (energy), `quest('water')`; then `launch` | Mutated live S before `persist()`, then launched regardless of result — **P0**; B4 entry work remains |
| `ui/battle/battle-ui.js:finish` | Common `statInc('wins')`, all mode rewards below, `accXP`, result modal | Mutated live S before `persist()`; result shown without checking it — **P0** |
| Campaign/default `finish` | `quest`, `campReward`, `signalPity`, `cleared`, `cryClaim`, `sealClaim`, `grantFrags`, `grantShards`, currencies | RNG and pity mutate S before write; retry could roll differently — **P0** |
| `finish` Journey | `JP` first clear, shard grant, crystals/seal/wol or repeat solari | One-time flag and reward must share commit — **P0** |
| `finish` Raid | Damage, participation, progress, and final loot/kill marker | All values must share one commit — **P0** |
| `ui/events.js:data-raidend` | User-confirmed partial raid cash-out, fragment/currency rewards, `S.raid=null` | Separate non-battle handler, direct S then persist — **P1, NOT handled by B4-B1** |
| `ui/views/conq.js:cqFinish` | Sector stars/route, one-time loot, feats, stamina, partial foe HP | Contains its historical frozen inner `persist()`; B4 defers that write until account XP is included — **P0** |
| `ui/views/trials.js:trialFinish` | Stars/attempts, random `trialRoll`, item/shard rewards | Shared `finish` commit — **P0** |
| `logic/bh94-story-battle.js:finishStoryUnlockBattle` | First clear/daily shard limit, receipt `prepared.settled` | One-use in-memory receipt is not itself a durable transaction ID — **P1** |
| `logic/baron-bh9-battle.js:finishBaronBH9Battle` | First clear legend shards/progress | Pure staged helper but actual public release of full BH9 battle is separately gated — **P1** |
| `ui/overlays/sim.js:runSim,simCore` | Energy, loot, quest counters, RNG and account XP | Direct S then persist, outside battle finish — **P1, future slice** |
| `ui/views/trials.js:trialSimClick,trialMulti` | Attempts, random rewards and XP | Direct S then persist — **P1, future slice** |
| `ui/views/conq.js:cqClick` | Static rewards, chests, loot and claim flags | Direct S then persist — **P1, future slice** |
| `ui/views/daily.js` | Daily quest and chest claims | Already characterized B0 C05–C06 unsafe; belongs to B5 reward claims |
| `ui/events.js` shop/crafting | Purchases/upgrades and inventory | Already characterized B0 C08–C10 unsafe; belongs to B6 purchases |
| `render3d/scenes/arena.js` | Battle visualization | Not proof of ranked PvP or separate PvP rewards |

Reference forensic baseline: `dev/tests/ci/arch02c-b0-transaction-characterization.mjs` C12 (battle entry) and C13 (battle finish) demonstrate historical unsafe direct RAM behavior in intentionally *ungated* old-client VM. These old tests must NOT be misrepresented as proof of protected production behavior and should remain pinned. C14 is only a sequential stale-write model, not native multi-tab proof.

## B4-B1 implementation — minimal scope

Under mandatory `loadSave.writer` gate, `finish()`:

1. Requires current Web Locks ownership via `writer.check()` before any new result-state mutations. Lost lease is retired, no stale commit.
2. Creates a detached JSON-compatible v1 working snapshot from S; swaps the S binding to it *synchronously* for the existing result code. No schema fields, ledger, journal, IndexedDB or new economic rules.
3. Defers `rewardHooks.unlock` and `rewardHooks.shardConv` presentation side effects until successful verified commit. Failed realms are blocked and discarded rather than flushing transient account level-up UI.
4. Runs all existing campaign, Journey, Raid, Conquest, Trial and event settlement calculations, including RNG/pity, on that snapshot. The historical byte-frozen `cqFinish` still calls `persist()`, but a RAM-only writer settlement guard defers this nested request (no storage write or UI hook).
5. Calls `writer.finishSettlement()` after computing account XP: it clears the RAM-only defer guard and invokes the existing `persist()` once. Mandatory gate routes this to `writer.commit` / B1 checkpoint (backup first, exact primary readback); no parallel persistence engine.
6. Only on `persist().ok` displays battle results and leaves candidate S active; deferred UI hooks fire after confirmation. `BT.done` forbids a duplicate settlement in the same battle object.
7. On failure/uncertainty, restores the preceding RAM binding, aborts any deferred settlement, explicitly releases authority, and invokes the already-installed blocked-writer lifecycle, requiring a fresh page. Transient UI queues in the blocked realm are not replayed. There is no silent retry.
8. In deliberately ungated legacy VM tests, the historical direct path remains; this is NOT permission for the production composition root to skip mandatory gate.

**Limits / safety interpretation:** A single successfully verified `dune-goh-v1` primary contains the *entire* result. Physical filesystem durability is not claimed for `localStorage`, and closing before the synchronous result checkpoint means the battle is **not acknowledged**, rather than magically replayed. An interrupted earlier battle-entry debit may still be stored. A corrupt/ambiguous write requires explicit recovery/reload rather than inferred rollback. No durable transaction-ID yet: it is not justified for one synchronous under-lock result; the existing first-clear flags and runtime `BT.done` protect their respective scopes. A future background battle replay or asynchronous server settlement would require an independently designed idempotency contract and migration.

## Acceptance and open slices

New `dev/tests/ci/arch02c-b4-b1-battle-commit-acceptance.mjs` runs real compiled PWA **and** HTML artifact under ordinary mandatory Web Locks boot, rather than only testing an isolated helper:

- B401 verified campaign first win + snapshot/backup consistency;
- B402 duplicate `finish()` does not mint rewards;
- B403 backup quota denies primary overwrite, restores RAM, blocks old session;
- B404 explicit lost lock prevents a stale finish;
- B405 write-then-throw uncertainty blocks old realm, cold reload sees precisely stored bytes with no automatic replay.

Full exact-head CI must continue to enforce PWA/artifact acceptance, B0 historical characterization, B1/B2/B3, architecture strict and immutable ESM boundaries, golden battles and saves, Campaign 210, screenshots, real Chromium Web Locks, offline/SW and final gate. **Never mark this PR green before checking the actual jobs.** Physical iPhone Safari remains owner acceptance after a separate release approval.

**Not complete in B4-B1:** battle *entry* must not launch if debit is unconfirmed; manual raid cash-out; all sim paths; Conquest chest/claim paths; replay-safe battle identity if later persisted midbattle; no rank PvP verified; legacy lower-level tests remain intentionally unsafe. Propose separate focused B4-B2/B4-B3 slices; do not claim full B4 safety from B4-B1 or erase B0 baseline.

**Hard hold:** no merge, v142, publish, PWA uninstall/reinstall, site-data clear, change to existing checkpoint/backup import/recovery, balance/RNG configuration or golden fixtures without owner authorization.
