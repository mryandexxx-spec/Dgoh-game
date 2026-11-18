# ARCH-02C-B1 — opt-in verified commit, backup and explicit recovery

**Owner GO:** «ARCH-02C-B1 — проверяемый commit, резервные копии и восстановление», 2026-11-18. **Stage: implementation candidate; no merge, no main or publication change.** Stacked on **B0 test-only Draft PR #201** (`4eccc5dcf8bf897ec3870e62db8d747cc15a932a`); v138 production main remains `b652864bbf033c2be12ea97475013c8ce77e37b8`. Parent issues #193 and #199, A1 proposed contract Draft PR #200.

## Precise delivered boundary

An additional opt-in protocol is now exported from `dev/src/core/save.js`:

- `CHECKPOINT_KEY = 'dune-goh-v1.backup'`: a sidecar containing `{format:1,key:'dune-goh-v1',raw:<exact prior valid v1 JSON>,checksum:<FNV-1a-32 over JS code units>}`. This checksum detects incidental corruption, **not malicious tampering, collision attacks, fsync, Safari origin eviction or power-loss**.
- `inspectCheckpoint()`: read-only status of primary and backup, with the original raw bytes available for a user's rescue export. Primary `ok`, `missing`, `invalid`, `corrupt`, `unsupported`, `unavailable` distinguished; backup adds `checksum-mismatch`. If primary is not valid and backup is verifiable, returns `recoverable`, but **never auto-restores or overwrites source bytes**.
- `commitCheckpoint({expectedRaw,candidate})`: *caller-controlled, opt-in only*. Requires exact previously inspected valid primary raw, or null for a confirmed missing primary. Before the primary write: validate candidate as v1, inspect current primary and backup, write previous primary into backup sidecar, **verify exact written sidecar bytes + content checksum + v1 shape**, re-read current primary for a sequential stale-write guard. Then write full v1 candidate to existing `dune-goh-v1`; **only a byte-exact successful primary read-back** returns `{ok:true,status:'committed'}`. Failed backup/primary writes return quota/security/errors and leave primary intact when conclusively unchanged. Ambiguous write/verification outcomes return `uncertain`, never "completed". Does **not** mutate `S`, grant rewards or emit a success toast. No-op `candidate===expectedRaw` returns `unchanged` without rotating backup.
- `recoverCheckpoint({expectedPrimaryRaw,expectedBackupEnvelope})`: **explicit consent action, not called during boot**. Requires byte-exact, previously inspected primary raw and backup envelope; permits only missing/corrupt/invalid primary when backup has valid checksum and v1 content. Rejects unsupported/newer save versions, intact primary, changed previews and unusable backups. Successful restore verifies exact read-back, preserves sidecar. Failed/uncertain recovery cannot report success.

**Unchanged existing caller path:** `loadSave()`, `persist0()`, `persist()`, `start()`, `ui/wiring.js` manual import/export, all gameplay transaction callbacks, economy, RNG, GameClock, golden. Only new API code in `core/save.js`. The original raw v1 save remains byte-compatible; no mandatory in-primary revision/ledger field is introduced. **This is not a deployed repair of the dangerous B0 transaction behaviors.** Production v138 retains those gaps until B2/B3/B4/B5/B6 are independently approved.

## Crash windows and recovery semantics

| Crash/fault boundary | Primary after fault | Sidecar after fault | API response |
|---|---|---|---|
| before candidate validation/preflight | old valid untouched | untouched | invalid/serialization/conflict/blocked |
| backup read/write or backup read-back failure | old valid untouched | may be old/new/absent; never silently delete | no success; quota/security/unavailable/backup-verification |
| after verified backup, before primary write | old valid untouched | exact old valid | no committed candidate |
| primary write quota/security without mutation | old valid untouched | exact old valid | quota/security; not acknowledged |
| primary write happens, then API throws | may be new | exact old valid | **uncertain**; inspect on reload before reattempt |
| primary set succeeded but read-back fails or mismatches | new or concurrent outsider | exact old valid at staging time | **uncertain**; no blind rollback or second grant |
| primary subsequently corrupt/missing, backup intact | corrupt/missing bytes preserved | previous verified v1 | `inspect` => recoverable, explicit guarded restore only |
| primary is unsupported future version | unsupported bytes untouched | potentially old v1 | blocked; no downgrade overwrite |
| both keys lost through site-data clearing | missing | missing | cannot recover locally; external export required |

