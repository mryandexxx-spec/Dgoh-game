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

## Шаг 3 — ленивая загрузка (2026-11-06)
Согласовано: вариант В (≤ 250 мс — лобби без 3D-фона; дольше — 2D-лагерь + плашка «Загрузка 3D-лагеря»; по готовности 3D проявляется за 0,32 с, 2D-канвас удаляется); бой ждёт чанк (экран «Загрузка 3D…», 2D-бой не подставляется); окно героя — 2D-фигура до загрузки; Baker ждёт чанк.
- `render3d/base.js`: `B3`, `HAS3D` — живые привязки (до загрузки null/false); `HAS_GL` — WebGL есть; `loadB3()` → Promise<boolean> (один на всех, при ошибке сбрасывается для повтора); `onB3(fn)` — инициализация модульных констант после загрузки (`materials.js` C3_*, `mocap.js` MQ/_mq*).
- PWA: `index.html` без тега Babylon, `loadB3` вставляет `<script src="babylon3d.js">`. Артефакт: чанк в `<script type="text/plain" id="b3src">`, `loadB3` исполняет его инлайном (Blob URL не нужен — CSP артефакта не проверялся).
- `camp.js mountCampStage(fallback)`: хост лобби пересоздаётся при каждой отрисовке — после загрузки монтируется только хост, который ещё в DOM; `battle-ui.launch` — повторный вызов во время ожидания игнорируется; при неудачной загрузке — 2D-бой.
- `tools/build.mjs`: замены в шаблоне — функциями (в минифицированном чанке есть `$'`, строка-замена ломала инлайн-артефакт).
- Тесты: `tests/smoke/3d.mjs`, `ab.mjs` дожидаются `loadB3()`; `tests/dom/screens.mjs` — `--babylon` необязателен (новые сборки без WebGL Babylon не грузят). `--update` не требовался.

Проверки: check-deps чисто, check-bundle OK (94); golden полный (battles/meta/saves/screens) совпадает на артефакте и PWA без `--babylon`. A/B (v51 ↔ шаг 3): лагерь 1,7 %, герой 3,7 %, арена 1,8 %, Baker 0 %. Смоук: desktop 2 цикла, phone 1, артефакт 1 — контекст 1, компиляций после wake 0, ресурсы без роста; ошибка артефакта — Google Fonts (сеть закрыта, как раньше). Desktop изредка 3 компиляции при выходе — Baker (скин-материал), не бой; как в фазе 3.

