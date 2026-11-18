# ARCH-02A — checkpoint for next chat / Owner review

Date 2026-11-18. GitHub repo `mryandexxx-spec/Dgoh-game`, verified source `main=2ef68623a001f5169daa3354931632fcf0d47c0f`, published **v137** / SW `0d811bb402`. Branch `audit/arch-02a-save-clock-rng-20261118`, separate ARCH-02 Issue #193 linked to Product Audit #120 and completed ARCH-01 #121. This checkpoint is **A-only docs**, not owner authorization for any implementation.

### Required reading, in order
1. `dev/ARCHITECTURE.md` (zero reverse imports, independent strict CI; existing 167 ESM markers and SCC [60,11,6,3] are protected).
2. `dev/docs/PROJECT_INSTRUCTIONS.md`, `dev/docs/PRODUCT_AUDIT_ROADMAP_2026_11_16.md`, `dev/CHANGES_STATUS.md` "Открыто".
3. `dev/docs/ARCH01D_V137_RELEASE_HANDOFF_2026_11_18.md`, `dev/docs/ci/STAGE3_MINIMAL_SCENARIOS_AND_PROMOTION.md`.
4. `dev/docs/ARCH02A_SOURCE_AUDIT_2026_11_18.md` (code evidence, storage keys, all major transaction families, P0/P1/P2).
5. `dev/docs/ARCH02A_SAFETY_CONTRACT_2026_11_18.md` (proposed API semantics, backup protocol, B/C/D GO/NO-GO and rollback).
6. `dev/docs/ARCH02A_REGRESSION_MATRIX_2026_11_18.md` (S01-S25, X01-X15, T01-T07, R01-R06).
7. Issue #193 and research Draft PR for current pending approval/status.

### Confirmed gaps vs unproven consequences
**Confirmed in source:** `core/save.js:77-83` suppresses read/write exceptions, `core/boot.js:27-40` selects `newSave` on falsey load and persists during start. `ui/wiring.js:43` import validates only presence of roster, replaces S before acknowledged storage. Mutating currencies/claim flags precedes `persist` throughout battle, sim, shop, daily, raid, Conquest. Calendar/week/energy uses wall clock and result random rewards use `Math.random`. No verified backup of primary save exists in core/save. Battle seeded `opts.seed || Date.now()` treats zero as falsey. These are code facts, **not proof of actual lost user progress**.

**Still requires tests:** corrupt JSON overwriting, quota failures with success UI, crash/close atomic recovery, stale-tab conflict, clock rollback exploitability, user-visible duplicate claims, Safari eviction and standalone behavior. The current `localStorage` key is a single synchronous replacement, not proven to create partially written JSON. A fully cleared origin is not recoverable without external backup.

### Next action: recommend owner approval for ARCH-02B0 only
Begin with a new small feature/Draft PR containing **read-only** fault-injection characterization harness and explicit CI registration, no runtime game source change. Capture reproducible failing path for S05-S10, S14, and baseline old fixtures. Do not mask expected baseline failures by weakening CI. Then **separately** request owner GO for B1 fail-closed loading/write feedback, followed by C backup/critical transactions, D clock/RNG. Each package requires its own approval and compatibility gates. In A no changes to `dev/src`, `dev/version.json`, `dev/tools/split.config.mjs`, `dev/tools/arch-import-baseline.json`, golden, protected Camp/Campaign, or root PWA.

### Controls
Do NOT merge/publish v138 as part of A. Physical iPhone Safari/WebKit still OPEN. Any architecture input change requires full CI; docs-only PR still requires independent `arch-strict` SUCCESS. If the Draft PR is not yet green, report the exact GitHub checks rather than implying PASS. Preserve historical save bytes and manual export/import. Stage implementation only under explicit owner command.
