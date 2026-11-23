# Babylon.js rendering and asset decisions for Dune GoH

Adapted from [TerminalSkills Babylon.js 9](https://github.com/TerminalSkills/skills/blob/main/skills/babylonjs/SKILL.md) (Apache-2.0) and [Curiosity AI Babylon.js 8 references](https://github.com/Curiosity-Ai-BV/Babylonjs-Skill/tree/main/BabylonJS/references) (MIT). These are project-specific recommendations, **not** drop-in upstream scripts.

## Read these existing files first

| Topic | Source of truth |
| --- | --- |
| Available engine classes and side effects | `dev/src/render3d/babylon.js`, `dev/src/render3d/base.js` |
| Canvas/Engine ownership and FPS ring | `dev/src/render3d/engine-host.js` |
| Quality settings, device thresholds | `dev/src/render3d/quality.js` |
| Materials and per-frame helper utilities | `dev/src/render3d/materials.js` |
| Scene lighting, props and particles | `dev/src/render3d/env/build-env.js`, `env/props.js`, `env/particles.js` |
| Authored rig/model playback | `dev/src/render3d/characters/authored.js`, `characters/rig.js` |
| KTX2 URLs and model manifests | `dev/src/assets/models.js` |
| Approved visual direction | `dev/docs/GRAPHICS_ASSETS_ROADMAP.md` and newer signed-off UI/art docs |

## Materials and lighting

- Confirm a visually motivated target first: fabric microstructure, weathered metallic highlights, skin shading, desert stone response or energy emissive effects.
- In the current WebGL scene, inspect the established `PBRMaterial` setup and relevant `environmentTexture` / prefiltered `.env` pipeline *before* adding extra lights. Excessive realtime shadows and postprocessing harm mobile GPU.
- Avoid changing a shared material instance to customize one character. Verify whether a material is shared, then clone or use designated per-instance parameters only when needed.
- Treat texture channels deliberately: albedo is color data, normal/ORM are non-color data; avoid accidental gamma mismatches and mirrored normal maps. Verify KTX2 result against JPEG fallback with the same UV mapping.
- Know the existing profile limits: HIGH adds bloom/SSAO/grain and stronger shadows; MED and LOW intentionally disable some expensive passes. Do not enable a high-only effect globally.
- For new custom shaders, assess whether the existing `Effect`/pipeline imports support them; use Babylon's Node Material Editor as a **design tool** only after deciding how the shader will be bundled offline. No network-only snippet dependencies in production.

## Geometry, models and animation

- Existing authored heroes are not generic runtime `.glb` imports. Their DGM model may include packed joint indices, inverse-bind transforms and separate animation clip mapping; preserve this data contract.
- New character assets start from an approved concept and repeatable source pipeline. Validate rig scale, facing, bounding boxes, skeleton name/number, clip boundaries, sword attachment, UV/normal/ORM consistency and fallback behaviour.
- Keep KTX2 decoder deployment and JPEG fallback intact in offline PWA. If a model or texture cannot load, the user must not lose access to the rest of the game.
- Preserve the single-engine lifecycle. Dispose per-scene objects only if owned by that scene; do not indiscriminately dispose shared textures/materials. Remove scene observers/listeners on detachment.
- Instancing and mesh merging are case-specific: good for repeated static props, not automatically safe for skinned or individually animated heroes. Avoid applying an optimization snippet without measuring visible regressions.

## Risk checks before making a graphics PR

1. Do the changes keep the same model/animation IDs, selection logic and battle camera composition?
2. Does LOW retain a clear silhouette and combat readability on a narrow phone?
3. Do optimized assets preserve appearance and integrity in both online and offline/PWA scenarios?
4. Is frame time, texture budget and user-visible improvement measured with a comparable baseline?
5. Can visual effects run without changing gameplay timers, battle tick ordering, RNG or player progress?

For concrete Babylon API signature differences, consult the installed `@babylonjs/core@9.30.0` source and official [Babylon.js docs](https://doc.babylonjs.com/) rather than silently copying v8 or unrelated Vite examples.
