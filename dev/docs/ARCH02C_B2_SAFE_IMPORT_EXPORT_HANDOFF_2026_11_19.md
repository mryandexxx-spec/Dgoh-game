# ARCH-02C-B2 — Safe manual import/export handoff

Date: 2026-11-19. Branch: feature/arch-02c-b2-safe-import-export-20261119. Base: main 58250027bddac8bc9505d71aae09e978da6d285a, published v139. **Candidate only; NO MERGE OR DEPLOY GO.** Parent #193, dedicated #199. See A1 contract in PR #200, B0 PR #201 and B1 PR #202.

## Audit: actual call graph

Manual export: profile button data-saveexp -> delegated ui/events.js click -> ui/wiring.js metaClick -> previously JSON.stringify(S) -> Unicode/base64 -> #savecode -> clipboard. This was LIVE RAM and might include unsaved reward changes; no storage confirmation. Manual import: data-saveimp -> textarea #savecode -> data-saveload -> metaClick -> atob/UTF8/JSON.parse -> roster truthiness only -> set_S(fillSave) -> metaFill(S) -> persist() without result check -> success toast. Old behavior overwrote valid v1 with unsupported v2, and quota left imported RAM with original storage. No file picker/FileReader is involved in the actual manual transfer path. Boot loadSave and startup persist, and UI-owned showSaveRecovery rescue export, are separate paths.

## B2 safety sequence

1. Parse bounded Unicode/base64 (max 2,000,000 characters, legal alphabet/padding, strict UTF8). Verify v1, required roster/balances, finite nonnegative resource and hero progress, optional v1 field shapes, forbidden prototype keys, node count and nesting. Preserve old optional squadTr map/array.
2. Work exclusively on the parsed candidate. Call fillSave and metaFill on that candidate, then validate again. Do not replace global S or show success.
3. Inspect current primary and sidecar with loadSave.checkpoint.inspect. Require valid primary and usable backup. Record exact expected primary raw and live S snapshot. Refuse corrupted, missing, newer or unavailable original storage; no silent recovery.
4. Preview v1, hero count, resources and noncryptographic fingerprint. Require a separate positive user confirmation. Reject if in battle, if live S changed, or if expected primary changed.
5. Commit only through loadSave.checkpoint.commit({expectedRaw,candidate}). It protects previous verified v1 primary in the sidecar, verifies backup write, checks expected primary again, writes candidate and verifies byte-exact primary readback. **Only ok:true** calls set_S(outcome.save), closes the dialog and shows a success toast.
6. On quota/security/conflict, do not activate candidate or say success. On uncertain post-write outcome, block through the recovery UI; primary might already contain the new candidate. Never blindly retry or overwrite with stale raw. On idempotent unchanged, do not rotate backup.

**Critical limitation:** exact byte recheck is not atomic compare-and-swap. A concurrent old/noncooperative tab can overwrite between check and write. B3 must address single writer. The backup contains the PREVIOUS valid checkpoint, and is not itself a guarantee of disk durability or protection against entire-origin eviction.

## B2 export semantics

Standard export uses the exact valid primary raw observed through checkpoint.inspect, preserving Unicode/base64 and v1 compatibility. This is a **verified readable storage snapshot**, not necessarily a B1-acknowledged game transaction: legacy persist remains active elsewhere and there is no journal. If JSON.stringify(S) differs, the UI explicitly says working RAM is excluded and offers a separate emergency memory export labeled NOT CONFIRMED SAVED. Save bytes are assigned to textarea.value, not interpolated into HTML. If primary cannot be read/validated, there is no false verified export; existing separate recovery rescue is unchanged.

## Acceptance and historical proof

New dev/tests/ci/arch02c-b2-transfer-acceptance.mjs: 20 tests **each** on actual built PWA and HTML artifact, covering: all three historical v1 fixtures, explicit confirmation, cold reload, malformed base64/UTF8, v2, invalid/missing fields, nonfinite/negative balances, prototype pollution, depth and oversize, Cyrillic/Unicode, stored-vs-RAM exports, backup and primary quota/security, write-then-throw uncertainty, stale storage, drifted memory, double confirm, corrupt outsider data, unavailable export, no-op and backup preservation.

B0 source characterization C01-C04 is now inverted to **safe import regression**, while C05-C15 remain deliberately **unsafe** until B4-B6. The original v138 unsafe observations remain independently pinned in PR #201 and CI run #44392658163; no historical evidence was deleted or relabeled as already-protected gameplay.

CI workflow adds a mandatory B2 PWA+HTML step; full CI must run because UI and workflow changed. Require 898 exports / 167 SPLIT strict architecture gate, unchanged goldens, 200 battles, 3 save fixtures, 41 screenshots, Campaign 210, PWA/offline, WebGL and verified SHA256 artifact, final required gate. Physical iPhone Safari/standalone storage-pressure and real cross-tab race proof remain OPEN.

## Boundaries and restart

Changes are confined to manual import/export in ui/wiring.js, new B2 acceptance, necessary inversion of B0 manual-import test expectations, CI step, and this handoff. No economy, GameClock, RNG, Camp, Campaign, ESM named exports, version or deployed root changes. No automatic recovery, no IndexedDB, no B3/B4-B6 migration, no claim of full storage transactions. Review exact-head CI and PR before owner merge GO. Then B3 is the next separately approved stage. Do not publish v140 during B2 review.
