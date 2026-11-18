# ARCH-02C-B0 — v138 critical transaction fault characterization handoff

**Date:** 2026-11-18. **Status: test-only implementation, no gameplay fix and no release.** Explicit owner GO: «Поехали» after proposed C-B0 in ARCH-02C-A1 research [PR #200](https://github.com/mryandexxx-spec/Dgoh-game/pull/200). Parent [#193](https://github.com/mryandexxx-spec/Dgoh-game/issues/193), dedicated [#199](https://github.com/mryandexxx-spec/Dgoh-game/issues/199). Pinned source: main `b652864bbf033c2be12ea97475013c8ce77e37b8`, published v138 / SW `112de6f994`. Branch: `test/arch-02c-b0-transaction-fault-characterization`.

## Scope and test contract

**Zero modifications to shipped gameplay.** New test file `dev/tests/ci/arch02c-b0-transaction-characterization.mjs`, small **opt-in test-only** event/selector capture hooks in `dev/tests/lib/load.mjs`, a post-build step in `.github/workflows/validate-pwa.yml`, this handoff. No changes to `dev/src`, `dev/version.json`, PWA root, Camp, Campaign 210, game economy, RNG, clock, ESM registry, architecture exceptions or saved goldens.

Test executes the **same actual built JavaScript** in both `dist/pwa/index.html` and `dist/artifact.html`, via the established `tests/lib/load.mjs` Node VM harness. Each case has a fresh fake `localStorage` Map; only `getItem`/`setItem` of that fake Map are intercepted. The test loads full source-derived bundle, deliberately invokes gameplay handlers, and exercises actual `metaClick`, delegated `ui/events.js` click, `claimQuest`, `claimChest`, `doRefill`, `cqClick`, `startBattle` and `finish` functions where indicated. The delegated click callback is captured from **actual module registration** via an opt-in document-listener hook, not reproduced from a test-only fake economy implementation. Tests do not open a browser profile or read real users' data.

### Case-by-case observation matrix

| ID | Actual code path | Fault / observation | Expected **historical v138** outcome |
|---|---|---|---|
| C01 | ui/wiring.js manual import of valid v1 | controlled fixture + base64 UTF-8 | **Positive** legacy import works, remains loadable |
| C02 | ui/wiring.js manual import | v2 with truthy roster | **UNSAFE:** overwrites valid v1 primary; boot rejects unsupported version |
| C03 | ui/wiring.js manual import | QuotaExceededError | **UNSAFE:** in-memory S replaced, stored primary unchanged |
| C04 | ui/wiring.js manual import | malformed base64 | **Positive:** existing syntax guard protects primary |
| C05 | ui/views/daily.js quest claim | quota on setItem | **UNSAFE:** claim marker and rewards changed in RAM, stored bytes unchanged |
| C06 | ui/views/daily.js random chest | quota on setItem | **UNSAFE:** chest marker/reward appears in live state without commit |
| C07 | ui/overlays/sim.js water refill | quota on setItem | **UNSAFE:** crystal debit, water credit and refill count not durably acknowledged |
| C08 | ui/events.js real delegated shop click | quota on setItem | **UNSAFE:** debit, inventory credit, limit changed in live S |
| C09 | ui/events.js skill upgrade click | quota on setItem | **UNSAFE:** upgrade and price written only to RAM |
| C10 | ui/events.js gear upgrade click | quota on setItem | **UNSAFE:** gear progression and resource debit written only to RAM |
| C11 | ui/views/conq.js Conquest one-time chest | quota on setItem | **UNSAFE:** C.tk marker and loot changed in RAM |
| C12 | ui/battle/battle-ui.js real campaign entry | quota on setItem | **UNSAFE:** energy debit followed by combat launch despite failed write |
| C13 | ui/battle/battle-ui.js real finish() settlement | controlled seeded completed battle; quota | **UNSAFE:** first-clear, credits and result flow despite unchanged primary |
| C14 | two independently loaded game VM instances | sequential stale-write model | **UNSAFE:** +100 overwrites to +3, lost update 97 |
| C15 | core/save.js / VM keys | save-key inventory | **Evidence:** no primary backup, revision or idempotency ledger |

**PASS means the historically unsafe behavior is reproduced.** These tests are not tests that acceptably protect player saves. They are characterization and will need to be replaced or inverted into safety acceptance when corresponding C-B1/B2/B3/B4/B5/B6 implementation changes are approved, while keeping pinned historical evidence in this PR, SHA and CI logs. Never quietly delete their old failing-safety result.

### Limits and what is NOT established

- Single-key `localStorage.setItem` writes are synchronous and not claimed to tear normal JSON. The injected quota preserves the last stored bytes as expected.
- Document/WebGL in the VM are stubs; the test exercises actual handlers and serialized state, but **does not prove** real user-facing modal stacking, Safari standalone behavior, actual live battle animation, crash recovery, multi-tab races or physical durability under power-loss.
- Case C14 is a **sequential stale-tab shared-store model**, not a real two-browser-tab concurrency run.
- The characterized false-success gap is distinct from B1's successful fail-closed **boot** protection. Never regress B1 S01–S15.
- No automatic backup or safe import was implemented here. The UI's emergency export is not verified durable state. Same-origin backup would not survive user clearing all website data.

## Verification and owner gate

- The B0 step runs once for each actual built artifact after the existing B1 storage acceptance step in the **build job**. Since both CI and harness/test files changed, the CI planner must select **full**, not docs-only reuse. Existing B1 23×2, unchanged goldens (200 battles/meta/3 save fixtures/41 screens), architectural `arch-strict`, Conquest/arena, PWA offline, Campaign 210 and WebGL jobs must not be bypassed.
- Check final exact-head CI result, including `arch-strict` SUCCESS, the B0 step's **15×2 observations**, actual golden PWA + artifact and the **final** required gate. Initial failures must be diagnosed instead of weakening guards.
- Final status, actual run ID and SHA to be added to PR/Issue as immutable evidence; this file intentionally contains **no invented CI success claim**.
- **Do not merge, publish, bump v139 or deploy** without the owner's separate direct instruction. The release stays v138 and main unchanged. Physical iPhone Safari 844×390/667×375, standalone/offline/quotas remains OPEN.

## Restart point

After B0 proof, review [ARCH-02C-A1 safety contract](https://github.com/mryandexxx-spec/Dgoh-game/blob/audit/arch-02c-a1-transaction-inventory-20261118/dev/docs/ARCH02C_A1_SAFETY_CONTRACT_AND_PR_PLAN_2026_11_18.md), not just the old v137 research. Next **separately owner-approved** C-B1 must prove verified localStorage checkpoint/backup and ambiguous-commit recovery before integrating callers. C-B2 should repair manual import and C-B3 must resolve stale-writer semantics before claiming cross-tab safety. Battle entry refund/resume/forfeit policy and optional IndexedDB require separate product/architecture agreement.