**Limitation:** backup is an **older checkpoint**, not a clone of the just-committed primary. A successful commit with valid primary is authoritative. If that primary later becomes corrupt, explicitly restoring the backup may lose the newest committed transaction; user must review/export raw bytes first. Not silently choosing a stale backup is part of the contract.

**Important race:** write-back of backup and primary is **not atomic**, and checking `expectedRaw` again before a `setItem` is **NOT CAS**. In the presence of two concurrent writers, two tabs can still overwrite one another; hostile old builds do not cooperate. No generation, writer exclusivity, operation journal, durable RNG retry ID or official second-tab read-only mode is claimed here. B3 must establish a single-writer policy and test real browsers before any live economy caller uses this API. No IndexedDB migration was performed.

**Rollback:** old versions can parse primary v1, but an old version's subsequent `persist()` writes do not update the sidecar, do not acquire locks and can invalidate any higher-level atomicity guarantee. Opt-in/non-use in live flows avoids introducing an active downgrade hazard during this candidate stage. A future production enablement needs formal downgrade/upgrade gates; do not claim merely reverting JS is safe.

## Verification matrix

New `dev/tests/ci/arch02c-b1-checkpoint-acceptance.mjs` exercises the **actual built code** via `dev/tests/lib/load.mjs`, with a fresh fake `localStorage` for each case. Run against both `dist/pwa/index.html` and `dist/artifact.html`.

S16–S47 = **32 cases per artifact / 64 total**, including: legacy v1 readonly inspection; successful commit/reload; genuine empty store; backup quota/security/readback faults; malformed/tampered existing backup; backup/primary read denial; candidate v2/negative/cyclic; stale expected byte mismatch; sequential interleaving before primary; primary quota/security; primary set-then-throw; failed and mismatched readback; explicit recovery from corrupt/missing primary; future-version refusal; checksum damage; stale preview; recovery quota and set-then-throw ambiguity; complete-origin deletion; unmodified live S; UTF-8/Cyrillic/Unicode; no-op; legacy `persist0` intentionally not protected; corrupt/unavailable primary. No old fixture or gameplay golden mutation.

**The B0 15×2 tests remain pinned and should STILL PASS, precisely because the new API is not wired into live UI.** Retaining their unsafe observations is intentional and accurately reports unfinished work.

The new test is a required build step **after** B1 historical `arch02b1-storage-acceptance` and ARCH-02C-B0 characterization in `.github/workflows/validate-pwa.yml`. Full CI is required due to changed `core/save.js`, including unchanged golden (200 battles/meta/three legacy saves/41 screens), all Campaign 210 fingerprints, PWA offline/service-worker tests, architecture strict gate, 3D/Arena/WebGL phone/desktop. Physical iPhone Safari (844×390 and 667×375, real low-quota PWA, multiple tabs and export keyboard) remains OPEN.

## Acceptance / follow-up

1. Review exact final HEAD PR CI run and test-case logs; **do not claim safe live transactions** on the strength of the new opt-in unit acceptance.
2. Preserve B0's historical unsafe proof without replacing it with a fake "pass" safety label.
3. C-B2 — safe v1 import/export + committed-versus-unsaved export semantics; C-B3 — single-writer conflict gate and downgrade policy; C-B4/B5/B6 — migrate each actual gameplay transaction family to a verified draft-and-commit path with deferred UI/RNG effects.
4. B1 may be merged **only with separate owner instruction** after CI; no automatic version bump, deploy, root publish, IndexedDB migration or product decision about abandoned battles.

**CI provenance:** exact run URL, HEAD SHA, full results are to be recorded in PR and Issue #199 after GitHub Actions finishes, without inventing a pass in this handoff.
