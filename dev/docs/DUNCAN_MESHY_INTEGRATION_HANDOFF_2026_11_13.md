# Duncan Meshy model integration — work in progress (2026-11-13)

This branch contains **source wiring only**, not the binary model files. Do **NOT** merge until the files below have been copied from the prepared `Dune_Duncan_Meshy_Integration_Staging.zip` package and the game has been validated.

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

1. **Binary assets are not in this PR yet.** Upload from the staging package.
2. Visual review: Meshy rig lacks the old three-cloth-bone cape; evaluate clipping and cloth motion.
3. Sword attachment: check if the mesh includes a sword on the back and the game adds a second sword to hand.
4. Ult choreography: Meshy's triple combo is not the old eight-strike visual sequence. Do not claim visual parity.
5. Confirm `Dead` -> `Stand_Up10` transition; 7.667-second source clip is mapped onto 1.3s revive.
6. Run `node tools/build.mjs --target all`, `node tools/check-deps.mjs`, `node tools/check-bundle.mjs dist/pwa/app.js`, golden, phone/desktop WebGL 3D smoke, A/B MED/LOW, and service-worker smoke. Do not deploy until these pass.

No release/version bump while integration is unverified.
