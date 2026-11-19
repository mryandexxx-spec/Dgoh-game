# ARCH-02C-B3-B1c-B2 — mandatory writer cutover preflight, unexpected-lease-loss fence

Date: 2026-11-19. Parent [#199](https://github.com/mryandexxx-spec/Dgoh-game/issues/199). Baseline `main=6c8a4c3a580a9fa2d6aa32e067c036a70598a449`, after merged PRs #213 and #214; complete main CI [#44572246030](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44572246030) SUCCESS. **This is a pre-cutover implementation PR, not default production activation.** No v141 or public PWA publication.

## Audited entrypoint and write boundaries

* The byte-frozen `dev/src/boot.js` calls the existing exported `start` via the host's hot-ready callback or synchronously. `core/boot.js:start` MUST retain first AST action `set_S(initialSave(data))`. When the explicit `writer-preview` flag is set *before* invocation, `initialSave` arms an asynchronous `startWithWriter` and returns undefined without reading progress; successful acquisition synchronously re-enters the existing boot under the held native exclusive Web Lock.
* Without the flag, current default `start` still reads `dune-goh-v1` and uses ungated legacy `persist0` / `localStorage.setItem`. This is **not a safe multi-tab production startup**. Setting a runtime opt-in flag in one tab is not a secure cutover or an old-client fencing mechanism.
* The B1 checkpoint remains the only opted-in verified writer protocol: sidecar `dune-goh-v1.backup` -> primary -> exact readback, with unconfirmed/write-then-throw outcomes refused. Direct `loadSave.checkpoint.commit/recover` is forbidden after the sticky gate is armed. `loadSave.writer.commit/recover` own the exclusive live lease.
* B2 `ui/wiring.js` manual import distinguishes legacy vs writer intent, requires an active lease before even inspecting the primary in the writer path, retires the writer on successful protected import and reloads cold. Explicit recovery is separately previewed, confirmed and one-shot through a recovery-only lease, with no implicit rollback. Export reads verified storage, not mutable RAM; a blocked secondary must not inspect progress.
* Lifecycle: `pagehide`, hidden visibility, `freeze`, BFCache resume and storage-change events retire the writer; waking the **same** heap cannot reacquire into stale RAM. Existing tests prove cooperative tab exclusivity and some Chromium transitions, not real Safari or v140 fencing.

## Failure/race matrix for mandatory switch

| Entry/failure | Required invariant | Current/next safeguard |
| --- | --- | --- |
| Default legacy `start()` | Must never ship alongside mandatory mode | **Unresolved until final cutover**; no default flip in this PR |
| Unsupported/denied Web Locks | No S, no progress read or write, visible block | Existing preview fails closed; preserve |
| Two cooperating new pages | Only one owned writer, second has no gameplay/import/restore authority | Existing lock + B2 protected transfer; keep native Chromium CI |
| Unexpected resolution/rejection of an *owned* lock request | Immediately disable input, invalidate lease, forbid further commits and stale reentry | **This PR** attaches one-way core-to-UI lock-loss notification |
| Hot host calls `start()` again while active | Never wipe or overwrite active writer S | **This PR** retains live S for the mandatory first AST assignment, then denies duplicate boot |
| Voluntary release/visibility/freeze/pagehide | Irreversibly retire authority, no reattach on resume | Existing lifecycle handler; test compatibility with new notification |
| Main save missing/corrupt with good backup | Never create a fresh account or overwrite data; user-only recovery | Existing protected two-step recovery; preserve |
| Import / backup write-then-throw / storage unavailable | No success acknowledgment, no fallback to unchecked path | Existing B1/B2; exact-head regressions |
| **Uncooperative cached v140/older code** | Must be gone before declaring single-writer safety | **Cannot be fenced by Web Locks, storage events, or a localStorage token**; controlled manual old-client retirement, external independently verified v140 export, owner release hold |
| PWA uninstall/origin eviction | Never assume localStorage survives | External export **before** any owner-authorized reinstall; no automatic clearing |

## Implemented narrow B2 first slice

1. Add a callback to the existing `loadSave.writer` namespace (no named ESM exports) and notify the armed boot lifecycle if the native lock-request Promise *unexpectedly* settles while a writer lease is still recorded. Mark the lease invalid before notifying. This is different from voluntary `release()`, which is not a lock-loss alarm.
2. Immediately block gameplay capture/events on unexpected lock loss, show the existing blocked UI, and make `persist0`, `persist`, checkpoint commit and recovery refuse stale authority; no new `start()`, auto-reload or recovered save.
3. Protect active RAM against a second host `start()` callback while preserving its mandatory first AST statement. The callback still refuses to re-enter mutable gameplay; a previously denied or suspended heap stays blocked.
4. New required deterministic cases in BOTH compiled PWA and HTML, including lock-request premature resolution and rejection, old heap can't write after another fresh owner commits, repeated callback and voluntary release controls. Existing tests and strict gates remain mandatory.

This is **not an old-client fence**, nor a proposal to use a runtime flag as the final production switch. It narrows the one-way session invariant before the higher-risk final cutover.

## Final cutover dependency contract (separate PRs, no release authorization)

1. Review every current writer to `dune-goh-v1` and backup in source and both compiled artifacts; add a positive assertion for default **ordinary** application start, not merely flagged preview. Flip the default in `core/boot.js` with frozen composition root/first-AST/898 names intact. No runtime backdoor that permits an owner to clear a flag and enter legacy boot.
2. Require fail-closed capability diagnosis, second-tab no-gameplay UI, fresh reload with latest primary, protected import and explicit recover, disabled stale timers/input and lifecycle, tests for denied storage/backup, quota and ambiguous writes. Extend actual native Chromium to **automatic** (no preview flag) startup on independent same-origin tabs, and offline PWA + compiled HTML.
3. Preserve existing 200 battles, 41 screens, 898 named ESM exports, strict dependency checks, golden and PWA/WebGL matrix; never weaken historical proof to force green.
4. Complete B3-B3 old-service-worker/offline and Safari iPhone standalone lifecycle acceptance, manually verify old v140 exported progress **outside PWA** and the actual transfer/import/reload path. Reinstall/new build must not be allowed concurrently with active old clients on the same origin; cannot make universal mixed-version exclusion claims.
5. **No IndexedDB migration is requested.** Keep v1 localStorage and existing raw bytes, no automatic `clear()`, silent recovery, origin reset, or assumption that an export already exists. Because pre-B3 caches ignore the gate, a future handoff must plainly document this remaining limitation and seek the owner's explicit release approval.

## Hard hold

No merge without owner approval; this branch is a Draft PR. No v141, no root PWA changes, no publication and **do not uninstall, reinstall or clear the installed v140 PWA**. The special reinstall authorization phrase is reserved exclusively for the later validated, separately approved handoff. This pre-cutover PR does not meet that condition.
