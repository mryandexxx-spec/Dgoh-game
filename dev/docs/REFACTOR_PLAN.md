# План рефакторинга архитектуры — Dune: Galaxy of Houses

> Историческая справка: план выполнен в фазах 0–7 (v45–v68), статусы фаз — `dev/PHASE*_STATUS.md`. Номера строк ниже — по старому монолиту `index.html` (до фазы 2). Действующие правила — `dev/ARCHITECTURE.md`.

**Основа:** аудит `AUDIT_perf_memory.md` (номера строк — по `index.html` из `dune-pwa-flat.zip`).
**Цели:** (1) модульная архитектура — и JS/HTML, и Babylon.js; (2) оптимизация кода; (3) снижение нагрузки на CPU/GPU без видимой потери качества; (4) оптимизация ассетов **без изменения игровой логики**.
**Жёсткие ограничения:**
- Боевой движок (1388–2040) и мета (4367–7066) переносятся **механически**: без изменения формул, порядка вызовов и RNG. Корректность проверяется golden-тестами (§6).
- Обе поставки сохраняются: артефакт claude.ai (сейчас — один HTML, Babylon с jsdelivr) и PWA на GitHub Pages (`build_pwa.py`).
- Каждая фаза заканчивается рабочей сборкой, которую можно выкатить.

---

## 1. Текущее состояние → целевое

| Аспект | Сейчас | Цель |
|---|---|---|
| Исходник | 1 HTML, 7 113 строк, 5 МБ, 2 `<script>` в общей глобальной области | `src/` из ES-модулей, сборка через esbuild |
| Babylon | UMD `babylon.min.js` 8,57 МБ, грузится синхронно до первого экрана | `@babylonjs/core@9.30` с tree-shaking, отдельный чанк, грузится лениво при первом 3D-экране |
| Движки | 4 независимых `Engine`/контекста (бой, лагерь, герой, запекатель) | **1 Engine** на приложение + менеджер сцен |
| Связь 3D-кода | глобальные `SC`, `SHG`, `PBR_ON` | явный контекст `ctx = { scene, shadows, quality, assets }` в параметрах |
| Ассеты | base64-литералы в JS (`MODEL_DATA` 3,8 МБ, `ENV_HDR`, `MOCAP`, `WORM_IMG`) | файлы `assets/` (glb + KTX2, .env, .bin, webp), ленивая загрузка, кэш SW |
| Качество | захардкожено + `SAVE_LOW` (DoF/SSAO) | профили LOW/MED/HIGH + адаптивное понижение по времени кадра |
| Цикл рендера | 60 fps всегда | планировщик кадров: ACTIVE 60 / IDLE 30 / STATIC «по требованию» / PAUSED |
| UI | `innerHTML` всего экрана/HUD на каждое изменение | рендер экранов как сейчас, но HUD боя — точечные обновления; позиционирование через `transform` |
| CSS | 1 блок 155 КБ | файлы по разделам (границы уже размечены комментариями) |

---

## 2. Целевая модульная структура

