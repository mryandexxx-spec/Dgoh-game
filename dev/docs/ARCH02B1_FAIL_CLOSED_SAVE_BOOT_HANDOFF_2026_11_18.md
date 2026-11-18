# ARCH-02B1 — fail-closed save loading / write diagnostics handoff

**Date:** 2026-11-18. **Status:** Draft implementation, **not merged or published**. Owner directed "Дальше" after ARCH-02B0. [B1 Draft PR #196](https://github.com/mryandexxx-spec/Dgoh-game/pull/196) is **stacked on B0 Draft PR #195**, which is itself based on published `main` commit `2ef68623a001f5169daa3354931632fcf0d47c0f` (v137). ARCH-02 audit Issue #193; Product Audit #120. Source-of-truth research: `ARCH02A_SOURCE_AUDIT_2026_11_18.md`, `ARCH02A_SAFETY_CONTRACT_2026_11_18.md`, `ARCH02A_REGRESSION_MATRIX_2026_11_18.md` in [ARCH-02A PR #194](https://github.com/mryandexxx-spec/Dgoh-game/pull/194).

## Safety rules now implemented

1. `core/save.js` preserves the **old public function names and original save key `dune-goh-v1`**. `loadSave()` retains the legacy v1 object-or-null result for golden and existing callers. `loadSave(true)` returns a **discriminated** result:
   - `{status:'ok',save}` — parsed and validated existing v1, filled by existing `fillSave` on a fresh parse object;
   - `{status:'missing'}` — only when `localStorage.getItem(SAVE_KEY) === null`;
   - `{status:'unavailable',error}` — `getItem` exception;
   - `{status:'corrupt',raw}` — unreadable JSON (original string preserved);
   - `{status:'unsupported',raw}` — version other than v1;
   - `{status:'invalid',raw}` — illegal shape/type, including missing roster or invalid currencies.
2. `core/boot.js` retains the historical **first executable statement of `start`: `set_S(...)`** for the ARCH-01C5a AST/initialization contract, but now uses `initialSave(data)`. When typed load detects bad/unavailable primary, it sets **undefined** state and returns before any mutation/persist/render/timer. No new user account or implicit reset. `data.save` hot snapshot compatibility retained.
3. `persist0()` and `persist()` now return typed outcomes `{ok:true,status:'ok'}` or `{ok:false,status:'quota'|'security'|'serialization'|'write-failed',error}`. `setItem` is synchronous. On error `persist` does not schedule its success hook; boot stops on failed initial write. Existing transaction call sites **do not yet consume** these return values, so B1 is **NOT** atomic spending/claiming.
4. To preserve 898 public names and 167 ESM markers, `onPersist(f,onError)` optionally registers a UI-owned error callback; `ui/wiring.js` defines `showSaveRecovery` without exporting an additional named symbol. Instead the callback is attached to the pre-existing UI export `metaFill.showSaveRecovery` for boot consumption. The recovery dialog uses DOM/textContent/value rather than unsanitized untrusted HTML, blocks normal gameplay on a storage error, offers repeat/reload and read-only copy text. For corrupt JSON it offers the *exact* original bytes; after write failure it attempts the original UTF-8 base64 export of in-memory progress. **Neither is a durable transaction checkpoint**. It has no destructive reset option.
5. Historical v1 mandatory resources and roster checks run before `fillSave`. Optional legacy fields remain optional. Current three fixtures and old golden are immutable; do not rename v1/save key or mutate reward/energy formulas.

## Tests — explicit old-v137 oracle reversal

- ARCH-02B0 established **unsafe behavior** in 17/17 real-bundle tests × PWA/artifact [CI #44336566386](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44336566386) **SUCCESS**. The B0 test source is **retained in pinned PR #195/commit history**, but is deliberately **not** run against B1: those asserts would demand unsafe behavior.
- B1 adds `tests/ci/arch02b1-storage-acceptance.mjs`, registered for PWA+artifact after production build in `validate-pwa.yml`. **22 separate scenarios per target**, with seeded time and a fresh in-memory VM for each scenario: valid missing + three fixtures; read SecurityError/generic; corrupt/truncated/invalid/v2 and malformed nested fields; optional legacy and idempotent migration; cyclic serialization; Quota/SecurityError post-start writes; failed startup checkpoint; manual repair and retry.
- [B1 first successful real build and acceptance step, CI #44353355828](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44353355828): dedicated B1 acceptance **SUCCESS** on PWA and artifact, **22/22 + 22/22**. Strict ARCH-01D and ESM order/898 public names also SUCCESS. **Overall full CI run result must be checked independently**; no full PASS inferred from the dedicated B1 step.
- Early red builds were **test/bootstrap integration diagnostics**, preserved in GitHub history: CI #44352503853 failed 899≠898 exported public names; #44352767429 failed first-start-statement AST; #44353049375 failed wrong B1 test assumption that offline `tickWater` cannot raise saved water after boot. The production energy formula and old CI guards were **not changed or weakened**.

## Scope / hard exclusions

B1 changed `dev/src/core/save.js`, `dev/src/core/boot.js`, `dev/src/ui/wiring.js`, the B1 test, and one CI test registration; B0's historical unsafe characterization file is removed **in the B1 overlay branch only** because it has a deliberately obsolete success oracle. This is intentional test replacement, not erased research (PR #195 and B0 handoff are retained). No updates to `version.json`, Camp, Campaign 210/21 maps, battle engine, rewards, RNG, clock, `tools/split.config.mjs`, architectural exception baseline `legacy:[]`, old goldens or public root PWA.

B1 **does not** implement:
- transactional commit + rollback for every caller (battle, sim, shop, calendar, daily, raid, Conquest, recycling, import);
- backup/checkpoint/restore or atomic multi-step save migration;
- stale-tab write detection and multi-tab coordination;
- schema-level import validation for the existing manual import UI, which remains an **open risk**;
- tamper-resistant wall time, `GameClock`, injectable game RNG or user data recovery after clearing the entire origin.

All of these remain explicit ARCH-02C / ARCH-02D tasks with separate owner approval and dedicated acceptance tests. Physical Safari/WebKit on iPhone (standalone/offline, quota, storage denial, keyboard/landscape recovery UI, 667×375) remains **OPEN**; Node VM and Chromium cannot replace it.

## GO/NO-GO, rollback and restart

1. Confirm B1 latest head and exact CI. Require **full** CI (not just isolated safety tests), including golden PWA/artifact, independent `arch-strict` SUCCESS, legacy 898 public names, 167 ESM markers, 173 modules, zero forbidden edges, Campaign 2.0 WebGL, PWA offline SW. Historical golden must be unmodified (`--update` forbidden). Any red gate is NO-GO; investigate instead of bypass.
2. Because B1 is stacked on Draft B0, first resolve/approve its dependency; **do not merge B1 directly without checking main base, PR order and all checks**. Neither B0 nor B1 has permission for merge, version bump or release in this phase.
3. Prepare owner validation of error UX against a **throwaway test-only fake profile** / copy of fixture, never a live primary without external backup; no real user save exported into CI. Test original bytes preserved under read failure and failed write, manual copy/restore, 667×375 standalone Safari.
4. If reverting the B1 runtime, old `v:1` data remains readable because no schema or key changes. **But reverting to v137 restores the known unsafe load behavior**; do not recommend as a safety fix. Recover known good primary via external copy/manual import and avoid reinstall/site-data clearing.
5. Next owner-approved task: **ARCH-02C** transactional checkpoint+backup and import safety (under separate design and approval) before claiming full save durability. Maintain golden and RNG/time parity.

[Issue #193](https://github.com/mryandexxx-spec/Dgoh-game/issues/193), [B0 Draft PR #195](https://github.com/mryandexxx-spec/Dgoh-game/pull/195), [B1 Draft PR #196](https://github.com/mryandexxx-spec/Dgoh-game/pull/196).
