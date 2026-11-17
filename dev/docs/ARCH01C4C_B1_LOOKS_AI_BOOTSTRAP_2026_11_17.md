# ARCH-01C4c B1 — устранение looks→AI через явный composition root

**17.11.2026 · Реальная feature-реализация, только Draft PR. Нет merge, изменения версии или публикации.**

## Основание

- Проверенный `main=4d36590cf9a9014c25d56a6272c0ca7130890f13`, публичная v133 и root PWA неизменны.
- [Stage A/A2 Draft PR #170](https://github.com/mryandexxx-spec/Dgoh-game/pull/170), итоговый [CI #44147416534](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44147416534) — SUCCESS, 19/19 на `3b77c116e252018c5bca668ebf2ac2080f044465`.
- 28 виртуальных конфигураций, 5 conditional order-exact, две с реальным cold/warm Node VM и неизменёнными golden. Выбран `root-gear-cine-ai`: ответственность за инициализацию находится в `src/boot.js`, не в экране Conquest.
- Отвергнутые решения C4b (все `render2d→logic` запрещены) не используются.

## Реальная минимальная правка

1. `dev/src/boot.js` — три разрешённые side-effect imports **строго перед** прежним `./ui/views/conq.js`: `./data/gear-cap.js` → `./logic/cinematic-preference.js` → `./logic/battle/ai.js`.
2. `dev/src/data/looks.js` — удалён только `import '../logic/battle/ai.js'; // порядок исполнения`; декларации `LOOK/ghash/sigil/SKINS/OL/FEM` побайтно неизменны.
3. AST baseline сокращён **3→2**, только `conquest-data.js→celebrate.js` и `story.js→models.js` остаются. Исключений не добавляли.
4. Исторические структурные тесты синхронизированы с новой реальностью **1000 imports**: `998 - 1 + 3 = 1000`; исторические проверки C4a boss→skills сохраняются.
5. Новый обязательный CI structural `arch01c4c-b1-boundary.mjs` фиксирует Git blob-hash восстановленных v133 `boot/looks` и неизменного `AI`, точный 167 `SPLIT`, 898 names, граф 173 modules, SCC membership [106,6], блокирует illegal `render2d→AI`.
6. Новый live `arch01c4c-b1-boot.mjs` включён в `tests/run.mjs` на **каждом** HTML (PWA и standalone), cold/warm seeds 77/101, AI/intents, LOOK/SVG, CINE_OFF, Shai-Hulud/raid, save keys.

## Неизменяемые контракты

- Ни одного изменения `SPLIT`, `golden`, формул, UI, Camp, Campaign 2.0 (210 миссий, 21 карта), WebGL HIGH/MED/LOW, сейвов, экономики, root `app.js`/`sw.js` или `dev/version.json`.
- Реальная production сборка PWA/HTML, exact 167 ESM markers, 898 exports, SHA-256 artifact, 200 battle golden / 1560 meta / 4 saves / 41 screens, all Campaign, PWA offline, iPhone DOM, WebGL MED/LOW/HIGH и весь обязательный CI **должны** пройти на этом конкретном feature commit.
- При провале — блокировать B1 и диагностировать в feature-ветке; эталоны и `SPLIT` не переписывать.

## Приёмка / реальные CI receipts

**РЕАЛЬНАЯ РЕАЛИЗАЦИЯ ПОДТВЕРЖДЕНА:** code head `16f7583a53fb9e0656d836a36a8b148512e456eb`, [GitHub Actions #44152849483](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44152849483) **completed SUCCESS на первой попытке этого commit, все 19 обязательных заданий SUCCESS**, финальный `All required checks passed` SUCCESS; `Publish verified PWA` **SKIPPED**. Публичная v133/root PWA остаётся неизменной.

- Реальная production сборка: `check-deps` PASS; Acorn AST `2 forbidden / 2 baseline / 0 new / 0 stale`; `arch-init-graph` 173 JS / **1000 static imports**, SCC 106+6 и точная реконструкция прежней membership; `check-bundle` **OK 167/167**, **898 named globals, 0 потерянных**. AI/boss/stats/LOOK invariant и исходные v133 Git blob hashes PASS; отдельная immutable 210 NODES SHA-256 PASS.
- Собраны и проверены настоящие `dist/pwa/index.html` и `dist/artifact.html`. Cold/warm seed 77 и 101, повторные независимые запуски, `LOOK/ghash/sigil/SKINS/OL/FEM`, AI/intents, `CINE_OFF`, `CH.worm === WORM`, 3 raid tiers и ключи старых сейвов **PASS** на каждой.
- Golden `battles` **200** (SHA `7d8169abdc688fb7`), `meta` **1560** сценариев, `saves` **4** (SHA `df7dfea2f6a4a1ee`), реальные DOM screens **44 экрана** без ошибок — **PASS на PWA и standalone HTML**, ни один golden не обновлён.
- Все **210** стоимости/открытия Campaign 2.0, live Conquest, boss/raid, worm SVG, PWA update/offline, iPhone UI/idle DOM, real WebGL MED/LOW/HIGH, arena A/B, лагерь/бой perf budgets, memory/lifecycle desktop и phone — **PASS** в обязательных jobs.
- Ранние неуспешные CI [#44152116469](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44152116469) и [#44152554682](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44152554682) были **старыми структурными ожиданиями тестов**, не runtime/bundle: четыре frozen ledger length `3` вместо `2` и список consumers cinematic-preference без нового разрешённого `boot.js`. Исправлены в feature-ветке без изменения реализации и без каких-либо послаблений ESM/SPLIT/golden; финальная реализация #44152849483 прошла полностью.
- Заключение: B1 **готов к архитектурной приёмке владельцем**, не является разрешением на merge/release. Физический Safari/iPhone остаётся открытым. Следующий документационный commit с этой записью требует отдельного успешного HEAD CI; до этого признаётся подтверждённым именно implementation SHA `16f7583a...`.
