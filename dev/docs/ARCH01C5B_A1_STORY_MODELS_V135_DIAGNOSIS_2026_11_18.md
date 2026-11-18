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

## Статус исследования
**A1: диагностическая ветка/Draft PR.** Фактическую матрицу и её CI номера заполнять только после проверенного запуска; не принимать гипотетические результаты за доказательства. Код и опубликованная игра v135 не изменены.
