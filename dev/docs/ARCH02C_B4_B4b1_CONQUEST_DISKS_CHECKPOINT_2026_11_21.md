# ARCH-02C-B4-B4b1 — one-time Conquest disks, route and feat notifications

Date: 2026-11-21. Base: stacked upon **draft** PR #225, exact base HEAD `1a0c23351e8e6573ab21bf8743f611b20aa8fd9e` (not merged into main). Main base `54c3297a093881c85ca029893761011633664db8` remains stable. **Draft only; no publication, no merge, no PWA version bump or save migration.**

## Audit and chosen slice

The frozen `dev/src/ui/views/conq.js` has exact Git blob `e93d51583d00ff17762c98f3cb380773bd8b053c`. It must remain byte-identical. The existing `ui/events.js` delegate calls `cqClick(d)` after B4a's narrow claim handler. This provides an approved UI-owned seam for a second narrow dispatch handler without adding a module or changing the historical ESM graph. Rule APIs are passed via B4a's **lazy** `cq.claimRules()` → `openSquadSel.conquestClaimRules()` bridge; no new static imports, named ESM exports, bootstrap order changes, or new save fields.

| Action | Legacy behavior | B4b1 protection |
| --- | --- | --- |
| `data-cqdiff` | set difficulty and deterministic `cqDiskPick('start')`, then unchecked `persist()` | validate account/difficulty/weekly lock inside candidate; difficulty + offer one verified checkpoint |
| `data-cqdisk` | add disk, add feat/stats, clear initial `pick`, then unchecked `persist()` and toast | validate exact offered disk and ownership inside candidate; disk + feat + pick clearing one verified checkpoint |
| `data-cqnd` | add selected disk, mark node `done` and commit route, then unchecked `persist()` | validate node type, current route, one-time status, exact offered disk or empty pool; disk + node + route + feats one checkpoint |
| `data-cqnode` cache unlock | select a location and mark previously unvisited cache as `done` before unchecked persist | **Deferred to B4b2** with cache/store purchases |
| `data-cqbuy`, `data-cqjbuy`, `data-cqrf`, `data-cqmed`, `data-cqdoff` | pay resources and/or unlock item before unchecked persist | **B4b2**, separate price/stock/rationing transaction audit |
| `data-cqdon` | free disk equip toggles then saves | **B4b2**, even no-cost changes need persistence check |

Important: `cqAddDisk` calls `statInc('cqLeg')` and `cqBump('disk', ...)`. The latter mutates feat/points in `S` **and** pushes a user notification into global `NOTES`, which is *not* a child of `S`. The writer transaction automatically rolls back `S`, but does **not** automatically roll back this transient queue.

## New safe action contract

In gated Web Locks sessions only, `cqVerifiedDiskClick(d)` intercepts the three disk actions before frozen `cqClick(d)`. Every action validates current values inside the detached candidate passed to `loadSave.writer.transact()`. Node requests are strict `sector-layer-index:diskId` syntax; a blank id is valid only if the deterministic offer is empty (all eligible disks collected). Stale, repeated, unoffered, route-blocked and invalid input returns `commit:false` with no write or UI payout.

We snapshot `NOTES.length` immediately before synchronous transaction. If transaction denies or returns uncertain, the adapter truncates the transient queue to that exact length. No `await` or event yield can interleave with staging, so there is no concurrent note producer between snapshot and rollback. On verified success only, the existing disk toast and screen rendering run. On failed/ambiguous/quota/SecurityError/lock-loss commit, there is no toast or render and the old handler does **not** run. No extra RNG is used; selection uses the same seed, same `cqDiskPick()`, `cqNodeDisks()`, `cqAddDisk()` and feat calculations as before.

The v1 save schema is unchanged. The frozen view, `dev/tools/split.config.mjs`, named imports, 1001-edge static graph, 167 ESM module positions, 898 named exports and all golden snapshots remain untouched. Existing non-gated VM behavior is left to the historic handler for characterization only. Multi-tab writes remain guarded by mandatory exclusive native Web Locks.

## Regression contract

`tests/ci/arch02c-b4-b4b1-conquest-disks-acceptance.mjs` is required in both fast Web Locks and full Validate CI, for built PWA and HTML artifact.

- B441: difficulty + deterministic first offer commit once with verified backup;
- B442: stale difficulty cannot switch mode or reroll;
- B443: offered first disk, feat and consumed pick commit once;
- B444: stale first disk cannot duplicate;
- B445: quota rejects a feat-triggering disk and **rolls back NOTES**, points and collection;
- B446: node disk, node completion, route and backup commit together;
- B447: stale, different offered and malformed node action cannot mint again;
- B448: SecurityError prevents node completion, route, disk and transient note;
- B449: ambiguous after-write denies reuse and cold boot preserves once-only ownership;
- B450: lost native lease denies all three disk actions with no changes.

Do not mark the step complete until both workflow conclusions are **SUCCESS on the exact PR HEAD**. No baseline edits, no test skips, no archive replacement. The parent draft PR #225 must be validated and independently reviewed before any merge; stacked B4b1 PR must not merge into the parent without owner authorization. On iPhone manually test first disk, node disks and cold restart using exported save; physical Safari is not covered by VM/Chromium.

## Next slice

B4b2 should convert cache unlock/route and contraband and Jihad shop purchases, followed by consumables/recharge/disk unequip; use the same pre-commit validation with item stock/currency checks. Keep external UI `toast`, modal and NOTES presentation after commit; rollback transient NOTES on any stage failure. Daily quest and login payouts remain a separately tracked B5 audit. No PWA reinstall is required for B4b1.
