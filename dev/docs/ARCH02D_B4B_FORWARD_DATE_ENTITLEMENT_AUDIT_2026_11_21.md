# ARCH-02D-B4b0 — forward calendar replay and entitlement-loss audit

**Date:** 2026-11-21. **Base:** `main=a4c554b88c4c865a4165ed42af2d31e5df06f051`, merged [ARCH-02D-B4a #240](https://github.com/mryandexxx-spec/Dgoh-game/pull/240). Published PWA remains **v141**. Prior source audits and protection contracts: [A1](ARCH02D_A1_GAMECLOCK_RNG_SOURCE_AUDIT_2026_11_21.md), [B1](ARCH02D_B1_CONQUEST_ROLLBACK_GUARD_2026_11_21.md), [B2](ARCH02D_B2_GAMECLOCK_DAILY_SNAPSHOT_2026_11_21.md), [B3](ARCH02D_B3_SESSION_REGEN_CLOCK_2026_11_21.md), [B4a](ARCH02D_B4_OFFLINE_TIME_POLICY_2026_11_21.md).

## Scope and threat

B4a proved that independent real offline time and a pre-launch forged `Date.now()` cannot be distinguished using the local browser clock. B4b0 now isolates a **different, actionable harm**: advancing the device calendar may overwrite a legitimately earned progress ledger when normal verified checkpoints follow a date-sensitive read. Save transactions can be correct while writing *the wrong candidate derived from forged time*. A good verified writer cannot authenticate the device calendar.

The following is the **actual current source behavior** (all are untrusted local dates):

| Consumer | Exact read/mutation | Risk and policy |
| --- | --- | --- |
| Conquest `logic/conquest.js:cq()` | On local Monday newer than `S.conq.wk`, **a read** allocates a new `S.conq` and drops prior `done`, `tk`, route, disk and run state. B1 protects only newer *saved* weeks against backwards resets. | **P1 progress erasure** if a normal checkpoint persists the new RAM state after a forged or mistaken forward clock. On rollback B1 correctly preserves the already persisted future run, but cannot restore the old one. A separate safeguard must prevent discard of verified earned tokens; do not rewrite week rules silently. |
| Trials `logic/trials.js:trialRunsToday()` | On **any** local-day mismatch, clears `S.trialRuns.n` without ordering guard, including a return to a previous day. `trialLeft()` and verified Trial rewards use that mutable ledger. | **P1 repeated attempts / eligibility and lost attempts ledger**, despite transaction atomicity. Calendar must be protected without denying legitimate timezone/DST travel indefinitely. |
| Shops `ui/views/shop.js:buysToday()` | A read-only stock screen uses `shopLeft()` without resetting the ledger; the mutable `buysToday()` path clears existing daily purchase counts on any mismatch. | **P1 paid limit replay** across forward/back date flips. Verified purchases still charge atomically; their calendar eligibility is not authoritative. |
| Daily quests `logic/daily.js:dly()` | A future device day clears current day's quest ledger, but backwards device day refuses to roll it back. B5+B2 bound claim to a verified one-operation date snapshot. | No double claim on stale click, **not** proof of correct future-day reward entitlement. |
| Login `ui/overlays/calendar.js` | Previous claim/month ledger plus B5 transaction checks deny older days/months; new months still rely on local time. | Do not claim true forward-clock resistance; preserve valid old saves and login token order. |
| Calendar/Trial weekly rotation | Conquest weeks use **local Monday**; Trial hero rotation uses **historical UTC week formula**, while availability uses local day. | Never normalize all rotations to UTC or alter shop seeds and RNG without owner-approved behavior policy. |

## Prioritization / proposed next implementation (NOT in this PR)

**B4b1 proposal: prevent destructive forward-week Conquest *read* effects.** The first change should make an ordinary screen read incapable of permanently erasing a verified old run solely because the observed week appears later. A week rollover must be decided at a protected write with an explicit rule for what history is retained/recoverable; ordinary genuine Monday must still give access to its new run. This needs a precise data/migration/backwards-week policy and full J1, rewards and transaction review. Do not move the rollover blindly into a different function; that could break Monday claims or replace the same record at the next writer checkpoint.

**B4b2 proposal: protect Trial and shop daily ledgers against arbitrary day reversals.** A monotonic **calendar entitlement** guard (as in Conquest B1) is a candidate, but a future forged day could then deny honest users access until their clock catches up. Alternative is a per-date immutable history, with bounded retention and safe legacy-v1 migration; this affects save shape, limits and retention policy. Both require owner agreement. Preserve existing 3 Trials per day and shop prices/stock/rotations; never award or claw back resources on clock diagnostics.

**B4b3 optional online time diagnostics:** HTTPS response observation, if available and not SW-stale, may warn of egregious skew, but does not prove offline duration or license forced denial. Signed server-issued entitlement tokens would require a separate backend/product and explicit fallback for fully offline users. No source in this PR pretends browser `Date`, `performance.now()`, cache or localStorage is trusted.

## Safe B4b0 packet (characterization only)

- Add `dev/tests/ci/arch02d-b4b-entitlement-clock-characterization.mjs` scenarios **B411–B417**, reusing actual compiled PWA and standalone HTML with native-shape verified writer in `UTC`, `Europe/Amsterdam`, `America/Los_Angeles`.
- B411 shows in-memory Conquest forward-week reset with persisted previous checkpoint preserved *until write*; B412 shows why a **verified future-week checkpoint and later rollback** cannot recover that run; B413 pins legitimate local-Monday reset; B414 demonstrates Trial day-forward/day-back attempts ledger replay; B415 shows read-only shop screen vs mutable paid ledger; B416 confirms existing daily-quest backward guard; B417 confirms B1 backwards-week claim guard.
- These are **expected known vulnerabilities under characterization**, not fixed anti-cheat claims. The test never awards/replays actual rewards and never disables prior strict, Golden, WebGL, PWA offline or final gates.
- Only documentation, CI and tests change; **no runtime source, version, RNG, balance, cap, `dune-goh-v1` field, backup/restore, Web Locks, worker or published release change**.

## Handoff / decisions

A proposed behavior change must answer: (1) when a new verified week can become active; (2) how an already-verified previous-week run survives a forward-spoof and subsequent clock correction; (3) how preexisting `dune-goh-v1` backups/imports migrate with zero unrecoverable resource loss; (4) whether a merely backdated honest traveler should be temporarily blocked; (5) how a purely offline PWA communicates that the clock cannot be trusted.

**Do not introduce a hidden offline-time cap, forced server validation, silent rejection, resource clawback or full calendar replacement.** In particular, preserving honest offline Water/Candle/Resolve/Stamina remains non-negotiable.

Draft until exact SHA Fast and Full SUCCESS, including `arch-strict`, all Goldens and final gate. No merge without owner approval. **No PWA release or reinstall**; v141 remains the approved published version.
