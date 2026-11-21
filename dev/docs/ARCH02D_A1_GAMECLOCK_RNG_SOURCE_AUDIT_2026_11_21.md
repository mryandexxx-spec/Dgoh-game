# ARCH-02D-A1 — audit of GameClock, reset boundaries and RNG

**Date:** 2026-11-21. **Base:** `main=eb1385610f33a1130bfce00031a525b2dfd22443`, validated published **v141**, SW `b80d378ad3`; [official release CI #44880285285](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44880285285), [independent Pages #44883517263](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44883517263). Source-level investigation only, not a live Safari test. Parent [ARCH-02 #193](https://github.com/mryandexxx-spec/Dgoh-game/issues/193), [product roadmap](PRODUCT_AUDIT_ROADMAP_2026_11_16.md), [deterministic RNG boundary](ARCH01C2C_DETERMINISTIC_RNG_BOUNDARY_2026_11_16.md).

## Decision/constraints

This A1 PR is **docs-only**, no new clock, no behavior changes, no modified version or published root. Preserved contracts: `dune-goh-v1` + exact save fixture roundtrips, strict zero-debt architecture, 167 ESM module markers and public export ABI, Campaign 210 `NODES` fingerprint, 200 battle and 41-screen golden, all probabilities and sequences (including intentional runtime `Math.random` calls). Owner explicitly authorized starting 02D audit, not a rewritten economy or irreversible calendar semantics.

**Key fact:** no `dev/src/core/clock.js` currently exists. Calendar/time consumers directly query `new Date()` and `Date.now()` at independent moments, and several reward streams use global `Math.random()`. There already are two deterministic seeded implementations (`data/seeded-rng.js` and `logic/battle/engine.js`) with important historical ordering constraints.

## Clock inventory (source lines refer to reviewed v141)

| Consumer | Evidence / current semantics | Risk / priority |
| --- | --- | --- |
| Daily/refills | `logic/economy.js:14-16` uses **local** `new Date().toDateString()`; `logic/daily.js:24-32` rotates daily task state on changed day and guards a *backward* saved date with `Date.parse`; `ui/views/daily.js:15-16,103` independently obtains current local day and next midnight. | **P1 consistency** if midnight occurs between read, stage and verified commit; duplicate/skip claim checks depend on display stamping. Review existing B5 acceptance before implementation. Same-zone backward date guard exists for quests, but not proof of authoritative date. |
| Login calendar | `ui/overlays/calendar.js:18-20,27-59,67-95`: month/year/day read multiple times, displayed day stamp, verified claim with saved `last` and monthly backdating guard. `core/boot.js:94` delayed modal can open above other UI. | **P1 consistency**, especially month boundary/timezone switch; stale modal should fail closed, confirmed B5b protections must not regress. UI overlay timing also exposed a flaky E3 hit-test during v141 CI (passed on retry), but this is not clock-safe proof. |
| Weekly Conquest (Джихад) | `logic/conquest.js:27-38` derives **local Monday** via `setHours(0)`, `setDate()`, `toDateString()`. **`cq()` recreates S.conq whenever `wk !== cqWeek()` including *clock rollback* to earlier week**. Also `enTs` and stamina timestamps originate from `Date.now()` in `logic/conquest.js:30-53`. | **P1 potential reset-on-rollback**: a backward device week can clear current weekly run/entitlements and may allow re-entry to earlier weekly logic. Verify actual claim/session flows and decide fail-closed week progression; do NOT silently change/reset live v1 state. |
| Trial rotation | `logic/trials.js:9` computes week number using `Math.floor((Date.now()/864e5+4)/7)` (UTC-aligned epoch week), while `trialOpen` at line 39 uses **local weekday** and attempts reset by local `todayKey()` (line 42). | **P1 rotation mismatch**: UTC-based rotating hero can change at a different instant than local weekly Conquest and local-day trial access. Keep current release semantics until owner-approved policy; compare legacy boundary fixtures. |
| Shop rotation/limits | `ui/views/shop.js:25,27,34,45,80`: local day string seeds deterministic `sRng(ghash(todayKey()+tag))` for hero pools, prices/stock and ledger checks; current shop stock is read again when purchases are staged in verified writer transaction. | **P1/P2** at timezone/day shift; same physical UTC instant can yield different local inventories. Avoid changing seed bytes before exact Golden proof. |
| Energy regeneration | `core/state.js:6-10` uses wall timestamp deltas to regenerate water/candles; `logic/progress.js:12` refreshes before spending. `logic/conquest.js:42-53` likewise regenerates Conquest resolve/stamina using `Date.now()` and persisted timestamps. | **P1**: jump **forward** can grant arbitrary offline regeneration to cap (and jump backwards can freeze/extend cooldown); currently no trusted elapsed-time source. Values are capped but untrusted; monotonic `performance.now()` works only per process, not across PWA relaunch. |
| Save initialization | `core/save.js:15,18` sets initial `waterTs` and `candleTs` from `Date.now()`. | Preserve existing key/value shape and old-save default behavior. |

## RNG inventory and sequence invariants

| Stream | Evidence | Non-negotiable contract |
| --- | --- | --- |
| Campaign map / deterministic art | `data/seeded-rng.js:3` contains pure `sRng`; `core/rng.js:3-9` is an order-preserving wrapper; `data/campaigns.js` and `logic/gear.js:25` use `sRng(ghash(...))`. | **Never** replace with global `Math.random`, alter hash/seed, change initialization/Esm slots, or mutate the exact 210-mission `NODES` digest. |
| Conquest deterministic layout/shops | `logic/conquest.js:64-100,203-209` seeds `sRng` from weekly local-date string, difficulty, level/key and other context. | Freeze seed text, draw ordering, chest layout and shop/route options. |
| Battle | `logic/battle/engine.js:14-21` `mkRng(seed)` and `createBattle(...,{seed})` fall back to `Date.now()` if `opts.seed` is falsy; `B.rng()` drives turn order/hit/crit/damage. `opts.seed=0` currently intentionally falls through due to `||` and must be characterized before fixing. | Exact historical `mkRng` sequence, initialization and default seed behavior for existing callers; 200 fixed battle goldens. |
| Payout RNG | `logic/economy.js:32-53` random shard/signal/mission drops; `logic/gear.js:60-78` gear/fragments; `logic/trials.js:49-55` trial drop count/chance/fragment selection; `ui/views/daily.js:73,86` chest crystals. | **Order and number** of global `Math.random()` draws, probability, pity updates, distribution, and commit timing. B4/B5 transactional retry policy must not reroll after uncertain writes. |
| UI-only random | `logic/conquest.js:20` uses `Math.random` for notification IDs in RAM notes. | Differentiate from economic RNG; verify any stream coupling before injection. |

## Threat model and initial findings

1. **Clock is not authoritative.** Offline PWA cannot prove real elapsed time, date, or timezone; a dependency-injection interface improves deterministic tests and single-operation consistency, not server-grade anti-cheat. Do not promise prevention of deliberate clock spoofing.
2. **Weekly rollback is a specific P1 candidate:** `S.conq.wk !== cqWeek()` resets the run even when observed week is earlier. Investigate entitlement and double-claim paths under verified writer before deciding remediation. The B5 daily and calendar backdate protection is narrower and should not be projected onto weekly Conquest.
3. **UTC/local mixed semantics are observable:** trials hero rotation (UTC epoch week) vs local weekday/daily reset vs Monday Conquest; using a single UTC date everywhere would change live game mechanics and shop seeds. First capture a matrix of established behavior.
4. **No universal RNG stream today.** Deterministic battle RNG and seeded rotations coexist with `Math.random` payouts. A new module that caches RNG or changes callers can silently shift outcomes. Prefer a narrow injectable provider with default direct delegation to the **existing** `Math.random` and Date at **the original invocation point**, no prefetch or reordered reads; prove draw counts with counter instruments and all Goldens before implementation.
5. **Clock jumps** affect offline energy regeneration; a capped resource still accrues against a manipulated timestamp. Do not add backwards-correcting persisted fields without explicit v1 compatibility contract and writer-checkpoint interaction.

## Proposed implementation packets (not yet started)

**D-B0 characterization tests first**: source-level and real compiled PWA+HTML read-only measurements for exact legacy times/seeds and RNG draw order, including UTC/local midnight and timezone / DST boundaries. No edits to runtime/time policies. Golden digest baselines captured before edits.

**D-B1 GameClock seam**: introduce a tiny injectable/overrideable time provider (default original wall-clock), no extra saved field; consumers switched **one at a time**, beginning with day/week read contexts with verified writer ownership. Pin single-snapshot acquisition per transaction; preserve all existing local-date strings and Monday/UTC-week formulas. Explicit backwards/forwardwards outcomes determined per product policy after characterization.

**D-B2 RNG seam**: instrument a provider that delegates to `Math.random()` for loot at the same call points; keep seeded `sRng` and battle `mkRng` byte-identical. Only make a source change when real PWA+HTML acceptance shows exact call count, sequence, drops, pity and golden consistency, including a seed-zero case explicitly classified as historical behavior.

**D-B3 boundary hardening**: only after evidence, protect weekly rollback/rollover and cross-timezone open sessions in writer-checkpointed transactions without resetting `S.conq` merely on read. Test separate day, month, week, DST, UTC/local offset, forward/backward clock jumps, tab reload/save import; no unapproved reset policy or server-time claims.

**D-C release handoff**: full strict architecture, 167 ESM marker order/898 exports, frozen campaign SHA, Golden 200 battles/meta/save/41 screens, PWA + artifact stress, offline/SW, actual Chrome two-tab. Physical iPhone Safari remains owner acceptance. Version bump/public release requires separate explicit authorization.

## Proposed acceptance matrix

| ID | Test setup | Must hold |
| --- | --- | --- |
| T01 | 23:59:59 → 00:00:01 local day | One paid/claim transaction cannot use a stale displayed day and a new day at once. |
| T02 | Sunday→Monday local with `S.conq.wk` retained | Weekly progress resets only according to agreed week policy; no duplicate paid chest. |
| T03 | Device set backwards one week | No silent loss/re-creation of a completed weekly entitlement; backup remains verified. |
| T04 | UTC week turnover before/after local Monday, multiple timezones | Trial hero rotation matches **legacy** values before deliberate policy choice. |
| T05 | Feb→Mar, Dec→Jan, leap Feb 29 | Calendar claims and reward month hero are internally consistent; no duplicate. |
| T06 | DST spring/fall and timezone switch | No wrong-day token re-claim; remaining-to-midnight UI tolerates 23/25h days. |
| T07 | +48h and -48h wall-clock shifts, PWA reload | Water/candles/resolve/stamina do not underflow or inflate beyond cap; policy for manipulation documented. |
| R01 | battle fixed 0/nonzero seed, 200 goldens | `mkRng` draw and battle outcome fingerprints unchanged. |
| R02 | fixed `Math.random` trace for 1000 payout cases | Exact draws, awards, pity, trial and chest values untouched. |
| R03 | failed/uncertain checkpoint after random payout | No reward reroll committed twice, no unverified UI win. |
| R04 | Conquest and daily shop deterministic generations across date boundary | Exact same historic byte seeds and layouts for each local-date fixture. |

### Current outcome

**A1 source investigation: GO for characterization-only D-B0. NO-GO for indiscriminate time/RNG replacement.** No game code or PWA release changes included. Next need implementation baseline acceptance and owner review of **weekly backdate and clock-abuse policy** before D-B3. The published **v141 remains intact**.
