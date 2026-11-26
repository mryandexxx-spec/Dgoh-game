# Dune GoH — selected AI game-development skills

Seven general-purpose skills from [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (Apache-2.0), plus one Babylon.js 9.30 engine skill adapted using TerminalSkills, Curiosity AI and Godogen references. Source paths are linked in each skill. These are tailored instructions **not** copies of engine-dependent snippets; they do not add runtime code, assets, npm dependencies, CI jobs or changes to game logic. The original upstream copyright/license remains with its authors.

## Routing
- GFX-06 ART-PROD production reset → [current handoff and stage-specific installed plugin skills](../../dev/docs/GFX_06_ART_PROD.md). Load fal-media / fal-models-catalog for one controlled decomposition experiment; fal-workflow and fal-gamedev only when applicable. Load Figma plugin skills for the exact operation, not just local adaptations. No new HTML art iteration before master acceptance.
- Premium game UI, approved reference decomposition, artistic nine-slice, layer assets → `game-ui-art-pipeline` + `create-game-assets` + `game-ui-ux`.
- Editable UI master and reference-faithful transfer → `figma-ui-transfer` (load actual Figma plugin skills before calls).
- Independent artistic acceptance and real browser comparison → `game-ui-visual-review` (mandatory for GFX-06); [pipeline](../../dev/docs/GFX_06_UI_PIPELINE.md).
- Babylon.js 9.30 WebGL scenes, PBR, lighting, KTX2/DGM, hero animations and visual proof → `babylonjs` (combine with task-specific skills when appropriate).
- UI, top navigation, roster, scaling and mobile accessibility → `game-ui-ux`.
- Cinematic hero showcase / authored idle, gesture, transitions and real motion review → `cinematic-motion` + `babylonjs` + `game-feel`.
- Animation, hit effects and interaction polish → `game-feel` (with `audio-design` for sound).
- Portraits, 2D icons, 3D characters, textures, provenance → `create-game-assets`.
- Kit/equipment/quests/progression → `rpg`.
- FPS, draw calls, load/memory → `performance-optimization`.
- Enemy targeting/decision policy → `ai-behavior-trees-utility-ai`.
- SFX, music, gain and mobile autoplay → `audio-design`.

Always read current `main` and `dev/docs/PROJECT_INSTRUCTIONS.md`, approved specs, and touched source files first. Project-specific implementation and safety contracts override these generalized guidelines. Use only skills relevant to the requested change. Do not switch engines or introduce dependency-heavy tooling. No blanket CI regressions: keep existing diff-sensitive short smoke + touched-system checks. No changes to saves, Web Locks, battle RNG or economy merely to satisfy a skill.

## License
The original seven skill sources are [Apache-2.0](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/LICENSE). The new Babylon.js guidance is original adaptation with attribution to [TerminalSkills (Apache-2.0)](https://github.com/TerminalSkills/skills/blob/main/skills/babylonjs/SKILL.md), [Curiosity AI (MIT)](https://github.com/Curiosity-Ai-BV/Babylonjs-Skill) and [Godogen visual QA](https://github.com/htdt/godogen/blob/master/engines/babylon.md). No third-party code or assets are vendored.
