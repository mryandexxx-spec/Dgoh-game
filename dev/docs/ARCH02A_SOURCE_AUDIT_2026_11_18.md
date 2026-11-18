# ARCH-02A — source audit: saves, critical transactions, GameClock and RNG

**18.11.2026 · research only / NO implementation.** Repository `mryandexxx-spec/Dgoh-game`, verified `main=2ef68623a001f5169daa3354931632fcf0d47c0f`, public v137 / Service Worker `0d811bb402`. Related: Product Audit #120, ARCH-02 #193; prerequisite ARCH-01 completed (strict CI, zero forbidden edges, SCC [60,11,6,3] not removed).

Evidence classifications throughout: **C = confirmed implementation property**, **H = plausible impact/attack scenario needing a test**, **T = requires runtime/physical verification**. A code property is not proof that real users lost data. All source coordinates below refer to this pinned main SHA; GitHub file links can be accessed via `https://github.com/mryandexxx-spec/Dgoh-game/blob/2ef68623a001f5169daa3354931632fcf0d47c0f/` + indicated path.

## 1. Save architecture and storage inventory

| Store/key | Format/owner | Read | Write | Safety assessment |
|---|---|---|---|---|
| `localStorage['dune-goh-v1']` | **v=1 JSON** object, primary **only** account/progress store; `core/save.js:8-88` | `loadSave()` `save.js:77-80`, called by `core/boot.js:27-28` | `persist0()` `save.js:81`; `persist()` `save.js:83`; called by boot and gameplay | No backup/checksum/acknowledged commit or observed recovery path (C). Per-key `setItem` is synchronous, not a multi-key transaction |
| `localStorage['dune-gfx']` | graphics settings JSON, `render3d/quality.js:50,64-76` | `readGfx()` | `writeGfx()` | independent, no account balance; legacy migration from `dune-gfx-low` |
| `localStorage['dune-gfx-low']` | legacy graphics flag, `quality.js:68-69` | `readGfx()` | `removeItem()` during migration | unrelated to save |
| `localStorage['dune-battle-fps']` | 30/60 string, `quality.js:52-60` | `readBattleFps()` | `setBattleFps()` | independent |
| `localStorage['dune-cine-off']` | JSON boolean, `logic/cinematic-preference.js:3`, `ui/overlays/battle-settings.js:73` | `CINE_OFF()` | battle settings | independent |
| `localStorage['dune-roster']` | roster UI filter/sort JSON, `ui/views/squad.js:18-21` | module initializer | `roSave()` | independent; not hero progression |
| `localStorage['dune-perf']` | perf overlay flag, `ui/perf-overlay.js:3,29,43` | initializer | set/remove | independent |
| `sessionStorage['rotok']` | rotation UX flag; `core/boot.js:36`, `ui/events.js:96` | boot | event | session only, no progress |
| PWA CacheStorage | SW app shell and immutable asset cache, `src/pwa/sw.js:2-24` | SW | SW install/activate | **not** an account backup; cache upgrades ≠ save migrations |

**Single shared save object**: `core/state.js:5,16` owns mutable binding `S`; `core/save.js:2` imports it, `logic/` and `ui/` mutate properties directly. Public `SAVE_KEY` is unchanged. `newSave()` (`save.js:10-16`) populates starter roster/resources and calls `fillSave`. `fillSave()` (`save.js:17-75`) patches in-place: daily/login, gears, materials, relics, raid, journeys, retired Liet, Jihad unlocks; preserved historical migrations (`memoryEconomyV2`, `migrations.retireLietV83`, `migrations.jihadJ1`). `ui/wiring.js:20-27` `metaFill` adds account/trials/profile/stats. Golden `tests/golden/saves.mjs:13-67` verifies missing + 3 files from `tests/fixtures/saves/`, both `loadSave` and post-`start`, without changing historical golden.

