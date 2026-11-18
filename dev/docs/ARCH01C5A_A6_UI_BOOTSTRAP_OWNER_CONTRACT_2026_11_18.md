# ARCH-01C5a-A6 — UI-owned Conquest bootstrap: утверждаемый контракт B1, без реализации

**Stage A6: architecture/design + fail-closed executable contract only. НЕ Stage B1.** Base `main=b3d65303130dbd385caaac299f1f2dfc0473cd8c`, officially published **v134**, root `a057ea05ebc115cf5deca0222a4bb5aa5164ab48`, SW `a93dcde641`. Цель: сохранить настоящую PWA iPhone/Safari архитектуру, Conquest и награды в стиле SWGOH при закрытии `data/conquest-data.js→ui/overlays/celebrate.js`. **Merge/публикация/изменение `dev/src` не входят в A6.**

## Источники и основание

- [GitHub Issue #132 — ARCH-01C](https://github.com/mryandexxx-spec/Dgoh-game/issues/132); правила `dev/ARCHITECTURE.md` и `dev/docs/PROJECT_INSTRUCTIONS.md` выше исторической гипотезы. Открыто в `dev/CHANGES_STATUS.md`: 2 forbidden dependencies, реальный iPhone Safari field acceptance.
- [A2 Draft #176](https://github.com/mryandexxx-spec/Dgoh-game/pull/176): исследованы 100 виртуальных кандидатов; **0 точных ESM-порядков**; лучший UI-first сдвигает 47/167 ESM-позиций. Это не доказательство невозможности любого решения.
- [A3 Draft #177](https://github.com/mryandexxx-spec/Dgoh-game/pull/177): 16 direct imports из `celebrate`, 12 транзитивно возвращают в Conquest; min-cut только по UI-owned arcs = 8 (7 именованных ESM APIs + 1 order-only), НЕ пригодный «удалить 8 импортов» патч. При полном чистом data-слое прежний mixed SCC не может сохранить прежних членов.
- [A4 Draft #178](https://github.com/mryandexxx-spec/Dgoh-game/pull/178): настоящий Chromium cold/warm и virtual esbuild; 0 TDZ в узком тесте, но **перемена фактической module-ready последовательности**, а также различие раннего warm splash; candidateParity=false.
- [A5 Draft #179](https://github.com/mryandexxx-spec/Dgoh-game/pull/179), [real complete CI #44243768929 SUCCESS 19/19 attempt 1](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44243768929), [final docs-only #44244923627 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44244923627): отдельные **2/2 browser scenarios совпали** на выбранных метриках с реальными `cqf`, STAR→UNLOCK, недельным rollover/reload и пятью decoded 3D models. Но это **не** proof полной виртуальной B1 рефакторизации, скрытые `#notes` и не проверенный Safari/standalone/EngineHost остаются.
- Current frozen v134 contract: 173 source modules, 1000 static imports, 167 ESM marker modules, 898 named exports, original large SCC [106,6], 2 old forbidden edges (Conquest→celebrate; Story→models); 0 new/stale forbidden.

## Выбранный минимальный B1-дизайн для отдельного будущего согласования

**Ответственный за порядок — существующий `ui/views/conq.js`.** Не создаём новый UI-модуль и не перемещаем объявленные API, функции, данные, DOM/схемы сохранений. Будущая *минимальная, пока НЕ выполняемая* правка — ровно две строки импорта:

```diff
--- a/dev/src/data/conquest-data.js
+++ b/dev/src/data/conquest-data.js
@@
-import '../ui/overlays/celebrate.js'; // порядок исполнения
 import { MENTAT } from './chars.js';
--- a/dev/src/ui/views/conq.js
+++ b/dev/src/ui/views/conq.js
@@
+import '../overlays/celebrate.js'; // UI владеет инициализацией наград Conquest
 import { cq, cqAddDisk, cqCanClaim, cqCanOn, cqChest, ... } from '../../logic/conquest.js';
```

Последняя строка `...` — **сокращённая иллюстрация**, не допустима для дословного patch/replace: в исходнике 38 реальных именованных импортов, они все должны остаться **байт-в-байт**. Нельзя добавлять импорт UI в `data`/`logic`/`render3d`, заменять семь групп живых named APIs на side-effect imports или смешивать этот пакет с `data/story.js→assets/models.js`, 3D baker или protected Camp.

### Фазы исполнения и ownership

| Фаза | Владелец | Контракт и контроль |
| --- | --- | --- |
| 0. ESM evaluation | root `boot.js` → `ui/views/conq.js` → `celebrate.js` → transitive imports | Только `ui/views/conq.js` объявляет новый UI predecessor; `data/conquest-data.js` содержит только data→data imports. Все имена и количество source ESM modules сохранены. |
| 1. Module-level registration | `ui/notifications.js`, `ui/overlays/squad-select.js`, `assets/models.js` | **Ровно один** top-level `onPersist(notePoll)`, `rewardHooks.unlock = id => celebQueue(...)`, `b3Pre(loadAssets3)`. Эти регистрации выполняются до root `boot.js` startup в оригинальном и виртуальном графе; не допускать двойных обработчиков, скрытого lazy dynamic import и раннего `notePoll` до гидратации `S`. |
| 2. Hydration и первый render | `core/boot.js.start(data)`, вызванный из `boot.js` | В начале `set_S(data.save || loadSave() || newSave())`, затем `metaFill/noteSnap`, `persist`, `render`, `splashOff`. Нельзя перемещать `start` в UI-data или запускать дважды; `window.claude.hot.ready` hook сохраняется. |
| 3. Conquest + UI events | `logic/conquest.js` → `S.conq`; `ui/notifications.js` / `celebrate.js` / `router.js` | `cqWeek/cq()` через stale rollover меняют только недельные поля, `S.cqUnlock` сохраняется. `cqBump`→`NOTES` / `onPersist`→`notePoll`; STAR/UNLOCK очереди показываются последовательно, не под active battle/modals. `#notes` должен реально показаться, когда все гейты скрытия сняты, не только заполнить невидимую очередь. |
| 4. Lazy 3D + Camp lifecycle | `render3d/base.js`, `assets/models.js`, `EngineHost` | `b3Pre(loadAssets3)` регистрируется **до первого** `loadB3`, но не удерживает readiness дольше ограничителя. Настоящие Babylon/DGM/KTX2 fetched, 3D loaded, затем protected `EngineHost` cycles (wake/sleep/dispose), один engine, нет новых leaks/compile после wake; 2D fallback сохраняется. |
| 5. Artifact & PWA | fail-closed CI + владелец | root PWA, standalone single-file HTML, offline/SW, SHA-256 manifest и iPhone Safari отдельно подтверждены до merge/release. Нельзя переносить в `main` один лишь успешный Chrome diagnostic. |

### Защита 7 именованных ESM API границ

A3 concept min-cut identifies **8** distinct UI edges; 1 order-only исторический `ui/hero-window.js→core/boot.js`, который тоже нельзя считать автоматически безопасным для удаления. **Оставшиеся 7 неизменяемых named edges (и их реальные symbol-count):**

| UI owner → dependency | Нынешняя структура | Требуемое B1 |
| --- | ---: | --- |
| `ui/battle/battle-ui.js→boot.js` | 2 named (`hourglass, spiceUser`) | Полностью сохранить |
| `ui/notifications.js→data/conquest-data.js` | 1 named (`CQ_SECT`) | Сохранить |
| `ui/overlays/squad-select.js→logic/conquest.js` | 10 named | Сохранить |
| `ui/overlays/squad-select.js→data/conquest-data.js` | 4 named | Сохранить |
| `ui/views/conq.js→logic/conquest.js` | 38 named | Сохранить |
| `ui/views/conq.js→data/conquest-data.js` | 18 named | Сохранить |
| `ui/views/lobby.js→logic/conquest.js` | 1 named (`cqHot`) | Сохранить |

**Сумма 74 настоящих named bindings на 7 UI edges.** Защищаются **точные имена и узлы импорта** Acorn, а не только количество. Общая функция `renderNotes()` и регистрация `onPersist(notePoll)` не перепривязываются. Недопустима фиктивная «победа» посредством ослабления исходных golden или переписывания `SPLIT` для маскировки порядка.

### Неустранимое отклонение графа — отдельное решение владельца

Обязательная модель future B1: исходный SCC `[106,6]` → виртуальный `[105,6]`, из большого SCC выходит **только `data/conquest-data.js`**. Сохраняются те же 173 source modules / 1000 imports / 167 ESM markers и те же 167 ESM module names, но **47 позиций меняют порядок**; первой (0-based index 118) исходная `logic/trials.js` уступает `data/conquest-data.js`. Нельзя оставлять прежний «точно идентичный [106,6]» контракт обязательным для очищенного data-слоя, но его изменение **не является автоматическим разрешением**: нужен отдельно утверждённый новый допустимый SCC set и доказательство отсутствия TDZ / ранних побочных эффектов / потерянных callbacks. Полный исходный набор проверок на неизменённой v134 не доказывает эквивалентность виртуального кандидата для всех 47 позиций.

### Машинный A6 guard (без изменения игры)

Новый `dev/tests/ci/arch01c5a-a6-ui-bootstrap-contract.mjs` запускается из уже обязательного `arch-init-graph.mjs`. Проверяет на исходной v134 и **виртуальном** candidate, который существует только в esbuild `onLoad`:

- Exact 7 named UI ESM edge bindings и **74 symbol names**, один исторический order-only `ui/hero-window→core/boot`; все неизменны и в виртуальном candidate.
- Top-level registrations `onPersist(notePoll)`, `rewardHooks.unlock = ...`, `b3Pre(loadAssets3)` — ровно один раз каждое, а root `boot.js` импортирует UI-owner до вызова `start`. Acorn проверяет, что `core/boot.start` сперва вызывает `set_S`.
- Two *negative in-memory mutation controls*: удаление `CQ_SECT` named import или одной из двух основных регистраций **обязательно приводит к FAIL** guard (тесты мутаций не пишут файлов).
- Actual Acorn graph original `173/1000/0 dynamic/[106,6]/2 historical debts`; virtual `173/1000/[105,6]/1 оставшийся Story debt`; только `data/conquest-data.js` выходит из прежнего 106-member SCC.
- **Real esbuild** baseline `167/167 frozen source markers` и virtual 167 с теми же именами и документированными 47 shifted positions; все module-level registration modules в обеих сборках до `boot.js`. Не меняет `SPLIT`/baselines/golden/version.
- Тест явно выводит `realB1Go:false`; он утверждает **контракт проекта**, не безопасность конечного продукта и не доступность поля Safari.

Новых runtime/CI workflow команд нет: этот guard наследует уже обязательный Acorn architecture gate. В A6 PR **только 3 paths**: этот файл, test-hook `dev/tests/ci/arch-init-graph.mjs`, текущий документ; никаких `dev/src`, `assets`, `save`, `SPLIT`, CI workflow, root PWA/SW files.

## Матрица приёмки отдельного B1 (пока не разрешён)

| Gate | Нужное свидетельство | Сейчас |
| --- | --- | --- |
| **B1-0 Owner** | Письменное согласование SCC точного `106→105`, 47 ESM shifted slots и границ scope | **OPEN / требуется** |
| B1-1 Graph & API | 2 forbidden source edges → 1; 0 new/stale; 173/1000/167 same names; 74 named bindings; registration pre-start | Только **виртуальный** A2/A6 |
| B1-2 TDZ/start | cold/warm multiple fixtures + hot reload + event registration once + no TDZ + splash convergence | A4/A5 частично |
| B1-3 Conquest | weekly rollover, refill, route, discs, bosses, reward/chest, unlock, feats, persistent saves (4 golden) | A5 частично, исходная PWA full pass |
| B1-4 CELEB/NOTES | STAR→UNLOCK, nonempty cqf notifications **visible when eligible**, modal/battle hiding, dedup and delayed callbacks | A5 partial, hidden note |
| B1-5 3D + protected Camp | actual B3/DGM/KTX2, MED/LOW/HIGH, EngineHost mount/wake/sleep/dispose 3+ cycles, GPU/resource budget | A5 actual assets, rest OPEN on virtual |
| B1-6 Packaging | original PWA **and candidate** standalone `artifact.html`, offline/SW / no stale-cache / 188 SHA-256, physical iPhone Safari landscape | OPEN |
| B1-7 Test suite | New **real** source B1 full CI all mandatory jobs + final gate first/verified retry, no oracle cheating | OPEN |
| B1-8 Release | Owner accepts PR, then separately approves merge and validated Pages publish, verifies root SW version | OPEN |

**Decision for A6:** Design + executable source-contract guard may be accepted as Stage A6 with CI; **not permission for Stage B1**, merge or publishing. If owner does **not** accept 47 ESM shifts / SCC membership shrink, stop and design a different composition solution rather than hiding drift or amending tests. Future project issue/PR must preserve this explicit handoff, with A6 report + CI immutable SHA.

## Реальный CI A6: верификация и решение Stage A

**Точный code+test HEAD `b68152a2e383b3b2fd9a455a8edea06c5e742bb0`** — [**GitHub Actions #44247930713 COMPLETED SUCCESS, attempt 1, все 19 обязательных jobs включая final gate `All required checks passed` SUCCESS**](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44247930713). Публикация PWA **SKIPPED**. Реальный `Build once + architecture + SHA-256 manifest` job **134611419915 SUCCESS**, в котором выполнялся новый A6 guard до real production build; полноценно прошли golden, Campaign 2.0 (210 missions), Conquest, PWA/offline/SW, WebGL MED/LOW/HIGH, camp/performance, E3 DOM, battle/arena. Это полный CI для ***неизменённой v134 игры плюс read-only диагностика***, а **НЕ** для внесённого в product кандидата B1. Original validated `dune-validated-build` artifact **ID 14402920760**, SHA-256 **`8cd01c6ab902b1511b1d17443e08388293826ca8cc5e77e228dbed93bef1b765`**, 188-файловый пакет PWA. Ни `dev/src`, `SPLIT`, version, golden, save, published Pages/SW не изменялись.

**Реальный вывод нового A6 architecture gate в Actions log:**

```json
{
  "main": "b3d65303130dbd385caaac299f1f2dfc0473cd8c",
  "contractOwner": "ui/views/conq.js",
  "originalSourceModules": 173,
  "originalImports": 1000,
  "frozenESM": 167,
  "virtualESM": 167,
  "shifted": 47,
  "firstMismatch": 118,
  "firstOld": "logic/trials.js",
  "firstVirtual": "data/conquest-data.js",
  "namedAPIEdges": 7,
  "namedSymbols": 74,
  "topLevelRegistrations": 3,
  "sccOriginal": [106, 6],
  "sccVirtual": [105, 6],
  "expelled": ["data/conquest-data.js"],
  "originalDebts": [
    "data/conquest-data.js -> ui/overlays/celebrate.js",
    "data/story.js -> assets/models.js"
  ],
  "virtualDebts": ["data/story.js -> assets/models.js"],
  "baselineAndCandidateRegistrationsBeforeStart": true,
  "sourceEdits": 0,
  "stage": "A6 design only",
  "realB1Go": false
}
```

В guard были **три отдельные отрицательные in-memory мутации**: удаление именованного `CQ_SECT`-импорта, удаление `b3Pre(loadAssets3)`, удаление `rewardHooks.unlock=...`. Каждая проверка успешно обнаружила утрату соответствующего контракта. Имя консольного флага `twoNegativeContractMutationsDetected` — историческое короткое название поля, **тест фактически проверяет все три** через три `assert.throws`. В продакшн-файлы эти мутации не попадали.

**Техническая готовность Stage A6: PASS только на уровне дизайна/исполняемого baseline+virtual контракта.** Границы допустимости реализации сформулированы и пока **НЕ утверждены владельцем**. B1 implementation remains **NO-GO**, пока не подтверждены explicit SCC-change, 47 ESM drifts, product/runtime tests на **реальном source candidate**, standalone+offline, visible NOTES, full Conquest gameplay, 3D EngineHost+protected Camp и physical iPhone/Safari. Оригинальный `main` продолжает содержать **2** source debts.

**Final docs-only HEAD:** будет отдельно указан в PR/Issue после независимого `reuse/full` CI. Нельзя приписывать этому документационному коммиту новый полный WebGL прогон, если planner законно использует verified coverage real run #44247930713.

