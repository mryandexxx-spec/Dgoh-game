# ARCH-01C4a Stage A — самостоятельные side-effect ESM-предшественники boss и looks

**17 ноября 2026. ТОЛЬКО ДИАГНОСТИКА (не игровой патч, не релиз).** Владелец после подтверждённой публикации v132: «Поехали». [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [дорожная карта](PRODUCT_AUDIT_ROADMAP_2026_11_16.md), `dev/ARCHITECTURE.md` и `dev/docs/PROJECT_INSTRUCTIONS.md` — обязательная база.

## Точная проверенная точка исхода

`main=69ee0196757d84deaa637c7403f297a310aeb7af` — docs-only cleanup после **опубликованной v132**, [cleanup PR #164 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/164), [19/19 CI #44108576924 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44108576924); `main` не пересобирал/не переиздавал PWA, SW остаётся `2c8aab985b`. Версия 132, [implementation #162 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/162), [release #163 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/163), [validated publish #44105972965 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44105972965), **188 SHA-256**, опубликованный root `9ee953a4180151f9e6008adddfce730ccc7b06ed`, [independent Pages #44107612434 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44107612434). Физический Safari/iPhone **не проверен**.

Осталось 4 исторических запрещённых ребра (0 новых/устаревших):
```
data/boss.js -> logic/battle/skills.js
data/conquest-data.js -> ui/overlays/celebrate.js
data/looks.js -> logic/battle/ai.js
data/story.js -> assets/models.js
```
C3b0 `conquest-data→celebrate` уже **NO-GO 0/35** при попытках оставить прежний ESM-порядок; C2d `story→models` **NO-GO 0/39** из-за эффекта bootstrap. Их **не трогать**. Следующие ещё не исследованные отдельно после v132 — ровно два «order-only» импорт-предшественника boss→skills и looks→ai; их и рассматриваем **без смешивания с остальными**.

## Смысл и реальные эффекты

- `dev/src/data/boss.js` начинается с `import '../logic/battle/skills.js'; // порядок исполнения`, затем `import { CH } from './chars.js';`. Никаких именованных skills APIs не использует, но **синхронно мутирует `CH.worm = WORM` на верхнем уровне**. `logic/battle/skills.js` зависим от `logic/battle/engine.js` (`ev/log`) и `data/skill-ups.js`. Перестановка boss относительно skills/engine может повлиять на `WORM` и реальный загрузочный граф.
- `dev/src/data/looks.js` начинается с `import '../logic/battle/ai.js'; // порядок исполнения`; других импортов нет. Затем создаёт `LOOK`, `ghash`, `sigil`, `SKINS`, `OL`, `FEM`. `logic/battle/ai.js` импортирует `data/boss.js` и `logic/battle/skills.js`, на верхнем уровне содержит CommonJS guard `if (typeof module !== 'undefined') module.exports = {...}`, который должен сохранить доступность зависимых имён для Node/CI. Это **не обычные неиспользуемые импорты**, они задают прежний DFS ESM.
- `dev/tools/split.config.mjs`: исходные marker slots `logic/battle/skills` перед `data/boss`, `logic/battle/ai` перед `data/looks`. Фактическая исходная сборка v132 имеет **173 JS, 999 статических импортов, 167 последовательных ESM-маркеров, 898 исторических публичных именованных экспортов, две SCC из 106 и 9 модулей**. Нельзя сдвигать или переписывать `SPLIT`, чтобы «позеленить» новую комбинацию.

## 16 виртуальных production esbuild сценариев

Новый обязательный `dev/tests/ci/arch01c4a-virtual-order.mjs` читает реальные исходники из `dev/src` и запускает точный production esbuild `src/main.js` (bundle ESM, без tree-shaking, UTF-8, без legal comments, target esnext) с `onLoad` **только в памяти**; никаких `dev/src` или `dev/dist` не меняет.

1. Удалить только boss→skills.
2. Удалить только looks→ai.
3. Удалить оба.
4. Заменить boss side-effect на импорт уже непосредственно используемого `data/chars.js`.
5. Заменить boss predecessor на разрешённый `data/skill-ups.js`.
6. Заменить looks predecessor на разрешённый `data/boss.js`.
7. Заменить looks predecessor на `data/chars.js`.
8. Заменить looks predecessor на `data/skill-ups.js`.
9–12. Небольшие независимые комбинации двух потенциальных `data→data` замен и/или удаления.
13–16. Удалить boss→skills, но одновременно поднять **уже существующий named import** `skills` раньше `boss` внутри одного из разрешённых слоёв логики — по отдельности `logic/battle/ai.js`, `logic/battle/stats.js`, `logic/battle/engine.js`, `logic/battle/raid.js`. Никаких новых статических import edges и никаких изменений в телах функций, только виртуальная перестановка import-строк.

Для каждого сохраняется строгая фактическая запись: совпадение всего ESM marker order (0 moved/missing/extra), точное SCC module-membership, все 898 глобальных имён, четыре текущие baseline зависимости, старые/новые импортные рёбра, statically valid imports, отсутствие смены тела `boss.js` и `looks.js` кроме первой side-effect строки, сохранение **`CH.worm = WORM`** и top-level `module.exports` блока в AI.

**Строгий VIRTUAL GO** только если целевое запрещённое ребро фактически убрано, **не появилось новых статических рёбер (даже формально разрешённых)**, 167 исходных marker slots точны, исходные SCC member lists точны, все 898 имён точны, только удалён нужный predecessor edge и все прочие проверки прошли. В противном случае **NO-GO** для данного сценария, не маскировать проблему переносом`SPLIT`, подменой golden, переопределением глобалов или изменением игровой механики.

Даже виртуальный GO — **только условная гипотеза на Stage B**: требуется самостоятельный implementation Draft PR и реальный PWA+standalone artifact тест холодной и тёплой загрузки, отсутствие TDZ/ReferenceError, (CH.worm === WORM) и ритма рейд-босса, `skLv/abFor` и Duncan guard, `aiPlan/computeIntents`, CommonJS compatibility, golden 200 боёв/meta/saves/41 screens, все 210 миссий, offline/SW, MED/LOW/HIGH WebGL, 3D lifecycle и бюджет лагеря. Физический iPhone остаётся отдельным условием.

**Запреты:** текущая работа НЕ меняет игру, `CH`, `SPLIT`, `dev/tools/arch-import-baseline.json`, сейвы, деньги/баланс, UI, Camp, Campaign, ассеты, golden, `dev/version.json` и root PWA/SW. Никаких merge/publish на диагностическом этапе.

**Состояние этого документа:** до получения логов финального CI кандидаты GO/NO-GO не утверждаются. По завершении записать точный PR-head/run ID, 16 реальных результатов, рекомендованную следующую безопасную границу и Issue #132.

## Измеренный Stage A — actual production esbuild (CI первого финального варианта)

Прямые двенадцать попыток `delete`, `data→data` и их небольшие комбинации: **0/12 ESM exact**, значит NO-GO для механического удаления. Наивный `boss→skills` removal сдвигает 3 из 167 ESM, ухудшает/перестраивает SCC 9→6 и нарушает порядок `skills < boss`. Наивный `looks→ai` removal сдвигает 60 ESM; SCC membership остаётся [106,9], но `ai < looks` нарушается. Правомерные импорты в `chars`/`skill-ups`/`boss` не восстанавливают прежний порядок: 2–55 перемещённых маркеров. Во всех случаях все 898 имён экспорта сохранены, но этого явно недостаточно.

Четыре дополнительные пробы **`boss→skills` removal + import order в `logic/battle/*` без нового edge**:
- `ai.js`: 3 ESM-marker moves, SCC [106,6] — NO-GO.
- **`stats.js`**: `import { SK_KEYS, autoSk } from './skills.js'` перенесён **перед** существующим `import { STAR_MULT } from '../../data/boss.js'`; **0 сдвигов ESM**, 898 имён, 0 новых/лишних edges, сохранён правильный skills→boss порядок и байтово неизменённые тела; но SCC **[106,9]→[106,6]**, то есть **НЕ СТРОГИЙ VIRTUAL GO**, а **исследовательский кандидат** с необходимостью отдельного анализа влияния инициализации.
- `engine.js`: 3 ESM moves, SCC [106,6] — NO-GO.
- `raid.js`: 3 ESM moves, SCC [106,6] — NO-GO.

**Итого 16 сценариев: ESM exact 1/16, strict virtual GO 0/16.** Все реальные результаты `ARCH-01C4a TRIAL` в [Actions #44113007773](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44113007773), build log. Размер SCC изменяется при удалении ребра, несмотря на сохранение порядка. Сокращение SCC само по себе может быть полезным, но не означает отсутствие ReferenceError/TDZ, изменений при boot или в боевой механике. **Ledger остаётся 4, не изменять.**

## Исследование runtime без изменения игры

`dev/tests/ci/arch01c4a-virtual-runtime.mjs` использует тот же в памяти overlay: удаляется **только** строка `boss→skills` и меняется **только** порядок двух уже существующих import declarations в `logic/battle/stats.js`. Сборка на тех же production esbuild flags, 167/167 marker order. Проверяет cold Node VM boot **исходной и виртуальной версий** в изолированных временных HTML+JS (вне проекта; файлы удаляются). Контроль `CH.worm === WORM`, boss/raid phase, `skLv`, `skMax`, Duncan guard, `aiPlan`, `computeIntents`, `createBattle`, другие сигнатуры. Если виртуальная версия не стартует — явный **NO-GO**, без изменения игры и без отключения CI.

Если cold boot пройден — кандидат сверяется с **неизменёнными** золотыми результатами `tests/golden/battles.mjs` (200 боёв, включая 30 рейдов и 30 Джихад), `tests/golden/meta.mjs` (1539 метаслучаев), `tests/golden/saves.mjs` (real saves), и `tests/arch01c3b3-conquest-selectors.mjs` (5 сложностей, 10 боссов, все награды). Запрещено `--update`; ни одна сохранённая золотая строка не меняется. Вывод `ARCH-01C4a RUNTIME` — обязательный фактический источник GO/NO-GO для следующей фазы, даже если архитектурная диагностика возвращает PASS как read-only тест.

Физический iPhone Safari, настоящий браузер/WebGL PWA+artifact и CI на **реальных изменениях исходников** не выполняются на данном диагностическом шаге; даже все зелёные виртуальные golden не дают разрешения на merge/release. Следующий пакет, если runtime подтвердит кандидата, — **отдельный Stage B1 Draft PR** ровно с двумя кодовыми изменениями плюс baseline 4→3 и строгие real-world-тесты/CI. Иначе **NO-GO**, перейти к проектированию composition-root/раннего ESM bootstrap без рефакторинга геймплея. C3b0 и C2d строго не трогать.

Итоговый runtime receipt и актуальную ссылку на полный CI последнего head документировать в [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132). **NO MERGE, NO PUBLISH на Stage A.**
