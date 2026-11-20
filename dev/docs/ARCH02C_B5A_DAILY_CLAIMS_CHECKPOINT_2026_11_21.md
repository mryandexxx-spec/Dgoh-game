# ARCH-02C-B5a — daily quest and chest verified claims

Date: 2026-11-21. Base main `f309520e46776f48e8881b58ad4e72802aa79269` (B4b2 #227 merged). **DRAFT IMPLEMENTATION, NOT MERGED, NOT PUBLISHED**. No save v1 migration, version bump, golden update or PWA reinstall.

## Confirmed source-path audit

Read `dev/ARCHITECTURE.md`, `dev/CHANGES_STATUS.md`, B1/B2/B3/B4 checkpoints, `core/save.js`, `logic/daily.js`, `logic/rewards.js`, `logic/economy.js`, `ui/views/daily.js`, `ui/overlays/calendar.js`, `ui/rewards.js`, `ui/events.js` and fast/full CI.

| Operation | Preconditions and state change | Former failure | B5 disposition |
| --- | --- | --- | --- |
| Single quest `data-qclaim` | Current day, active quest, threshold, `daily.got[k]`, resources, +10 XP/account level rewards | Live `S` changed before unchecked `persist`; quota could leave prize uncommitted | **B5a:** detached writer transaction; recompute readiness, token and day before grant; one backup-first checked write |
| Collect all `data-qall` | All active ready quests, every `daily.got`, currency and XP | Repeated individual `persist()`: partial batch, stale clicks, mid-batch failure | **B5a:** one detached candidate and one write; only active quests; no partial receipt |
| Day chest `data-qchest` | Seven claimed daily quests, `daily.chest`, seal, random 50–300 cry, solari | Marker and RNG grant before unchecked persist; ambiguous write could reroll | **B5a:** threshold and token checked inside candidate, original `Math.random()` and rounding executed once per eligible attempt; on uncertainty retire writer, never retry automatically |
| Daily date reset `dly()` | `daily.d`, counters, tokens and chest reset when local date changes | Device date rollback would resurrect prior state | **B5a:** do not replace a future-dated daily record when client date moves backwards; a claim requires exact current date |
| Level-up notification queue | +10 quest XP can append `ACC_UPS` (outside `S`) and reward hook callbacks | Detached save rollback would leave uncommitted presentation queued | **B5a:** restore original `ACC_UPS` length on any refusal/failure; `giveRewards.presentationHooks` queues unlock/conversion until verified commit |
| Calendar login `data-calclaim` | `login.m/n/last`, reward of current hero, date/month boundaries | `loginState` and `claimLogin` mutate `S` before unchecked write; month reset and repeated tap | **B5b:** separate PR for period reset, sequential grant, race/uncertain handling |
| Quest progress `quest(k,n)` | Many battle/shop/upgrade sources increase daily progress | Some outer B4 transactions protect counters, but B6 and other legacy paths may still mutate before unchecked writes | Audit register retained; B5b/B6 must protect each originating outer operation, never nest a second writer transaction |

## Implementation contract

The production boot enforces native Web Locks. Only gated sessions use `loadSave.writer.transact(stage, giveRewards.presentationHooks)`. The ungated legacy branches in `claimQuest/claimChest` are intentionally retained for the historical B0 forensic test only, not a fallback after a failed writer transaction. Readiness is rechecked against the detached candidate. Transaction result is required before `refreshAll` and `rewardWin`. Failure, quota, SecurityError, stale owner, primary readback uncertainty or exception cannot acknowledge success. A refused or uncertain write leaves original live `S` in place and the writer mechanism retires the session.

The existing `ui/events.js` import of `claimQuest` reuses the function property `claimQuest.all`, keeping named ESM exports and module edges unchanged. `renderDaily` remembers the date of the currently drawn screen on function properties, not in HTML, so stale overnight buttons are refused without changing the pinned screen DOM golden. `logic/daily.js` declines backwards date reset; a forward date still requires a new day's genuine counters and tokens. `accGain.pendingQueue` exposes the preexisting transient `ACC_UPS` for lossless rollback, without a new import.

**Trust boundary:** the application is offline, based on the client's wall clock and v1 save with no trusted server time or durable multi-day journal. It cannot cryptographically prevent a player from advancing the device clock into arbitrarily future dates, deleting local data, or restoring an old external backup. B5a's same-day/replay/rollback protection is not server-authoritative anti-cheat; do not claim otherwise.

## Acceptance and CI

`dev/tests/ci/arch02c-b5a-daily-claims-acceptance.mjs` contains B501–B514; each must pass on the actual compiled `dist/pwa/index.html` and standalone `dist/artifact.html` in both the fast mandatory-writer workflow and Full Validate:

- single claim reward/token/XP/backup one-write; replay and stale rendered day;
- insufficient conditions, unknown claim, inactive quest, bulk once-only atomicity;
- backup quota and primary SecurityError, including external transient level-up notification queue;
- random chest fixed+RNG grant and token, replay without a second roll/write;
- ambiguous after-primary write and exact cold-boot no replay;
- Web Locks lease loss and backwards clock protection;
- cold-boot single claim stays claimed.

Historical B0 intentionally unsafe checks must remain as baseline (only ungated, no normal boot). Pinned golden, strict architecture, PWA offline/standalone, broader regression jobs stay mandatory and must not be weakened.

## Remaining B5b and release gates

B5b: verified sequential login/calendar reward and month resets; investigate local-time rollback vs period claims, and all quest-progress producers outside already protected B4 outer transactions. Later B6: shops, upgrades, refreshes and legacy resource writers not covered by B4/B5a. No deployment, no main merge, no v1 migration, no PWA reinstall until explicitly approved. Real iPhone Safari offline/cold boot/time rollover and Web Locks need physical user acceptance following a separately approved release.
