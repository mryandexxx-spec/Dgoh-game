# ARCH-01C4c — явная композиция bootstrap без render2d→logic (Stage A)

**17.11.2026 · Только Stage A: архитектурное исследование в памяти, никакой реальной правки игрового кода.** Команда владельца: «Идём дальше» после ARCH-01C4b, не означает разрешение merge или release.

## Проверенный исходный контракт

- Current `main` source SHA: `4d36590cf9a9014c25d56a6272c0ca7130890f13`; **опубликована v133**: GitHub Pages root `41d95d529e1922990842016066b198068eb1d119`, SW `e1a6859133`, 188 SHA-256. [Official #44129152399](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44129152399) и [independent Pages #44131280637](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44131280637) SUCCESS. Физический iPhone/Safari не подтверждён.
- 173 JS, 998 static imports, 167 неизменяемых ESM-маркеров в `SPLIT`, 898 глобально видимых имён, SCC [106,6], **3** прежних forbidden `data→*` и **0 new/stale**. Точный baseline — `dev/tools/arch-import-baseline.json`.
- Оставшиеся долги: `data/conquest-data.js→ui/overlays/celebrate.js` (C3b0 NO-GO), **`data/looks.js→logic/battle/ai.js` (цель C4c)**, `data/story.js→assets/models.js` (C2d NO-GO). Больше ничего в текущей стадии не менять.
- [Предыдущий C4b Draft PR #169](https://github.com/mryandexxx-spec/Dgoh-game/pull/169), [полный CI #44138611639 SUCCESS, 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44138611639): из 66 виртуальных вариантов **0 архитектурно допустимых GO**, 62 переставляют 20/60 ESM-маркеров, **4 сохраняют 167/167**, но создают запрещённое `render2d/*→logic/battle/ai.js` (не допускается `dev/ARCHITECTURE.md` §1). Никакой реализации B1 там не разрешено.
- Не разрешено считать перенос запретного импорта в `render2d/` исправлением, переписывать `SPLIT` под новый порядок, трогать immutable golden.

## Новый вопрос C4c

Может ли **законный owner в composition root (`src/boot.js`)** или в уже существующем раннем `ui/views/conq.js` поставить именно нужные боевые predecessors перед первым достижением `data/looks.js`, сохранив фактический порядок bootstrap и удалив старое ребро? В отличие от C4b, проверяем не одиночное перемещение AI-импорта, а **контролируемый пролог из нескольких разрешённых static imports** (gear-cap, cinematic-preference, fx/chars, skills, boss, stats, engine, turns, raid, AI). Слои `boot/ui → logic/data` разрешены, хотя новые разрешённые edges требуют отдельного обоснования, а не автоматического GO.

Главное: исходная цепочка первой загрузки `looks.js` идёт через `main.js → boot.js → ui/views/conq.js → logic/conquest.js → data/conquest-data.js → ui/overlays/celebrate.js → … → render2d/fx-layer.js → scene-bg.js → scenes.js → figures.js → data/looks.js`. Все 20 ранних боевых маркеров в действующем `SPLIT` идут **до** `looks.js`. Изменение времени import-evaluation может ломать top-level effects / TDZ, даже когда итоговый набор модулей не изменился.

## Чёткое устройство эксперимента

Новый `dev/tests/ci/arch01c4c-virtual-composition.mjs` выполняется через обязательный `dev/tests/ci/arch-init-graph.mjs`. Для каждого варианта он:

1. Снимает AST-граф `main` и настоящие esbuild-маркеры production сборки `src/main.js`, проверяет exact **167/167** совпадение с историческим `SPLIT`, 173 JS / 998 imports / 898 names / SCC [106,6] / ровно 3 legacy.
2. **Только в памяти** удаляет `import '../logic/battle/ai.js'; // порядок исполнения` из `data/looks.js`.
3. Вставляет проверяемые разрешённые static import-predecessors **только** до первого `import './ui/views/conq.js'` в `src/boot.js`, либо поднимает **уже существующий named `computeIntents`** в самое начало `ui/views/conq.js` с дополнительным разрешённым прологом. Никакие функции, top-level выражения, комментарии, ассеты, 3D, UI, CSS, константы, сейвы и ресурсы не правит.
4. Пробует отрицательный контроль (голое удаление, ранее 60 moved) и компактную матрицу комбинаций и порядка preludes. Для каждой попытки сообщает `ARCH-01C4c TRIAL`: число moved/missing/extra ESM-маркеров, позиции AI/looks, AST new/removed edges, membership SCC, исходные global exports и инвариант тел функций.
5. **Ни один** `render2d/render3d→logic`, `data→(core,logic,ui,assets,render*)` или `logic→ui` новый edge не допускается. Никаких тестовых исключений в архитектурный baseline. Два других blocked predecessors обязаны остаться.
6. Выводит `strictCandidate` только при отсутствии новых рёбер, 167/167 точном ESM и сохранении SCC; если ESM совпал с разрешёнными **новыми** `boot/ui→logic/data` рёбрами, фиксирует **только `conditionalReview`**, не объявляет runtime/bundle GO. Exact ESM при другой SCC тоже только conditional review. Все случаи с moved ESM — NO-GO до отдельного явно одобренного пересмотра контракта.

Важно: добавление статического импорта в bootstrap даже в законном направлении **не означает** готовность к релизу. Особенно тщательно проверить однократность установки provider/hook и порядок `CH.worm=WORM`, `setGearStatProvider`, функций AI `aiPlan/computeIntents` и Node/CommonJS adapter, доступность `LOOK/ghash/sigil/SKINS/OL/FEM`, ранее закрытые Conquest и Campaign зависимости.

## GO / NO-GO

- **Если 0 допустимых order-exact вариантов:** сохранить 3 исторических edge, не создавать B1 implementation, оформить анализ глубокой декомпозиции bootstrap и предложить другой P0-срез.
- **Если есть хотя бы один conditionalReview:** следующий отдельный Stage A2 virtual runtime smoke — cold/warm Node VM, TDZ, golden snapshots PWA+HTML, 200 battles/meta/saves/41 screens, 210 Campaign, offline SW, browser WebGL HIGH/MED/LOW, весь лагерь; при несовпадении NO-GO. Сложные разрешённые дополнительные edges проверить на отсутствие ненужной связности. Только затем отдельный Stage B1 Draft PR с реальными изменениями и **полным 19/19 CI**.
- **Ни один виртуальный результат не разрешает merge и publication.** Решение владельца требуется после конкретного безопасного пакета. Не поднимать версию и не обновлять золотые эталоны.

## Касаемые файлы в этом диагностическом PR

Только `dev/tests/ci/arch01c4c-virtual-composition.mjs` (новый), одна импортирующая строка в `dev/tests/ci/arch-init-graph.mjs` и этот `dev/docs/ARCH01C4C_COMPOSITION_ROOT_STAGE_A_2026_11_17.md`. Никаких production `dev/src/**`, `dev/version.json`, `dev/CHANGES_STATUS.md`, `SPLIT`, `arch-import-baseline.json`, immutable golden, 210 миссий / 21 карты, лагеря, экономических чисел, сейвов, WebGL или корневых `app.js` и `sw.js`.

**CI receipt:** записать actual final head SHA, конкретный JSON `ARCH-01C4c SUMMARY`, статусы workflow и 19/19, решение следующего stage в Issue #132 **после** реальных логов; не объявлять статусы заранее.

## Подтверждённая виртуальная матрица Stage A (архитектурная часть CI)

На [GitHub Actions #44145867721](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44145867721), head `647d954d9777a6f9cf9fd2d64f7bab923dab798b`, обязательный `ARCH-01 Acorn import-boundary regression gate` **SUCCESS**, production `npm run build` и строгий `check-bundle` **SUCCESS**, `Build once + architecture + SHA-256 manifest` **SUCCESS**.

Фактическая строка `ARCH-01C4c SUMMARY`: **28 tested, 5 exact, strict 0, 5 conditionalReview**. Не найдено ни одного автоматически готового к слиянию варианта. Пять кандидатов с **0 moved ESM-маркеров**, исходной точной членностью SCC [106,6], всеми 898 именами и без новых запрещённых edges:

| Кандидат | Новые разрешённые edges | Итого static imports | Решение |
|---|---:|---:|---|
| `root-gear-cine-ai` | 3 (`boot.js→gear-cap`, `boot.js→cinematic-preference`, `boot.js→AI`) | 1000 | условный Stage A2 |
| `root-gear-cine-fx-ai` | 4 | 1001 | избыточный, не первый выбор |
| `root-gear-cine-chars-ai` | 4 | 1001 | избыточный, не первый выбор |
| `ui-gear-cine-existing-ai` | **2** (`ui/views/conq.js→gear-cap` и `→cinematic-preference`, existing AI named import только перемещён) | **999** | **приоритетный A2** |
| `ui-gear-cine-fx-chars-existing-ai` | 3 | 1001 | избыточный, не первый выбор |

Вне списка — 23 сценария NO-GO (от 2 до 60 сдвинутых ESM-маркеров). Во всех 28 тест не меняет реальные `dev/src`, `SPLIT`/baseline, golden или `main`.

**Интерпретация:** два ранних независимых предшественника `data/gear-cap.js` и `logic/cinematic-preference.js` необходимы именно **в таком порядке** перед AI. Противоположный порядок даёт 2 сдвига; один отсутствующий predecessor — 19–20. Это не «бесплатная» замена: три новых разрешённых root edges или два новых UI edges требуют runtime/TDZ тестов и отдельного review.

## Stage A2 — фактические проверки холодного/повторного запуска

Добавлен четвертый файл `dev/tests/ci/arch01c4c-virtual-runtime.mjs`; обязательный CI gate вызывает его **после** virtual matrix. В памяти на real v133 `src/main.js` сопоставляются **оба минимальных кандидата** `root-gear-cine-ai` и `ui-gear-cine-existing-ai`, каждый с эталонной сборкой.

- `loadGame` в том же Node VM, что и golden, seed 77 и 101; исходный v133 cold boot должен работать, все 167 esbuild-маркеров должны совпадать.
- Сверка `LOOK/SKINS/OL/FEM/ghash/sigil`, `CH.worm === WORM`, AI/raid/skills/stats/cinematic и структуры нового сохранения; проверить совпадение virtual baseline и кандидат.
- Неизменные golden: `battles`, `meta`, `saves`, реальный boss boot и селекторы Conquest. Каждое несовпадение выводить как virtual `NO-GO`, а не менять эталон или продакшн.
- Полный браузер/WebGL/41-screen/offline CI текущего неизменного production проверяется отдельно. Его PASS **не является** автоматическим доказательством виртуальной сборки: реальный B1 с новыми исходниками потребует ещё один собственный 19/19 CI и отдельного разрешения.
- **Никакого Stage B1 до успешного A2 receipt и согласования дизайна.** `main` остаётся опубликованной v133, 3 legacy edges и нулём новых.

**Уточнённый scope Draft PR: ровно четыре файла** — два новых `dev/tests/ci/arch01c4c-*.mjs`, один обязательный importer `dev/tests/ci/arch-init-graph.mjs`, этот отчёт. Ни одного production file.
