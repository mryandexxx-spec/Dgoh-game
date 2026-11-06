# Фаза 3 — статус (REFACTOR_PLAN §3, §7)

Фаза разделена: **3a — слои** (механически, под golden) и **3b — ядро 3D** (EngineHost, GameScene, ctx, AssetCache, планировщик, пул FX) — отдельной сессией.

## 3a — готово (2026-11-06)
Эталоны не переснимались: battles / meta / saves / screens совпадают на артефакте и PWA. `check-deps` — нарушений нет, `check-bundle` — порядок OK (91 модуль).

| Шаг | Что сделано |
|---|---|
| 1. `core/util` | переименован в `logic/progress` (энергия, прогресс, требования узлов, `prog`, `unlockedIds`, мощь); выделены `core/dom` (`$`, `LAND_MQ`, `isLandPhone`), `core/rng` (`sRng`), `logic/daily` (`DAILY`, `CHEST_*`, `dly`, `quest`, `qState`, `dailyGot`, `dailyReady`); `starStr`, `glyph` → `ui/common`. `core/save` больше не импортирует ui: `notePoll` подписывается через `onPersist` |
| 2. HTML из logic/data | `cqRwHtml`, `cqBadge`, `cqRarTag`, `cqDiskCard`, `cqI` → `ui/views/conq`; `thumb`, `skillSvg`, `itemIcon` → `ui/common`; `fragLines` → `ui/rewards`. SVG-контуры (`CQ_ICON`, `GLYPHS`, `ITEM_SVG`, эмблемы) остаются данными |
| 3. Награды | новый `logic/rewards`: `addRes`, `RING_RATE`, `grantShards`, `applyRewards(list)` → записи, `accGain(n)` → уровни; UI-эффекты через `rewardHooks.unlock` / `.shardConv` (регистрирует `ui/overlays/squad-select`, вызов в тот же момент, что в монолите). `ui/rewards`: `giveRewards`/`accXP` — те же имена и строки, только форматирование |

**check-deps расширен:** HTML-разметка в `logic/` и `data/` (контуры SVG разрешены); импорты `core/* → ui/*` (исключение — `core/boot`, оркестрация старта).

Цепочка порядка: `core/state → logic/daily → core/dom → core/rng → logic/progress → logic/rewards → core/errlog → …` (все добавлены в `tools/split.config.mjs` с номером строки `core/util`).

**Замечание:** golden `--no-dom` не ловит пропавший импорт в UI-модулях (так был пойман пропавший `$` в `ui/rewards`) — `check-bundle` после каждого шага обязателен.

## 3b — план (согласован 2026-11-06)
1. 3D-смоук `tests/smoke/3d.mjs` (`puppeteer-core` + системный Chrome/SwiftShader): цикл лагерь → герой → бой → выход ×N; живые WebGL-контексты, meshes/textures/materials, компиляции эффектов после `wake()`, ошибки консоли, скриншоты лагеря/арены. База — до любых правок.
2. ctx вместо `SC/SHG/PBR_ON`: `render3d/ctx.js` с `withCtx({scene, shadows, pbr}, fn)` (автовосстановление, запрет async внутри); ctx параметром только у фабрик (`buildEnv`, `makeHuman3`, `makeWorm3`, `dynTex`). Полное протаскивание в `mat3/mk` — фаза 6.
3. EngineHost: один Engine (`antialias:false` — сглаживание делает пайплайн MSAA×4 + FXAA; `alpha:true`, непрозрачные сцены — clearColor α=1; проверка попиксельным A/B), канвас переносится между хостами; Baker — RenderTarget + `readPixels`; обработчик `webglcontextlost`.
4. GameScene: create/wake/update/sleep/dispose (лагерь — sleep, арена — dispose после боя).
5. AssetCache (сначала аудит мутаций материалов), 6. планировщик кадров (A/B), 7. пул FX + `forceCompilation`.

`--update`: battles/meta/saves — не ожидается; screens — только если изменится разметка 3D-хостов (шаг 3), с согласия.

