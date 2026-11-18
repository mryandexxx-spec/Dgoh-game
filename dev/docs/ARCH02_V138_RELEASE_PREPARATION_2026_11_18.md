# Dune GoH — ARCH-02 B0+B1 / v138 — release preparation (NOT published)

**18 November 2026. Status: PREPARED ONLY / release approval, guard and official publish still required.**
No automatic dispatch with `publish=true` was made; no GitHub Pages deployment was requested. Public users still run the published **v137** until a separately authorized official publish and independent Pages verification succeed.

## Fixed source and dependency order

- Last published and pre-implementation `main`: `2ef68623a001f5169daa3354931632fcf0d47c0f` / `dev/version.json={"v":137}`, public PWA root `abcdf6b87a16c0183ce40b82afd2957f165c0d51`, SW `0d811bb402`.
- B0 characterization [PR #195 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/195) at merge `f0be801cb3a9598e6e3a82bb4708def2487da1e9`. Full B0 PR [CI #44336566386 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44336566386): 17 real-bundle v137 **unsafe** observations on PWA and artifact; **this is not a safety pass**. B0 was merged by `merge`, not squash, to preserve B1's ancestry.
- B1 implementation [PR #196 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/196), stacked base retargeted to `main` after B0 merge, merge SHA **`fd05a419d84fc920b20545500d1ecd6230b15b1d`**. Full B1 [CI #44356084531 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44356084531), 20 required successful jobs including final gate, `arch-strict` independent; 23 **safe** VM observations per built target (46 total), 200 battle/meta/save/41-screen golden, Campaign 210, real Chromium Conquest weekly reset/save reload, PWA offline, WebGL, arena. Earlier B1 regression rejecting real `squadTr: {}` was discovered and fixed before merge, with permanent roundtrip coverage.
- **Combined implementation `main`** `fd05a419d84fc920b20545500d1ecd6230b15b1d`: [post-merge main-push CI #44364295828 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44364295828), including independent `arch-strict`, verified same-source artifact/proof-bound reuse and final `All required checks passed` SUCCESS. Intentional skipped golden/WebGL jobs in this post-merge run were **proof-bound reuse** from the full final-head B1 run, not claimed as fresh execution.
- [ARCH-02 tracking Issue #193](https://github.com/mryandexxx-spec/Dgoh-game/issues/193), [ARCH-02A research PR #194](https://github.com/mryandexxx-spec/Dgoh-game/pull/194), [B0 handoff](ARCH02B0_STORAGE_FAULT_CHARACTERIZATION_HANDOFF_2026_11_18.md), [B1 handoff](ARCH02B1_FAIL_CLOSED_SAVE_BOOT_HANDOFF_2026_11_18.md).

## Exactly what v138 candidate includes

1. Fail-closed `loadSave(true)` discriminates `ok`, `missing`, `unavailable`, `corrupt`, `unsupported` and `invalid`. Only **confirmed absent** `dune-goh-v1` permits `newSave()`; malformed/unreadable/unsupported primary bytes are never replaced by startup. Older v1 fixture / key / version remain compatible, with no schema migration.
2. `start()` blocks on bad/unreadable save and on failed first disk commit. Original ESM first-statement contract, 167 approved module positions, 898 public names and the zero-legacy strict gate remain intact.
3. `persist0()`/`persist()` report explicit quota/security/serialization/write statuses, with no successful UI note callback for failed write. Recovery UI is UI-owned and nondestructive: copy of exact readable broken primary, or in-memory emergency export if possible, plus retry. No reset or cache clearing.
4. The preserved B0 dangerous-behavior oracle is **replaced**, not weakened, by B1 safe acceptance in CI. Source/history of B0 test still exists in Git commits/merged PR #195. All 23 B1 scenarios run against both actual PWA/artifact bundles.
5. **Unchanged:** protected Camp and navigation, Campaign 21 maps/210 missions, currencies/economy/ability rewards, battle and random streams, GameClock, all goldens, graphics HIGH/MED/LOW, EngineHost, `SPLIT`, `arch-import-baseline.json`, published root PWA.

**Known non-goals / release risks — still OPEN:** manual import currently accepts shallow `roster` data, changes live state before checking persistence and can falsely announce success; many transaction callers do not honor typed `persist()` errors and have no durable rollback/idempotency; multi-tab stale-write, backup rotation and restore are not solved. These require separately approved ARCH-02C stages, not deceptive claims of full data durability. Complete origin storage clearance cannot be repaired without an external manual export. Real iPhone Safari/WebKit standalone/offline/denied/quota verification remains **OPEN**.

## This candidate release PR (no deployment)

- Branch `release/arch-02b0-b1-v138-prep-20261118`, **based on exact merged B1 main SHA** `fd05a419d84fc920b20545500d1ecd6230b15b1d`.
- `dev/version.json`: `137 → 138`; `dev/CHANGES_STATUS.md`: staged v138 entry + open risks; this new release-preparation handoff; append merger evidence to the historical B0 and B1 handoff documents.
- No `dev/src`, `tests/golden`, `dev/tools/split.config.mjs`, `dev/tools/arch-import-baseline.json`, `.github/workflows/validate-pwa.yml`, or public-root app/sw assets change in this release PR. B1's runtime code was merged in the two previous PRs.
- Required release-preparation CI: both PWA and HTML artifacts built for **v138**, golden/real-browser/required graphics or correctly attested unchanged-behavior reuse; independent `arch-strict` must run and pass even on reuse; final gate SUCCESS. Do not accept a failed/skipped strict or final gate, missing artifacts, changed golden, mismatched version, or non-reviewed extra path. The release PR remains Draft until explicit release approval.
- Because this is a **preparation** task, no `.github/workflows/release-v138-once.yml` authorization/dispatched `publish=true` is included. Before any actual publish, prepare a separate single-use fail-closed guard pinned to the **then-current** release source SHA, reviewed paths, expected version and original public root/SW hashes. Recheck main and provenance before dispatch; do not guess future merge SHA. Prior v137 guard failed initially on incorrect version assertion, so both HEAD and parent version must be explicitly checked by the real guard.

## Next steps ONLY after owner's explicit release command

1. Re-read current main HEAD, release PR final SHA and exact paths; check full CI and ensure `arch-strict` plus final gate SUCCESS. Review/accept the known unresolved ARCH-02C risks and physical Safari OPEN.
2. Approve and merge v138 release PR **as a separate action**; if source or diff moved, STOP and revalidate. This alone **does not publish** GitHub Pages, as the official workflow only deploys on an explicitly authorized `workflow_dispatch publish=true` on `main`.
3. Prepare and validate a **single-use guard** (or equivalent explicit fail-closed provenance check) for v138; verify release source SHA/version 138/expected changed paths (relative to source), no unrelated source change, `legacy: []`, unchanged approved ESM, untouched old root and only preapproved root diff. Require real full/proof-bound CI and final gate before dispatch.
4. On a distinct explicit **publish** instruction, run official validated dispatch once, verify **real** deploy job SUCCESS, SW/version cache hash, source and build SHA-256 manifest, root diff restricted to authorized generated files, independent Pages SUCCESS on exact root commit.
5. Record actual CI/provenance/run IDs/asset hashes and Pages result in this handoff and `dev/CHANGES_STATUS.md`, remove spent one-shot guard via docs-only cleanup (no second publish). Physical iPhone tests remain an owner follow-up.
6. Proceed to separately approved ARCH-02C transaction safety/manual import/backup, then ARCH-02D GameClock and RNG, without assuming B1 solves them.

**STOP CONDITIONS:** Any CI failure, changed upstream base, unknown build/source SHA, silent primary overwrite, missing/failed independent arch-strict, unsupported old saves, changed game/balance/graphics/golden, unreviewed root changes, or an unapproved `publish=true`. Do not silently rebaseline.
