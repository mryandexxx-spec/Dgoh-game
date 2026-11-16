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

## Фактические результаты

*До первого CI: ожидается SHA-256 210 NODES и отчёт virtual esbuild о порядке 165 прежних маркеров.*