```
src/
  main.js                      бут: сплэш → загрузка сохранения → роутер → ленивый 3D
  core/
    state.js                   S, BT, view (единая точка доступа, без изменения формата сохранения)
    save.js                    SAVE_KEY, newSave, fillSave, loadSave, persist (+ дебаунс записи)
    errlog.js                  errLog с троттлингом, battleMark, детектор крэша
    timers.js                  единый тикер 1 с (вода/свечи), без пересборки DOM
    device.js                  телефон/планшет/десктоп, DPR, WebGL2, профиль качества
    dom.js                     $, toast, делегирование событий
  data/                        ЧИСТЫЕ ДАННЫЕ (сначала JS-модули, потом часть — в JSON)
    chars.js  fx.js  story.js  campaigns.js  journeys.js  items.js  shop.js
    conquest-data.js  glyphs.js  icons.js  looks.js (LOOK, HERO3, ENV3, SCN)
  logic/                       БЕЗ DOM и Babylon — запускается в Node для тестов
    battle/engine.js  battle/turns.js  battle/raid.js  battle/ai.js  battle/order.js
    economy.js  gear.js  relics.js  daily.js  feats.js  account.js  conquest.js  trials.js
  ui/
    router.js                  render() — таблица view → функция (как сейчас, 4608)
    views/                     lobby.js camp.js squad.js raid.js legend.js shop.js trials.js feats.js daily.js conq.js rules.js
    overlays/                  detail.js info.js squad-select.js calendar.js profile.js levelup.js celebrate.js rewards.js
    battle/                    battle-ui.js (launch/step/finish/leave), hud.js (точечные апдейты), dialog.js, controls.js
    notifications.js  gestures.js (long-press, свайпы)
  render2d/
    scene-bg.js  fx-layer.js  figures.js  thumbs.js
  render3d/
    engine-host.js             ЕДИНСТВЕННЫЙ Engine, перенос канваса между хостами, loseContext, resize
    scheduler.js               режимы ACTIVE/IDLE/STATIC/PAUSED, лимит FPS, видимость страницы
    quality.js                 профили + адаптивное понижение
    assets.js                  AssetCache: текстуры, шаблоны мешей, материалы, клипы — на движок
    materials.js               фабрики mat3/basic3 с кэшем по ключу
    geometry.js                примитивы, bRock, lathe, foldify
    env/  build-env.js  props.js  particles.js  sky.js
    characters/  procedural.js  authored.js (glb)  rig.js  merge.js  pose-generic.js  pose-duncan.js  mocap.js
    worm.js
    fx/  pool.js  effects.js   (пул мешей + заранее прогретые материалы)
    hud-projector.js           проекция 3D → 2D без аллокаций и forced layout
    scenes/  base-scene.js  arena.js  camp.js  hero.js  baker.js
  styles/
    base.css lobby.css battle.css battle3d.css map.css popups.css hero.css meta.css celebrate.css conquest.css landscape.css splash.css
assets/
  models/duncan.glb  worm.glb        (meshopt + KTX2)
  tex/*.ktx2                         (при необходимости вынесенные отдельно)
  env/desert.env                     (Babylon prefiltered)
  anim/mocap.bin                     (Int16, как сейчас, но бинарно)
  img/worm-ava.webp  worm-badge.webp
  fonts/*.woff2  icons/*.png
tools/                               (текущие dune-tools + build.mjs, export-assets.py)
tests/
  golden/battles.test.mjs            детерминированные бои по seed
  smoke/cycle.spec.mjs               Playwright: 20 циклов бой→лагерь, счётчики
```

**Правило зависимостей (проверяется линтером/скриптом):** `data ← logic ← ui`, `data ← render3d`, `ui → render3d` только через фасад `render3d/index.js` (`showCamp`, `showHero`, `startArena`, `syncArena`, `stopArena`). `logic/*` не импортирует `ui/*`, `render*/*`, `document`, `BABYLON`.

### Соответствие текущих строк модулям

| Строки сейчас | Модуль |
|---|---|
| 16–1359 | `styles/*.css` (по комментариям-маркерам) |
| 1360–1385 | `index.html` (каркас) |
| 1388–1638 | `data/fx.js`, `data/chars.js` |
| 1639–2040 | `logic/battle/*` |
| 2041–2469 | `data/looks.js`, `render2d/figures.js`, `render2d/thumbs.js` |
| 2470–2568 | `render2d/scene-bg.js`, `render2d/fx-layer.js` |
| 2570–2794 | `render3d/geometry.js`, `materials.js`, `env/*` |
| 2796–3175 | `render3d/characters/*`, `render3d/worm.js` |
| 3177–3548 | `render3d/scenes/arena.js`, `fx/*`, `hud-projector.js` |
| 3550–3733 | `render3d/characters/pose-duncan.js`, `mocap.js` + `assets/anim/mocap.bin` |
| 3735–3927 | `render3d/scenes/{base-scene,hero,camp}.js` + `assets/env/desert.env` |
| 3929–4008 | `render3d/scenes/baker.js`, `core/errlog.js` (детектор крэша) |
| 4010–4012 | `assets/models/*.glb`, `assets/img/*.webp` |
| 4014–4365 | `data/story.js`, `data/campaigns.js`, `data/glyphs.js` |
| 4368–4495 | `data/journeys.js`, `data/items.js`, `logic/gear.js`, `logic/relics.js` |
| 4496–4547 | `core/save.js` |
| 4548–4616 | `core/timers.js`, `core/dom.js`, `core/errlog.js`, `ui/router.js` |
| 4617–5444 | `ui/views/*`, `ui/overlays/*` |
| 5465–5807 | `ui/battle/*` |
| 5808–6015 | `ui/*` (события), `main.js` (start) |
| 6016–6589 | `ui/overlays/*`, `logic/feats.js`, `logic/account.js` |
| 6590–7066 | `data/conquest-data.js`, `logic/conquest.js`, `ui/views/conq.js` |
| 7067–7113 | `main.js`, `ui/gestures.js`, регистрация SW |

