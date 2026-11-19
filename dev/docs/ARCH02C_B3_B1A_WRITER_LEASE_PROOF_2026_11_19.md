# ARCH-02C-B3-B1a — opt-in single-writer lease proof, NOT live integration

Date: 2026-11-19. Starting commit: merged B3-A0 PR #206 in main at 0d7caff8517d4ec2020717436ec18b2a2ac4604a. Published PWA remains v140 (original publication at e109937b630ccc0fcf13fb20031e4a598928d3e7). Parent issues #193 / #199. This package is the FIRST SMALL IMPLEMENTATION SLICE under user authorization to start B3-B1. It is **not a completed multi-tab safety fix** and requires separate review/GO before merge or release.

## Why the slice is deliberately opt-in

The pre-existing game is architected around synchronous boot.start, shared mutable global S and dozens of direct persist/persist0 callers. The B1 checkpoint is opt-in and B2 manual import alone uses it. Simply wrapping checkpoint.commit in navigator.locks would leave older gameplay/boot/notification writes outside the lock. Starting gameplay without obtaining native writer authority would still allow a stale tab to overwrite an acknowledged import.

Web Locks can serialize *cooperating same-origin, same-storage-partition* clients, not old cached code that never requests the lock. Broadly replacing synchronous persist/start or making all gameplay asynchronous without dedicated lifecycle and golden tests would be an unsafe regression. Therefore B3-B1a first implements **isolated proof of the coordination primitive** on the existing loadSave function's opt-in property. It deliberately does not enable it as a production storage gate yet; production calls remain unchanged and B3-A0 UNSAFE cases must still pass as forensic characterization.

## Actual implementation in this branch

In dev/src/core/save.js, add loadSave.writer, with **no new named export** (preserves frozen 898 names/167 SPLIT markers):

- name: dune-goh-v1.writer; stable Web Locks resource name for cooperating same-origin clients.
- acquire(): async navigator.locks.request(name,{mode:'exclusive',ifAvailable:true},callback). If unavailable/missing/denied, or lock busy, returns typed non-success. This intentionally does **not** use localStorage as a mutex (no cross-tab CAS). A validated native manager returns a Promise; non-Promise behavior is not an ownership acknowledgment. Once acquired, first inspect primary and backup; reject unsupported/unavailable/invalid current primary or unusable sidecar; a missing primary with readable backup is recovery-required, not a new account.
- Native lock is **held by a pending Promise** until release, rather than acquired/released around one immediate read. This allows a future single active gameplay writer mode. No blocking wait for another tab: ifAvailable immediately refuses with busy.
- state()/check(): current opt-in lease; check always re-reads exact primary bytes (to detect older/uncooperative writers that wrote since acquisition), denies later opt-in commit when stale. Even this check cannot fence a process that ignores all locks and writes immediately afterwards.
- commit({expectedRaw,candidate}): only while lease is active and current; exact raw must match lease base; invokes existing B1 commit synchronously within lock, including prior backup and primary exact-byte verification. Successful commit advances owner baseline. Existing B1 uncertain/conflict marks lease stale; it never retries implicitly or acknowledges ambiguous outcomes.
- release(): invalidates an acquired lease and resolves native lock-holding Promise; also cancels pending acquisition via generation ticket, so later callbacks cannot take ownership. An unexpected native lock resolution/rejection drops owner state. No automatic recovery or data deletion.

**Important non-goals:** B3-B1a does NOT modify persist(), persist0(), start(), the boot order, game transactions, B2 import, checkpoint.commit/recover API compatibility, UI screens, browser service worker, save schema, backup format or primary key. Consequently a second tab running legacy persist can **still** overwrite a successful opt-in commit. This gap is stated in tests and PR, not hidden.

## Test contract

New dev/tests/ci/arch02c-b3-b1-writer-lease-acceptance.mjs uses independent actual compiled game VMs with one shared localStorage Map and a deterministic mocked Web Locks manager. It runs for both built PWA and HTML artifact as a required post-build CI step.

