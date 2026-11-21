# ARCH-02D-B0 — baseline characterization of GameClock and RNG

Date: 2026-11-21. Stacked on [ARCH-02D-A1 #235](https://github.com/mryandexxx-spec/Dgoh-game/pull/235). Base runtime is the owner-accepted published v141 on `main=eb1385610f33a1130bfce00031a525b2dfd22443`.

**Scope:** add `dev/tests/ci/arch02d-b0-clock-rng-characterization.mjs` and its CI step only. Run on compiled **PWA and standalone HTML** under three runner timezones (`UTC`, `Europe/Amsterdam`, `America/Los_Angeles`). Reuse the existing `tests/lib/load.mjs` virtual Date, deterministic Math.random and strict native-shape Web Locks fixture. **No game code, version, root PWA, save, ESM, economy, engine, RNG or golden changes.**

## Baseline checks

| ID | Category | Legacy expectation *being characterized*, NOT a post-fix acceptance policy |
| --- | --- | --- |
| D001 | local wall date | `todayKey()`, `monthKey()`, trial weekday match the runner's local calendar |
| D002 | UTC versus local weeks | `weekNo()` rotates at UTC Monday while `cqWeek()` computes local Monday |
| D003 | month/leap day | existing month key / month length logic on Feb/Mar and leap year |
| D004 | deterministic shop | `dailyHeroes` seeded stock does not consume global loot `Math.random()` |
| D005 | **known P1** rollback | after -7d, `cq()` re-creates current-week state in RAM on a read, even though old state had completed nodes |
| D006 | same week | `cq()` returns existing progress without writing |
| D007 | negative/positive wall jump | no negative energy on -48h, but old timestamps persist; +48h fills to caps |
| D008 | seed fallback | `createBattle` with `seed:0` has historically fallen back to `Date.now()`; nonzero seed is deterministic |
| D009 | economic RNG | test call trace and outputs for `rollShards` and `trialRoll` are identical on identical injected global draws |
| D010 | calendar rollback | existing `loginCan()` prevents double-claim against saved future date |

## Risk grading and next work

- **P1 under investigation:** older `S.conq.wk` overwritten on read after backward device clock; determine whether this can produce duplicate week-specific claims and, if yes, solve through verified writer state, never through a speculative in-place migration.
- **P1/policy pending:** local time, DST, timezone and UTC trial-week rollover; changing every reset to UTC would silently change rotations, resource timing and deterministic daily shop inventory.
- **P1/policy pending:** offline `Date.now()` energy and stamina can be manipulated. `performance.now()` alone cannot provide trusted elapsed time between PWA processes.
- **RNG frozen:** seeded `sRng`, battle `mkRng`, `opts.seed || Date.now()`, global `Math.random` payout draw order and roundings. B0 only measures them. D-B2 may introduce injection after exact trace and 200-battle golden proof.

**Validation:** CI run PASS must be tied to this PR's **exact head SHA** and include `arch-strict`, both target test invocations and final gate. The tests are intentionally read-only with a v1 fixture; D005 sets simulated RAM, checks that the real disk snapshot is unchanged and releases the writer, so no user data is affected.

**Release boundary:** B0 does not alter the published v141. Do not merge or publish without owner confirmation and green exact-head CI.
