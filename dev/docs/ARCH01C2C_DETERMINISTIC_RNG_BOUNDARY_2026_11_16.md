# ARCH-01C2c — детерминированный RNG без обратной зависимости data → core

**Дата:** 16.11.2026. **База:** `main 064c903fc97be71e4cc92b405b13de3fbe5052d6` после owner-approved merge [ARCH-01C2b PR #142](https://github.com/mryandexxx-spec/Dgoh-game/pull/142) и [CI #43946128726 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43946128726). Опубликованная версия игры **v127**, физическая Safari/iPhone проверка остаётся открытой. [Общий Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).

## Текущий import и risk

- `data/campaigns.js → core/rng.js` — одна запрещённая зависимость из 12 остающихся; `sRng(ghash(ck + c + ':' + m))` вызывается на **верхнем уровне** в порядке L, D, C и 7 глав × 10 миссий — ровно 210 узлов. Каждая RNG-последовательность фиксирует `enemy`, длины и отбор повторяющихся фракционных врагов. После генерации вручную выполняется спец-коррекция Раббана для `C:1:1`.
- `core/rng.js` содержит ровно `import './dom.js'; // порядок исполнения`, реализацию `function sRng(seed) { ... }` и `export { sRng }`. Удалять предшественник `core/dom.js`, перемещать вызовы RNG или seed из `looks.ghash` нельзя. `looks.js` содержит собственный order-only `import '../logic/battle/ai.js'` (будущий отдельный пакет, его не трогать).
- Поскольку `data/campaigns.js` использует named import `sRng` при top-level генерации, простое удаление связи, побитовое изменение `Math.imul`/порядка операторов или нежданный ESM/TDZ сдвиг могут изменить почти все 210 миссий. Нельзя подменять RNG `Math.random()` или произвольным seed.

## Предлагаемый C2c: только один импорт, 12 → 11

1. Новый **pure** `data/seeded-rng.js` — **текстуально идентичная функция** `sRng(seed)` с `seed >>> 0`, `Math.imul`, переполнением `|0` и нормировкой `4294967296`. Без DOM/3D/глобального состояния, без кэша и побочных эффектов.
2. `data/campaigns.js` меняет только один import на `./seeded-rng.js`. Всё остальное: `CAMP_DEF`, полный `NODES`, `ghash`, `sRng(ghash(...))` и Rabban correction — без изменений.
3. `core/rng.js` продолжает импортировать `./dom.js` **первым** как порядок исполнения, далее потребляет `sRng` из чистых данных и **сохраняет старый named export `sRng`** для сторонних потребителей. Ни один прежний consumer core RNG не переписывается. Если схема изменяет порядок прежних ESM модулей — **STOP, redesign**, не переписывать существующие строки SPLIT.
4. AST baseline убрать только `data/campaigns.js -> core/rng.js` после реального устранения ребра. Старый `data/story.js → assets/models.js` (order-only) и другие 10 ребёр остаются; `--strict` не включать.
5. **Никакой правки лагеря:** 3D, UI, зоны, кнопки, навигация, стили. Не менять 21 карты Campaign 2.0, 210 миссий, диалоги, имена, уровни, врагов, seed, шансы, награды, экономику/баланс, сейвы, версия v127.

## Вначале — только доказательства на текущем коде

На первой диагностической фазе [Draft PR](https://github.com/mryandexxx-spec/Dgoh-game/pulls) содержит только `dev/tests/ci/arch01c2c-virtual-rng.mjs`, `dev/tests/arch01c2c-nodes-digest.mjs`, подключение к существующему CI и данный документ. Все игровые исходники, SPLIT, baseline и golden **не изменены**.

- Read-only virtual esbuild (`entry=src/main.js`, `treeShaking:false`, `format:esm`) симулирует два переадресованных импорта, прежний `core/dom` predecessor и pure RNG; сверяет точный относительный порядок **всех 165 прежних ESM-маркеров**. Обнаружение перестановки — NO-GO.
- SHA-256 полного `JSON.stringify(NODES)` на прежнем бандле **PWA и artifact**, включая все 210 полных объектов, `enemy`, диалоги, `drops`, `story`, `scene`, `lvl` и спец-коррекцию Раббана. Фиксировать один и тот же SHA в обязательном строгом regression test **до реального изменения RNG**. Заменять этот hash или менять golden «чтобы прошёл» запрещено.
- Строго требовать SHA-256 match после реализации, дополнительно 1000+ сравнений `sRng` на нулевом, отрицательном, максимальном unsigned seed, при переполнении, нескольких последовательных вызовах. Закрепить исходную функцию текстуально и право её повторного core/rng export.
- После настоящей реализации: baseline **12→11**, 0 новых/stale; `check-bundle OK (166)`, все 165 существующих маркеров в прежнем порядке и named exports сохранены; Golden 200 battles/meta/saves/41 screens PWA и artifact, offline, DOM, mobile/desktop WebGL MED/LOW, 3D lifecycle SUCCESS.
- **Без merge и release** до отдельного разрешения владельца. Конкретные CI результаты и хеш SHA-256 — добавить ниже после запуска.

## Этапы дальше

C2d `data/story → assets/models` order-only — **не удалять механически**: прежняя C0 virtual esbuild показала сдвиг 60 модулей. Нужен отдельный владелец порядка ESM, дифференциальные тесты и отдельный Draft PR. Пакеты других 10 legacy edges не затрагиваются.

## Фактическая диагностика до изменения игры

**CI #43955019544 — неизменённая продукционная сборка:**
- [Первоначальная виртуальная проба](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43955019544), архитектурный build step SUCCESS: `existing=165, moved=95, missing=["core/rng.js"], extra=[], first=70:core/rng.js -> logic/progress.js`. **NO-GO для наивного re-export:** esbuild удаляет пустой `core/rng.js` после выноса тела функции. Сдвигаются 95 старых маркеров, без права подгонки `SPLIT`.
- Текущее `logic/progress.js` **уже** содержит `import '../core/rng.js'; // порядок исполнения`, поэтому новый импорт-предшественник не требуется; проблема в отсутствии runtime объявления в почти пустом core/rng адаптере. Вторая виртуальная проба проверяет **явный локальный алиас** `import { sRng as pureSRng } from '../data/seeded-rng.js'; const sRng = pureSRng; export { sRng };`, сохраняя `import './dom.js'` первым и не добавляя побочных эффектов.
- **Базовый SHA-256 всех 210 полных `NODES` на неизменённом исходном коде** PWA **и** artifact: `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`. Показания идентичны для обеих сборок; закреплены константой в `tests/arch01c2c-nodes-digest.mjs` до внесения изменений.
- `check-bundle OK (165)`, 896 public names, AST baseline **12 existing, 0 new/stale**. Golden и другие проверки диагностической ветки не заменяют будущий implementation CI.

**Следующая контрольная точка:** запустить второй virtual esbuild с двумя вариантами (plain NO-GO, explicit alias) и проверить, даёт ли alias `moved=0, missing=[], extra=[]`. При неуспехе — переработать кандидат, не менять production. **Ни merge, ни release без владельца.**


## Реализация C2c — фактические данные после виртуальной проверки

В повторном виртуальном [CI #43955866548](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43955866548) были сопоставлены оба варианта: **plain re-export** `moved=95, missing=["core/rng.js"]` (**NO-GO**) и явный **alias** `moved=0, missing=[], extra=[], first=none` (**GO только по порядку маркеров**). SHA-256 210 полных `NODES` на неизменённых PWA и artifact: `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`. Этот хеш зафиксирован в коде test ДО игровой реализации.

**Первый реальный candidate alias на Draft PR #143 не принят.** Архитектурная сборка [#43956780416](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43956780416) показала AST **11/0 new/0 stale**, `check-bundle OK (166)`, 897 имён/0 потерь, **4096 PRNG векторов PASS**; но обязательный `tests/arch01c2a-energy.mjs` при запуске реального PWA-бандла упал **во время его VM инициализации**. Обычного сохранения ESM-маркеров оказалось недостаточно. В `render2d/scenes.js` есть верхнеуровневая инициализация `const NZ = makeNoise(1337)`, вызывающая импортируемый из `core/rng.js` `sRng`; после переезда старого `function sRng` к `const sRng = pureSRng` исчезло hoisting-поведение старой функции. Это типовой риск TDZ/order; **CI правильно заблокировал пакет, тесты не ослаблялись**.

**Исправление:** `core/rng.js` сохраняет `import './dom.js'; // порядок исполнения`, импортирует `pureSRng` и объявляет **hoisted wrapper** `function sRng(seed) { return pureSRng(seed); }` плюс прежний `export { sRng }`. В чистом `data/seeded-rng.js` лежит функция с бит-в-бит прежними 213 символами тела `sRng`; `data/campaigns.js` импортирует только его. На вызов `sRng(seed)` добавляется одна тривиальная обёртка только для прежнего core API (в каждом потоке RNG алгоритм и последовательность неизменны). Early render2d/makeNoise снова может получить hoisted функцию. Тесты дополнены проверкой этого конкретного инварианта.

**Реальные изменения:** `dev/src/data/seeded-rng.js` (+1 чистый модуль), `dev/src/data/campaigns.js` (ровно один новый импорт), `dev/src/core/rng.js` (совместимый API/предшественник), `dev/tools/arch-import-baseline.json` **12→11** и одна новая запись в `SPLIT` без перестановки прежних **165**. Все предыдущие C1/C2 тесты сохранены и обновлены только их точные счётчики, а новый `tests/ci/arch01c2c-pure-rng.mjs` проверяет 4096 значений RNG/слои/hoisting. `tests/arch01c2c-nodes-digest.mjs` в штатном build CI требует pinned SHA-256 для всех 210 полных объектов на **PWA и artifact**.

**Приёмка:** новый реальный CI после исправления обёртки должен дать `check-bundle OK(166)`, SHA-256 exact совпадение обеих сборок, 0 новых/stale зависимостей, полный mandatory golden/DOM/offline/WebGL, 3D lifecycle. До полного SUCCESS — **Draft не готов к приёмке; merge, bump, release запрещены**. Физический Safari/iPhone v127 всё ещё не проверен.

