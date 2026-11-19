# ARCH-02C-B3-B1b — opt-in runtime writer gate and preboot arbitration

Date 2026-11-19. Parent #199 / #193. Baseline: PR #208 merged to main at ffb235125c805755a5f6272240fa409f5cfb1868, B3-A0 #206 previously merged. Published version v140 unchanged.

**STATUS: FIRST B1b IMPLEMENTATION SLICE. NOT a live multi-tab fix, NOT authorized for production.**

## Actual source risk

- dev/src/boot.js invokes start immediately or through host hot.ready(start) before any asynchronous writer acquisition.
- dev/src/core/boot.js:start loads, migrates S, modifies login/meta data and invokes synchronous persist. It renders and attaches gameplay progress. Dozens of UI/logic calls depend on synchronous persist/persist0.
- dev/src/core/save.js:persist0 writes mutable global S to dune-goh-v1 with plain localStorage.setItem; opt-in B1 checkpoint and B3-B1a lease do not automatically intercept it.
- dev/src/ui/wiring.js:B2 manual import uses unguarded loadSave.checkpoint.commit, which is NOT inside writer authority. Explicit checkpoint.recover also remains separate.
- B3-A0 baseline proves several unsafe race interleavings. B3-B1a proves cooperative Web Locks lock acquisition only. A cached pre-B3/v140 PWA ignores Web Locks and may overwrite current primary. Exact-byte revalidation detects past interference, not interference after the check. A localStorage token or BroadcastChannel cannot fence uncooperative old JS.

## Implementation in this candidate (opt-in, no production cutover)

1. loadSave.writer.enableGate is a sticky one-way flag in the JS realm. When enabled, **every legacy persist0 and persist call** goes through synchronous writerCommit with the currently held exclusive lease and the existing B1 verified checkpoint protocol (backup then primary + exact readback). Missing/denied/lost lease, stale original raw, quota, ambiguous write and corrupt storage return non-success and trigger existing onPersist error hook. There is no silent fallback to old localStorage.setItem after opt-in. Successful gated persist keeps the historical status ok and adds diagnostic verified status; save schema unchanged.
2. start.writer(data={}) is an opt-in method on the existing named export start in dev/src/core/boot.js. It refuses if ordinary start already ran, rejects an unverified hot reload snapshot, enables the strict gate BEFORE acquisition, acquires writer lease, then invokes the existing synchronous start. Denied/busy/unsupported lock does not initialize S or render gameplay. A boot interrupted by failed checkpoint returns boot-incomplete; exceptions return boot-exception without claiming success.
3. The existing production boot.js entry is deliberately unchanged. This preserves historical golden/DOM/boot semantics for v140, but the live PWA remains UNSAFE from multiple tabs until a separately approved cutover.
4. Once a gated owner releases the lock, later persist/persist0 refuse writes. The existing game can still mutate its RAM after release; freezing the UI/action handlers across pagehide/freeze/BFCache is incomplete. No promise of safe gameplay state or transaction acknowledgment yet.

Existing named exports 898, ESM split markers 167, strict architecture baseline zero forbidden, v1 save key and schema, page root/SW, version, gameplay economy, Campaign 210, goldens, graphics profiles and rendering are unchanged. No backup is fabricated for an initial write into an empty origin.

## Deterministic acceptance

New dev/tests/ci/arch02c-b3-b1b-gated-boot-acceptance.mjs: 18 cases times two actual compiled builds (PWA and artifact), with two independent game VM heaps on shared storage and deterministic native Web Locks stub.

- G01 documents UNSAFE legacy default. G02 gate without owner refuses writes. G03 unsupported Web Locks never reaches boot. G04 competing second tab cannot boot or save.
- G05 new owner reloads latest primary after prior release. G06 guarded legacy persist stages/verifies checkpoint. G07 release never falls back to unchecked persist. G08 old uncooperative client still bypasses lock (explicit UNSAFE) and opted-in client detects stale storage.
- G09 backup quota failure leaves primary unchanged. G10 write-then-throw yields uncertain and bars retry. G11 corrupt primary cannot become a fresh account. G12 a legacy-started session cannot claim late-safe bootstrap. G13 untrusted hot reload data cannot bypass reloading verified primary.
- G14 missing primary without a backup creates a genuinely new account under authority. G15 missing primary with valid backup requires manual recovery. G16 rejected native manager blocks boot. G17 failed first checkpoint during boot cannot claim startup success.
- G18 after a gated session releases, it cannot reacquire a new lease using old RAM; a later confirmed owner's write is preserved. Gate invalidation is sticky for the original JS realm.

Required CI stage on both PWA/HTML plus existing B3-A0 intentionally UNSAFE forensic characterizations, B3-B1a primitive tests, B0/B1/B2 saves, strict ARCH-01D, campaign/golden/3D/PWA/offline/full gate. VM tests are not a two-real-page browser proof.

## Remaining B1b and hard NO-GO before production

1. Inventory all primary storage writes and route checkpoint.commit, checkpoint.recover and B2 manual import through the same authority. Distinguish read-only verified export from writes.
2. Replace production boot entry only after showing that a denied second writer cannot mutate S, play, receive rewards, trigger timers, or export unverified RAM as verified. Provide a clear user notice and explicit safe reopening instead of hidden fallback.
3. Handle pagehide/pageshow, BFCache, freeze/visibility, unexpected lock release and app resume: release/cancel, revalidate current storage and restart or refuse; never continue playing with stale S. Test two real Chromium pages, mobile SwiftShader and physical Safari iPhone PWA standalone (844x390/667x375).
4. **Old cached v140 cannot be fenced via Web Locks alone.** No production multi-tab claim until an owner-approved authoritative store/migration/downgrade plan, e.g. IndexedDB as authoritative with tested migration and safe legacy cutoff, is implemented and verified. Do not silently migrate or discard old saves.
5. B3-B2 handles concurrent import/recovery; B3-B3 handles older SW/offline transition and physical iPhone; B4–B6 handles already-mutated-RAM gameplay transactions, rewards/purchases/idempotency and error acknowledgment.

No merge, release, version bump, production root change, fixture/golden regeneration, architecture downgrade or CI relaxation without separate owner approval. Issue #207 separate flaky Conquest case remains open. Owner review of exact-head full CI and complete blocker list is mandatory.
