# Dune GoH — v141 ARCH-02C protected save and transaction release

Date 2026-11-21. This is the owner-authorized **release candidate**, **not proof of publication**. Parent source `main=cc9f4f7ec489d65ecfb8340c4afdb43e16d8ce12` includes merged B7a audit #233 and preceding B4/B5/B6 implementation PRs. The historical production root and source version are **v140** before release.

## Scope and invariants

- B2: validated manual v1 transfer, double-confirmation, verified backup/checkpoint and recovery-only lock.
- B3: mandatory Web Locks single-writer startup, lifecycle invalidation, denial of stale/duplicate writes, explicit blocked-screen recovery.
- B4: verified battle entry costs, settlement and rewards, simulations, Conquest and Trials.
- B5: atomic daily quest/chest and login calendar grants.
- B6: marketplace/refills/recycler debits; hero upgrades/craft; one-time feats and raid creation.
- B7a: final source audit with **no newly identified high-value P1 entry bypass**, with remaining P2 UI preferences, migration toast, abandoned battle refund policy, and offline time/rollback limitations documented separately in `ARCH02C_B7A_FINAL_AUDIT_SIMPLE_PWA_HANDOFF_2026_11_21.md`.
- Release candidate changes **only** `dev/version.json` (140→141), `dev/CHANGES_STATUS.md`, this release document and a one-shot guarded dispatch workflow. No runtime JS/CSS, Conquest frozen file, 210 mission balance, RNG, `dune-goh-v1` schema, `golden` or public PWA root change in the PR. Public root will be synchronised only by the official validated publish job from immutable tested artifacts.

## Required safety gates

1. Complete release PR validation on exact latest head, with independent `arch-strict`, required selected jobs, final `All required checks passed` SUCCESS. Version bump changes artifact and service-worker cache fingerprint; CI must recompile and verify artifact/PWA golden and SW install/offline. Proof-bound reuse is permitted **only** when `ci-policy`/receipt validates identical behaviour inputs and immutable artifacts.
2. Owner-authorized squash merge on `main` with exact subject **`release(arch): publish v141`**, sole parent `cc9f4f7ec489d65ecfb8340c4afdb43e16d8ce12`, and exactly four paths: `.github/workflows/release-v141-once.yml`, `dev/CHANGES_STATUS.md`, `dev/docs/ARCH02C_V141_RELEASE_HANDOFF_2026_11_21.md`, `dev/version.json`.
3. One-time guard checks release parent + v140 old root blobs + exact changed paths, invariant strict/ESM baselines, merged PR tree equality with exact-head successful PR CI and present `main` ref. Guard may dispatch official **`validate-pwa.yml`** once with `publish=true`; never dispatch on PR, ordinary push, another commit, or rerun.
4. Official workflow dispatch on `main` must complete all required test jobs and full final gate plus **Publish verified PWA to GitHub Pages** SUCCESS. Verify generated-root merge commit, version `141`, new `const VER` in `sw.js`, and independent Pages deployment to the same root SHA. A successful PR build alone is NOT publication.
5. When release is genuinely live, record actual PR, CI, guard, dispatch, immutable artifact, generated root and independent Pages evidence. One-shot workflow should then be removed in a **separate docs-only cleanup** without a new publish.

## Owner-selected simple PWA handoff

Publication is authorized now; **deleting the currently installed v140 PWA is not** a safe action until an **actual complete external backup** exists. The old v140 client ignores Web Locks and may overwrite the new client's save if they are used concurrently.

- Before removing old v140: finish/exit battle; in its Profile use **Экспорт сохранения**. Store entire copy in Notes/files outside the game and reopen the saved text to confirm it exists, ideally twice. Clipboard-only text is not an external backup. If v140 warns of unverifiable or unsaved RAM, STOP and investigate.
- After v141 Pages verified: shut all old browser/PWA sessions. Opening updated browser Safari on the same origin may already preserve local save; **if progress is correct, skip import**. Reinstall only if necessary. Verify app footer says v141.
- If the new installation is empty, use **Профиль → Импорт сохранения → Проверить код → Подтверждаю замену**, then follow mandatory reload. Check hero count, account level, resources, and a cold relaunch. Keep external code afterwards.
- Missing native Web Locks, blocked/uncertain storage, future-schema candidate or mismatched progress are STOP conditions. Do not repeatedly clear site data. Physical iPhone Safari/PWA storage quota/standalone/OS lifecycle is **not validated by CI** and must not be claimed tested.

## Final record (append after successful publication)

- Release PR/head: PENDING.
- Release head / main push CI: PENDING.
- One-shot guard: PENDING.
- Official publish run/artifacts/root SHA: PENDING.
- Independent Pages: PENDING.

No invented success claims are permitted.
