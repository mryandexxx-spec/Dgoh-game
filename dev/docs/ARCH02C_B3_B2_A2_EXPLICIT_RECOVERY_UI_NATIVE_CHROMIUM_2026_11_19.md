# ARCH-02C-B3-B2-A2 — explicit protected restore UI and real Chromium Web Locks

Date: 2026-11-19. Parent issue [#199](https://github.com/mryandexxx-spec/Dgoh-game/issues/199). Stacked on Draft [#213](https://github.com/mryandexxx-spec/Dgoh-game/pull/213), A1 exact-head CI [#44533949128](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44533949128) SUCCESS on `b1439616cceafec130acf26fe3189eeabe94001e`. A1 remains a Draft PR targeting main; A2 is a separate Draft PR targeting A1 branch until owner approves ordered merge. No production default boot activation, service-worker or public PWA version change.

## Verified starting architecture

* `dev/src/boot.js` is byte-frozen and `start(data)` MUST keep `set_S(initialSave(data))` as its first AST statement.
* The old production composition root remains unprotected. `window.__DGOH_B3_B1C_BOOT_MODE__ = 'writer-preview'` is the **only** automatic entrypoint opt-in. Cached v140 JavaScript can still write without Web Locks; a new lock is not a remote fencing protocol.
* B3-B2 A1 introduced the opt-in `loadSave.writer.acquire({purpose:'recovery'})` and `loadSave.writer.recover({expectedPrimaryRaw,expectedBackupEnvelope})` for verified B1 recovery under a recovery-only native lease with `S === undefined`, and no reentry after release.
* A1 import already commits under the same writer lease and blocks all normal gameplay input after a successful import or uncertain/stale result.

## A2 implementation: two explicit user actions, no silent rollback

Upon **opted-in** `start.writer` refusal due to corrupt/invalid primary or missing primary with intact backup, the existing `save-writer-blocked` dialog may offer **Проверить резервную копию**. This is deliberately *not* visible to unsupported-version, busy, no-Web-Locks, valid-primary, or post-suspend screens. Rendering the initial blocked UI never inspects storage without authority.

The user's FIRST action requests a native exclusive recovery-only Web Lock with `ifAvailable:true`, then invokes B1 inspection only while the lease is confirmed owned/current. It requires primary `missing/corrupt/invalid`, backup `ok`, and an observed `recoverable` state. The UI reveals a summary of the actual verified *previous* v1 checkpoint (hero count, balances, noncryptographic checksum), explicitly warning that recent progress may be absent. It does not write, clear, migrate, boot, or change RAM. Denied, missing backup, stale, hidden or unavailable acquisition fails closed with no automatic retry.

The user's SECOND and separately labeled action **Подтверждаю восстановление из резервной копии** invokes the one-shot `writer.recover` with exact primary raw and backup envelope bytes captured under lock. The core checks current owned status and byte equality, verifies primary write/readback and releases on success *or any failure/uncertainty*. The current JS heap remains blocked and is never attached to newly restored S. Successful UI says **Резервная копия восстановлена — перезагрузите игру**; failure shows a blocked reason and does not suggest blindly trying again. **Отмена — сохранить всё без изменений** releases the lease and leaves primary untouched; a fresh browser load is required for any new attempt. No reset or automatic recovery affordance.

## Lifecycle correctness

The B3-B1b boot lifecycle guard used to release native leases only upon first transition from active to blocked. A corrupt save blocked gameplay *before* the user could acquire recovery-only authority, so pagehide/visibility hidden/freeze/BFCache could otherwise leave the recovery lock held. A2 always treats those suspend events as authority-revocation events **even when already blocked**, calls writer.release() and invalidates the JS realm. A late pending acquire cannot reattach after a background transition. Current overlay confirmation with a lost lock invokes no save commit and cannot silently reactivate gameplay.

## Mandatory test evidence

* `dev/tests/ci/arch02c-b3-b2-a2-recovery-ui-acceptance.mjs` — U01–U14 for **both** compiled PWA and HTML artifact. No auto restore, separate preview+confirm, cancel, pagehide/freeze/visibility/BFCache, pending acquire cancellation, future save, missing backup, verified backup with missing primary, outsider primary write, sidecar tamper, double-confirm. Actual JS DOM controls are invoked against the real compiled app with deterministic native-lock shim; old tests remain.
* `dev/tests/ci/arch02c-b3-b2-a2-real-chromium.mjs` — native Chromium via `puppeteer-core`, real same-origin HTTP PWA, browser Web Locks and shared localStorage. Tests actual composition-root preview entrypoint, B2 modal preview/confirmation and a denied second tab, fresh post-import boot, real UI one-click recovery inspection (raw unchanged), independent same-origin Web Locks denial during approval, verified recovery after second click and cold reload, plus pagehide interrupt releasing native lock. No mocked lock provider, no safety claim about old clients.
* Both checks are **required in CI** by `.github/workflows/validate-pwa.yml`: VM PWA+HTML in Build once and native Chromium in E3 phone DOM job after the earlier real multi-tab writer proof. Historical tests and all 20 required jobs remain intact; do not weaken the CI gate.
* A2 must pass **complete exact-head CI**, not merely its new 14 test cases, before anyone may propose a merge.

## Safety boundaries and release HOLD

1. This is still **opt-in preview only**. Mandatory Web Locks production boot must be a separately reviewed B3-B1c final cutover; no publication before real Safari/PWA local-data risk review and user explicit release GO.
2. **Physical iPhone Safari/standalone iOS testing is not provided by Chromium CI**; manual acceptance must verify foreground/background/BFCache, storage quota/security, import, recovery, offline PWA, and copy/paste export with real device data protected.
3. Old v140 PWA tabs/service-worker caches are **uncooperative**; they cannot be fenced by Web Locks. End-user handoff must be controlled (one client/device, external verified backup) and avoid running old/new builds concurrently. No IndexedDB migration is planned; historical v1 import is explicit/manual.
4. A native Web Lock provides same-origin cooperation only; it does not make localStorage transactional across arbitrary uncooperative tabs, secure against origin eviction, or guarantee fsync.
5. **Do not delete, uninstall, reinstall or clear the currently installed PWA now; do not publish v141 now.** The explicit phrase “МОЖНО ПЕРЕУСТАНАВЛИВАТЬ PWA” is reserved for the later separately verified post-release handoff after current v140 external export, completed B3-B2 and final default boot, full CI, Safari proof, protected import, and owner approval.

Until CI and iOS evidence, Draft PRs remain unmerged.
