# ARCH-02D-B4a — cross-session PWA time audit, explicit trust boundary and characterization

**Date:** 2026-11-21. **Base:** merged ARCH-02D-B3 [PR #239](https://github.com/mryandexxx-spec/Dgoh-game/pull/239), verified `main=4022f98dda1005649cad9cde39c284dfc2e2d4a4`. Published PWA **v141** unchanged. Source checkpoints: [A1](ARCH02D_A1_GAMECLOCK_RNG_SOURCE_AUDIT_2026_11_21.md), [B0](ARCH02D_B0_CLOCK_RNG_CHARACTERIZATION_2026_11_21.md), [B1](ARCH02D_B1_CONQUEST_ROLLBACK_GUARD_2026_11_21.md), [B2](ARCH02D_B2_GAMECLOCK_DAILY_SNAPSHOT_2026_11_21.md), [B3](ARCH02D_B3_SESSION_REGEN_CLOCK_2026_11_21.md).

## Architecture and source audit (2026-11-21)

- `logic/economy.js:regenNow()` uses in-memory `regenAnchorWall = Date.now()` and `regenAnchorMono = performance.now()`. `core/boot.js:start()` anchors it after verified native Web Locks startup. During *one process* `regenNow()` ignores later wall-date changes and follows nondecreasing `performance.now()`.
- When the PWA process is closed or the device restarts, these anchors are lost. A new boot calls `Date.now()` again. `core/state.js:tickWater`, `logic/conquest.js:cqEn/cqSta` compare that boot-derived wall epoch with the existing v1 wall timestamps. `logic/progress.js`, paid refills and resource UI have B3's in-session protections.
- `logic/conquest.js:cqWeek/cq()` uses **local Monday** and B1's backwards-week guard. A newly observed *forward* local Monday creates a fresh run in RAM before verified checkpoint; weekly track/chest tokens stay in the old serialized run until a save. This is a genuine forward-clock attack surface, not fixed by B1.
- `logic/daily.js:dly` and verified B5 daily/calendar claims use **local day/month**, with backwards-date guards and B2 per-transaction fresh snapshots. `logic/trials.js:trialRunsToday` rotates on local day; `weekNo()` and rotating Trial heroes use the pre-existing UTC-week equation; `ui/views/shop.js:buysToday/shopLeft/dailyHeroes` use the **local** day (including deterministic daily seed).
- `core/save.js` continues to load/write `dune-goh-v1` and existing UTC-epoch millisecond timestamps, with no trusted clock metadata. The ARCH-02C verified checkpoint and rollback/uncertain-write guarantees, mandatory Web Locks, and recovery/export/import must remain unchanged.

## Real scenarios, severity and B4a outcome

| Scenario | Observation / known limitation | Policy for B4a |
| --- | --- | --- |
| Honest 48-hour absence; restart or device reboot | Offline time restores resources at unchanged rates up to old caps. | **Preserve fully**, including old v1 stamps. |
| +48h system clock before next launch | Indistinguishable from real absence when only local data are available; resources can fill to cap. | **Known open anti-cheat risk**; do not silently reduce legitimate offline progress. |
| -48h system clock before next launch | Future saved timestamps suppress subsequent elapsed-time gains, but do not deduct existing resources. | Preserve saved balances and timestamps; no speculative rewrite or compensation. |
| Spoofed launch then clock corrected mid-session | Session anchor still reflects boot time, preventing additional within-session spoof effects; already credited amount is not reversed. | No clawback or negative resource. |
| Reload/tab close then reopen | A separate JS realm reanchors monotonic time; Web Locks still require a real writer lease. | Characterize separate process; no claim of trusted passage of time. |
| Time zone change | The same Unix epoch is unaffected, but local daily/Conquest/Trial/shop boundaries can move. | Keep original day, local-Monday and UTC-Trial policy until owner approves change. |
| DST ±1h | Actual elapsed milliseconds on a 23/25h day differ from civil 24h; B2 next-local-midnight remains independent. | Preserve rates in milliseconds and no lost capped offline resources. |
| Very long absence | Restores to normal cap, not arbitrary unbounded resources. | Never truncate honestly accumulated resources. |
| Legacy backup import or recovery | Historical v1 timestamps have no proof of clock validity; old saves have no trusted time fields. | Preserve import, state shape, deterministic RNG and rollback recovery; do not insert trust bits. |
| No network / cached PWA | No guaranteed authoritative time. | Game and protected checkpoints must continue fully offline. |
| Conquest forward week | Date spoof can cause new in-RAM run and later verified reset, potentially opening another cycle of weekly entitlements. | **P1 product/security follow-up**, no broad week-policy change in this packet. |
| Daily quests/calendar, Trial attempts, rotating shops | Date spoof can rotate allowed day/week and seed; B2 snapshots/B5 checkpoints prevent same-operation staleness, not arbitrary forged dates. | **P1/P2 follow-up**; preserve balances, costs, claim tokens and deterministic seeds. |

This matrix distinguishes **safety of saved resources** from **anti-cheat**. A cap does not make a manipulated clock trusted. An offline client cannot prove a historical duration without an independently verifiable clock anchor; a local flag, localStorage sentinel, `Date.now()-performance.now()`, or last-run timestamp can also be forged/reset and can unfairly penalize travellers, restored devices or genuine offline users.

## External time without mandatory game server: feasibility

An *optional* live HTTPS time observation (same-origin uncached `Date` response header or a dedicated HTTPS time endpoint) could detect **some accidental/drastic local skew** when online. It cannot guarantee full authority: the browser may serve stale SW/HTTP cache content, headers can have coarse precision, devices can be offline for long periods, request latency is nonzero, and an attacker who controls browser/runtime/storage can fabricate either side. Merely fetching an unauthenticated remote HTTP `Date` header is **not** a persistent, tamper-proof token. A signed timestamp/monotonic counter verified against a trusted key plus online freshness rules would increase assurance but introduces a new service/trust/privacy/product dependency and cannot independently prove full offline duration. Never promote a cached old observation to current authoritative time.

**Decision requested before any enforcement:** owner must choose among (A) current unlimited-*duration* offline regeneration **up to unchanged caps** (fairness first; forward-clock exploits accepted); (B) optional online time checks that only show non-blocking diagnostics (no lost offline progress, not anti-cheat complete); or (C) authoritative service-based entitlement/clock policy with an explicit offline grace/repair/migration design. A hard offline limit, clock-rollover denial, remote requirement, resource clawback or resetting timestamps is **not approved** by the current task and requires separate product sign-off with recovery/compatibility plan.

## First safe implementation packet: B4a (non-runtime)

Only add `tests/ci/arch02d-b4-offline-clock-characterization.mjs`, CI invocations, this audit checkpoint and a status entry. It is deliberately **characterization-only**: no production code edits, no new fields, no ESM ABI change, no balance/rate/cap changes, no new RNG draws, no save migration, no change to `dev/version.json`, root PWA, `app.js`, `sw.js` or Pages deployment.

Tests B401–B410 exercise:
- honest offline recovery and verified v1 reopening, plus **expected known spoof equivalence**;
- backwards restart preserving balances, clock correction within a new session;
- same-week Conquest Resolve/stamina and token retention, **known** forward-week reset in RAM while saved bytes remain unchanged;
- legacy local daily/Trial/shop rotation on forward day (not treating it as a proven secure clock);
- 23/25-hour DST transitions and resource caps;
- old v1 import/reopen with exact save keys;
- no-network boot with native Web Locks.
Execute on both **real compiled PWA and standalone HTML** in `UTC`, `Europe/Amsterdam` and `America/Los_Angeles` in **Fast and Full CI**. Keep B0–B3/B5 tests and strict architecture, Golden 200 battles/41 screens, WebGL and offline checks. Real device clock/reboot and physical Safari remain *manual acceptance*, not simulated test claims.

## Merge and release policy

Draft PR only until **Fast and Full CI SUCCESS at exact head SHA**, including `arch-strict` and final gate. Do not merge without owner confirmation. Do not publish v142 or ask the player to reinstall PWA: published v141 remains the last approved version. Later B4b implementation must receive a specific, non-punitive offline-time policy and cover imports, rollbacks and transaction recovery before changing behavior.
