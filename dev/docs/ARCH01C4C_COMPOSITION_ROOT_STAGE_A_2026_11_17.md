# ARCH-01C4c — явная композиция bootstrap без render2d→logic (Stage A)

**17.11.2026 · Только Stage A: архитектурное исследование в памяти, никакой реальной правки игрового кода.** Команда владельца: «Идём дальше» после ARCH-01C4b, не означает разрешение merge или release.

## Проверенный исходный контракт

- Current \`main\` source SHA: \`4d36590cf9a9014c25d56a6272c0ca7130890f13\`; **опубликована v133**: GitHub Pages root \`41d95d529e1922990842016066b198068eb1d119\`, SW \`e1a6859133\`, 188 SHA-256. [Official #44129152399](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44129152399) и [independent Pages #44131280637](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44131280637) SUCCESS. Физический iPhone/Safari не подтверждён.
- 173 JS, 998 static imports, 167 неизменяемых ESM-маркеров в \`SPLIT\`, 898 глобально видимых имён, SCC [106,6], **3** прежних forbidden \`data→*\` и **0 new/stale**. Точный baseline — \`dev/tools/arch-import-baseline.json\`.
- Оставшиеся долги: \`data/conquest-data.js→ui/overlays/celebrate.js\` (C3b0 NO-GO), **\`data/looks.js→logic/battle/ai.js\` (цель C4c)**, \`data/story.js→assets/models.js\` (C2d NO-GO). Больше ничего в текущей стадии не менять.
- [Предыдущий C4b Draft PR #169](https://github.com/mryandexxx-spec/Dgoh-game/pull/169), [полный CI #44138611639 SUCCESS, 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44138611639): из 66 виртуальных вариантов **0 архитектурно допустимых GO**, 62 переставляют 20/60 ESM-маркеров, **4 сохраняют 167/167**, но создают запрещённое \`render2d/*→logic/battle/ai.js\` (не допускается \`dev/ARCHITECTURE.md\` §1). Никакой реализации B1 там не разрешено.
- Не разрешено считать перенос запретного импорта в \`render2d/\` исправлением, переписывать \`SPLIT\` под новый порядок, трогать immutable golden.

## Новый вопрос C4c

Может ли **законный owner в composition root (\`src/boot.js\`)** или в уже существующем раннем \`ui/views/conq.js\` поставить именно нужные боевые predecessors перед первым достижением \`data/looks.js\`, сохранив фактический порядок bootstrap и удалив старое ребро? В отличие от C4b, проверяем не одиночное перемещение AI-импорта, а **контролируемый пролог из нескольких разрешённых static imports** (gear-cap, cinematic-preference, fx/chars, skills, boss, stats, engine, turns, raid, AI). Слои \`boot/ui → logic/data\` разрешены, хотя новые разрешённые edges требуют отдельного обоснования, а не автоматического GO.

Главное: исходная цепочка первой загрузки \`looks.js\` идёт через \`main.js → boot.js → ui/views/conq.js → logic/conquest.js → data/conquest-data.js → ui/overlays/celebrate.js → … → render2d/fx-layer.js → scene-bg.js → scenes.js → figures.js → data/looks.js\`. Все 20 ранних боевых маркеров в действующем \`SPLIT\` идут **до** \`looks.js\`. Изменение времени import-evaluation может ломать top-level effects / TDZ, даже когда итоговый набор модулей не изменился.

## Чёткое устройство эксперимента

Новый \`dev/tests/ci/arch01c4c-virtual-composition.mjs\` выполняется через обязательный \`dev/tests/ci/arch-init-graph.mjs\`. Для каждого варианта он:

1. Снимает AST-граф \`main\` и настоящие esbuild-маркеры production сборки \`src/main.js\`, проверяет exact **167/167** совпадение с историческим \`SPLIT\`, 173 JS / 998 imports / 898 names / SCC [106,6] / ровно 3 legacy.
2. **Только в памяти** удаляет \`import '../logic/battle/ai.js'; // порядок исполнения\` из \`data/looks.js\`.
3. Вставляет проверяемые разрешённые static import-predecessors **только** до первого \`import './ui/views/conq.js'\` в \`src/boot.js\`, либо поднимает **уже существующий named \`computeIntents\`** в самое начало \`ui/views/conq.js\` с дополнительным разрешённым прологом. Никакие функции, top-level выражения, комментарии, ассеты, 3D, UI, CSS, константы, сейвы и ресурсы не правит.
4. Пробует отрицательный контроль (голое удаление, ранее 60 moved) и компактную матрицу комбинаций и порядка preludes. Для каждой попытки сообщает \`ARCH-01C4c TRIAL\`: число moved/missing/extra ESM-маркеров, позиции AI/looks, AST new/removed edges, membership SCC, исходные global exports и инвариант тел функций.
5. **Ни один** \`render2d/render3d→logic\`, \`data→(core,logic,ui,assets,render*)\` или \`logic→ui\` новый edge не допускается. Никаких тестовых исключений в архитектурный baseline. Два других blocked predecessors обязаны остаться.
6. Выводит \`strictCandidate\` только при отсутствии новых рёбер, 167/167 точном ESM и сохранении SCC; если ESM совпал с разрешёнными **новыми** \`boot/ui→logic/data\` рёбрами, фиксирует **только \`conditionalReview\`**, не объявляет runtime/bundle GO. Exact ESM при другой SCC тоже только conditional review. Все случаи с moved ESM — NO-GO до отдельного явно одобренного пересмотра контракта.

Важно: добавление статического импорта в bootstrap даже в законном направлении **не означает** готовность к релизу. Особенно тщательно проверить однократность установки provider/hook и порядок \`CH.worm=WORM\`, \`setGearStatProvider\`, функций AI \`aiPlan/computeIntents\` и Node/CommonJS adapter, доступность \`LOOK/ghash/sigil/SKINS/OL/FEM\`, ранее закрытые Conquest и Campaign зависимости.

## GO / NO-GO

- **Если 0 допустимых order-exact вариантов:** сохранить 3 исторических edge, не создавать B1 implementation, оформить анализ глубокой декомпозиции bootstrap и предложить другой P0-срез.
- **Если есть хотя бы один conditionalReview:** следующий отдельный Stage A2 virtual runtime smoke — cold/warm Node VM, TDZ, golden snapshots PWA+HTML, 200 battles/meta/saves/41 screens, 210 Campaign, offline SW, browser WebGL HIGH/MED/LOW, весь лагерь; при несовпадении NO-GO. Сложные разрешённые дополнительные edges проверить на отсутствие ненужной связности. Только затем отдельный Stage B1 Draft PR с реальными изменениями и **полным 19/19 CI**.
- **Ни один виртуальный результат не разрешает merge и publication.** Решение владельца требуется после конкретного безопасного пакета. Не поднимать версию и не обновлять золотые эталоны.

## Касаемые файлы в этом диагностическом PR

Только \`dev/tests/ci/arch01c4c-virtual-composition.mjs\` (новый), одна импортирующая строка в \`dev/tests/ci/arch-init-graph.mjs\` и этот \`dev/docs/ARCH01C4C_COMPOSITION_ROOT_STAGE_A_2026_11_17.md\`. Никаких production \`dev/src/**\`, \`dev/version.json\`, \`dev/CHANGES_STATUS.md\`, \`SPLIT\`, \`arch-import-baseline.json\`, immutable golden, 210 миссий / 21 карты, лагеря, экономических чисел, сейвов, WebGL или корневых \`app.js\` и \`sw.js\`.

**CI receipt:** записать actual final head SHA, конкретный JSON \`ARCH-01C4c SUMMARY\`, статусы workflow и 19/19, решение следующего stage в Issue #132 **после** реальных логов; не объявлять статусы заранее.
