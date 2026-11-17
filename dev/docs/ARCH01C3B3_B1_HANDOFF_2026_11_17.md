# ARCH-01C3b3 Stage B1 — три живых селектора Джихада в logic

**17.11.2026. Реализация в отдельном Draft PR, не слита, не опубликована.** [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132). Решение владельца после Stage A: «поехали» — разрешено приступить к отдельной реализации, **не считать это разрешением на merge/publish**.

## База

Исходный `main`: `78baa2f9d26e67d3250d7c2850a3e8d4437cc592` (послерелизный PR #160 MERGED, одинарный v131 guard удалён). Последний **реально опубликованный выпуск v131**, root `522f0035126b1d757091e671e18849132b3199ea`, SW `25cfd6ff90`, 188 SHA-256, [official validated publish #44073950763 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44073950763), [independent Pages #44075082409 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44075082409). Физический Safari/iPhone не подтверждён; владелец сообщил, что проблем пока не видит.

Обоснование: [Stage A diagnostic Draft PR #161](https://github.com/mryandexxx-spec/Dgoh-game/pull/161), [CI #44092098260 SUCCESS, 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44092098260). Проверено 8 вариантов настоящего production esbuild in-memory, точный ESM 167/167, SCC 106/9, 898 глобальных имён и отсутствие новых рёбер; **3 варианта VIRTUAL GO** на одновременный перенос трёх селекторов, 5 NO-GO. Stage A PR оставлен Draft и не смешивается с реализацией.

## Минимальная реальная реализация

1. `dev/src/data/conquest-data.js`: удалить единственный именованный импорт `cq` из `logic/conquest.js`; удалить только неизменяемые исходные **тела** `cqK`, `cqModD`, `cqScore` и их три прежних модуля экспорта. **Все чистые каталоги** CQ_DIFF, CQ_BMOD, CQ_MODS, CQ_GF, CQ_EN, CQ_SECT, CQ_CHESTS, CQ_DISKS, а также `cqMod` и `cqFeats` оставить на местах. Не трогать `import '../ui/overlays/celebrate.js'; // порядок исполнения` (C3b0 NO-GO 0/35).
2. `dev/src/logic/conquest.js`: вставить byte-identical тела `cqK`, `cqModD`, `cqScore` перед `cqWeek`; использовать прежний импорт `data/conquest-data.js` для чистого `cqMod`; оставить прежние lazy `cq`, `cqBump` и его `NOTES.push`, `cqRfN/cqRfCost`, маршруты, награды и сейвы. Экспортировать те же три глобальных имени **один раз** из logic.
3. `dev/src/ui/views/conq.js`: изменить только списки именованных импортов уже существующих data/logic зависимостей. Дополнительных module graph edges не вводить.
4. `dev/tools/arch-import-baseline.json`: удалить **ровно одно** реально исчезнувшее ребро `data/conquest-data.js -> logic/conquest.js`, baseline 5→4, новых 0, stale 0. Оставить четыре старых: `data/boss→logic/battle/skills`, `data/conquest-data→ui/overlays/celebrate`, `data/looks→logic/battle/ai`, `data/story→assets/models`.

## Контракты и проверка

- `dev/tests/ci/arch01c3b3-boundary.mjs` — обязательный исходный AST/topology/export gate: **173 JS, 999 статических импортов, 167 SPLIT-маркеров, 898 канонических глобальных экспортов, 2 исторические SCC 106/9, четыре старых рёбра**, ни одного нового. Байтовая идентичность трёх формул. Путь export-owner **меняется** с `data` на `logic` — это сознательное изменение модуля-владельца, при сохранении глобальных имён. В репозитории были найдены четыре прежних импортера этих символов, все перенацелены; после переноса тест требует ровно три UI именованных импорта из logic и ноль старых из data.
- `dev/tests/arch01c3b3-conquest-selectors.mjs` запускается **на реальном production PWA И HTML-артефакте** в Node VM, проверяя bootstrap/TDZ, `cqK` для отсутствующей/easy/normal/hard/legacy сложности, **все 10 boss-modifier × 5 сложностей** и все 8 статических модификаторов × 5, их тексты и точные округления (например, у босса `b0a` на hard урон **22%** из исходного IEEE-754 Math.round). `cqScore=stars+featPts`, семь порогов сундуков и 35 наград трека, сохранение/загрузка/замена S, недельный сброс, NOTEs и однократное завершение подвига, старые дневные цены пополнения.
- Старые `arch01c3b1-refill-boundary` и `arch01c3b2-boundary` остаются строгими на прежние формулы/NOTES и новый baseline. Более ранние AST-тесты обновляют только численность ledger 5→4, без изменения игровой логики.
- Не изменять `SPLIT`, golden, game balancing, цены, сейвы, таблицы, визуалы, интерфейс, Campaign 2.0 (21 карта/210 миссий), защищённый лагерь, 3D/рендер, ассеты, корневую PWA/SW или `dev/version.json`. Реальный full CI: check-deps, AST, production esbuild check-bundle exact 167, golden 200 battles/meta/saves/41 screens PWA+artifact, 210 NODES hash, offline/SW, DOM iPhone, WebGL MED/LOW/HIGH, 3D lifecycle и бюджеты лагеря.

## GO/NO-GO и приёмка

**Только после полного реального CI SUCCESS** предложить пользователю проверенный Stage B1 Draft PR для отдельной приёмки. Если обнаружен ESM/TDZ, API или runtime-регресс — NO-GO и исправление в отдельной ветке; нельзя отключать тесты, менять баланс или эталоны ради зелёного CI. Публикация v132 требует отдельного релизного пакета, явного разрешения владельца и независимого успешного GitHub Pages. Известные опасные C3b0 celebrate и C2d story/models NO-GO оставлены нетронутыми. После CI дополнить документ точным PR head SHA, run ID и подтверждёнными результатами.