---

## 3. Модульная архитектура Babylon.js

### 3.1 Сборка Babylon
- Перейти с UMD на `@babylonjs/core@9.30.0` (та же версия — никакой смены поведения) с точечными импортами + обязательными side-effect-импортами: `ShadowGeneratorSceneComponent`, `effectLayerSceneComponent` (GlowLayer), `postProcessRenderPipelineManagerSceneComponent`, `prePassRendererSceneComponent`/`geometryBufferRendererSceneComponent` (SSAO2 на HIGH), шейдеры PBR/Standard/частиц, `@babylonjs/loaders/glTF/2.0` + `KHR_texture_basisu` и `EXT_meshopt_compression`.
- esbuild: отдельный чанк `babylon.[hash].js`, грузится **динамическим `import()`** при первом 3D-экране; лобби до этого показывает существующий `SceneBG` (2D-фоллбек уже есть, 5440).
- Ожидаемый размер — порядка 1,5–2,5 МБ min (оценка, измерить после сборки) против 8,57 МБ.
- Для артефакта: сохранить загрузку с jsdelivr (`babylonjs@9.30.0`) как опцию сборки `--target=artifact`, если модульная сборка не помещается в ограничения артефакта.

### 3.2 Один движок — менеджер сцен (`engine-host.js`)
```
EngineHost
  engine                       создаётся один раз; loseContextOnDispose: true; antialias: false (сглаживание — FXAA в пайплайне)
  canvas                       один; переносится в DOM-хост активного экрана (как уже делают Stage3D.attach)
  scenes: Map<name, GameScene> camp | hero | arena | baker
  show(name, host, params)     предыдущая сцена → sleep(); новая → wake()
  dispose()                    только при `webglcontextlost`/выходе
```
**Контракт `GameScene` (`base-scene.js`):**
```
create(ctx)   строит граф один раз (геометрия, материалы, свет)
wake(host)    создаёт пост-обработку под профиль, запускает режим кадров
update(now, dt)  логика кадра без аллокаций
sleep()       стоп рендера + dispose пайплайна/SSAO/Glow (освобождение RT), граф остаётся
dispose()     полное уничтожение (арена — после каждого боя; лагерь/герой — только на LOW или при нехватке памяти)
```
Окно героя поверх лагеря: лагерь `sleep()` (как сейчас «пауза»), герой `wake()`. Вариант с двумя видимыми канвасами одновременно — `engine.registerView()` (есть в 9.30), но для текущего UI достаточно переключения.

Эффект: всегда **один** WebGL-контекст → проблемы L1/L2/L4/L12 из аудита исчезают по построению.

### 3.3 Явный контекст вместо глобалов
`mat3(c, o)` → `materials.lit(ctx, c, o)`; `mk(mesh, mat, …)` → `place(ctx, mesh, mat, …)`; `makeHuman3(def)` → `buildHero(ctx, def)`. `ctx = { scene, shadows, pbr, quality, assets }`. Убирает латентную утечку L7 и ошибки «меш создан не в той сцене».

### 3.4 `AssetCache` на движок
- Текстуры: ключ = URL/имя; Дункан загружается один раз на движок, повторные экземпляры (лагерь + бой + герой) делят текстуры.
- Шаблоны процедурных героев: `makeHuman3` сейчас при каждом создании строит десятки примитивов и сливает их (`mergeRig` 2815). Кэшировать результат слияния как `VertexData` по `def.id` и инстанцировать клонированием — визуально идентично, CPU на старте боя в разы меньше.
- Материалы: кэш по ключу `(цвет, roughness, metalness, emissive, side, pbr)`; FX-материалы — пул.
- Glow-текстура: одна `DynamicTexture` на движок вместо 10–15 копий.

