# ARCH-02C-B4-B2 — verified battle-entry debit (candidate)

Date: 2026-11-20. Parent: merged B4-B1 PR #221 at `main=8f332305655289d814991d5caa968609eb6612c6`. Branch `feature/arch-02c-b4-b2-entry-checkpoint-20261120`. **NO MERGE / NO RELEASE.**

## Why this slice exists

Before B4-B2, the campaign `startBattle(i)` called `enSpend; persist(); launch` and the Conquest squad selector called `cqEnSpend; persist(); launch`. These did not check the result of `persist()`, so a failed checkpoint could still consume RAM energy and launch a fight that was never durably charged. The published B4-B1 already protects `finish()`, but does **not** protect entry. Historical ungated B0 characterization C12/C13 must remain untouched.

## Implementation

- Add `loadSave.writer.transact(action)` to the **existing** writer API object; no new named exports or static import edges. This is a synchronous, writer-gated v1 save candidate transaction. It verifies lease ownership; clones `S` as the normal JSON v1 save; reuses existing B4 settlement defer / single B1 verified backup-first checkpoint; commits **before** caller may launch a battle. On rejection/uncertainty it reverts the RAM binding, releases the Web Lock and fences the old game via the existing lifecycle. No auto-retry, refund, migration, IndexedDB, or new save keys.
- An action returning `{commit:false,value:reason}` is a **normal no-spend precondition**, restores the original RAM binding and releases only the temporary staging guard (not the writer lease). The transaction rejects asynchronous action functions. **Never run launch, dialogs, reward presentation or other irreversible side effects inside the staged callback.**
- `startBattle()`: under mandatory gate, **regen + affordability + available squad + actual energy/quest debit** are evaluated on the candidate and verified before `launch`. Missing energy / squad do not create an uncommitted debit. Ungated historical path stays pinned.
- `sqGo()`: writer check before opening any squad-mode battle; Conquest resolves current node, remaining enemy list, and resolve energy inside the same candidate and commits before `launch`. No-budget, blocked route, or empty enemy list are benign cancellations. Other free modes retain their existing path (their **result** is protected by B4-B1).
- Both campaign and squad selector reject a second entry while an existing `BT` is active and unfinished (duplicate-tap guard).

## Acceptance

`dev/tests/ci/arch02c-b4-b2-entry-checkpoint-acceptance.mjs`, required for *both* `dist/pwa/index.html` and `dist/artifact.html`, enters the normal boot via real fake-held Web Locks and tests:

- B407 verified campaign energy debit, daily-water counter, previous-primary backup, and actual battle launch;
- B408 duplicate active campaign click does not charge twice;
- B409 backup quota prevents battle launch, leaves no RAM/disk debit, and retires writer;
- B410 stale lease prevents campaign debit and launch;
- B411 verified Conquest resolve debit and launch;
- B412 duplicate active Conquest click does not charge twice;
- B413 Conquest backup quota prevents charge and launch;
- B414 insufficient Conquest resolve cancels without disk write or lease retirement;
- B415 ambiguous primary write-then-throw blocks old realm; fresh boot adopts exactly the stored debit, does **not** auto-start a battle.

Existing B4-B1, B0, frozen Conquest source hash, strict 1001-import/898-export architecture, v1 saves, 200 golden battle fixtures, native Web Locks, PWA/offline and CI final gate remain mandatory.

## Explicit limitations and upcoming slices

- **This is a verified debit-before-launch, not a durable battle-ticket / exactly-once battle receipt.** If the browser closes *after* a successful entry checkpoint but *before* or during the battle, the charge remains; there is no automatic replay/refund. If the primary write itself is ambiguous, fail closed and inspect/reload; do not blindly repeat.
- `launch()` may perform delayed 3D setup after the checkpoint. True atomic debit-and-resume would need a separately reviewed receipt/state-machine and save migration. No invented refund policy in B4-B2.
- Campaign simulation `doXSim`/`runSim`, trial `trialSimClick`/`trialMulti`, manual raid cash-out, and Conquest rewards/chests still mutate live S before unchecked `persist()`. They require separate focused B4-B3+ work with hook deferral, RNG characterization, one-checkpoint tests and immutable Conquest gate.
- B5 daily rewards, B6 shop/upgrades, account import/recovery are **not** being changed here.
- No `main` merge, version bump, published root PWA edit, Safari cache/PWA reinstall, or site-data deletion until explicit approval and green exact-head CI.
