# ARCH-02C-B3 — multi-tab concurrency audit and implementation contract

Date: 2026-11-19. Parent: #193 / #199. Baseline: main e109937b630ccc0fcf13fb20031e4a598928d3e7 after verified v140 PWA publication. Published release source: 20c0e7eae7cb28cee61c20d4b1feb7b9243bd3a0. Version 140. **B3-A0 is characterization/test infrastructure only, NOT a protection fix. No merge/release/publish authorization.**

## Actual v140 sources and existing guarantees

Historical evidence: ARCH-02A #194; ARCH-02B0/B1 #195/#196; ARCH-02C-A1 #200, B0 #201, B1 #202, B2 #204 and v140 #205; main dev/docs/ARCH02C_B0*, B1*, B2* and the 22 transaction groups in the A1 inventory. GitHub Actions publication #44464747352 attempt 2 completed success, including verified Pages job; root PWA sync commit is e109937b.

- dev/src/core/save.js: key dune-goh-v1 is v1 JSON. loadSave distinguishes missing/ok/corrupt/unsupported/unavailable. Legacy persist0 stringifies the mutable global S and directly invokes localStorage.setItem on the progress key, with typed write errors but **no lock, version compare, readback or checkpoint backup**. persist delegates to persist0. Boot and gameplay/notification callers still use this path.
- loadSave.checkpoint.inspect validates primary and backup. checkpoint.commit validates a detached draft, writes/verifies the previous valid primary to dune-goh-v1.backup, rechecks expected exact primary raw, writes new primary, verifies exact readback; only this opt-in API returns verified committed. checkpoint.recover requires explicit expected primary and backup bytes, refuses valid/future primary and verifies restoration. Both recheck/write sequences are **non-atomic across tabs**.
- dev/src/ui/wiring.js: B2 manual import uses detached parse/preview, memory+raw guards, explicit human confirmation and checkpoint.commit; set_S happens only after confirmed write. Export reads verified valid primary, with separate labelled unsaved RAM export.
- dev/src/core/boot.js: start still executes synchronous migrations and persists before initial render, without writer election. The 22 transaction groups in ARCH-02C-A1 still mutate S first; B0 cases C05-C15 retain unsafe historical observations until B4-B6.
- Existing mandatory dual-artifact B0, B1, B2 tests, 898 named ESM exports, 167 SPLIT markers, zero ARCH-01D forbidden edges, v1 save fixtures, game goldens, Campaign 210, and independent strict CI remain immutable.

**Separate risk:** In v140 publish run #44464747352 attempt 1, the E3 Conquest real-browser test at dev/tests/ci/arch01c5a-b1-real-lifecycle.mjs:96 timed out waiting for celebration visibility (8 seconds). The exact retry passed without a source/test edit. Track this as flaky timing independently; do not weaken tests or confuse it with B3.

## Verified code risks / interleavings

| ID | Fault timeline | Current result | Required protection |
| --- | --- | --- | --- |
| R1 | Two checkpoint tabs both read P; B commits between A's last recheck and write | Both may acknowledge, B is overwritten | One exclusive writer, no acknowledged lost update |
| R2 | A commits P+100, B's legacy persist writes old RAM P+3 | Newer confirmed state clobbered | Fence all old save paths before lock is released |
| R3 | A previews import; B changes primary before A confirms | Sequential conflict correctly refused | Keep safeguard, eliminate check-to-write gap |
| R4 | A confirms import, stale tab B persists old RAM afterward | Import lost on reload | Block stale tab's writes, show explicit reopen/conflict |
| R5 | Two explicit restorers race; B restores and commits new progress before A overwrites with older backup | Confirmed post-recovery progress lost | Restore and commit share exclusive writer authority |
| R6 | Write exception after another tab's commit | Uncertain status (correct) | No success and no blind retry; inspect before action |
| R7 | Tab closes/freezes/BFCache/restores, or lock manager absent | No owner lifecycle | Fail closed, reacquire/revalidate on wake |
| R8 | Old cached PWA bypasses new locking entirely | Old version can write same key | Resolve downgrade/fencing or NO-GO |
| R9 | BroadcastChannel/storage event delayed or missed | Notifications unreliable | No safety dependence on events |

localStorage setItem is per-key synchronous replacement in a normal browser. The flaw is absence of multi-tab check-and-write isolation and stale-writer fencing, **not** proof of torn JSON. This audit does not claim an actual player's save was lost or that iPhone Safari has reproduced these races.

## Architecture comparison and provisional recommendation