### 3.5 Планировщик кадров (`scheduler.js`)
| Режим | Когда | FPS |
|---|---|---|
| ACTIVE | анимация действия, синематик, призыв червя, драг героя | 60 |
| IDLE | ожидание ввода, лагерь, окно героя без взаимодействия | 30 (рендер через кадр) |
| STATIC | экран результатов, попап поверх боя, диалог | 1 кадр по изменению |
| PAUSED | сцена скрыта / `document.hidden` | 0 |
Переходы — по событиям из `ui/battle` (`act start/end`, `waiting`, `finish`), а не опросом DOM каждый кадр.

### 3.6 Профили качества (`quality.js`) — «без потери качества» за счёт замен
| Параметр | LOW | MED (телефон по умолчанию) | HIGH (десктоп/iPad Pro) | Чем компенсируется |
|---|---|---|---|---|
| DPR | 1 | ≤1,5 | ≤2 | FXAA + sharpen |
| Пайплайн | LDR, FXAA, виньетка | LDR, FXAA, bloom ½, ACES, виньетка, статичное зерно | HDR, всё + MSAA 4 | — |
| SSAO2 | нет | нет | да | запечённый AO в вершинных цветах окружения/моделях |
| DoF | нет | только в синематике ульты | всегда | — |
| GlowLayer | нет | да, 0,35, kernel 16 | да | bloom на MED отключить, если включён Glow (не оба) |
| Тени | 512, только герои, refresh/2 | 1024 PCF, только герои | 2048 PCF | статичная тень пропсов запечена в землю; блоб-тени под героями на LOW |
| Тень костра (лагерь) | нет | нет | 512, 1 обновление/3 кадра | мерцание света сохраняется, тень — блоб |
| PCSS в окне героя | нет | PCF medium | PCSS | — |
| Источников на шейдер | 2 | 4 | 8 | эмиссив + glow вместо точечных ламп |
| PBR sheen/translucency | нет | translucency только `skin` | всё | — |
| Частицы | ×0,25 | ×0,4 (GPU на WebGL2) | ×1 | — |
| Текстуры моделей | 512 | 512/1024 (mip-skip KTX2) | 1024 | — |
**Адаптивность:** в первые 3 с каждой сцены мерить медианное время кадра; если > 22 мс на MED — понизить на ступень (и запомнить в `localStorage`, как уже делает детектор крэша 4006).

### 3.7 Пул FX и прогрев шейдеров
`fx/pool.js`: заранее созданные меши (тор, трубка, сфера, диск, бокс) × N, материал на тип; `fade()` берёт из пула и возвращает. При `wake()` арены — `forceCompilation` для всех FX-материалов и частиц (включая дым). Убирает поток create/dispose (L9) и фризы компиляции (H10).

### 3.8 HUD-проектор без forced layout
`hud-projector.js`: кэш `uid → element`; прямоугольники поля/канваса — только на `resize`; `Vector3.ProjectToRef` с переиспользуемыми `Vector3`/`Viewport`; запись `transform: translate3d(x, y, 0)` (композитинг без layout); `--fh/--w` — только при изменении > 1 px. Используется и в бою, и в лагере.

---

## 4. Оптимизация кода (без изменения логики)

1. **Горячие циклы без аллокаций:** предвычисленные `Color3`-константы для колец/пулов (3477–3479), `LerpToRef`, `copyFrom`, временные векторы на модуль; очереди `fxq/tr/summons` — удаление на месте/кольцевой буфер.
2. **`poseHuman`/`poseDuncan`:** `o.base.clone()` → переиспользуемый `o._pos`; кэш `STANCE`, `remapK` как есть. Поведение идентично.
3. **`renderBattle` (5687):** разделить на `renderBattleShell()` (один раз за бой) и `updateBattleHud(diff)` (полоски, кулдауны, порядок ходов, плавающие числа). Строки разметки — те же.
4. **Меню:** `renderRes` раз в секунду → обновление только текста изменившихся счётчиков; опрос 400 мс (3927) → явные вызовы при закрытии оверлеев.
5. **Сохранение:** `persist()` — дебаунс 250 мс + запись на `pagehide/visibilitychange`; формат и ключ без изменений.
6. **`errLog`:** троттлинг повторов (см. аудит, шаг 13).
7. **CSS:** анимации только `transform/opacity`; `box-shadow`-пульсации → псевдоэлемент с `opacity`; `will-change: transform` у `.unit` в 3D-бою; анимация `--ga` только у видимых карточек.
8. **2D-фон `SceneBG`:** кэшировать градиенты, `reduceMotion` — один `MediaQueryList` с подпиской на `change`.
9. **Ленивые модули UI:** `conq`, `trials`, `feats`, `profile` — динамический `import()` при первом открытии (−время старта, без изменения поведения).

