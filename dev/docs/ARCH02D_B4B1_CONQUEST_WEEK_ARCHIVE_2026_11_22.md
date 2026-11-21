# ARCH-02D-B4b1 — Conquest safe forward-week retention (implementation candidate)

**Date:** 2026-11-22. **Base:** merged [B4b0 PR #241](https://github.com/mryandexxx-spec/Dgoh-game/pull/241), `main=565290b5010ef68c14c5f076ea72f7a908af1060`; both B4b0 exact-head CI and its post-merge CI passed. Last owner-approved packaged PWA remains **v141**; this proposal is **not published**. Policy and reproduction: [B4a](ARCH02D_B4_OFFLINE_TIME_POLICY_2026_11_21.md), [B4b0](ARCH02D_B4B_FORWARD_DATE_ENTITLEMENT_AUDIT_2026_11_21.md), [B1](ARCH02D_B1_CONQUEST_ROLLBACK_GUARD_2026_11_21.md).

## Scope: save-safety only, not trusted time

Current Conquest uses local-Monday `cqWeek()` and stores a SINGLE active run `S.conq`. B1 protects the current run when a device date goes **backwards**; a **forward** date can still replace the in-memory run, and the next legitimate verified PWA checkpoint can save that state. B4b0 reproduced both loss and inability to recover the old `done`, `tk`, route, disks and progress through clock correction alone. That is a save-data safety risk independent of whether the future clock was honest.

B4b1 changes only `dev/src/logic/conquest.js:cq()`: before the existing forward-week switch, it preserves the complete previous `S.conq` in the **inactive** array `S.conq.weekArchive`. Each archived entry is a flat copy of a prior active run; nested archives are removed so the saved structure is not recursively expanded. Subsequent weeks append full records. Initial accounts or existing same-week saves do not gain the optional field. The top-level `dune-goh-v1` save key, `v:1` version and all existing base fields/verified writer/backup formats remain unchanged. The optional nested field is saved through existing verified checkpoints, export and import. Existing `fillSave()` migration traverses nested Conquest records, including archived squads, to prune retired Liet consistently.

### What B4b1 does NOT promise

- **Archived records are inert.** The active run still resets immediately on a legitimate forward local Monday; prior `done` and `tk` are not claimable in the current week. On a later backwards clock correction B1's current-week guard **still denies** earlier-week combat, resolve spending, new difficulty and rewards. This patch prevents **erasure of raw earned progress**, not automatic return to a previous weekly run. UI restoration/replay needs a separately reviewed entitlement policy.
- **Local Date is still untrusted.** A forged future date can still begin a future weekly run and make valid future-week awards; this patch does not detect spoofing, impose server checks, cap offline duration, or revoke awarded resources.
- **History retention is append-only, without eviction.** No retention limit was silently chosen, because any cap would erase history. Large histories could eventually pressure localStorage quota or the existing 2 MB save-transfer limit; verified writes then fail closed under ARCH-02C safety rules rather than discard historic runs. Future **B4b1b** must explicitly resolve bounded storage/diagnostics/recovery before distribution to players. In particular, DO NOT ship an unreviewed silent prune.
- The optional field is not an authenticated token and is not an anti-cheat authority. Old *cached* PWA clients could drop the new history when they perform the old forward-reset flow; a controlled explicit publish/handoff is required after approval.

## Invariants

1. No rewrite of `cqWeek()`: **local Monday** continues, including DST, timezone and year transitions; no replacement of Trial UTC week or shop seeds.
2. Archive must be **created before** any new active run can enter a verified checkpoint. Preserve full older `done`, `tk`, disk, route, stamina, progress, week and ledger data; no old-week duplicate claims.
3. Existing B1 backwards-week guard and J1 next-difficulty unlock remain unchanged; malformed optional archive cannot authorize destructive rollover.
4. Saved `v:1` and `dune-goh-v1`, old offline accrual rates/caps, RNG, prices, upgrades, Web Locks, verified writer and undo/backup paths are unchanged; no added network dependence.
5. A fresh legacy or same-week save has **no** new archival field until its first forward rollover. All archive entries are data, not live claims.

## Tests and deployment gates

- B4b0 B411 and B412 are updated from pre-fix loss-characterization to asserting archived progress surviving new-week reads, verified save, restart and backwards correction while claims remain blocked. B413–B417 still characterize local Mondays, Trials/shop replay (OPEN B4b2), daily and B1 backwards guards.
- New B418–B424: full archive equality before/after forward week, checked v1 persistence and rollback, multiweek flat history, genuine Sunday–Monday transition/J1 unlock, same-week + export/import compatibility, malformed archive fail-closed, archive and current run in a *single verified transaction*.
- Execute new and previous acceptance matrix on **compiled** PWA plus standalone artifact, `UTC`, `Europe/Amsterdam`, `America/Los_Angeles`. Preserve legacy B0–B4a/B4b0, strict architecture, Golden 200 battles/saves/41 screens, WebGL, offline PWA, final gate.
- Draft PR only. **No merge** without owner approval after Fast + Full exact-HEAD SUCCESS and final gate. **No build/version/root app/sw change or PWA release**. The v141 PWA remains installed and no reinstall is needed at this stage.

## Remaining decisions

**B4b1b — retention:** How long and how much history must be durable, when the browser quota or export size approaches the existing limit, and which **explicit user-authorized** backup/export/archival handling is acceptable? A silent fixed-size ring would violate the no-data-loss goal.

**B4b2 — daily anti-replay:** Trial attempts and shop purchase ledger resets are independent from Conquest. Guarding date reversal must not lock out honest travelers or silently reduce daily availability after a bad system clock.

**B4b3 — optional network observations:** HTTPS time hints can help diagnostics but cannot prove offline elapsed time and must not block genuine offline play.

B4b1 is a *save-retention candidate*, not complete calendar security or production-ready retention/migration policy.
