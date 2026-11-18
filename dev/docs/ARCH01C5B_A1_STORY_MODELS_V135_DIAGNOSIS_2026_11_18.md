# ARCH-01C5b-A1 — последняя граница data/story → assets/models (v135)
**18 ноября 2026 · Стадия A1: диагностическая, БЕЗ реализации / merge / публикации.**

## Точная исходная точка
- Главная ветка перед диагностикой: `372d915fdd7f7b06fa5c3b23ce97b3a74dcf6753`; [v135 опубликована](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44265048618), [новый публичный root Pages подтверждён](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44266584134). v135 одноразовый guard удалён [PR #183](https://github.com/mryandexxx-spec/Dgoh-game/pull/183).
- По проверенному исходнику: 173 JS / 1000 статических ESM imports / 0 динамических / SCC [105,6], 167 точных маркеров и 898 экспортов. Последняя запрещённая связь в [AST ledger](../tools/arch-import-baseline.json): **`data/story.js → assets/models.js`**, ровно одна. `STORY` и `BIOS` — единственные exports из Story; импорт моделей не использует binding, но сохраняет ESM-порядок исполнения.
- `assets/models.js` до своего тела импортирует `render3d/scenes/baker.js`, а тот — `render3d/scenes/camp.js`; `camp.js` и `baker.js` уже имеют named `models` импорты. `models.js` один раз выполняет top-level `b3Pre(loadAssets3)`. `loadB3()` использует реальный список `B3_PRE`, затем WebGL/Babylon; нарушение порядка создаёт риск ранней TDZ, пропуска модели, зависания/лишней загрузки и отличия warm Safari. Механическое удаление запрещено.
- Историческое [исследование C2d / Draft #144](https://github.com/mryandexxx-spec/Dgoh-game/pull/144) относилось к v127: **0/39 точных совпадений**, remove-only переставлял 81 модуль, лучший `render2d/figures` — 77; это **не** результат проверки v135. [Исходная диагностика C2d](https://github.com/mryandexxx-spec/Dgoh-game/blob/audit/arch01c2d-story-models-order-probe/dev/docs/ARCH01C2D_STORY_MODELS_ORDER_DIAGNOSIS_2026_11_17.md) сохранена как исторический NO-GO.

## Что проверяет текущая A1
- Новый read-only `tests/ci/arch01c5b-a1-story-models-virtual.mjs`, импортируемый прежним `tests/ci/arch-init-graph.mjs` из обязательного CI build. Без изменений `dev/src/**`, `SPLIT`, baseline, golden, version, release root, лагерь и 3D.
- Fail-closed control: `SPLIT` равен независимому `tests/ci/arch01c5a-b1-approved-order.json` (167 имен), реальная esbuild сборка v135 строго совпадает со всеми 167; реальный AST 173/1000/[105,6]/0 unresolved, в baseline ровно Story→models; top-level `b3Pre(loadAssets3)` на месте.
- **В памяти** esbuild `format:esm`, `treeShaking:false` проверяет removal-only, прежние 19 не-data owner-кандидатов × first/after, и 8 новых UI-владельцев (`celebrate`, `info`, `hero-window`, `notifications`, `hero-card`, `reward-tiles`, `profile`, `detail`) × first/after; дополнительно позицию непосредственно **перед существующим named import Story** у UI-владельца, если таковой есть. Итог: **минимум 55 независимых кандидатов** включая remove-only.
- Каждая строка CI сообщает `exact`, `moved`, `relativeInversions`, `missing`, `extra`, индекс первого изменения и имена. В конце — сводка exact/minMoved/best. Чистый результат матрицы **не делает** граф реального приложения безопасным; это только необходимая статическая проверка.
- `render2d→assets` запрещён действующими правилами; даже exact вариант на этом владельце НЕ GO. Переписывать защищённый `render3d/scenes/camp.js` нельзя. Прямой `data/story→models` НЕ заменять скрытым импортом через другой data-файл. Никаких функций живого code path не менять в A1.

## Гипотезы следующей A2 (пока не утверждены)
1. Уточнить **первый фактический ESM path**, по которому story достигается через `data/campaigns.js` и UI; определить допустимого владельца asset bootstrap *вне data* раньше первого чтения STORY.
2. Показать, возможна ли композиция `models` до Story без обратного ребра в реальном SCC [105,6], либо нужен контролируемый явно согласованный новый ESM order (как для v135). Не разрешать перестановку автоматически и не менять SPLIT «для зелёного CI».
3. Независимо испытать раннюю регистрацию `b3Pre(loadAssets3)`, all 5 actual DGM/KTX2 и 1 EngineHost; Safari/iPhone cold/warm splash, 844×390/667×375, PWA offline/standalone — отдельное поле приёмки. До этих доказательств **source implementation NO-GO**.

## Условия допуска к будущему B1 (отдельная команда владельца)
Удалён ровно `data/story.js→assets/models.js`, ledger 1→0 / 0 new / 0 stale; строго валидные SCC, 167 ESM/898 имен/side effects; `STORY/BIOS`, 210 Campaign `NODES` SHA-256, 200 battle golden, 4 saves/41 screens, Conquest CELEB/NOTES, update/offline и WebGL MED/LOW/HIGH, 3 EngineHost lifecycle cycles — без регрессий. Лагерь UI/сцены/3D/стили/зоны не трогать. Никаких обновлений golden и source, без отдельного разрешения на миграцию ESM-порядка. После baseline 0 отдельный ARCH-01D PR делает `check-deps --strict` обязательным gate.

## Фактическая матрица A1 на v135 — VERIFIED

Реально выполнена на исходниках Draft [PR #184](https://github.com/mryandexxx-spec/Dgoh-game/pull/184) при HEAD `d9b8b3e3d677323fe38c1e08f88b1c05af94030e`: [**full CI #44271042329 COMPLETED SUCCESS / attempt 1 / 19 обязательных SUCCESS + final gate SUCCESS**](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44271042329); `Publish verified PWA` **SKIPPED**. `dune-validated-build` artifact ID **14412302408**, digest `sha256:933e5a93c874649e8763a646cc7de87bbcd11c3c4054eb97468576290c9bfed1`. Не запускался никакой release.

- **57 / 57 реальных in-memory esbuild проб обработаны; exact ESM-order = 0 / 57, допустимых exact = 0**. Все сценарии сохранили набор 167 модулей: `missing=[]`, `extra=[]` для наблюдаемых кандидатов. Старый v127 0/39 — отдельное историческое исследование, не подмена нынешней проверки.
- **remove-only:** перемещены **62 из 167** старых ESM-позиций, первое различие (0-based) **#20**: `data/looks.js → data/story.js`, `relativeInversions=2`. Это строго **NO-GO** для текущего frozen `SPLIT`.
- **Минимум по математическому числу перестановок: 58** у `render2d/figures.js:first/after`, но новый `render2d→assets/models.js` нарушает `ARCHITECTURE.md` и не может быть реализацией; лагерь не трогать.
- **Лучший проверенный UI-owner: `ui/router.js:first/after` — 59 переставленных маркеров**, first #20, `relativeInversions=2/1`. Это тоже НЕ GO для B1, поскольку нет контракта нового реального ESM-порядка и runtime proof. Добавленные UI Story-owner кандидаты не сохранили exact.
- **AST граф фактической v135:** **173 JS / 1000 imports / 0 dynamic / 0 unresolved / две SCC [105,6]**, сохранён ровно один forbidden `data/story.js→assets/models.js`. `STORY/BIOS`, `models` / `baker` / `camp` import graph и единственная top-level регистрация `b3Pre(loadAssets3)` подтверждены. Прямые импортеры `story.js`: `data/campaigns.js`, `ui/overlays/celebrate.js`, `ui/overlays/info.js`. Прямые импортеры `models.js`: `data/story.js`, `render3d/characters/authored.js`, `render3d/scenes/baker.js`, `render3d/scenes/camp.js`, `render3d/worm.js`, `ui/hero-window.js`, `ui/overlays/profile.js`.
- Все golden battles/meta/saves/41 screens, 210 Campaign, E3 UI, PWA/standalone/offline, Arena WebGL MED/LOW, Camp budgets, 3D EngineHost phone/desktop прошли полный PR CI. Это подтверждает **безопасность диагностических тестов**, но **НЕ runtime-безопасность ни одного виртуального варианта**.

### Решение A1 и входные условия A2

**NO-GO для тривиального переноса/удаления одного импорта.** Факт: текущая v135 менее чувствительна к прямому удалению, чем v127 (62 против 81 moved), однако 62 перестановки всё равно не эквивалентны исходному ESM-порядку. Не придумывать «0 debt», не менять `SPLIT`/ledger/golden и не обходить layering. v135 остаётся опубликованной и безопасной, долговое ребро остаётся **1**.

**Рекомендуемый следующий этап ARCH-01C5b-A2 — явный non-data 3D asset bootstrap / SCC & runtime proof:**
1. Доказать самый ранний **реальный** `main→…→data/campaigns→story` import/evaluation path и время `b3Pre(loadAssets3)`; измерять настоящий порядок hook и `set_S/start` (не только 167 имен).
2. Спроектировать **явный owner** в разрешённом `ui`/composition-root и минимальный строго определённый set перемещений. Виртуальный `ui/router` — лишь кандидат. Если неизменность всех 167 ESM-позиций невозможна, оформить **отдельное архитектурное решение владельца** с frozen old/new orders и точными последствиями; по умолчанию **NO-GO**.
3. До любых реальных исходников выполнить isolated virtual 3D/PWA cold/warm browser proof: регистрация `b3Pre` до `loadB3`, реально декодированные DGM/KTX2, 1 EngineHost, тройной wake/sleep/dispose, cold/warm 844×390/667×375, 210 Campaign, Story dialogues, CELEB/NOTES, offline/standalone. Контролировать исторические TDZ и early warm splash отличия.
4. Не менять защищённый `render3d/scenes/camp.js`, экономику, логику, сейвы, golden и production root. Физический iPhone Safari остаётся OPEN. B1 реализация, merge и release только по отдельным согласованиям.

**Итог:** задача A1 завершена как **реальная диагностическая проверка**, а не как удаление импорта; изменение игрового кода **0**. Следующее действие — A2 исследование явного bootstrap, не B1 удаление «на удачу». [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132) — учёт всей цепочки.