---

## 5. Оптимизация ассетов (игровая логика не затрагивается)

| Ассет | Сейчас | Цель | Инструмент | Ожидаемый эффект (оценка) |
|---|---|---|---|---|
| Дункан, геометрия | base64 Int16/Int8 в `MODEL_DATA` (8 частей, ~28 тыс. вершин) | `duncan.glb` + `EXT_meshopt_compression`; 8 материалов → атлас 2–3 материала | Blender-экспорт (`mh_duncan_bake.py` уже пишет .glb), `gltfpack` | −draw calls 8→3, файл −50–70% |
| Дункан, текстуры | 22 JPEG (8×1024², 11×512², 3×256²) → в GPU RGBA ~60 МБ | KTX2: альбедо ETC1S, нормали UASTC, ORM ETC1S; mip-skip для 512 на MED | `toktx`/`basisu` | VRAM ×4–6 меньше (~10–15 МБ) |
| Червь | base64 в `MODEL_DATA.worm` + JPEG 512×1024/256×512 | `worm.glb` (meshopt) + KTX2 | `gltfpack` | — |
| `ENV_HDR` | RLE .hdr 256×128 base64 (175 КБ), префильтрация на старте | `desert.env` (Babylon prefiltered) | `EnvironmentTextureTools` в Node/браузере | без GPU-префильтрации на старте |
| `MOCAP` | JSON + base64 Int16 (108 КБ) | `mocap.bin` + JSON-заголовок | `mixamo_clips.py` (вывод в бинарь) | парсинг ×5 быстрее |
| `WORM_IMG` | PNG base64 (91 КБ) | `.webp` файлы | `cwebp` | −60% |
| Иконки PWA | `icon-512.png` 188 КБ, `maskable-512.png` 150 КБ | оптимизированные PNG | `oxipng`/`pngquant` | −50–70% |
| Шрифты | 12 woff2 (~190 КБ) | как есть + `preload` двух основных, `font-display: swap` | — | быстрее первый текст |
| Запечённые портреты | PNG 256×452 + 192² в IndexedDB, все blob-URL в памяти | один атлас на ростер или меньший `full`; JPEG там, где нет альфы | `Baker` на общем движке | −память декода |
| Процедурные герои | строятся из примитивов при каждом создании | кэш слитой геометрии по `def.id` (§3.4) | — | −CPU на старте боя |
| Земля | 170 подразбиений (58 тыс. треугольников) | 96–120 + LOD дальних колец | — | −вершинная нагрузка ×2–3 |

**Service Worker:** разделить кэш на «оболочку» (index, app.js, css, шрифты) и «ассеты» (glb/ktx2/env — cache-first по требованию, с хэшами в именах). Версия кэша — по хэшам файлов (сейчас — общий SHA, `build_pwa.py`), чтобы правка UI не заставляла перекачивать модели.

**Конвейер:** `tools/export-assets.py` (Blender → glb + KTX2) встраивается рядом с `mh_duncan_bake.py`; `embed_model.py` остаётся только для сборки артефакта в режиме «всё в одном файле».

---

## 6. Как гарантировать, что логика не изменилась