Предварительный замер (SwiftShader, file://, первый запуск страницы): лобби интерактивно (setTimeout(0) после появления лобби) — v51 ~3,7–4,0 с, шаг 3 **~0,2 с**; при CPU ×3: v51 ~6,7–7,1 с, шаг 3 ~0,5 с. 3D-лагерь появляется через 0,8–4,4 с. Повторы в одном браузере шумные — точный замер в шаге 5.

**Выкатка (шаги 2–3):** PWA `dune-goh-9696d2ce82` — в корне `babylon3d.js` (2,25 МБ) вместо `babylon.min.js` (8,6 МБ), `duncan.glb` удалён; артефакт — чанк инлайном (7,39 МБ, jsdelivr не нужен).

## Шаг 4 — поставки (2026-11-06, согласовано)
**Артефакт — multi-file:** `artifact.html` (5,02 МБ) + `babylon3d.js` (2,25 МБ) рядом, публикуется через `files` у Artifact; `loadB3` — один путь `<script src="babylon3d.js">` для PWA и артефакта (инлайн-ветка и `<script type="text/plain" data-b3>` удалены). Сборка: `dist/artifact.html` + `dist/babylon3d.js`.
- Пробник на живом артефакте (iPhone, iOS 18.7, приложение Claude): соседний файл грузится (`frame.claudeusercontent.com/_f/<версия>/babylon3d.js`), `__B3` — 39 имён, CSP-нарушений нет; инлайн-скрипт тоже исполняется.
- Сравнение (HTTP + gzip, Wi-Fi 30 Мбит / 4G 9 Мбит, SwiftShader, медиана, до интерактивного лобби): A (было, text/plain перед кодом игры) 4,58 / 6,22 с; A2 (text/plain в конце body) 1,14 / 2,97 с; **B (multi-file) 1,16 / 2,98 с**. B выбран: один путь с PWA, HTML меньше на 2,25 МБ (на iPhone нет двух копий строки), чанк при republish не перезаливается.

**Тесты:** `--babylon` убран из `tests/run.mjs`, `dom/screens.mjs`, `smoke/3d.mjs`; в `smoke/ab.mjs` — только для старых сборок (где в HTML есть `babylon.min.js`, иначе ошибка). `tests/lib/load.mjs` без пропуска `data-b3`. `package.json` "test" — обе сборки без `--babylon`. README: команды, golden, раздел смоука.

**SW:** офлайн-фолбэк `caches.match('./')` — только для навигации; прочие запросы при ошибке сети получают `Response.error()` (раньше `index.html` вместо скрипта). Сценарий iPhone (localhost, puppeteer): v51 (`dune-goh-d6987b4178`, `babylon.min.js` в кэше) → выкатка → новый SW ставит все файлы списка без 404, старый кэш удалён, `babylon.min.js` в кэше нет, `babylon3d.js` есть; открытая v51 продолжает работать; новый запуск — новая версия, `loadB3()` true; офлайн — из кэша, 3D грузится. Замечание: перезагрузка/навигация *той же вкладки* со старой v51 после `clients.claim()` в headless Chrome+SwiftShader зависает — так же и при выкатке v51→v51 с другим именем кэша (контроль), т. е. поведение харнесса/старой страницы, не новой сборки; на iPhone запуск PWA — новая навигация.

**Номер версии в лобби** (по запросу, макет согласован): `dev/version.json` (`{ "v": 53 }`, поднимается вручную при выкатке) + хеш сборки = версия кэша SW → «v53 · 57aa70c8f6», правый нижний угол лобби, 10 px моно, без событий. `tools/build.mjs` подставляет `__APP_VER__` (ровно одно вхождение, иначе ошибка); хеш кэша теперь считается от номера, шаблона, кода, CSS и чанка. Golden screens маскирует номер (`v0`); эталон screens переснят один раз (`--update`, согласовано) — отличие только в `<div class="appver">`.

## Шаг 5 — замеры (2026-11-06)
`tests/smoke/3d.mjs --tti N [--phone] [--net wifi|4g|none] [--cpu 3]`: папка страницы по HTTP с gzip, каждый прогон — новый контекст без кэша, медиана; метки lobby / tti (setTimeout(0) после лобби) / b3 / camp3d (смонтирован 3D-лагерь) / load.

| Сборка, Wi-Fi 30 Мбит | tti, с | 3D-лагерь, с | load, с |
|---|---|---|---|
| PWA v51, desktop (5) | 5,62 | 2,43* | 21,5 |
| PWA v53, desktop (5) | **1,22** | 2,34 | 9,2 |
| PWA v51, phone (5) | 4,23 | 2,26* | 13,0 |
| PWA v53, phone (5) | **1,15** | 2,02 | 6,1 |
| PWA v51, phone, CPU ×3 (3) | 7,24 | 3,92* | 23,6 |
| PWA v53, phone, CPU ×3 (3) | **1,57** | 3,82 | 21,2 |
| Артефакт v52 (инлайн), desktop / phone | 5,38 / 4,01 | 2,16 / 2,07 | 11,9 / 8,9 |
| Артефакт v53 (multi-file), desktop / phone | **1,28 / 1,24** | 2,16 / 2,04 | 9,2 / 6,8 |

\* в v51 3D-лагерь монтируется синхронно вместе с лобби, но поток занят до tti.

Размеры: чанк 2,25 МБ (gzip 0,55) против `babylon.min.js` 8,17 МБ; артефакт 7,39 → 5,02 МБ + чанк; PWA app.js 4,92 МБ.

**Смоук 20 циклов (v53):** desktop и phone — 1 WebGL-контекст; meshes/textures/materials 211/51/120 (phone 211/43/120) без роста; gpu 92 (phone 63) без роста; компиляций после wake 0 во всех циклах; ошибок 0. Вход/выход ≤ 400 мс на SwiftShader не измерить (FAIL ожидаем, проверка — iPhone).
- Компиляции при выходе (desktop): циклы 2, 4, 5, 13 — 3/2/1/1. Циклы 2 и 4 — сцена Baker (3 направленных света `DIRLIGHT2/3`, без теней и постобработки; в цикле 4 — `NUM_BONE_INFLUENCERS 4`, скин-материал); 5 и 13 — по одному варианту `NONUNIFORMSCALING` без признаков боя. Подтверждено: не бой.
- **Наблюдение (phone):** время выхода растёт: циклы 1–4 ≈ 2,1 с (синхронно 1,3–1,7), циклы 17–20 ≈ 2,7 с (синхронно 2,1–2,2); на desktop роста нет (4,6–5,2 с, редкие всплески GC). Счётчики ресурсов при этом стабильны — вероятно, рост кучи JS/журнала. Совпадает с пунктом iPhone-проверки «рост времени выхода»; если подтвердится на устройстве — отдельная задача (профиль кучи по циклам).

Опционально (размер чанка): загрузчики текстур ~20 КБ, `gpuParticleSystem` 45 КБ, эмиттеры ~18 КБ — выигрыш ~65 КБ (−3 %, gzip ≈ −15 КБ). Не делаем (согласовано).

**Выкатка v53:** PWA `dune-goh-57aa70c8f6` (`babylon3d.js` не изменился, `sw.js` с `Response.error()`), артефакт multi-file. check-deps чисто, check-bundle OK (94), golden полный совпадает на артефакте и PWA.

## Фаза 4 закрыта
Осталось на iPhone (пользователь): лагерь на 30 fps, лагерь ↔ бой ≤ 400 мс, рост времени выхода за много циклов (см. наблюдение phone), вид ожидания 3D при первом запуске; в лобби должна быть версия «v53 · 57aa70c8f6».