L01: missing API = fail closed, no opt-in commit.
L02: two active tabs cannot acquire the same cooperative lease simultaneously.
L03: owner commits verified backup/primary; after release, new writer reads new base and stale expectedRaw fails; combined +100 and +10 remain.
L04: double simultaneous and reentrant acquisition cannot fork same-tab owner.
L05: explicitly UNSAFE uncooperative legacy persist while lease held; detected as stale, later opt-in commit refused, but legacy writer was not prevented.
L06: corrupt backup preflight refuses to own/commit and preserves primary.
L07: quota staging backup under lease preserves old primary; no false success.
L08: primary write-then-throw returns uncertain; lease becomes stale and blocks blind retry.
L09: denied primary read during acquisition refuses ownership/releases native lock.
L10: native lock promise rejection refuses ownership.
L11: release during pending acquisition cancels late callback.
L12: genuinely empty verified origin permits explicit new v1 checkpoint under owner; no automatic starter write.
L13: missing primary with valid backup requires recovery; never silently treat as new.
L14: explicitly UNSAFE fallback; plain legacy persist still operates even with absent Web Locks, proving the remaining integration gap.

**No real browser / physical iPhone safety claim from this fake lock test alone**. The B3-A0 source-based interleaving evidence is still mandatory and still UNSAFE until all writers are fenced. Do not relabel unsafe tests as safety acceptance. Existing B0 C05-C15 game transaction failures await B4-B6.

## Remaining B3-B1b work / stop gates

Before enabling production single writer, design and implement in its OWN reviewable PR or a separately approved continuation:
1. Acquire validated writer ownership **before calling start, newSave, fillSave/migrations that lead to writes, or enabling any mutable UI**. Secondary window is clearly blocked and can safely export valid storage or separately unconfirmed RAM; no hidden bypass.
2. Integrate *all* synchronous primary write sites (persist0, persist, boot, notifications, checkpoints and manual import), preserving stable ESM initialization/boot contract; any absent/busy/lost lock must refuse any primary write. No fake 'read-only' display if live button handlers still mutate S.
3. Ensure that a writer's known base raw updates only after verified completed write. All writers must recheck base and relevant primary status while owner; no blind merge of stale currency/claims/loot. Existing persist is only write-error-classified, not proof of transactional B4-B6 acknowledgment.
4. For pagehide/BFCache pageshow/freeze/visibility change, release/cancel and reacquire/revalidate before gameplay actions or persist. Do not silently resurrect suspended stale RAM or steal a lock. Test actual two Chromium pages in one browser context, reload/close/offline, and physical iPhone Safari + installed PWA.
5. Explicit **cross-version/downgrade blocker**: a cached v140 PWA remains able to write dune-goh-v1 while a newer PWA holds a Web Lock. Web Locks alone cannot prevent this. If a dependable version-fencing/upgrade policy cannot be demonstrated without losing acknowledged changes, STOP and request owner approval for an IndexedDB authoritative cutover / dual-store migration plan. Do not claim full multi-tab safety or publish B3 on the Web Locks lease proof alone.
6. Recovery must remain manual; checkpoint backup is an older snapshot, not a transactional journal or origin-eviction guarantee. No changes to GameClock/RNG/economy/graphics/Campaign 210/goldens/architecture baseline.

## Verification, governance and restart

Current files in this B1a candidate: dev/src/core/save.js, new dev/tests/ci/arch02c-b3-b1-writer-lease-acceptance.mjs, .github/workflows/validate-pwa.yml and this document. No version increment or root PWA changes. Read B3-A0 audit in dev/docs/ARCH02C_B3_MULTITAB_RACE_AUDIT_2026_11_19.md, B1 checkpoint and B2 handoffs, PR #206, Issue #199.

Exact PR HEAD and complete CI (both builds' new L tests; old B3-A0 UNSAFE tests; independent ARCH-01D strict; all existing goldens, 200 battles/41 screens, Campaign 210, PWA/offline, WebGL, SHA-256, final all-required) must be verified before any acceptance. An exact-head job pass does not authorize merge/publish or prove a real single-writer production policy. No merge/release/publish without direct owner GO. Old flaky Conquest E3 issue #207 remains separate; no test relaxation.
