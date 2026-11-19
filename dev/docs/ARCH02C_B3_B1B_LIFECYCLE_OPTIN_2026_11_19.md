# ARCH-02C-B3-B1b lifecycle slice — opt-in session fence and rescue UI

2026-11-19. Parent #199 / #193. Stacked on draft PR #209 (B1b gated boot/persist); previous B1a PR #208 merged to main ffb235125c805755a5f6272240fa409f5cfb1868. Public PWA remains v140. The base PR #209 must be merged before this stacked PR can be considered as a stand-alone main change. This branch is NOT a production cutover.

## Why a separate stacked PR

B1b #209 introduces opt-in start.writer, sticky gated synchronous persist/persist0. Current production entry src/boot.js still uses unguarded legacy start. To preserve independent exact-head CI on #209 while continuing safely, this PR changes only lifecycle behavior when opt-in start.writer is called. It must not be represented as an enabled runtime fix on users' v140 PWA.

## Implemented and acceptance boundary

1. core/boot.js: the optional start.writer path arms a synchronous input capture guard BEFORE waiting for the exclusive Web Lock. When acquisition is busy, unsupported, interrupted, or boot incomplete, it does NOT initialize a second game's S and blocks gameplay event handlers. The overlay is a UI-owned callback, not an import from logic/data. No additional ESM named export.
2. pagehide, document freeze, document visibilitychange (hidden) release/cancel exclusive writer authority. pageshow (BFCache persisted), document resume and visible return NEVER reacquire into stale RAM. Reload is explicitly required, and the one-way B1b gate keeps persist/persist0 denied. A pagehide during pending asynchronous acquire invalidates the callback and cannot start a late session.
3. On same-origin storage events touching the primary dune-goh-v1 key, check exact under-lease primary bytes; if changed, block + release. Any other tab write to the verified backup sidecar or a storage clear conservatively blocks too. Unrelated preferences such as dune-gfx do not block. Storage notifications are best effort and only detect outsider writes after the fact, not a mutex.
4. ui/wiring.js: UI-owned blocked screen with clear reason, no reset or automatic recovery. If the current primary is verified valid, offers a textarea with the exact UTF-8 base64 export code from storage (same encoding as B2), never from possibly modified global S. If corrupt/unavailable, does NOT mislabel an emergency RAM copy as verified. The overlay has explicit user-controlled full reload; game input capture permits only overlay controls.
5. core/save.js: expose primaryKey on existing opt-in loadSave.writer property, so storage listener compares the actual v1 primary (not an undefined key). Existing 898 named exports, 167 ESM split markers and ARCH-01D strict baseline must remain unchanged.

## Mandatory deterministic acceptance

The new dev/tests/ci/arch02c-b3-b1b-lifecycle-acceptance.mjs runs twenty-one scenarios on EACH compiled PWA and HTML artifact:

- E01 active owner saves and remains unblocked; E02 busy second tab never boots or writes, with block reason.
- E03 pagehide releases and denies stale RAM; E04 BFCache pageshow persisted true blocks; E05 freeze/resume remains blocked.
- E06 uncooperative pre-B3 cached PWA can still overwrite primary, storage-event detection stops the new writer afterward (explicit **UNSAFE historical behavior**, not protection).
- E07 identical outside primary event does not block; E08 backup sidecar event blocks; E09 unrelated preference event does not block.
- E10 pagehide during pending lock acquisition cancels late grant and boot; E11 blocked game clicks prevented; E12 overlay copy/reload buttons still usable; E13 active gameplay input allowed.
- E14 unsupported navigator.locks has a blocked diagnostic and no S; E15 quota on boot persist refuses boot, releases writer and blocks; E16 pageshow does not resurrect S.
- E17 blocked screen displays exact verified storage bytes, not mutated RAM; E18 corrupt primary has no verified export.
- E19 a cross-tab storage-clear event blocks conservatively even if bytes were rapidly recreated before delivery; E20 visibility hidden releases while visible return never resumes stale RAM.
- E21 blocked overlay absorbs clicks and key presses before historical global event handlers, while preserving native text-copy keyboard defaults.

Additionally, an actual native Web Locks, two-page same-origin Chromium smoke test is required within the existing E3 iPhone UI job (after Chrome setup): `dev/tests/ci/arch02c-b3-b1b-real-multitab-chromium.mjs`. It captures the real composition-root callback before automatic legacy start; checks blocked secondary, verified +100 then pagehide/release/new +10, confirms an uncooperative legacy start still bypasses lock (+3), detects stale storage and refuses additional save, and tests BFCache-style wake. This is real Chromium and real shared localStorage, not a VM mock; it still is NOT Safari, not an actual v140 cached service worker and not full PWA promotion/downgrade proof.

