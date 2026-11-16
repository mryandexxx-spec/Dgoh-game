# ARCH-01C2d · order-only story → 3D asset models — предреализационная диагностика

Дата: 17.11.2026. Владелец принял и разрешил слияние C2c, [PR #143 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/143), `main=02a4f0143acedbac859d57be0719c6b4f58352f7`; [полный CI #43957569960 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43957569960). **Опубликована v127** (в версии нет C2b/c), физическая Safari/iPhone v127 остаётся непроверенной. [ARCH-01C Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).

## Проблема

Сохранилось 11 исторических запрещённых `data→*` импортов, один из них **`data/story.js → assets/models.js`**, ровно одна строка:

`import '../assets/models.js'; // порядок исполнения`

`data/story.js` экспортирует исключительно `STORY` и `BIOS`; никаких значений из `assets/models.js` не использует. Однако это **не мёртвый импорт**: `assets/models.js` выполняет `b3Pre(loadAssets3)` на верхнем уровне, подготавливает `ASSET` / `MODEL_DATA` / `WORM_IMG`, участвует в циклах ESM `models↔render3d/scenes/baker.js` и `models↔render3d/scenes/camp.js`. `baker.js` и `camp.js` уже имеют named imports из `assets/models.js`; перенос или удаление в одном месте способен изменить TDZ и момент регистрации 3D-ассетов. Порядок 3D сцены (в том числе лагерь!) **строго неприкосновенен**.

**Известный NO-GO:** в C0 прямое виртуальное удаление `story→models` сдвигало около 60 модулей. Изменять `SPLIT` под новый случайный порядок, удалять `b3Pre` или отключать CI запрещено.

## Стадия A — диагноз, никаких изменений игры

[Ветка диагностики](https://github.com/mryandexxx-spec/Dgoh-game/tree/audit/arch01c2d-story-models-order-probe) запускает только `dev/tests/ci/arch01c2d-virtual-story-models.mjs` через существующий AST gate и этот документ. Test вызывает реальный production-config esbuild с `format:'esm'`, `treeShaking:false`, `entry:src/main.js` и симулирует **в памяти**:
- контрольную сборку из текущего `main` с точным совпадением всех **166** `SPLIT` marker;
- удаление только запрещённого import (`remove-only`) — проверить точные `missing/moved`;
- безопасные на первый взгляд варианты импорта `assets/models.js` из *уже существующих* не-data владельцев исполнения (`render3d/scenes/hero.js`, `base-scene.js`, `camp.js`, `baker.js`, `render3d/engine-host.js`, `render3d/base.js`, `render3d/characters/*`, `render2d/figures.js`, `ui/router.js`, `ui/overlays/squad-select.js`, `core/boot.js`) перед первым или после последнего импорта; затем отдельно — приложение `main.js`/`boot.js`, `ui/views/conq.js`, `ui/battle/battle-ui.js`, `ui/events.js` и `ui/views/lobby.js`.

Каждый сценарий выводит `exact`, `moved`, `missing`, `extra`, `relativeInversions`, первую перестановку и список первых 9 затронутых модулей. Скрипт печатает входящие рёбра `story/models/baker/camp` и существующие SCC. **Ни один кандидат ещё не утверждён**. Нельзя продвигать вариант `exact:false`; даже при `exact:true` надо затем сравнить *реальные побочные эффекты* ESM/3D, а не только имена.

На этом шаге не меняются `dev/src/**`, `SPLIT`, `arch-import-baseline.json`, версия, golden, артефакты или root PWA. Baseline остаётся **11**. Полный CI может запускаться стандартным workflow, публикация на Draft отсутствует.

## Контракт будущей реализации — только при доказанной безопасности

1. Сохранить **все старые 166 ESM-маркеров в исходном порядке**, прежние 2 SCC без новых TDZ, все 3D `b3Pre` hooks и раннюю загрузку `MODEL_DATA`/KTX2/мокапа.
2. Переносить зависимость только в собственника исполнения вне `data`; убрать ровно `data/story.js → assets/models.js`, baseline **11→10**, без добавления новых запрещённых `data→*`. `STORY/BIOS` и их 210 сюжетных ссылок бит-в-бит неизменны.
3. Сохранить текст/истории и полный SHA-256 210 `NODES`: `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`, прежний RNG, `nodeOpen`, стоимость энергии, rewards, save schema. Проверить PWA и artifact.
4. В полном CI проверить AST gate, строгий check-bundle, golden battles/meta/saves/41 screens, offline/SW, E3 DOM, WebGL/MED/LOW phone+desktop, строгий 3D lifecycle и **лагерь неизменённым**. Не обновлять golden и скриншоты.
5. Один отдельный feature Draft PR после GO/NO-GO. **Без merge и публикации** до нового согласия владельца. Лагерь (UI/сцена, зоны/кнопки/стили/навигация) запрещено менять.

## Фактический результат и решение

### Выполнено — доказанный NO-GO для простого удаления/переноса

- [CI #43962648073 — первая матрица](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43962648073), [CI #43963186676 — расширенная матрица](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43963186676): обязательная архитектурная сборка SUCCESS, production AST baseline **11 известных / 0 new / 0 stale**, `check-bundle OK (166)`, **897 публичных экспортов без потерь**; оригинальная сборка точно совпадает со всеми 166 слотами SPLIT. Запуски моделировали изменения только в оперативной памяти.
- **39** сценариев (одно прямое удаление + 19 не-data модулей × два положения импорта). **Ни один** не сохранил прежний порядок: `exact=true` = **0 из 39**; везде `missing=[]`, `extra=[]`, то есть проблема именно в перестановке.
- **Без замены:** удаление `data/story.js → assets/models.js` переместило **81** старый модуль; первая перестановка на индексе **1**: вместо `logic/cinematic-preference.js` выполняется `data/story.js`. Причина: сторийный data-модуль начал инициализироваться сразу, тогда как раньше его `import models` заставлял ESM сначала пройти большую циклическую ветвь загрузки 3D.
- Перенос импорта в обычные 3D/2D/UI модули не помог: лучшая из проверенных эвристик — `render2d/figures.js` — **77** переставленных модулей. Для `ui/router.js` — **78**.
- Отдельное композиционное подключение в корне `main.js`, `boot.js` и `ui/views/conq.js` тоже **не помогло**: в худших сценариях `main.js:first` — **165**, `boot.js:first` — **161**, `ui/views/conq.js:first` — **163** переставленных модулей. Ни один root вариант не сохранил старые 166 позиций.
- Статический граф: `data/story.js` имеет импортёров `data/campaigns.js`, `ui/overlays/celebrate.js`, `ui/overlays/info.js`. `assets/models.js` импортируют 3D baker/camp, 3D authored/worm, `ui/hero-window.js`, `data/cosmetics.js` и непосредственно story. `assets/models.js` исполняет `b3Pre(loadAssets3)`. Существуют две прежние SCC размером **106** и **9** модулей. Нельзя считать этот импорт неиспользуемым и удалять без переноса обязанности и дополнительной проверки ранней загрузки.
- Все эти пробы **не изменяли ни одного игрового файла**, `SPLIT`, baseline, имён/ассетов, сохранений и карт; **опубликована прежняя v127**. Для дальнейших решений числовая цель C2d остаётся **11→10**, но пока **НЕ достигнута**.

### Архитектурное решение

**NO-GO для реализации C2d как однофайлового/однорёберного переноса.** Строгий контракт порядка и сохранения побочных эффектов важнее формального сокращения счётчика на единицу. `data/story.js → assets/models.js` остаётся в baseline 11, PR #144 — исключительно диагностический Draft, не сливать и не публиковать.

Чтобы устранить нарушение, потребуется отдельное архитектурное проектирование разрыва большой 106-модульной SCC и явный владелец bootstrap для 3D-ассетов. Такой проект **не должен** обходить `check-bundle`, обновлять golden ради прохождения, переставлять существующие маркеры или вмешиваться в лагерь без нового отдельного согласования. До этого разумнее работать с другими изолированными `data→*` зависимостями по ARCH-01C, сохранив C2d как документированный blocker.

Физический Safari/iPhone v127 остаётся непроверенным.

