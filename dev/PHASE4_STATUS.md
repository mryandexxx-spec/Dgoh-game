# Фаза 4 — статус (REFACTOR_PLAN §7, «Babylon modular»)

База: коммит 8efd515, артефакт v51, PWA `dune-goh-d6987b4178`. Перед правками сборка из main воспроизводит тот же кэш SW; golden (battles/meta/saves/screens) совпадает на артефакте и PWA.

## Шаг 1 — аудит API (2026-11-06, согласован)

Обращения к `B3.*`/`BABYLON.*`: 20 модулей `render3d/` + `tests/smoke/3d.mjs` (`BABYLON.EngineStore.Instances`) + заглушка `BABYLON` в `tests/lib/load.mjs`. Вне `render3d` Babylon не используется.

| Группа | Имена | Модуль @babylonjs/core 9.30 |
|---|---|---|
| Движок | Engine, EngineStore, Constants.ALPHA_ADD, Effect.PersistentMode, Scene (+FOGMODE_LINEAR) | Engines/engine, engineStore, constants; Materials/effect; scene |
| Математика | Vector3 (Lerp/LerpToRef/Distance/Project/ProjectToRef/TransformCoordinates), Quaternion (FromEulerAngles/FromUnitVectorsToRef/RotationAxisToRef/SlerpToRef), Matrix (IdentityReadOnly/RotationX/Translation), Color3/Color4, Axis, Curve3.CreateCatmullRomSpline, Viewport | Maths/math.vector, .color, .axis, .path, .viewport |
| Камера, свет | UniversalCamera; Directional/Hemispheric/Point/SpotLight | Cameras, Lights |
| Тени | ShadowGenerator (QUALITY_MEDIUM) | Lights/Shadows/shadowGenerator (компонент сцены регистрирует конструктор) |
| Glow | GlowLayer | Layers/glowLayer + effectLayerSceneComponent |
| Постобработка | DefaultRenderingPipeline, DepthOfFieldEffectBlurLevel, ImageProcessingConfiguration.TONEMAPPING_ACES, SSAO2RenderingPipeline (+IsSupported) | PostProcesses/RenderPipeline/Pipelines/*; postProcessRenderPipelineManagerSceneComponent; geometryBufferRendererSceneComponent; prePassRendererSceneComponent |
| Материалы, текстуры | StandardMaterial, PBRMaterial, Texture, DynamicTexture, RenderTargetTexture (REFRESHRATE_RENDER_ONCE), HDRCubeTexture (env-hdr, .hdr RGBE + префильтр), ReflectionProbe | Materials/*, Probes/reflectionProbe |
| Геометрия | Mesh (+MergeMeshes, side/cap/billboard константы), TransformNode, VertexData (+ComputeNormals), VertexBuffer (*Kind), MeshBuilder: Box, Cylinder, Disc, Ground, IcoSphere, Lathe, Plane, Polyhedron, Sphere, Torus, Tube | Meshes/*, Buffers/buffer, отдельные Meshes/Builders/* (не весь MeshBuilder) |
| Скелет | Skeleton, Bone (своя mocap-анимация, B3.Animation не используется) | Bones/* |
| Частицы | ParticleSystem (BLENDMODE_*, BILLBOARDMODE_STRETCHED) | Particles/particleSystem + particleSystemComponent |
| Пикинг | scene.pick | Culling/ray (side-effect) |

**Не нужны:** glTF-загрузчик (Дункан встроен как `MODEL_DATA` в `assets/models.js`; `duncan.glb` в корне кодом не читается), DDS/ENV (окружение — HDRCubeTexture), морфы (MorphTarget не используется), анимации Babylon, инстансы, WebGPU.

**Прототип чанка** (`tools/babylon/entry-draft.js`, esbuild 0.24, minify, ESM):
- как есть — **2,71 МБ** (gzip 0,62) — не укладывается;
- без WGSL-шейдеров (`ShadersWGSL/**` → пустой модуль; движок только WebGL, WGSL грузится лишь в WebGPU-ветке) — **2,25 МБ** (gzip 0,54) — укладывается, функциональность та же.
- В бандле есть шейдеры теней, glow (+blur), SSAO2, geometry buffer, частиц, FXAA, grain, chromatic aberration, DoF, image processing, PBR, standard, hdrFiltering, кости.
- Крупнейшие части: ShadersInclude 298 К, PBR 131 К, Textures 122 К, scene 83 К, mesh 75 К.

Против текущего: babylon.min.js 8,6 МБ → ~2,25 МБ (−74 %).

**Согласовано:** вариант без WGSL; `@babylonjs/core` — devDependency с точной версией `9.30.0` (обновлять только со смоуком и A/B); `babylon.min.js` и `duncan.glb` уходят из поставки.

## Шаг 2 — чанк `render3d/babylon.js` (2026-11-06)
- `src/render3d/babylon.js` — явные импорты @babylonjs/core 9.30 + side-effect-импорты; объект `B3` с теми же 39 именами (79 обращений и 11 билдеров проверены по собранному чанку — все на месте); `globalThis.__B3 = B3`. Модуль — отдельная точка входа, в граф `main.js` и в `split.config.mjs` не входит (порядок исполнения не затрагивает).
- `render3d/base.js`: `B3 = globalThis.__B3 || BABYLON` (BABYLON — только заглушка Node-тестов).
- `tools/build.mjs`: `babylonChunk()` — esbuild, IIFE, minify, плагин `no-wgsl`; PWA — файл `babylon3d.js` (в списке SW, `babylon.min.js` и `duncan.glb` исключены, при `--deploy` удаляются из корня); артефакт — инлайн `<script data-b3>` (временно, решение — шаг 4), jsdelivr больше не нужен.
- Тесты: `tests/lib/load.mjs` пропускает `<script data-b3>`; `tests/smoke/3d.mjs` берёт EngineStore из `window.__B3` (запасной — `BABYLON`).
- Размер: **babylon3d.js 2,25 МБ** (было 8,6). Пока синхронный, грузится до app.js — ленивая загрузка в шаге 3.

Проверки: check-deps чисто, check-bundle OK (94), golden `--no-dom` совпадает на артефакте и PWA. A/B (v51 ↔ шаг 2, desktop): лагерь 1,3 %, герой 3,7 % (тост «Задание выполнено» — CSS-анимация; в 3D только зерно), арена 1,8 % (мерцание щитов, зерно), Baker 0 %. Тени, glow, хроматическая аберрация, щиты — на месте. Смоук 2 цикла desktop: контекст 1, meshes/textures/materials 211/51/120, gpu 93, компиляций после wake 0, ошибок 0.
