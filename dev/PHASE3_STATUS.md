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

## Что осталось вне фазы 3
- `core/format` (`amt`, `ic`) — HTML-форматтеры в core; разрешены как общие, кандидат в `ui/format` при UI-рефакторинге (фаза 7).
- `core/boot` импортирует ui — оркестрация старта, кандидат в `main.js`.
- Ассеты в JS-модулях — фаза 5.