| Candidate | Benefit | Cost and decision |
| --- | --- | --- |
| Web Locks exclusive named lock + recheck inside critical section | Preserve v1/localStorage/checkpoint, serialize cooperating same-origin participants, offline compatible; Safari iOS support since 15.4 | Async boot ownership and lifecycle; unsupported/partitioned clients; cannot stop old uncoupled JS. Preferred only after proof |
| IndexedDB authority with one readwrite transaction | True transaction-level serialized primary version/revision and data mutation | Dual-store/migration complexity, Safari/WebKit behavior, quota, old clients, golden/boot/rollback. Requires explicit owner architecture GO |
| Single-writer UX without Web Locks/IDB | Simple user model | Election using localStorage token alone is racy. Insufficient |
| Optimistic version or generation inside v1 | Identifies sequential stale snapshots, supports idempotency | Bare localStorage get+set is still not CAS. Supplement only |
| BroadcastChannel or storage events | Fast tab notifications and reload prompt | Not a mutex, may be delayed or absent. Notification only |

**Working choice:** cooperative Web Locks-based single active writer plus exact-base revalidation; secondary tabs must not initialize mutable gameplay or write primary. No fallback to unguarded persist on absent/denied/timeout lock. Do not lock only checkpoint.commit while legacy persist0 still bypasses it. Holding an exclusive lock for the active session plus explicit pagehide/freeze/pageshow release/revalidation is a candidate, **not yet proven**; prolonged frozen holders, deadlock, boot test assumptions and in-progress battle continuation need tests.

**Critical old-version caveat:** a pre-B3 offline PWA ignores the new lock. There is no localStorage trick that atomically fences out a process that never checks the protocol. Full cross-version safety needs an authoritative-store cutover or demonstrably safe old-client upgrade policy; if this cannot be proven, Web Locks-only must stay NO-GO for production. A migration to IndexedDB may then be justified, but cannot be silently adopted.

## Required staged implementation contract

1. **B3-A0 (this PR):** deterministic unsafe baseline using two independent built-game VM heaps with one shared origin storage map and injected exact interleavings. B3-01..08 run on both actual built PWA and HTML artifact. B3-02/03/05/06/08 intentionally prove UNSAFE behavior; green means characterization succeeded, not that races are fixed. Keep the unsafe evidence permanently available.
2. **B3-B1:** prototype lock manager / single writer acquisition **before boot.start** and before any critical mutation; fail closed without native support; stale/secondary tab UX, lifecycle and read-only rescue; no direct persist0 bypass. Preserve startup ordering/898/167/ARCH-01D invariants. Add deterministic mutual exclusion and two-real-page Chromium tests. Do not merge the lifecycle contract if old-version fencing unresolved.
3. **B3-B2:** adapt checkpoint.commit/recover/manual import to the proven authority. Compare exact current primary under lock, stage/verify backup and primary as before; on conflict/uncertain block without automatic recovery. Convert historical UNSAFE checks into new positive safety acceptance in a separate suite (do not erase prior forensic evidence); test quota, set-then-throw, concurrent import/restore, retry, tab closure.
4. **B3-B3:** standalone PWA/offline, old-cache downgrade/upgrades, BFCache/freeze/reopen, lock unavailable, same vs different origin/partition, observed notification delivery independence, physical Safari iPhone. Resolve old-version authority question before production GO.
5. **B4-B6:** move reward/purchase/battle settlement to detached drafts with operation markers and confirmed acknowledgment. Single-writer protection alone does not solve already-mutated RAM/false-success after quota.

**Final acceptance:** two writers reading same version cannot both acknowledge mutually destructive updates; no confirmed resources, claims, purchases or imported/backup progress silently rolled back; all actual primary writers gated; stale tabs never save; no unsupported-API fallback; import and restore mutually exclusive; failed writes and ambiguous readbacks never report success; v1 fixtures and entire CI strict gate pass unchanged; true same-origin multi-page and physical standalone iPhone Safari verification. Notifications are best-effort only. No guarantee against whole-origin eviction, fsync or cross-device PWA sync.

## Reproduction and continuation

Build in dev and run:
- node tests/ci/arch02c-b3-multitab-characterization.mjs dist/pwa/index.html
- node tests/ci/arch02c-b3-multitab-characterization.mjs dist/artifact.html

The workflow invokes both tests as a required post-build step when CI mode is not reuse. Exact-head full CI and final All required checks passed must be verified before PR acceptance. Never infer a new safety property from a green unsafe characterization. Document resulting PR link/CI run and blockers in parent Issue #199. Do not merge, bump dev/version.json, touch public PWA root, publish, or modify golden to make a test pass without the owner's specific authorization.
