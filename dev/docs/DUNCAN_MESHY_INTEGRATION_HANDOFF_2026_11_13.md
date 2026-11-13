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

## 2026-11-13 visual quality gate (PR #53, diagnostic work)

- Previous smoke proved that the skinned Meshy part and 16 clips exist, but did **not** prove that the JPEG albedo had decoded by capture time, that pixels actually contained Duncan, or that the result was adequately lit.
- `tests/smoke/duncan-meshy-webgl.mjs` now waits for the actual skinned mesh's bound texture to become ready and reads foreground/background pixels from the *live Babylon/WebGL framebuffer* at both MED 844×390 and LOW 667×375.
- The foreground/background difference must have non-trivial coverage, plausible on-screen bounds, mean luminance and bright-pixel fraction; every profile writes a JSON metrics file alongside its screenshot. This is a **heuristic quality gate**, not a substitute for human visual review. It needs evaluation against actual CI captures and known-good character controls before acceptance.
- Important: the shared Engine sets `preserveDrawingBuffer: false`; reading `canvas.toDataURL()` after a render is unreliable. The gate uses immediate synchronous `gl.readPixels` after rendering both frames.
- Converter specifies `materialMode: 'standard'` and one UV-mapped textured cloth part. PBR-specific adjustments cannot be assumed to resolve this asset's appearance. The converter also does not produce a KTX2; absence of that file selects the JPEG fallback.
- **Not yet fixed/verified:** the root cause of the MED dark silhouette / LOW disappearance, actual WebGL output after any material correction, sword duplication, cape clipping, full animation transition/facing and eight-strike ultimate choreography. Do not merge or release. Keep draft.

## 2026-11-13 repaired WebGL material and portrait (PR #53, still Draft)

**Reproduced:** Original Actions #43408888603 artifact dune-duncan-meshy-758: MED nearly black and LOW empty in the old browser screenshot. Paused Puppeteer capture was not reliable because EngineHost uses preserveDrawingBuffer:false. New smoke samples synchronized gl.readPixels; both 844×390 MED and 667×375 LOW now draw Duncan.

**Primary root cause verified:** convert-duncan-meshy.py preserves glTF UVs, but tex3 previously forced invertY:true. Meshy Duncan now uses invertY:false for JPEG and prospective KTX2 albedo only. Offline vertex/atlas sampling at head height found 341 skin-like pixels with correct orientation versus 66 with inverted orientation. Real WebGL showed restored face/cloth/armor colors.

**Scoped fixes:** Original diffuse albedo is also used as modest emissive fill (.85); the imported Meshy mesh no longer receives thin-geometry self-shadow acne but still casts shadows. Removed the duplicate procedural sword. Portrait Showcase uses Idle_11, combat Idle stays Combat_Stance. Portrait yaw is native; Duncan-only camera distance is multiplied by .89. Combat pose has separate +90-degree facing correction, still requires actual battle review.

**Real regression caught and fixed:** A mistaken this.y instead of this.yaw made the imported mesh world bounds non-finite and the hero invisible after HeroStage.tick(). Repaired, and the GPU smoke now calls real HeroStage.tick() before capture and writes PNG/JSON even when quality assertions fail.

**Checks:** duncan-meshy-webgl.mjs waits for albedo readiness, compares GPU foreground/background coverage and luminance, saves two real WebGL frames and four cardinal-yaw captures, checks rig/clips and verifies Attack/special/ult/death/Ghola/recovery at speeds x1/x2/x4. Duncan smoke passed on code commit dada7b75c54e6811602d31d33f1f34d4b6fc7764 in Actions #43422792355 with artifact dune-duncan-meshy-781. Final entire workflow status is separate.

**Remaining blockers:** Triple_Combo_Attack does not reproduce the original eight-strike ultimate choreography; battle-facing/cloth clipping and real iPhone Safari review are not fully accepted. KTX2 asset is not committed; JPEG fallback works. Do not merge or publish and do not bump release version without the owner's permission.

## 2026-11-13 portrait refinement — further validation required

- The baked-albedo emissive contribution was raised to 1.25 for the imported Duncan only (other heroes unchanged). The latest GPU capture at 844×390 MED / 667×375 LOW showed visible body/texture with measured mean luma ~122/~121, but face detail is still compromised by the head-down source pose; this is not final visual acceptance.
- Targeted hero-only fill reuses existing `rim2` (no extra light) and restores its position/intensity when switching to another hero; Duncan-only additive backdrop halo alpha becomes .045 and restores .20 for other heroes.
- Verified real WebGL captures for four existing animation candidates (Idle_11, Combat_Stance, Lower_Weapon_Look_Raise, Long_Breathe_and_Look_Around) at 25/50/75% of each clip. None gives an unequivocally better calm full-body hero card; retain Idle_11. See artifact `dune-duncan-meshy-788` from Actions #43424938160.
- The latest portrait change adds a small local head lift (-.24 radians about local X) **after** imported showcase clip sampling in `HeroStage.tick()`; this affects only the card and must be judged in fresh GPU frames. The clip animator resets the source pose each frame so it must not accumulate.
- Smoke additionally gates `tex.invertY===false`, finite skinned bounds after real stage tick, and restored rim/halo values after navigating from Duncan to Leto. It captures live GPU pixels, not browser screenshots of a released backbuffer.
- Real battle facing, cape clipping, PWA on physical iPhone, and the original eight-strike ultimate choreography remain open. Maintain Draft; do not merge/deploy based on green CI alone.

## PR #53 — exterior surface, portrait and combat verification

Supersedes the earlier diagnosis for 4186624. On the same frozen MED portrait, removing emissive, varying diffuse, changing to nonmetal PBR, and adding front fill all left an empty-looking face. Switching only triangle orientation restored the facial features. The converter copies glTF CCW indices verbatim; Babylon's manually constructed RH mesh defaults to CW. The source also declares doubleSided. Meshy now sets CCW, double-sided lighting, diffuse JPEG only, no emissive map. UVs are in [0,1], input normals unit length, original atlas is dark (median channel 38 at vertices). Cardinal GPU views show the face at yaw 0, cloak at pi. Removed the unconditional combat quarter-turn. The portrait reuses the existing spotlight, sets a closer camera and lowers the target to include both boots.

Scene pooling bug caught by the new Leto framebuffer control: evicting a prefetched PBR hero disposed the shared environment BRDF lookup. Subsequent Leto meshes had valid transforms but unready PBR materials and only the podium rendered. Shared scene textures now outlive the pooled actor. The same real control now shows the entire Leto model.

Local WebGL on Chromium/SwiftShader: MED original luma 31.9; repaired ~67; LOW ~59. No clipped foreground highlights in these captures. Both preserve the original woven scarf, armor panels and skin tones. Single skinned mesh, 66 bones, 16 clips. Pose smoke exercises attack, parry, hit, death, revival and recovery at x1/x2/x4. Ultimate chains triple, double and triple authored attacks; the eight slash cues use source right-hand velocity peaks and catch up across skipped frames. Arena smoke enters via doAct and captures eight contacts and Idle on both profiles. No damage or timing changes to game logic.

Remaining acceptance: blade is visible on Duncan's back, not independently attached to his striking hand. The eight slash effects are present, but the hand-held sword presentation and cloth clipping across every clip are not art-approved. KTX2 not supplied; the existing bulk encoder flips every atlas and must respect the Meshy UV convention before adding this file. Physical iPhone/WebKit frame pacing remains unmeasured. Draft only.
