---
name: create-game-assets
description: Dune GoH JavaScript/Babylon.js adapted gameplay guidance for create game assets tasks.
---

# Dune GoH — create-game-assets

Source: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/create-game-assets/SKILL.md (Apache-2.0). For Dune-themed 2D icons/portraits and Babylon 3D GLB/DGM/KTX2 assets; does not install third-party importers.

## Workflow
1. Read approved art direction and existing concepts/manifests in `dev/docs/` and `dev/assets-src/`; reuse the approved desert-imperial palette, lighting and silhouette language.
2. Specify asset type, target screen size, mobile texture/memory budget, alpha handling, file format, and usage before generation. Approve a representative example before expanding a family.
3. Store reproducible editable sources, meaningful names, provenance and license details. Treat newly generated art as draft until verified in-game. Do not take unlicensed art from media franchises.
4. Prefer clean SVG for UI pictograms (text remains rendered by the app); avoid unnecessary bitmap bloat. For characters preserve existing rig, bone names, clip IDs, accessories, DGM pipeline and fallback assets.
5. Validate textures, UVs, alpha, scale, animation clips and mobile memory. Use the project's existing conversion, encoding and manifest scripts; never silently introduce a Three.js pipeline.

## Targeted acceptance
- Review asset at native phone scale against the actual game background; compare approved reference and final, check for clipping/transparency and PWA asset load offline.
- Run existing asset-specific validators, build and relevant 3D smoke when 3D assets changed; no automatic full regression for icon-only changes.
