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
- `core/boot.js` связывает функцию через side-effect import *до start()*, **без чтения S или вызова prog при module evaluation**. Отсутствующий bind → явная ошибка, не default true. Дублирующий bind → явная ошибка.
- Не трогать **ни один** из файлов лагеря (UI/3D, стили, кнопки, зоны и навигация), `ui/overlays/profile.js` и `ui/wiring.js` на этом подэтапе, а также `assets/models.js`, `logic/stats.js`, 21 карту и 210 миссий, награды, графику, баланс, сейвы и опубликованную PWA.

## Стадия A — виртуальный ESM до правок игры

`dev/tests/ci/arch01c3a1-virtual-unlocks.mjs` выполняется в обязательном `arch-init-graph` CI, при этом в памяти имитирует удаление двух imports из data, регистрацию логического обработчика и неизменность визуальных данных. **Не меняет** `dev/src`, baseline, `SPLIT`, golden, assets, версию и опубликованные файлы.

Контроль: **166 текущих ESM markers** в точном порядке, не допустить исчезновения/переезда любого старого модуля. Если virtual result `moved>0`, candidate остановить/перепроектировать, не переписывать `SPLIT`.

## Только при успешном virtual

- Реальная реализация в этой feature-ветке, новый модуль и **один** additive marker; AST **9 known/0 new/0 stale**, check-bundle **OK (167)**, все старые 166 модулей в прежней относительной последовательности; прежние named exports сохранены.
- Проверка на реальных собранных **PWA и artifact**: FREE, сохранённые права, hero stars 0/1/7, живой прогресс после replacement `set_S`, invalid kinds, отсутствие eager state reads, все cosmetic frames/titles/avatars и SVG червя (изображение/URL/фон) байтово идентичны исходному.
- Golden 200 battles/meta/saves/41 screens обеих сборок, PWA SW/offline, E3 phone DOM, mobile/desktop WebGL MED/LOW + строгий lifecycle — обязательны без обновления golden.
- **Нет разрешения на merge, version bump, release**. Физический Safari/iPhone v127 всё ещё непроверен.

## Фактический результат

*Диагностический CI запущен. До результатa exact-order virtual ни один production файл не изменён.*
