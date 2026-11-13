# Duncan Meshy model integration — work in progress (2026-11-13)

**2026-11-13 update:** Binary model, JPEG, source GLB, animation manifest, and conversion tools have now been uploaded to PR #53. **Do not merge until KTX2 generation, tests and visual review have passed.**

## Required files

- `dev/assets/models/duncan-meshy.dgm` (new DGM1 v5 / local-TRS, 66 bones, 16 clips)
- `dev/assets/tex/duncan-meshy-alb.jpg` (2K JPEG fallback)
- `dev/assets/ktx2/duncan-meshy-alb.ktx2` (generate using `cd dev && node tools/encode-ktx2.mjs`)
- `dev/assets-src/duncan/Duncan_mobile_optimized_16clips.glb` and animation manifest (source data; optional in git if repo size is constrained)
- `dev/tools/convert-duncan-meshy.py` to reproduce conversion

The existing `dev/assets/models/duncan.dgm` is retained for rollback. `src/assets/models.js` selects the new asset when present, and keeps the old asset otherwise.

## Current clip mapping

| Game event | Meshy clip |
| --- | --- |
| Combat idle | Combat_Stance |
| Basic | Double_Combo_Attack |
| Special | Sword_Parry_Backward |
| Ult | Triple_Combo_Attack |
| Hit | Hit_Reaction |
| Death | Dead |
| Ghola revival | Stand_Up10 |
| Showcase | Lower_Weapon_Look_Raise |

Gameplay abilities, effects and balance are unchanged.

## Blockers before merging

1. **Binary model and JPEG are uploaded.** KTX2 is not yet uploaded; generate it before publishing.
2. Visual review: Meshy rig lacks the old three-cloth-bone cape; evaluate clipping and cloth motion.
3. Sword attachment: check if the mesh includes a sword on the back and the game adds a second sword to hand.
4. Ult choreography: Meshy's triple combo is not the old eight-strike visual sequence. Do not claim visual parity.
5. Confirm `Dead` -> `Stand_Up10` transition; 7.667-second source clip is mapped onto 1.3s revive.
6. Run `node tools/build.mjs --target all`, `node tools/check-deps.mjs`, `node tools/check-bundle.mjs dist/pwa/app.js`, golden, phone/desktop WebGL 3D smoke, A/B MED/LOW, and service-worker smoke. Do not deploy until these pass.

No release/version bump while integration is unverified.

## 2026-11-13 dedicated WebGL review

- Added `tests/smoke/duncan-meshy-webgl.mjs` to the UI job in `.github/workflows/validate-pwa.yml`; MED 844×390 and LOW 667×375 frames are stored in the `dune-duncan-meshy-<run_number>` Actions artifact.
- Repaired Meshy-specific completed-action cleanup (otherwise the actor could remain stuck in Attack indefinitely).
- Repaired model-level fall-offset reset during Ghola revival and corrected showcase clip looping duration.
- Source model has 66 joints / 16 clips and a single textured skin mesh; no separate cape cloth bones. Visual approval of cape and sword remains open.
- Full new CI and WebGL smoke are **pending** on the latest branch commit; do not interpret earlier successful runs as validating these later changes.