## 3b — шаги 1–3 готовы (2026-11-06)
Эталоны не переснимались: battles / meta / saves / screens совпадают на артефакте и PWA. `check-deps` чисто, `check-bundle` OK (93 модуля).

| Шаг | Что сделано |
|---|---|
| 1. 3D-смоук | `tests/smoke/3d.mjs` (`puppeteer-core`, системный Chrome + SwiftShader): лагерь → герой → бой → выход ×N; контексты, meshes/textures/materials (без сцены Baker), линковки шейдеров после wake, время входа/выхода, ошибки консоли, `--phone`, `--strict`. База до правок — `tests/smoke/base/` (desktop + phone, json + png). `tests/smoke/ab.mjs` — A/B двух сборок на виртуальных часах + попиксельный diff |
| 2. ctx | `render3d/ctx.js`: `CTX` + `withCtx(c, fn)` (поля undefined наследуются, откат и при исключении, Promise внутри — ошибка). Глобалы `SC/SHG/PBR_ON` и сеттеры удалены. Фабрики: `buildEnv(A, key, day, ctx)`, `makeHuman3(def, ctx)`, `makeWorm3(ctx)`, `dynTex(cv, rep, alpha, ctx)`; `makeModel3` в своём кадре withCtx (раньше при исключении оставлял SHG = null). FX-методы арены, которые не сбрасывали SC, теперь в кадре |
| 3. EngineHost | `render3d/engine-host.js`: один Engine (`antialias:false`, `alpha:true`, premultipliedAlpha:false), один канвас, стек владельцев (`mount/release/forget`), хост отпал из DOM → `onDetach`, рисуется предыдущий; один render loop (`hostKick` вместо сторожа в camp.js). `webglcontextlost` → всем владельцам `contextLost()/dispose()`, следующий `engineHost()` создаёт новый движок. Stage3D/Arena3D/Baker без своих движков; Baker — RenderTarget (MSAA×4) + `readPixels` → 2D-канвас → PNG |

Смоук (desktop, 3 цикла): контекстов 4 → **1**; meshes/textures/materials 211/55/120 без роста; ошибок нет; вход в бой на SwiftShader 11–13 с → 6–7 с. Компиляции после wake: 0–1 за цикл (шаги 5, 7). 400 мс на SwiftShader не измерить — проверять на устройстве.
A/B (база v48 ↔ 3b): портрет Baker 0 % отличий; лагерь 1,8 %, герой 6,9 %, арена 2,3 % — зерно, пламя, CSS-анимации интерфейса; рёбер (сглаживание) и просвечивания (alpha) нет. `antialias:false` оставлен.

**Осталось:** ~~4. GameScene~~ (готово, см. ниже) (create/wake/update/sleep/dispose; лагерь — sleep, арена — dispose); 5. AssetCache (сначала аудит мутаций материалов); 6. планировщик кадров (A/B); 7. пул FX + `forceCompilation`. Смоук на 20 циклов — после шага 5 (~1,5 мин/цикл на SwiftShader).

## 3b — шаг 4 готов (2026-11-06)
Эталоны не переснимались (golden `--no-dom` совпадает), `check-deps` чисто, `check-bundle` OK (94 модуля).

- `render3d/game-scene.js` — контракт `GameScene`: create (конструктор) → `wake(host, o)` → `update(now)` → `sleep(o)` → `dispose()`; состояния created/awake/asleep/disposed. EngineHost — параметром конструктора (модуль в цепочке после `ctx.js`, раньше `engine-host.js`). Хост отпал из DOM → `onDetach` → `sleep`.
- `Stage3D` (лагерь, окно героя) и `Arena3D` — подклассы. Арена: канвас ставится в хост до построения (`place`, раскладка рейда меряет его), `wake` в конце конструктора; после боя и при отпадении хоста — `dispose`.
- `freeStages` удалён → `sleepStages()` перед боем (и на телефоне). На телефоне сон «лёгкий»: освобождаются пайплайн (MSAA), SSAO, glow, на `wake` — пересоздаются (`look` с сохранёнными параметрами). Обычное закрытие окна героя — простой сон.

