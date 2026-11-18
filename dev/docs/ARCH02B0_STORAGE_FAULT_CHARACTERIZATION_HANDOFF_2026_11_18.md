# ARCH-02B0 — forensic storage fault characterization handoff

**Date:** 2026-11-18. **Status:** read-only characterization implemented in Draft PR #195, **not** a save safety fix. Pinned source: `main 2ef68623a001f5169daa3354931632fcf0d47c0f`, released **v137 / SW 0d811bb402**. Parent audit: Product Audit #120, ARCH-02 Issue #193, ARCH-02A Draft PR #194. Branch `audit/arch-02b0-storage-fault-characterization`. **No merge, release, PWA publish or version bump authorized.**

## Scope and exact source of truth

- New `dev/tests/ci/arch02b0-storage-characterization.mjs` invokes existing `dev/tests/lib/load.mjs` with the **actual built** `dist/pwa/index.html` and `dist/artifact.html`. Each test has its own Node VM, fake DOM and **new in-memory Map-based localStorage**. Test changes only the fake `getItem/setItem` functions and `g.store`. No browser profile or real save key is opened.
- `.github/workflows/validate-pwa.yml` adds **one** post-build step (same tests against BOTH targets), enabled when `needs.plan.outputs.mode != 'reuse'`. No existing jobs removed or skipped, no CI gate weakened. Because CI workflow was changed, the existing CI planner requires the **full** regression set. Independent `arch-strict` remains unconditional, with the strict zero-ledger baseline.
- No `dev/src`, `dev/version.json`, `dev/tools/split.config.mjs`, `dev/tools/arch-import-baseline.json`, `tests/golden`, camp, Campaign 210/21 maps, graphics, rewards, game RNG or root PWA files were modified.

## Executed characterization — 17 checks on each of two full builds

