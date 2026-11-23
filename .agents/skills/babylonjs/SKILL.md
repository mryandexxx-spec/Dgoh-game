---
name: babylonjs
description: Dune GoH Babylon.js 9.30 WebGL rendering, 3D scenes, PBR/lighting, DGM/GLB/KTX2 assets, mobile profiles, animation, VFX and screenshot-based visual validation. Use for any 3D or graphical development task in this repository.
---

# Babylon.js — Dune GoH rendering skill

**Use when:** editing hero and arena rendering, PBR materials, shadows, lighting, camera, authored models, procedural geometry, VFX, post-processing or mobile 3D performance. Combine with the existing `game-feel`, `create-game-assets` or `performance-optimization` skills only when relevant.

**Sources (adapted guidance, not verbatim copies):**
- [TerminalSkills Babylon.js 9 / Apache-2.0](https://github.com/TerminalSkills/skills/blob/main/skills/babylonjs/SKILL.md) — current engine concepts, ES-module import boundaries, PBR, lifecycle.
- [Curiosity AI Babylon.js 8 / MIT](https://github.com/Curiosity-Ai-BV/Babylonjs-Skill) — materials, animation/loading and performance reference; **check v8 snippets against the pinned v9 package**.
- [Godogen Babylon engine guide](https://github.com/htdt/godogen/blob/master/engines/babylon.md) — visual evidence, browser/GPU diagnostics, screenshots/video, not its new-project scaffolding.
- [Official Babylon.js documentation](https://doc.babylonjs.com/).

## Project rules — authoritative over upstream examples

1. Inspect current `main`, `dev/docs/PROJECT_INSTRUCTIONS.md`, approved graphics documents, relevant code and tests before proposing a change. `dev/package.json` pins `@babylonjs/core` to **9.30.0**; the project builds ES modules with its own bundler, **not Vite**, and deliberately targets **WebGL**, not WebGPU.
2. The shared engine entry is `dev/src/render3d/babylon.js`. It exposes the curated `B3` set with deep ES imports and necessary side-effect imports. Add new Babylon symbols **there**, not ad hoc through global `BABYLON`, a second engine, loaders, UMD/CDN scripts, or alternative rendering libraries. Confirm available symbols with the pinned package first.
3. `dev/src/render3d/engine-host.js` owns **one canvas/one Engine** and moves it among camp, hero and arena hosts, handling scene owners, sleep, context loss and frame pacing. Do not create competing render loops, resize listeners or canvases.
4. `dev/src/render3d/ctx.js` implements a **synchronous** `withCtx` boundary. Do not introduce an `await` inside its callback.
5. `dev/src/render3d/quality.js` owns HIGH/MED/LOW/AUTO settings and the battle-FPS override. Use existing quality flags to gate shaders, particles, shadows and postprocessing. Never silently change the common battle camera or downgrade art at every profile without a visual comparison.
6. `dev/src/render3d/characters/authored.js` and `dev/src/assets/models.js` implement custom DGM/skinned meshes, KTX2 with JPEG fallback and existing animation IDs. Do **not** replace this with generic `SceneLoader`/glTF loading from an upstream tutorial. Use GLB as an authored *source* when appropriate; preserve rig, mapping, material slots, weapon attachments and fallback.
7. Game state, combat RNG, clocks, Web Locks, save-v1/PWA progression and reward settlement are independent from presentation. Graphical effects must never influence simulation, stored values or reward timing.

## Focused implementation workflow

1. Identify owning scene and current visual reference: `dev/src/render3d/scenes/{arena,hero,camp}.js` and `dev/src/render3d/env/`, `materials.js`, `characters/`. Determine whether a change affects environment, rig, texture or post-processing.
2. Write a small art/technical acceptance target: intended visible difference, affected quality profiles, texture budget, FPS/frametime and safe fallback. Prior approval is needed for material shifts in overall art direction.
3. Implement smallest compatible patch through existing engine and asset boundaries. Prefer controlled material/lighting changes over replacing a renderer. Use engine observables carefully, unregister them on scene disposal; share GPU resources only with explicit ownership.
4. Check the actual screen and assets under native target viewport(s). Compare equivalent camera/time/model/lighting, with the same quality profile and a stable warm state. Do not infer that a successful `npm run build` proves visuals are correct.
5. Use existing responsive/mobile WebGL smoke and performance measurements only for systems actually touched. Preserve shorter CI plan: build + short smoke + 3D-specific checks when source/3D assets change; no extra global jobs for this skill.

## Domain quick decisions

- **PBR:** start with existing `PBRMaterial`/`StandardMaterial` definitions, exposure/tone, lighting/environment and normal/ORM texture interpretation; verify cloth/skin/metal read at game scale. Watch transparency sorting, texture color space and material sharing.
- **Geometry:** choose existing procedural helpers or authoring assets; respect skeleton, instance and batching constraints. Avoid unnecessary per-frame mesh/material allocations.
- **Animations:** visual-only transitions after gameplay events; preserve clip names, mapped actions, deterministic state boundaries and disabled/offline fallbacks.
- **Effects:** particle and post FX must use LOW/MED alternatives; never block input, impair readability, or depend on a constant 60 Hz.
- **Performance:** use current engine host frame ring/p95 and graphics reports, compare like-for-like on phone. Shader compile stalls, draw calls, texture decode and GPU bandwidth are plausible bottlenecks; measure rather than guess.

**Read before implementing:**
- [rendering-and-assets.md](references/rendering-and-assets.md) for Babylon materials, lighting, KTX2, DGM and pitfalls.
- [visual-proof.md](references/visual-proof.md) for reproducible visual QA and targeted test selection.

**Scope:** this skill installs instructions only. It does not configure Babylon MCP, modify rendering, install packages, introduce CI workflows or publish a new game build.
