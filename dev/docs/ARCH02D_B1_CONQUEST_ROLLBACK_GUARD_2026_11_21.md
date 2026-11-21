# ARCH-02D-B1 — Conquest weekly rollback guard (implementation candidate)

Date: 2026-11-21. Base: `main=a851eae78f94b9d6c044cc873c411df5e59b6c78`, merged [D-A1 #235](https://github.com/mryandexxx-spec/Dgoh-game/pull/235) and [D-B0 #236](https://github.com/mryandexxx-spec/Dgoh-game/pull/236); currently published PWA **v141**. Follows [source audit](ARCH02D_A1_GAMECLOCK_RNG_SOURCE_AUDIT_2026_11_21.md) and [B0 characterization](ARCH02D_B0_CLOCK_RNG_CHARACTERIZATION_2026_11_21.md).

## Problem reproduced in B0

When `S.conq.wk` represents a newer local Monday than the device's computed `cqWeek()`, a read of `cq()` previously reset all of `S.conq`. This discarded weekly node completion, selected route, chest and milestone claim tokens `tk`, items and the current run in RAM. The B0 test D005 reproduced this in both built targets. A backwards clock, timezone change or imported older device time can trigger it without real week progression.

## Narrow safe policy for B1

1. Preserve the existing **local Monday** computation and serialized `toDateString()` week key. The guard orders the two existing parseable keys chronologically using `Date.parse`, never lexicographically. Only a **strictly newer saved week** suppresses reset. Same-week reads and real forward-week resets remain unchanged. Invalid legacy week keys follow the pre-B1 initialization fallback.
2. When the device shows a week older than the preserved saved run, retain the full `S.conq` object including `done`, `tk`, routes, disks, energy and timestamps; do **not** create an alternate earlier-week record. During this mismatch, disallow Conquest chest/milestone claims, node combat entry, resolve spending and premature next-difficulty unlock.
3. Existing J1 migration unlock sentinels (`legacy`, `old-week` and earlier non-date placeholders) still authorize historical progression in the normal week, but not while `S.conq.wk` is ahead of device week. A return to the saved week restores eligibility automatically, without a new saved flag or migration. A legitimate later local Monday still initializes a new run exactly as in v141.
4. The existing `cqWeek()`, generated Conquest content, seeded rewards, battle/loot RNG and reward prices are unchanged. No new module, public exports or persisted fields, no version increment, release-root or Pages publish.

**Security boundary:** an offline browser has no trusted time. This patch protects **rollback-triggered erasure and specific backwards-week entitlements**, not clock-forward cheating, cross-process elapsed-time validation or all mutation paths. Screen reads can still trigger *forward* in-RAM initialization (legacy issue). `cqEn()` and energy/stamina timestamp policy remain separate D-B1/D-B3 follow-ups; do not claim complete server-grade clock protection. The fallback for malformed/incompatible `wk` remains an open recovery question, not a new migration.

## Reviewed tests and CI

- Update the existing D005 B0 regression from observed destructive reset to expected preserved run, **explicitly in this implementation PR**. D001–D004 and D006–D010 (daily/local/UTC/trials, DST/month leap, shop/RNG and calendar) remain unchanged.
- Add B101–B106 in `dev/tests/ci/arch02d-b1-conquest-rollback-acceptance.mjs`: rollback keeps `done/tk/wk` and verified saved snapshot, claimed/unclaimed rewards and next-difficulty fail closed, battle entry and resolve spending fail closed, clock restoration resumes, normal later Monday resets, December→January ordering, autumn DST backshift, backward-week gating for migrated non-date unlock markers.
- Execute original D001–D010 **and** new B101–B105 on both **built PWA and standalone HTML** in `UTC`, `Europe/Amsterdam`, `America/Los_Angeles`; strict architecture, complete Golden 200 battles/meta/saves/41 screens, PWA offline and final CI required at exact PR HEAD. No golden/baseline acceptance weakening, no proof of physical iPhone Safari.
- Compare PR file scope: only `dev/src/logic/conquest.js`, two clock test scripts, `.github/workflows/validate-pwa.yml`, this checkpoint and change journal. Published root `app.js`/`sw.js` and `dev/version.json` are untouched.

## Gate / handoff

**NO MERGE until exact-head CI SUCCESS and independent `arch-strict` + final gate. NO RELEASE without owner's separate authorization.** Next limited packet: centralized GameClock read seam and controlled daily/energy timestamp policy without changing historical shop/Trial UTC-week rotations. Full forward-clock exploit prevention requires a trusted time source and separate product policy.
