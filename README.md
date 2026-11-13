# Duncan Meshy — staging package for Dune GoH

Target repo: `mryandexxx-spec/Dgoh-game`; source integration has been committed to **Draft PR #53**, branch `feat/duncan-meshy-model-20261113`.

**To complete PR #53:** checkout its branch and unpack this archive at the repo root. The source patches are already committed and the installer is idempotent (optional). Commit the binary assets, generate/commit KTX2, build and test. The PR is *not ready to merge* until then.

## What is included

- `dev/assets-src/duncan/Duncan_mobile_optimized_16clips.glb`: reusable rigged Meshy source; 16 clips.
- `dev/assets-src/duncan/animation-manifest.json`: clip durations and track counts.
- `dev/assets/models/duncan-meshy.dgm`: DGM1 v5 local-TRS 66-bone skinned mesh, full 16 animation clips.
- `dev/assets/tex/duncan-meshy-alb.jpg`: 2K albedo (JPEG fallback for Babylon).
- `dev/tools/convert-duncan-meshy.py`: reproducible GLB→DGM converter (numpy, Pillow).
- `dev/tools/install-duncan-meshy.py`: guarded source patch for the existing Dune GoH loader/animator.

## Install in a clean feature branch

1. Extract contents of this archive into the repository root, preserving paths. DO NOT overwrite other models.
2. `python dev/tools/install-duncan-meshy.py`
3. From `dev/` run `node tools/encode-ktx2.mjs`: generates `assets/ktx2/duncan-meshy-alb.ktx2` (commit that result and updated manifest). KTX2 is deliberately not forged here: the repository's official encoder is required.
4. `node tools/build.mjs --target all` then `node tools/check-deps.mjs`, `node tools/check-bundle.mjs dist/pwa/app.js`, `node tests/run.mjs dist/pwa/index.html --no-dom`.
5. Full golden and `tests/smoke/3d.mjs --cycles 2 --phone` + desktop, `tests/smoke/ab.mjs` MED/LOW and SW smoke before merge.
6. Visually verify every clip, sword attachment, model facing, height, skin weights and texture orientation on iPhone; only then deploy.

No edits to `dev/version.json`, `dev/CHANGES_STATUS.md`, build output, published root or main branch are included. This is a candidate feature-branch package, not a release.

## Known limitations requiring visual review

- `Triple_Combo_Attack` is NOT eight distinct slashes; Duncan's "Eight Against One" is approximated visually. Game mechanics (including triple hit upgrade) are unchanged. Author a final eight-cut combo in Blender if visual parity with the previous procedural animation is required.
- The GLB has 66 Mixamo joints and does not have the original three cape cloth bones; cloak simulation is therefore not equivalent until rigged separately.
- The source mesh may already include a back-mounted sword. The game adds its procedural sword in the right hand. Confirm no duplicate weapon is visible during the fight; adjust model geometry/attachment in Blender if needed.
- `Stand_Up10` can have a different initial floor pose from `Dead`; continuity must be checked before release.
- `Duncan` is intentionally kept on the original procedural anims if old DGM remains installed and the new file is omitted.
- Albedo is JPEG (not a physically authored full PBR set). KTX2 should be generated with the repo tool.
- We have not run the whole game CI or mobile WebGL screenshot tests within this package workspace.

## Clip mapping

| In-game | Meshy clip |
|---|---|
| Combat idle | Combat_Stance |
| Basic | Double_Combo_Attack |
| Special | Sword_Parry_Backward |
| Ultimate | Triple_Combo_Attack (visual placeholder) |
| Hit | Hit_Reaction |
| Death | Dead |
| Ghola revive | Stand_Up10 |
| Character showcase | Lower_Weapon_Look_Raise |

Remaining eight clips are retained for later remapping without re-exporting geometry.