**Evidence:** [actual PWA/artifact build and B0 test step, CI #44332263107](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44332263107/job/134900610142) shows **17/17 PASS for PWA and 17/17 PASS for artifact**: 34 scenario executions. In this document `PASS` means the unsafe **historical v137 behavior was reproduced**. Do not confuse this with passing the proposed ARCH-02B1 fail-closed acceptance contract.

| IDs | Source-backed experiment | Observed baseline v137 outcome | Classification |
|---|---|---|---|
| S01 | empty fake store, `start({})` | legitimate new v1 save written | positive compatibility |
| S02, S03, S04 | three existing `fixtures/saves`: 01-legacy, 02-mid, 03-late; load and start | all load, original water/solari preserved and valid v1 saved | positive compatibility; full golden separately |
| S05, S06 | `getItem(SAVE_KEY)` throws `SecurityError` or injected generic error, but writes permitted | `loadSave()` returns null; boot selects newSave and overwrites former primary bytes | **P0 mechanism CONFIRMED**, actual browser frequency unproven |
| S07 | truncated, nonempty JSON `{"v":1,"roster":` | loader returns null, boot overwrites raw invalid bytes with new starter | **P0 mechanism CONFIRMED** |
| S08-null/array/noversion, S09 | nonempty parseable `null`, `[]`, no v, unsupported v=2 | all treated as absent and replaced with fresh account | **P0 mechanism CONFIRMED** |
| S10 | v1 object with `roster:null` | nested shape error swallowed, new account persisted | **P0 mechanism CONFIRMED** |
| S14-QuotaExceededError, S14-SecurityError | `setItem` always throws for progress key | `start` and `persist()` return normally; in-memory currency +17 while bytes remain unchanged | **P0 failed-write acknowledgment gap CONFIRMED** |
| S13 | introduce cyclic S reference in isolated VM then invoke `persist0()` | failed stringify is swallowed; stored bytes remain older version | **P1 serialization error gap CONFIRMED** |
| S15 | boot with valid fixture + all progress writes fail | `start({})` returns normally, storage remains old even though live initialized S diverges | **P0 startup write-feedback gap CONFIRMED** |
| SAVE-08 | two VM instances load same state, A commits +100; B keeps stale S and commits +3 into shared simulated store | committed +100 overwritten by old+3; lost update of 97 | **P1 hypothesis substantiated in stale-write model**; requires real-tab race test |

**Important limitation:** S05/S06 intentionally inject a `getItem` error while `setItem` still succeeds. In Safari both may be blocked by the same policy; the B0 test establishes unsafe handling logic, not the probability of that exact runtime combination. Single-key `localStorage.setItem` is synchronous; B0 does not claim that a normal interrupted write creates a half-written JSON string. Whole-origin deletion remains unrecoverable without independently exported backup.

### First characterization run failed because of an invalid assertion in the new test

[CI #44331753015](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44331753015): independent `arch-strict` SUCCESS and build succeeded, but B0 assertion at old `arch02b0-storage-characterization.mjs:55` wrongly required `JSON.stringify(S)` to equal persisted bytes after `start()`. Current `core/boot.js` persists before `render()` and render can lazily initialize `S.conq`; this does not imply the earlier save operation failed. Corrected test compares durable resource invariants instead of assuming post-render memory is a durable checkpoint. **No production code was changed.** This exposes a potential separate bootstrap deferred-initialization concern for B1 characterization, not proof of lost rewards.

### Full CI beyond the B0 diagnostic

- [Run #44332263107](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44332263107): B0 34 scenario executions PASS, arch-strict PASS, build PASS, existing goldens 200 battles/meta/saves/41 screens PASS, Campaign 2.0 PASS. Other jobs are recorded in the actual GitHub run; verify its final gate at the moment of acceptance.
- **First full attempt** had an unrelated **Arena animation** failure: `tests/smoke/arena-animation-recovery.mjs:71`, "flash-expired HUD projection drift u0" in 667×375 after 844 MED passed; [job #134902138144](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44332263107/job/134902138144). There is **no Arena source or test change in the PR**. Final gate of attempt 1 failed closed as expected. No tests were relaxed and no golden was updated.
- A **targeted rerun of only the failed Arena job** was requested under run attempt 2. Inspect [run #44332263107](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44332263107) for the factual rerun result; do not call this full CI green unless the final gate explicitly says SUCCESS. Documentation updates on the PR may trigger a newer CI run, which must be inspected independently.

## ARCH-02B1 proposal — separate approval required

Suggested **smallest safe next packet** after owner approval is **fail-closed load/boot** (not all transaction rewrites at once):
1. Add a typed result from an isolated storage read: `missing` vs `ok` vs `corrupt`/`unsupported`/`unavailable`. Preserve the existing public v1 key, and historical `loadSave` export compatibility without ESM/hoisting changes.
2. Only `missing` plus verified usable storage allows `newSave()`. For errors and nonempty invalid bytes, do not call `persist`/`newSave` or lose original raw bytes; offer recovery/retry and manual export without changing the protected Camp.
3. Separate a low-level write success/error result (`quota`, `security`, `serialization`) and demonstrate it on B0 S13/S14/S15; do not announce a critical transaction successful merely because `persist` returned. Integrating all spend/claim callers into atomic durable transactions is a larger C package and needs an explicit migration strategy.
4. Convert these same B0 *characterization expectations* into fail-closed acceptance tests in the B1 PR; **do not delete the historical evidence or silently weaken assertions**. Run positive legacy fixture/golden tests for PWA and artifact unchanged.
5. Preserve independent `arch-strict`, zero reverse edges, `legacy: []`, 167 historical ESM markers/898 names and SCC [60,11,6,3] pending explicit graph proof; strict full CI, no protected assets, unchanged balance/RNG.

**GO for B1 design only:** exact permanent backup/verification policy, user-visible error and initialization path, VM deterministic fault injection, all old save fixtures/golden with no destructive overwrite, and clear rollback preserving bytes. **NO-GO:** any original bytes discarded on malformed/read-fault state, false success after write failure, new mandatory schema without backward migration, baseline/golden rewrite, bypassed CI, change to Camp. Physical standalone Safari/WebKit iPhone remains OPEN.

## Restart instructions

1. Check HEAD main and this Draft PR #195 actual files, commits and latest CI attempts/steps; do not assume queue/rerun succeeded.
2. Read `dev/docs/ARCH02A_SOURCE_AUDIT_2026_11_18.md`, `ARCH02A_SAFETY_CONTRACT_2026_11_18.md`, `ARCH02A_REGRESSION_MATRIX_2026_11_18.md` from Draft PR #194, current `dev/ARCHITECTURE.md` and `dev/docs/ci/STAGE3_MINIMAL_SCENARIOS_AND_PROMOTION.md`.
3. Owner approval is required before implementing B1. B0 itself contains **zero** game-runtime changes and needs separate explicit owner direction before merge/release/publish. CI failure remains a blocker, never reinterpret it as pass because the failure is probably unrelated.
