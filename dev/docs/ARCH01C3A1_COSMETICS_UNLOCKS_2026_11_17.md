# ARCH-01C3a1 — косметика: доступ к сохранению и прогрессу только через logic

**Дата:** 17.11.2026. **Старт:** `main=02a4f0143acedbac859d57be0719c6b4f58352f7`, ARCH-01C2c принят, [PR #143 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/143), [CI #43957569960 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43957569960). **Опубликована v127** (C2b/C2c ещё не выпущены). [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).

## Почему этап разделён на подзадачи

У `data/cosmetics.js` четыре запрещённых импорта:

1. `→ core/state.js` — только в callable `unlocked(kind,id)`;
2. `→ logic/progress.js` — только в той же `unlocked`;
3. `→ assets/models.js` — `WORM_IMG.ava` подставляется в SVG эмблемы червя и меняет её background при инициализации;
4. `→ logic/stats.js` — чистый order-only импорт **первым**, обеспечивает историческую ESM-последовательность.

C2d доказал опасность удаления order-only связи с загрузчиком моделей: 39 вариантов из 39 переставляли 77–165 модулей в виртуальном esbuild, исходный SCC из **106** модулей содержит 3D-инициализацию. Поэтому эти четыре связи нельзя удалять одним рефакторингом.

**C3a1 scope — только рёбра 1 и 2: ожидаемый AST baseline 11→9.** Остальные две связи намеренно сохраняются до отдельных C3a2 (ранний WORM_IMG без data→assets) и C3a3 (stats predecessor). Нельзя «дочищать» их механически.

## Контракт C3a1

- `EMBLEMS`, `FRAMES`, `TITLES`, `FREE`, имена, SVG эмблем и фактическое разрешение `WORM_IMG` сохраняются без изменений, включая `if (typeof WORM_IMG !== 'undefined')` и точные цвета `['#a8784a','#2a1608']`.
- Старое `unlocked(kind,id)` используется из `ui/overlays/profile.js` и `ui/wiring.js`. Без переподключения публичного UI, с обязательным сохранением named export: внутри `data/cosmetics.js` только строго однократно регистрируемый callable adapter; реализация живого правила в новом `logic/cosmetics-unlocks.js`:
  `FREE[kind].includes(id) || !!S.unlocks[kind][id] || (kind === 'ava' && id.startsWith('hero:') && CH[id.slice(5)] && prog(id.slice(5)).stars > 0)`.
- Порядок вычисления `||` и отсутствие проверки незнакомых `kind`/id **сохранить как в текущей версии**: незнакомый kind бросает исключение; свободные title/frame дают true даже без `S`; герои получают аватар только при `stars>0`, не от имени/фракции; уже сохранённые `S.unlocks` остаются авторитетны.
- Существующая UI-композиция через `ui/wiring.js` связывает функцию side-effect import *до start()*, **без чтения S или вызова prog при module evaluation**. Отсутствующий bind → явная ошибка, не default true. Дублирующий bind → явная ошибка.
- Не трогать **ни один** из файлов лагеря (UI/3D, стили, кнопки, зоны и навигация), `ui/overlays/profile.js`; в `ui/wiring.js` допустим только один side-effect import обработчика в проверенной точке без изменения UI-поведения, а также `assets/models.js`, `logic/stats.js`, 21 карту и 210 миссий, награды, графику, баланс, сейвы и опубликованную PWA.

## Стадия A — виртуальный ESM до правок игры

`dev/tests/ci/arch01c3a1-virtual-unlocks.mjs` выполняется в обязательном `arch-init-graph` CI, при этом в памяти имитирует удаление двух imports из data, регистрацию логического обработчика и неизменность визуальных данных. **Не меняет** `dev/src`, baseline, `SPLIT`, golden, assets, версию и опубликованные файлы.

Контроль: **166 текущих ESM markers** в точном порядке, не допустить исчезновения/переезда любого старого модуля. Если virtual result `moved>0`, candidate остановить/перепроектировать, не переписывать `SPLIT`.

## Только при успешном virtual

- Реальная реализация в этой feature-ветке, новый модуль и **один** additive marker; AST **9 known/0 new/0 stale**, check-bundle **OK (167)**, все старые 166 модулей в прежней относительной последовательности; прежние named exports сохранены.
- Проверка на реальных собранных **PWA и artifact**: FREE, сохранённые права, hero stars 0/1/7, живой прогресс после replacement `set_S`, invalid kinds, отсутствие eager state reads, все cosmetic frames/titles/avatars и SVG червя (изображение/URL/фон) байтово идентичны исходному.
- Golden 200 battles/meta/saves/41 screens обеих сборок, PWA SW/offline, E3 phone DOM, mobile/desktop WebGL MED/LOW + строгий lifecycle — обязательны без обновления golden.
- **Нет разрешения на merge, version bump, release**. Физический Safari/iPhone v127 всё ещё непроверен.

## Результат виртуальных тестов на НЕИЗМЕНЁННЫХ исходниках

- [CI #43965553793](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43965553793), архитектурная сборка: прямой вариант регистрации через `core/boot.js` переставил **5 из 166** старых модулей, поэтому **NO-GO**.
- [CI #43965966162](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43965966162), архитектурная сборка: варианты регистрации через `ui/overlays/profile.js`, `ui/views/feats.js` и `ui/wiring.js` после прежнего data import сохранили **166/166 прежних позиций (moved=0)**. Выбрано `ui/wiring.js`: уже отвечает за выбор `pava`, `pframe`, `ptitle` и импортирует `unlocked` из data. Единственная добавка в UI — **один** side-effect import из `logic/cosmetics-unlocks.js`, никакого изменения кнопок/рендера/навигации.
- [CI #43966361442](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43966361442): до изменений production `src` на **PWA и artifact** сняты **идентичные SHA-256**:
  - Все права на косметику для fresh/partial/all-starred/replaced saves, `title/frame/emb/hero` — `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55`.
  - Полные `EMBLEMS`, `FRAMES`, `TITLES`, `FREE`, SVG/URL и background червя — `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8`.
  - Оба хеша **зафиксированы в коде** `dev/tests/arch01c3a1-cosmetics-snapshot.mjs` **до реального рефакторинга** и вызываются для PWA+artifact в обязательном CI. Хеши нельзя заменять ради прохождения.

## Реальная реализация C3a1 (в отдельной feature-ветке, без merge)

- `data/cosmetics.js`: убраны импорты `core/state.js` и `logic/progress.js`, статические EMBLEMS/FRAMES/TITLES/FREE и прежний WORM_IMG/logic/stats predecessor **без изменений**. `unlocked(kind,id)` остаётся публичной функцией и строго делегирует в привязанный логический обработчик; bind duplicate/missing → throw.
- Новый `logic/cosmetics-unlocks.js`: **побуквенно идентичная** исходной короткозамкнутая формула с живыми `S.unlocks`, `prog`, `CH` и `FREE`. При ESM evaluation регистрируется **только callback**, без чтения S/prog. `ui/wiring.js`: один импорт после старого `unlocked` import. `core/boot.js`, `ui/overlays/profile.js` и **лагерь** не изменяются.
- `tools/arch-import-baseline.json`: ровно **11→9**, high-risk модели и stats остаются, 0 new/stale; `tools/split.config.mjs`: одна additive запись нового логического модуля после старого profile и перед wiring, прежние 166 в прежней относительной последовательности.
- Все прежние C1/C2 regression asserts обновлены по точным количествам **167 SPLIT / 173 source JS / 9 legacy**, без ослабления; `dev/tests/ci/arch01c3a1-cosmetics-boundary.mjs` проверяет исходное правило, bootstrap UI, два удалённых ребра, отсутствие новых SCC и нетронутый WORM_IMG.
- Публикация и версия **v127** не меняются. **Реальный полный CI после реализации ожидается**. Если появятся runtime/TDZ/визуальные расхождения, этот Draft нельзя принимать. C3a2/C3a3 только отдельными этапами: SVG asset coupling и stats predecessor ещё не устранены.