1. **Golden-тесты боёв (`tests/golden`):** до начала фазы 2 снять эталон — для 200 seed’ов (`createBattle(..., { seed })`, 1639) прогнать бой с ИИ за обе стороны в Node и сохранить итог (победитель, раунды, HP, журнал). После переноса в `logic/battle/*` — побайтовое сравнение.
2. **Снимки меты:** функции наград/экономики (`campReward`, `raidFrags`, `lvlCost`, `CRAFT`, Джихад) — табличные тесты на фиксированных входах.
3. **Совместимость сохранений:** загрузить 3–5 реальных сохранений (экспорт уже есть, 6291) старой и новой сборкой, сравнить `JSON` после `fillSave`.
4. **DOM-снимки экранов:** Playwright проходит по всем `view` и оверлеям, сравнивает `innerHTML` (без 3D-канвасов) старой и новой сборки.
5. **Перф-регрессия:** `tests/smoke/cycle.spec.mjs` — 20 циклов бой→лагерь: число живых контекстов ≤ 1, `scene.textures/meshes` вернулись к исходным значениям, нет роста кучи (> 5% за цикл). На iPhone — ручной прогон по чек-листу с Web Inspector.

---

## 7. Дорожная карта

| Фаза | Содержание | Зависимости | Критерий готовности |
|---|---|---|---|
| **0. База** | Debug-оверлей, golden-эталоны (§6.1), замеры на iPhone: FPS, VRAM (оценка по RT/текстурам), число контекстов, время старта | — | Таблица базовых метрик в `dune-tools/PERF_BASELINE.md` |
| **1. Быстрые исправления** | Шаги 1, 3, 5, 6, 8, 9, 13 из аудита — точечно в текущем монолите | 0 | 20 циклов без крэша на iPhone; простой боя ≤ 30 fps; нет forced layout |
| **2. Сборка и разрезание** | `src/` + esbuild; механический перенос по таблице §2; глобалы → импорты; CSS по файлам; выход: PWA (много файлов) и артефакт (один HTML или multi-file) | 0 | golden-тесты и DOM-снимки совпадают; `build_pwa.py` заменён на `build.mjs` |
| **3. Ядро 3D** | `EngineHost` (1 движок), `GameScene`-контракт, `ctx` вместо `SC/SHG/PBR_ON`, `AssetCache`, планировщик кадров, пул FX + прогрев | 2 | всегда 1 WebGL-контекст; нет компиляций шейдеров в бою после `wake()` |
| **4. Babylon modular** | `@babylonjs/core` с tree-shaking, ленивый чанк | 2 | бандл Babylon ≤ 2,5 МБ; лобби интерактивно до загрузки 3D |
| **5. Ассеты** | glb + KTX2 для Дункана и червя, `.env`, `mocap.bin`, webp, SW с раздельным кэшем | 3 | VRAM Дункана ≤ 15 МБ; `index.html` < 200 КБ |
| **6. Качество** | Профили LOW/MED/HIGH, адаптивное понижение, запечённый AO/тени пропсов вместо SSAO/динамики | 3, 5 | A/B-скриншоты утверждены; время кадра GPU на MED −40% против базы |
| **7. UI/DOM** | HUD боя точечными апдейтами, CSS-анимации transform/opacity, ленивые модули меты | 2 | 0 layout/кадр в простое; paint в ростере −50% |

Фазы 1 и 2 можно вести параллельно (фаза 1 — в текущем монолите для ближайшего релиза), остальные — последовательно.

---

## 8. Риски

| Риск | Митигация |
|---|---|
| Разрезание монолита ломает порядок инициализации (сейчас скрипты полагаются на глобальный hoisting и `typeof X !== 'undefined'`) | Перенос в 2 прохода: сначала «как есть» в один модуль с экспортами, затем дробление; golden + DOM-снимки после каждого шага |
| Tree-shaking Babylon теряет side-effect-компоненты (тени/glow «молча» не работают) | Явный список side-effect-импортов в `render3d/babylon.js` + смоук-тест каждой сцены по скриншоту |
| KTX2 требует transcoder (wasm) — ещё файлы в SW и CSP артефакта | Для PWA — кэшировать transcoder; для артефакта — fallback на JPEG ≤ 512 |
| Ограничения артефакта claude.ai (размер/внешние скрипты) | Режим сборки `--target=artifact`: всё инлайном или multi-file артефакт; Babylon с jsdelivr, как сейчас |
| Визуальные отличия при замене SSAO/теней на запечённые | Профиль HIGH сохраняет текущий вид; MED утверждается по A/B-скриншотам (по правилам проекта — макет на согласование) |
| Один движок: переход лагерь ↔ бой должен быть быстрым | Лагерь — `sleep()` вместо `dispose()`, арена — пул/кэш шаблонов; бюджет перехода ≤ 400 мс |