**Startup read/write**: `core/boot.js:27-45` calls `set_S((data && data.save) || loadSave() || newSave())`, `metaFill(S)`, one-time `migB` migration + `persist()`, `dly().c.login=1`, then unconditional `persist()` before first render. `loadSave()` accepts only `s.v === 1` but catch-all returns null on get error, parse error, or invalid nested fields; `newSave` is selected for all null outcomes. Existing `data.save` from hot reload can bypass `loadSave` validation (not a production UI import route). No distinction among missing/invalid/unsupported/unreadable.

**Write/notification**: `persist0()` is `try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}`. `persist()` calls it immediately; its 60 ms timer schedules a UI notification hook, not a deferred durable save; onPersist does not provide error acknowledgment (`save.js:81-85`). `ui/notifications.js:33` also writes via `persist0()`. Callers ignore storage failure status because none is returned. Source-level finding C; QuotaExceeded and read exceptions should be injected, not assumed to happen in deployed Safari.

**Manual export/import already exists** (`ui/wiring.js:41-43`): export base64 of UTF-8 JSON from current *memory* state, not an established durable checkpoint; clipboard fallback is offered. Import checks only `!!s.roster`, then `set_S(fillSave(s)); metaFill(S); persist()`; success toast after return, even if `persist0` swallowed a storage error. It does **not** check `s.v===1`, root field types/limits, or preserve old active state until write verified. This is an existing user feature; ARCH-02 must harden, never remove it.

## 2. Critical transaction map (source-backed)

| Area & source path | Mutations before save | Existing idempotency/guard | Failure/restart risk |
|---|---|---|---|
| Campaign battle, `ui/battle/battle-ui.js:63-65,570-645` | Spend energy and persist **before** battle; reward, `cleared`, `cryClaim`/`sealClaim`, shards + `persist` on finish | First-3-star flags and `BT.done` (session only) | C: non-atomic end-to-end workflow, battle not serialized; H: interrupted run can lose energy or end-of-battle progress; silent write failure |
| Simulated battles, `ui/overlays/sim.js:117-122,161-180` | `enSpend`; multiple reward rolls, XP and inventory then persist | Sim unlock/energy checked before run | C: all edits live before unacknowledged persist; H: retry/loss across reload |
| Shop and equipment, `ui/events.js:138-168,190-228` | `buildPart`, `craftAndEquip`, gear/level/ability/star/relic, `addRes(-price)` + item award; persist after mutation | affordability, `shopLeft`, equipment flag/limits | C: no all-or-nothing durable commit; H: rollbacks and multi-tab stale overwrite |
| Recycle, `ui/recycler-screen.js:106-116` | `scrapQuote` then `scrapCommit(S,...)`; persist after | validates current basket at commit | C: quote/commit guard protects some invalid input, not storage durability |
| Daily quests/chest, `ui/views/daily.js:12-22` | `daily.got[k]` / `daily.chest` set then `giveRewards` then persist; chest `Math.random` | in-memory claim flags | C: protects repeated same-day UI click within current S; H: date rewind or failed save can reopen claim |
| Login calendar, `ui/overlays/calendar.js:18-22,45-46` | `login.n++`, `login.last=todayKey`, `giveRewards` then persist | last-day key, month counter | C: per-local-month/day state; H: changing timezone/system time affects eligibility |
| Raid, `ui/battle/battle-ui.js:576-590`, `ui/events.js:208-219` | save cumulative boss HP/used attackers, on kill or manual end grant resources/frags and clear raid, then persist | active raid state, `BT.done` | C: volatile battle and durable checkpoint split; H: lost attempt/settlement if storage fails |
| Jihad/Conquest, `logic/conquest.js:27-53`, `ui/views/conq.js:203-227` | weekly state, consumables, purchases, one-time tracks/chests, random choice, persist after | `C.done`, `C.buy`, `C.tk` flags | C: week reset on `cq()` read and wall-clock; H: rewind enables renewed one-time paths |
| Trials, `logic/trials.js:39-55`, `ui/views/trials.js:68-95` | day count/win/reward and `trialRoll` then persist | per-day run limit | C: limit tied to local day; H: rollover/date change |
| Feats / story / journeys, `ui/views/feats.js:40-46`, `logic/bh94-story-events.js:23-63`, `ui/battle/battle-ui.js:591-620` | increment claim flags and shards, battle finish persists | milestone/first-clear flags, story event daily caps | C: normal same-session guard exists; H: failed storage or clock manipulation |

