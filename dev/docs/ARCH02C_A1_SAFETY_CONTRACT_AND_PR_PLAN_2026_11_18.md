# ARCH-02C-A1 — proposed durability contract, failure policy and staged PRs

**Research proposal, NOT implementation authorization.** Pinned v138 main b652864bbf033c2be12ea97475013c8ce77e37b8. Parent [ARCH-02 #193](https://github.com/mryandexxx-spec/Dgoh-game/issues/193), dedicated [ARCH-02C #199](https://github.com/mryandexxx-spec/Dgoh-game/issues/199). Read the [transaction source inventory](ARCH02C_A1_TRANSACTION_INVENTORY_2026_11_18.md), ARCH-02A safety contract in Draft PR #194, B0/B1 handoffs and permanent dev/ARCHITECTURE.md before implementation.

## Decision boundary: what "durable" can and cannot mean

- Existing primary is **localStorage key dune-goh-v1, serialized v:1**. Do not rename, clear, silently reset or require IndexedDB. B1 explicitly handles read errors and setItem failures; it has no verified multi-step transaction contract.
- A successful **single-key localStorage.setItem** is synchronous replacement with key-level atomicity under normal browser contract; **it is NOT** a transaction across separate keys, a cross-tab compare-and-swap, a hard-disk fsync or an assurance against Safari/PWA origin eviction. Read-back raises confidence but cannot prevent later browser storage eviction or user site-data deletion.
- A **critical operation is acknowledged** only after: preconditions under a single-writer policy; complete draft mutation + entitlement marker; valid serialized candidate; protected prior checkpoint; successful primary setItem; **successful read-back of exactly the expected candidate**, with coherent metadata. On any negative or uncertain status, never show a purchase/claim success. Failure recovery may block interaction and provide verified export/retry.
- Two crash windows must be distinguished: (a) before primary write: old committed progress remains; (b) after primary write, before UI acknowledgment: new candidate may be present **without prior acknowledgment**. On reboot inspect existing operation ID/marker; **do not reroll or grant again** merely because UI never displayed success.

## 1. Candidate API (to validate in proof tests before production)

Conceptual, not new shipped exports:

- `inspectCommitted(storage) -> {status:'ok', snapshot, raw, source, generation, hash} | {status:'missing'|'unavailable'|'corrupt'|'invalid'|'unsupported'|'conflict', raw?, error}`
- `prepareTransaction(workingSnapshot, operationId, apply) -> {status:'ready', candidate, effects} | {status:'duplicate'|'invalid'|'insufficient'|'conflict'}`. Must enforce preconditions and **put charge + grant + claim marker in the same candidate JSON**. Cannot call global reward notification hooks early; render/celebration effects deferred until commit.
- `commitCandidate({expectedGeneration, operationId, candidate}) -> {ok:true, snapshot, generation} | {ok:false,status:'quota'|'security'|'serialization'|'verification'|'conflict'|'uncertain'}`. Use a single resolved result; no success to caller before round-trip. **uncertain** means write may have reached primary; block, re-inspect, never blind retry with fresh RNG.
- `activateCommitted(snapshot)` runs only after successful commit, using a scoped UI integration point and controlled refresh. Avoid naïvely replacing global S across all modules at once: live object references, data/logic hooks and ESM initialization order have to be proven for each operation family.

**No unconditional rollback by writing old bytes over a possibly newer primary.** On failed pre-primary write, discard draft and keep old S. On ambiguous write/read-back failure, preserve latest readable raw and enter recovery state; if primary is already the candidate, recognize operationId and do not duplicate. A mutation already performed in live S is **not** reliably reversible by subtracting the same value: it may have affected XP, unlock hooks, inventory, RNG or daily counters.

## 2. Checkpoint / backup protocol proposal (localStorage, conditional)

Candidate additional keys (names provisional; not implemented):
- `dune-goh-v1.backup` — last independently verified pre-commit **good raw primary**, with generation/hash metadata or a verified envelope.
- Optional `dune-goh-v1.recovery` — only after fault-model proof; do not require a multi-key pending marker merely to make the normal single-key primary update work.
- In-primary **additive** metadata (revision, small bounded idempotency IDs) may preserve `v:1` parsing, but older builds may ignore/fail to maintain it. Define migration and downgrade rules before introducing. **Do not blindly inject all old saves with mandatory new fields.**

Proposed ordered critical write:
1. Get writer exclusivity or fail closed; guarded read primary + optional backup. Validate exact legacy v1 shape on clone; reject malformed, unsupported or conflicting inputs. Establish expected generation; never treat a read exception as missing.
2. Prepare a **copy** with existing business rules; validate numbers, entitlement flags, inventory, sizes and monotonic revision without rebalancing resources. Derive deterministic/replay-safe operation ID, and never run reward side-effect hooks until committed.
3. Before touching primary, write/verify backup of **previous valid primary**. If backup write/read fails from quota or security, abort without writing primary; do not clear caches, corrupt primary or good backup to make room. Never rotate a known-good backup to corrupted input.
4. Write serialized whole candidate to **existing primary key once**. Then read it back, verify exact bytes/hash/shape/revision. Only success triggers active S swap and notifications. On mismatch, unavailable read or concurrent revision change, report **uncertain/conflict**, block, and retain recoverable data.
5. Startup: if primary valid and metadata coherent, load primary. If invalid and verified backup valid, **offer non-destructive recovery** and raw export, not unconditional overwrite. If both valid but disagree with no unambiguous authority, expose conflict and preserve both; do not assume larger currency means newer account. A valid backup cannot prove true recency without consistent generation.
6. Storage failure/low quota: no automatic data deletion. Warn with separately copyable **last verified committed** export and **unsaved working-state** emergency export. Export outside device is the only client-only mitigation for complete origin loss.

**Important design objection to naïve two-key "atomic" backup:** backup and primary replacements cannot be atomically committed together via localStorage. Recovery must be driven by snapshot revisions, hashes and deterministic conflict decisions; fault injection around every write/read and reload is mandatory. An interrupted after-primary-write flow can be committed but unacknowledged.

## 3. Safe manual import and export, v1 compatibility

Export policy:
- Default export **last verified committed raw/canonical v1 snapshot**, with explicit commit provenance. Current ui/wiring.js:39 exports live S and may contain uncommitted grants: change only in an owner-approved import/export PR.
- Emergency export of live S can remain, but label it **NOT CONFIRMED SAVED**; never imply it is backed up. Preserve UTF-8/Cyrillic and legacy base64 copy/paste roundtrip.
- No private save content in logging, test artifacts or GitHub.

Import policy:
1. Cap input byte length before decode; strictly decode base64/UTF-8 and JSON; reject null, arrays, cyclic/impossible shape, dangerous keys, prototype pollution, unsupported `v`, negative/non-finite balances and excessive nested data. The actual accepted v1 optional fields must match legacy golden fixtures and genuine post-boot saves (e.g. **squadTr may be a map**). Do not turn import into a silent schema change.
2. Parse into isolated candidate; validate **before** `fillSave`, run migrations on a clone only, validate again and compute explicit preview (version, roster, key resources, candidate fingerprint) for human confirmation; do not mutate S or display success yet.
3. Verify existing primary, create verified backup of old primary first; if storage is inaccessible/quota fails, **leave current S and primary unchanged** and permit external export.
4. Commit imported candidate, read-back verify; then replace active state and show success. If current primary generation changed since preview, abort with conflict; do not allow a second tab to overwrite data.
5. Test legacy v1 imports, all three fixture snapshots, malformed/unsupported/oversized content, Unicode, recovery after browser reload, and real physical iPhone text area behavior.

## 4. Idempotency and operation lifecycle

- **Daily/login/tracks/first clears:** use existing `daily.got`, `daily.chest`, `login.last`, `cryClaim`, `sealClaim`, `C.tk`, `JP`/BH9 and feat markers as current eligibility sources. Bind entitlement marker and credit **within one committed snapshot**; idempotency ID is additional, not a substitute for current business rules.
- **Shops/refills/craft:** stable item/slot/action identity tied to expected snapshot generation and an opaque attempt ID. Clicks repeat the **same attempt**, not regenerate new IDs on automatic retry. Precondition check must run against the working clone under writer gate; debit, received item, quest count and daily limit form one snapshot.
- **Battle:** explicitly represent `entry prepared -> entry charged and committed -> in battle -> outcome prepared -> outcome committed`. Entry may be committed separately from finish, so "atomic battle" across the entire play session is impossible without persisted in-flight intent and product-defined abort policy. Must coordinate with existing seeded battle creation and RNG draws **without changing RNG order**. On crashed incomplete attempt, **do not auto-refund, auto-forfeit or auto-replay** until owner agrees to game-economy semantics.
- **Retry after uncertain post-primary write:** reopen and check the same attempt ID and committed marker; if present, show already settled without rolling loot again. If absent and proven uncommitted, permit a policy-defined retry.
- **Memory / UI:** current rewardHooks.unlock and shardConv trigger presentation during reward calculation (logic/rewards.js:11-29 and ui/overlays/squad-select.js:113-115), so mutation-on-isolated-draft cannot simply call every old helper without a scoped notification buffer. This is a key dependency to isolate before broad migration.

## 5. Multi-tab conflict contract (separate decision)

- Existing primary has **no generation**, writer lease or CAS, so two live S copies can overwrite one another; B0 SAVE-08 demonstrated lost update 97 in a shared-store model. Storage events can notify **other** tabs of changes, not prevent two concurrent writes atomically.
- Proposed requirement: **single active writer** per origin, read-only/blocked additional tabs, revision/hash recheck before commit, and explicit conflict UI/export. Where available, investigate browser-native exclusive Web Locks (with real Safari support tests); where unavailable, **do not** claim localStorage timestamp leases or getItem+setItem provides strong mutual exclusion. Either fail closed to single-tab policy or seek owner approval for a transactional storage engine.
- Even with an exclusive lock, test browser crash/lock loss, interleaving same-origin PWA+Safari, background tab wake, restored frozen pages, SW updates, and another older client version writing without respecting protocol.
- **IndexedDB is an option, not an approved implementation.** Real multi-record transactions and concurrency control may justify a follow-up migration **only after** performance, Safari availability, v1 rollback/import/export and data recovery costs are investigated. IndexedDB also does not protect against entire-origin eviction.

## 6. Small independent PR sequence (each requires a new implementation GO)

| Package | Scope (without balance changes) | Required proof / rollback |
|---|---|---|
| **C-B0 (first)** | TESTS ONLY: isolated VM original PWA + HTML artifact, import corruption, quota read/write, failed daily/shop/refill/craft acknowledgment, campaign entry/finish, B0 stale tabs. Record current **unsafe or ambiguous behavior** as characterization, not a safety PASS. | 3 historical v1 fixtures, B1 23×2 remain intact. No game runtime changes, revert tests only. Full CI if workflow modified; standalone strict gate always succeeds. |
| **C-B1** | Opt-in commit/checkpoint protocol in core/save.js **without mass-calling new API**; verify backup before primary, read-back, uncertain-state handling, failure injection across all boundaries. | S16–S25 fault matrix; no destructive primary overwrite; no old v1 fixture/golden diffs; rollback gate proving old versions won't ignore critical metadata. If not proven, stop before production integration. |
| **C-B2** | Safe import/export in ui/wiring.js; validation, bounded payload, isolated migration, confirmed backup, writer conflict and confirm-after-commit UX. | Corrupt/unsupported/negative/oversize/Unicode, read/write/backup errors, same S/primary on failure; browser reload, old exports decode. |
| **C-B3** | One-writer/revision conflict enforcement, concrete supported-browser/fallback policy. | Two-VM simulated tabs, real Chromium tabs, iPhone Safari PWA/browser concurrency. If no robust exclusion, keep second tab read-only and document limitation, do not accept lost update. |
| **C-B4** | **One family per sub-PR**: daily/chest/calendar/feat; shops/refills; hero/relic/equip/recycler. Commit before showing success, buffer hooks. | X04/X05/X07/X08/X09/X15 and monetary/marker parity; double-click/reopen/quota/security; old economic golden unchanged. |
| **C-B5** | Conquest/Trials/Journeys/Raid first-clear settlements, two-boundary entry/finish with idempotent opaque attempts. | X10/X11/X12/X13/X14, daily/week transitions retained (clock policy belongs to ARCH-02D), no extra RNG draws. |
| **C-B6** | Campaign/Conquest entry/exit recovery, battle attempt policy only after explicit owner decision; planned rollback/restart UX. | X01/X02/X03, failure windows before/during/after battle, PWA update/offline, no balances/rates/golden changes. |
| **C-acceptance** | Full existing CI gates, real built PWA/artifact, real browser + physical iPhone checks and documented release GO/NO-GO. | Nothing merged or published without separately requested approval. |

Ordering of B2 vs B3 may be refined after B1 proof, but do **not** ship live monetary transactions before cross-tab policy is resolved. If review finds the last existing good backup cannot reliably be retained under quota, **stop; do not silently degrade guarantees**.

## 7. Acceptance / no-go / rollback matrix

**Mandatory for every code PR:** independent `arch-strict` SUCCESS even on docs-only; `node tools/check-deps.mjs --strict`, `node tools/check-arch-imports.mjs --strict`, `node tools/check-bundle.mjs dist/pwa/app.js`; no architectural legacy exceptions, preserve 167 ESM markers / 898 exports and established SCC; unchanged dev/tests/golden/data and old saves; actual built **dist/pwa/index.html + dist/artifact.html** with injected storage and exact pre/post bytes; historical 200-battle/meta/save/41-screen golden; Campaign 2.0 (21 maps / 210 missions), WebGL MED/LOW and PWA/offline/SW gates according to existing CI selection proof. No `--update`. Physical iPhone Safari standalone 844x390 and 667x375 with storage pressure, restart, import/recovery keyboard and multi-tab **remains OPEN until executed**.

**NO-GO:** false success after quota/security/write/verify failure; destructive backup rotation; auto-overwrite corrupt primary; unacknowledged increase/decrease in economy; replay/re-roll that changes random stream; stale-tab silent lost update; mandatory schema that breaks v1; unauthorized storage migration to IndexedDB; baseline/golden/camp/Campaign edits; trying to recover after total-origin deletion without external copy; inability to safely downgrade a new metadata format.

**Rollback requires data compatibility, not just Git revert.** Before merging any new key/metadata: prove older build reads v1 without resetting, that its future writes cannot invalidate or overwrite the revision/ledger safeguards, or supply explicit owner-approved downgrade block plus external-export procedure. Never switch the published PWA to an older writer that treats a newer save as safe if that can discard committed transactions.

## 8. Owner decisions before implementation

1. Confirm **localStorage-first verified snapshot+backup** as the target for C-B1, understanding its quota and origin-eviction limits, or authorize a separately researched storage migration.
2. Confirm initial **single-writer / second-tab read-only** policy pending real Safari capability proof.
3. Define **abandoned in-flight battle** policy (restart/refund/forfeit/hold) for already-committed entry debit. **Do not decide by accident through technical implementation.**
4. Confirm that the research-only C-B0 test packet is the next executable change; C-B1 and all gameplay behavior changes require independent approvals.

**This document and the companion source inventory are A1 documentation only.** No tests were executed as part of writing them and no runtime, version, PWA root, snapshot or release file was changed. A docs-only PR CI may reuse proof-bound jobs; it must not be misrepresented as a fresh full PWA+artifact fault-validation run.
