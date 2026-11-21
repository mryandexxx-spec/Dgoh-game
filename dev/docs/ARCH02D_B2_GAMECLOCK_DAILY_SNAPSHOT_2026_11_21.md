# ARCH-02D-B2 — GameClock local-snapshot and daily/calendar consistency

Date: 2026-11-21. Base: merged [ARCH-02D-B1 #237](https://github.com/mryandexxx-spec/Dgoh-game/pull/237), main `606acffa8aa06590f70e08c63b0c0f4e717d6a97`, validated exact-head Fast [#44913188947](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44913188947) and Full [#44913188959](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44913188959). Current **published PWA v141**, no B2 publication. Reviewed [A1 audit](ARCH02D_A1_GAMECLOCK_RNG_SOURCE_AUDIT_2026_11_21.md), [B0 baseline](ARCH02D_B0_CLOCK_RNG_CHARACTERIZATION_2026_11_21.md), [B1 guard](ARCH02D_B1_CONQUEST_ROLLBACK_GUARD_2026_11_21.md).

## Scope and design

B2 introduces a minimal **GameClock read-only provider** for *one-operation wall-clock snapshots* while preserving the strict existing 167-module/898-public-export ESM ABI. To avoid a newly ordered module or exported name, the frozen provider is attached as `todayKey.clock` to the existing exported function in `logic/economy.js`; `dly.clock` points at the exact same provider for existing consumers of the daily module.

Provider methods:
- `now()` delegates directly to the historical `Date.now()` (no clamping, no speculative trusted time).
- `date()` delegates to `new Date()`; the established `todayKey()` retains the exact local `toDateString()` bytes.
- `snapshot()` reads **one** `new Date()` for an immutable record of wall milliseconds, local day, `YYYY-M` month, year/month index, local weekday, days in month, and the next **local** civil midnight. The next-midnight value is formed from local year/month/day +1 and handles 23/25-hour daylight saving days. No UTC standardization or timezone offsets are written into the save.

Consumers are migrated narrowly:
1. **Daily quests / chest**: the date displayed by `renderDaily`, the local-midnight countdown, eligibility, rendered-day token and gated claims use a shared snapshot per read/operation. A fresh snapshot inside the existing verified `loadSave.writer.transact` rejects a day rollover before any reward or chest RNG draw. `qState/dailyGot/dailyReady` accept an optional snapshot without changing default calls/exports.
2. **Login calendar**: rendered stamp, month heading, chosen hero, reward list and day count come from the *same snapshot*. A transaction takes a fresh timestamp to reject a day or month change between modal/click/checkpoint; the reward is computed from the verified candidate's snapshot. The B5b verified writer, rollback guard, n/day/month ledger, presentation hooks and legacy ungated fixture semantics remain intact.
3. **Water / Candles**: `core/state.js:tickWater` reads `todayKey.clock.now()` in place of `Date.now()`, retaining exactly the same legacy elapsed-time formula and cap. Conquest stamina, trials UTC Sunday hero rotation, deterministic shop seeds, battle seed-zero and all RNG streams are **not** changed.

## Tests and invariants

Run new B201–B207 against **real compiled PWA and standalone HTML** in UTC, Europe/Amsterdam and America/Los_Angeles: legacy date/month equivalence, frozen one-shot provider, leap day and Dec/Jan, local 23/25-hour DST midnight, unchanged energy caps/no new save keys, simulated clock rollover during daily claim and calendar verified write (no paid reward), month coherence even when repeated Date constructors would drift, stable single checkpoint normal claim, no global RNG consumption. Re-run D001–D010 and B101–B106 plus B5a/B5b, exact-save/200-battle/41-screen goldens, independent strict architecture, Chrome UI/WebGL and PWA offline.

**Not included:** trusted clock source, protection against deliberate +48h advance (still capped at max), identity/migration changes, calendar/Trial rotation policy, RNG seeding, new ESM module or named export, backup schema, version increment, public root `app.js/sw.js`, GitHub Pages publish. Do not claim that offline clock spoofing is solved; `performance.now()` cannot authenticate time across app relaunches.

## Gates

**Draft until exact PR-head Fast and Full CI SUCCESS (including final gate).** No merge or publication before verification. Physical Safari/iPhone and real system-clock changes are separate owner acceptance. Recommended next narrow step B2b/B3: explicitly define policy for forward clock jumps and regen timestamps **without** changing saves/energy awards silently.
