# ARCH-02C-B4-B4 — audit and B4a Conquest one-time reward settlement

Date: 2026-11-20. Exact parent: `main=54c3297a093881c85ca029893761011633664db8` (merged #224). **DRAFT — no merge, publish, version bump, save migration or golden updates.**

## Sources and architectural decision

Read `dev/ARCHITECTURE.md`, B4-B3/B3b checkpoints, `core/save.js`, `logic/rewards.js`, `logic/conquest.js`, frozen `ui/views/conq.js`, `ui/events.js`, `ui/rewards.js`, and the project change log. Ordinary production startup requires a native single-writer Web Locks lease; the B1 checkpoint stores byte-for-byte v1 primary with a verified backup-first envelope. B4-B2 exposes synchronous `loadSave.writer.transact(stage, presentationHooks)`, and B4-B3 queues `unlock` / `shardConv` presentation until verified commit.

The Conquest view is frozen (`ui/views/conq.js` blob SHA `e93d51583d00ff17762c98f3cb380773bd8b053c` on exact parent). A direct edit would breach its pinned source invariant. Adding an ESM adapter module would change the frozen 167-module chain and `split.config.mjs`. **Decision: B4a uses an inline, UI-owned, narrow adapter in already-existing `ui/events.js`, immediately before `cqClick(d)`.** The adapter runs only in gated sessions; the frozen legacy path remains for historic B0 characterization. To satisfy the pinned **1001 static ESM imports / 167 module positions / 898 named exports**, the already imported `ui/overlays/squad-select.js` widens its existing named Conquest imports and registers a read-only `openSquadSel.conquestClaimRules` bridge. The already imported `ui/rewards.js` exposes its existing mouse SVG renderer via `rewardWin.mouseSVG`. The event adapter consumes those existing functions; no new static import statement, module, named export, save key, or initialization-order change is introduced. Both registrations are UI-owned and only point to existing functions.

## Claim risk matrix and slices

| Operation | Existing risk | Allocation |
| --- | --- | --- |
| `data-cqst` stage reward | `tk.s*` and materials before unchecked persist, immediate popup | **B4a:** revalidate stage + token on detached candidate; grant then commit; show only if verified |
| `data-cqopen` chest | `Math.random` reward, `tk.c*`, `cqMax` and resources before unchecked persist + result modal | **B4a:** one atomic candidate, same RNG and loot tables; result modal only after commit |
| `data-cqdisk`, `data-cqnd` one-time disk choices | weekly route, disk collection and feat/stat side effects before unchecked persist | **B4b:** separately audit initial choice, route and counters |
| `data-cqbuy` cache and `data-cqjbuy` jihad store | payment and stock/one-time mark before unchecked persist, possible shards/UI notification or random disk | **B4b:** price and stock validation inside writer transaction, rollback on failed save |
| `data-cqrf`, `data-cqdoff`, `data-cqmed` | resource spend + energy/stamina mutations before unchecked persist | **B4b:** debit/stamina settlement, no compensating rerolls |
| `data-cqdiff`, `data-cqnode` | first-time week/route progression before unchecked persist | **B4b:** progression review; no gift until safe commit |
| `cqFinish` battle victory, one-time battle rewards and feats | inner `persist()` exists | **Covered via B4-B1** outer synchronous writer settlement; retain battle golden |
| Daily `claimLogin`, `claimQuest`, `claimChest`, daily aggregate `qall` | independent pre-confirm mutations | **B5**, not silently included in Conquest scope |
| Shop, upgrades, `doRefill` outside Conquest | independent pre-confirm mutations | **B6 / refill audit** |

B4a deliberately does not claim that every Conquest action is now safe. Until B4b, other Conquest item transactions can still be lost or acknowledged after failed writes. The UI's mandatory boot makes an unowned session fail closed, but does not make an unconverted mutator transactional.

## B4a verified behavior

1. UI event owner intercepts only `cqst` and `cqopen` before frozen `cqClick()`. If Web Locks gate is not active, preserve historical B0 characterization unchanged.
2. Invalid indices are rejected. Stage rechecks `cqStCan(j)` / `cqCanClaim(i)`, which compare current week, token and current score inside detached candidate. Stale/repeated input returns `commit:false` with no writes, RNG or presentation.
3. The stage applies the **identical** `cqStatic(j)` or `cqChest(i)` tables and one `Math.random()` array selection. Chest stage also writes token `tk.c*` and final-stat `cqMax` within that same candidate. Existing `giveRewards` grants shards/resources and `presentationHooks` defers only character unlock/conversion visuals.
4. `writer.transact` makes exactly one B1 verified checkpoint with backup-first readback. A denied/uncertain storage write, `SecurityError`, quota, lost lease or stale primary does not fall through into the original unchecked Conquest handler. Core retires unsafe realm as before.
5. Only after `tx.ok`: update reward track UI or show chest result with original markup; no prize modal on rejected/uncertain write. An ambiguous after-write where primary actually contains the claim is **not** replayed by the old realm; cold boot loads its persisted token and prevents a second claim.
6. The game still has no cross-device cloud authority, and does not claim atomic CAS against malicious noncooperating old writers.

## Acceptance

`dev/tests/ci/arch02c-b4-b4a-conquest-claims-acceptance.mjs` runs with standard native-Web-Locks mock startup **on both actual compiled PWA and single-file HTML artifact**.

- B431: intermediate token, resources, backup-first verified commit.
- B432: repeated intermediate button has no further writes.
- B433: RNG chest fixed + one extra prize, token, modal after commit.
- B434: stale/invalid chest attempts cannot duplicate.
- B435: backup quota rolls back intermediate reward.
- B436: backup SecurityError withholds random prize.
- B437: ambiguous after-write retires realm and cold boot rejects duplicate.
- B438: lost lease denies either claim.
- B439: final `cqMax` stat is granted exactly once.
- B440: primary read SecurityError prevents claim before RNG.

All previous B0–B4b tests, ARCH-01D strict, ESM/bundle, golden battles/meta/saves/screens, built PWA and artifact, SW/offline and 3D acceptance remain mandatory. Do not accept skipped checks or update pinned goldens.

## Next stage

B4b should prioritize disk node choice and both Conquest stores as a separate reviewable change, likely using the same existing `ui/events.js` seam. Each action must validate cost, stock, weekly state, route and ownership on the detached snapshot; side effects like feat NOTES (not in save) require explicit post-commit consideration. Do not alter frozen Conquest source without a new architectural approval. B5 handles the separate daily-claims family, B6 paid upgrades. No PWA reinstall is necessary for B4a; no deployment occurs before owner approval.
