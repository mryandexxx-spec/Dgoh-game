# Dune GoH — selected AI game-development skills

Seven task-specific, project-adapted skills from [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills), licensed Apache-2.0. Source paths are linked in each skill. These are tailored instructions **not** copies of engine-dependent snippets; they do not add runtime code, assets, npm dependencies, CI jobs or changes to game logic. The original upstream copyright/license remains with its authors.

## Routing
- UI, top navigation, roster, scaling and mobile accessibility → `game-ui-ux`.
- Animation, hit effects and interaction polish → `game-feel` (with `audio-design` for sound).
- Portraits, 2D icons, 3D characters, textures, provenance → `create-game-assets`.
- Kit/equipment/quests/progression → `rpg`.
- FPS, draw calls, load/memory → `performance-optimization`.
- Enemy targeting/decision policy → `ai-behavior-trees-utility-ai`.
- SFX, music, gain and mobile autoplay → `audio-design`.

Always read current `main` and `dev/docs/PROJECT_INSTRUCTIONS.md`, approved specs, and touched source files first. Project-specific implementation and safety contracts override these generalized guidelines. Use only skills relevant to the requested change. Do not switch engines or introduce dependency-heavy tooling. No blanket CI regressions: keep existing diff-sensitive short smoke + touched-system checks. No changes to saves, Web Locks, battle RNG or economy merely to satisfy a skill.

## License
The original upstream repository and skill material are distributed under [Apache License 2.0](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/LICENSE). This repository records project-specific adaptations, with source attribution in each file.