**No assertion of proven duplicate payout in regular same-save use.** Several reward paths explicitly set flags before awarding. To establish exploitability, test deliberately reordered clock, two independently loaded tabs, and forced persistence failures, comparing *net durable balances* rather than number of toast messages. A user manually clearing browser site data cannot be recovered locally without pre-existing separately exported backup or server account; no client-only approach may guarantee otherwise.

## 3. Source-backed risk register (prioritized)

| ID | Priority | Evidence | Classification | Repro / closure |
|---|---|---|---|---|
| SAVE-01 | **P0** | `core/save.js:77-81` + `core/boot.js:27-40`: load error → null → `newSave` → unconditional write | **C mechanism; H data loss** | Inject invalid JSON with an intact original key; start; inspect whether original bytes replaced. MUST fail closed |
| SAVE-02 | **P0** | `core/save.js:81-85` all write errors swallowed; critical transaction examples above | **C mechanism; T consequence** | Fault injection `setItem` throws (`QuotaExceededError`, `SecurityError`), make critical mutation; assert no success confirmation and no acknowledged commit |
| SAVE-03 | **P1** | `ui/wiring.js:43` accepts `roster` without `v===1` and replaces S before checking durable outcome | **C validation gap; H corruption** | Import v2/invalid-nested/oversized save: existing state must remain intact |
| SAVE-04 | **P1** | `fillSave` in-place migrations, `loadSave` catches all shape exceptions as null; `metaFill` runs after replacement | **C shape fragility; H corruption** | Valid JSON with v1 but null/malformed roster or migrations; preserve source; no reset |
| SAVE-05 | **P1** | No backup write/read implementation at primary key, cache != progress; `core/save.js` entire file | **C no recovery mechanism; H eviction** | Corrupt primary while keeping last verified checkpoint; recovery only after approved C; site data deletion remains unrecoverable without external export |
| SAVE-06 | **P1** | battle spend before finish in `battle-ui.js:63-65`, rewards at `570-645` | **C split workflow; T loss magnitude** | close/reload after charge, before reward, after reward; ensure documented policy, no free duplicate claim |
| SAVE-07 | **P1** | local date reset, `logic/daily.js:18` / `logic/conquest.js:27-30` / `ui/overlays/calendar.js:18-22` | **C wall-clock dependence; H exploit** | forward/back date, midnight, timezone, DST, same-week reorder; compare durable daily/weekly flags |
| SAVE-08 | **P1** | Single localStorage snapshot, no version/lease across tabs (`save.js:81`) | **H concurrent-tab lost update** | two tabs load same old S; tab A buys, tab B claims, write B; inspect lost A; single-thread `setItem` does not solve lost updates |
| CLOCK-01 | **P1** | energy `core/state.js:7-11`, Jihad `logic/conquest.js:42-53` timestamp arithmetic | **C wall-time use; H manipulation** | long offline, time jump ± days, negative delta and cap. No economy change without owner |
| RNG-01 | **P2** | `logic/economy.js:32-53`, `logic/gear.js:62-78`, `logic/trials.js:49-55`, `ui/views/daily.js:20` and `ui/views/conq.js:226` use `Math.random` | **C implicit global RNG; T replay** | fixed random stream must match invocation order and exact outputs before/after injector |
| RNG-02 | **P2** | `logic/battle/engine.js:14-21` `opts.seed || Date.now()` | **C zero-seed fallback**, **H test blind spot** | zero seed unexpectedly time-based; address only in approved D and golden |