Смоук, 3 цикла: контекстов 1; desktop meshes/textures/materials 211/55/120, phone 211/47/120 — без роста; вход в бой desktop 4,1–4,7 с, phone 2,1–2,3 с (после шага 3 — 6–7 с); выход в лагерь на phone 1,7–1,9 → 2,6 с (пересоздание пайплайна после лёгкого сна — прогрев в шаге 7). Компиляции после wake 0–1 (шаги 5, 7). Ошибка `ERR_FAILED` в смоуке `artifact.html` — Google Fonts (смоук режет внешние запросы), не регресс.

## 3b — шаг 5: аудит мутаций материалов (согласовано 2026-11-06)
- Вспышки удара/лечения, стелс (`o.mats`: `emissiveColor` от `_baseEm`, `alpha`), фазы босса → кэш хранит шаблоны, экземпляр получает `clone()` (вариант А).
- Кольца/лужи (`_emOwn`), временные FX (`fade` → `alpha`), кольцо подиума героя, червь (`_baseEm`) — материалы остаются собственными.
- Легендарный emissive одежды детерминирован по `def.id` — кэшируется.
- glow-текстура: 9 вызовов `dynTex(glowCanvas())` → одна на сцену. Текстуры Дункана — сначала замер (кэш Babylon по URL), затем явный кэш.
- Геометрия: слитые VertexData по `def.id` — на CPU, общий; материалы/текстуры — кэш в пределах сцены.

## 3b — шаг 5: сделано (2026-11-06)
- **Утечка GPU-памяти** (найдена новой метрикой смоука `gpu` — `engine.getLoadedTexturesCache()`, разбивка по видам): `scene.dispose()` арены не освобождал буферы SSAO2 — MRT геометрии 2×экран, depth, raw; +3–4 GPU-текстуры на каждый бой (была и до 3b). `GameScene.dispose` теперь вызывает `ssao.dispose(true)` + `disableGeometryBufferRenderer()`. Desktop 4 цикла: gpu 93–94 стабильно (было 93→96→100); phone 64–65.
- **glow-текстура:** `glowTex(ctx)` в `geometry.js` — одна DynamicTexture на сцену (было по одной на каждую систему частиц, лужу юнита, спрайт). `dispose()` общей текстуры — no-op (её «убивали» бы `mesh.dispose(false, true)` и `ParticleSystem.dispose`), настоящее освобождение — на `scene.onDisposeObservable`. scene.textures: desktop 55 → 51, phone 47 → 43. A/B (шаг 4 ↔ 5): лагерь 1,5 %, герой 0,09 %, арена 1,8 % — шум зерна/пламени; Baker 0 %.
- **Текстуры Дункана:** уже общие на уровне GPU — после шага 3 движок один, Babylon переиспользует внутреннюю текстуру по совпадающему data-URL (по одной копии каждой из 22 карт на лагерь, героя и арену). Явный кэш не нужен.
- **Замер построения героев** (`makeHuman3`, SwiftShader, медиана): процедурный герой 5–20 мс, 27 персонажей — 237 мс; на бой ~10 юнитов ≈ 0,1–0,2 с из 4 с входа. Геометрия авторских моделей уже кэшируется на CPU (`modelData`).
- Смоук: `tests/smoke/3d.mjs` печатает `gpu` (лагерь / в бою) и пишет `gpuKinds` в json.

**На согласовании:** кэш слитой геометрии процедурных героев и кэш материалов — отложить (выигрыш ≤ 0,2 с, а материалы героев всё равно должны быть свои у экземпляра из-за вспышек).

## Что осталось вне фазы 3
- `core/format` (`amt`, `ic`) — HTML-форматтеры в core; разрешены как общие, кандидат в `ui/format` при UI-рефакторинге (фаза 7).
- `core/boot` импортирует ui — оркестрация старта, кандидат в `main.js`.
- Ассеты в JS-модулях — фаза 5.