The new tests are mandatory post-build for both PWA+HTML alongside B3-A0 intentionally unsafe baseline, B3-B1a cooperative Web Locks test, B3-B1b gated boot test, B0/B1/B2 checkpoint/import, strict ARCH-01D, golden 200 battles/41 screens, campaign, offline PWA, full WebGL matrix, final all required gate and artifact identity. Fake DOM and fake Web Locks are not proof of actual two-Chromium-page or physical iPhone Safari behavior. Do not remove failing tests or golden mismatch through regeneration.

## Cross-version and design STOP

- Full single-writer production startup remains **OFF**. Pre-B3/v140 JavaScript cached by older service workers ignores any new Web Locks and still writes the exact same primary key. Storage events cannot prevent confirmed writes from being overwritten before the notification. Old-version fencing, backup+restore and import serialization remain open.
- Direct loadSave.checkpoint.commit/recover, B2 import confirmation and several old UI flows still bypass writer authority because the default mode has not been activated. B3-B2 must align them.
- Browser freeze/pagehide, Safari standalone, navigation and observed event order need actual end-to-end validation on two live pages and physical iPhone 844×390/667×375. Do not claim test stubs establish safety in WebKit.
- This only protects a currently active in-memory session from writing AFTER it loses authority; in-memory resource mutations that preceded a failed save are not transactionally rolled back. B4–B6 remains needed.
- If existing uncooperative cached JS cannot be safely fenced, develop an explicit owner-reviewed IndexedDB-authoritative migration + rollback plan and deny full B3 release until accepted; do not silently change the data store, key, schema or version.

No merge/publish/version bump, root PWA edits or game balance/3D/goldens changes. Review CI at exact PR head, update #199, obtain separate owner GO. Reference baseline audit dev/docs/ARCH02C_B3_MULTITAB_RACE_AUDIT_2026_11_19.md, B1a proof and #209 B1b gated contract.

## Owner-approved manual PWA save transfer / reinstall HOLD — 2026-11-19

The owner **explicitly approved** a single-device manual save handover instead of introducing an automatic IndexedDB data migration at this stage. Preserve existing v1 localStorage save semantics with verified checkpoints plus exclusive Web Locks for cooperating new PWA clients. The transfer will be: export the verified save from the **currently installed v140**, store the export code **outside the PWA** and independently confirm it is complete/readable, validate/publish a future protected version, close ALL old game tabs/PWA instances, reinstall as instructed, import with the B3-B2 protected writer, confirm roster/resources/campaign and successful persistence through another reload.

**HARD RELEASE STOP:** Do **not** tell the owner to delete/reinstall the current PWA, clear site data, or import a save until the assistant explicitly sends a separate user-facing message: **«МОЖНО ПЕРЕУСТАНАВЛИВАТЬ PWA»** with a step-by-step export-before-delete checklist. This signal is withheld until B3-B1c protected production boot, B3-B2 exclusive import/recovery, required exact-head CI, release verification, browser/PWA regressions, and physical Safari validation are complete or honestly qualified/accepted. PWA removal may erase localStorage and lose any progress not exported. If verified export fails or is unavailable, STOP the migration; never clear data.

This accepted manual path does not magically fence old v140/older offline JS. Pre-B3 cached client versions can bypass Web Locks and mutate the legacy primary. Closing/retiring all old instances and owner-controlled reinstall reduces exposure for the one-device rollout but is not a general cross-version correctness proof; production handover must explicitly document this limitation. No automatic IndexedDB migration will be implemented without a new owner decision.

## CI incident — 2026-11-19

PR #210 exact HEAD edb6096f5d0fd9cb017383d12ef19727f6cc1e78, run 44495111850 attempt 1: pre-existing E3 Conquest celebration 8s timeout (tracked separately in #207), preventing new native B3 smoke from running; build/strict/VM B3 proofs all passed. Attempt 2: E3 cold+warm passed, but NEW native same-origin Chromium test observed a cross-renderer read of 4200 immediately after the owner verified 4300. The independent page may not have observed the updated localStorage cache yet; do not assume visibility is synchronous across renderer processes. CI must now explicitly require (a) verified writer sees its own exact bytes immediately, (b) separately running page converges to the committed bytes within a bounded window, (c) after ownership handoff a fresh writer actually starts from the latest verified primary. This is a diagnostic race finding, **not a completed multi-tab safety proof**. No weakening of conflict assertions, no suppression of native test, and no production cutover on green VM-only tests.