Priority reflects **severity of plausible consequences**, not verified frequency.

## 4. GameClock map

- **Current clock source** is system wall time throughout. `logic/economy.js:14` `todayKey = new Date().toDateString()`: daily quests, currency refills, shops, login, story reward limits, Jihad refill keys.
- `logic/conquest.js:27` Monday 00:00 **local** week string, `cq()` resets weekly S.conq if mismatched (no external authority). `ui/views/conq.js:112,180` displays remaining time via `new Date(C.wk)+7 days`.
- `logic/trials.js:9` uses numeric UTC-ish 7-day epoch for hero rotation; `:39-42` local weekday and daily tries. Distinct weekly concepts must not be silently conflated.
- `ui/overlays/calendar.js:18-22` local month, month length, last claimed day. `logic/daily.js:18` changes daily S lazily; `ui/wiring.js:24` daily session statistic mutated by `metaFill`.
- `core/state.js:7-11` water/candle regeneration from timestamps; `logic/progress.js:12-13` spending/refund; `logic/conquest.js:42-53` resolution and stamina; `ui/views/daily.js:26` and `ui/views/shop.js:77` local midnight countdown.
- `ui/battle/battle-ui.js:88,657` seeds combat from `Date.now() & 0xffffff`; this is *outcome-related*, not only display. `performance.now()` in boot/input/perf is a separate monotonic UI-duration mechanism and should remain separate.
- Risk boundaries: UTC/local week mismatch, timezone/DST, midnight crossing during open UI, manual wall-clock rewind/advance, long absence. A purely offline client **cannot establish tamper-proof server time**. D stage first provides testable parity, then proposes policy with owner sign-off before changing economy/calendar.

## 5. RNG map and protected sequences

| Generator | Source / calls | Purpose | Requirement |
|---|---|---|---|
| `sRng(seed)` pure Mulberry32 | `data/seeded-rng.js:1-5`, wrapper `core/rng.js:1-9` | deterministic campaign/content and Conquest/shop seed-based choices | preserve exact seed, algorithm, call count, historical hoisting/ESM order (ARCH-01C2c regression) |
| `mkRng(seed)` | `logic/battle/engine.js:14-21`, `B.rng()` throughout battle | combat outcomes | keep combat seed fallback and draws unchanged in A/B/C; D only with comparative goldens and approval |
| `Math.random` gameplay | `logic/economy.js:32-53`, `logic/gear.js:62-78`, `logic/trials.js:49-55`, `ui/views/daily.js:20`, `ui/views/conq.js:57,226` | random shard/material/raid/trial/chest payouts | injectable via scoped call site only; never reorder consumption |
| `Math.random` cosmetic/notification | `ui/overlays/celebrate.js:25-27`, `ui/notifications.js:32` | particles/temporary notification IDs | permitted non-critical visual randomness; must not share gameplay seeded stream |

Do **not** globally monkeypatch `Math.random` in production. Golden `tests/golden/battles.mjs`, `meta.mjs`, `saves.mjs`, campaign nodes digest and ARCH-01C2c 4096-vector tests are regression constraints, not candidates for blind `--update`.

## 6. What ARCH-02A does *not* claim

- No actual user save loss has been reproduced in Safari; no fault-injection test was run as part of this documentation-only research. Static code inspection establishes failure handling gaps only.
- A single synchronous `localStorage.setItem` operation is treated as key-level atomic; we do **not** claim partial JSON is generated by ordinary interruption. Parse-corrupt JSON is a separate scenario (bad bytes, manual tooling, previous bugs, browser fault).
- Restoring after full site-data eviction without exported/cloud copy is impossible by design. Backup keys inside the same origin cannot resist a user clearing all site data.
- Physical iPhone Safari/WebKit (844×390 / 667×375, standalone/offline, cold/warm, across system time and browser storage fault) remains **OPEN**.
