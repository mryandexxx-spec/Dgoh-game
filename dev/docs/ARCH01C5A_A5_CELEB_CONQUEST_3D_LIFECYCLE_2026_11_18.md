# ARCH-01C5a-A5 — фактическая проверка CELEB / Conquest saves / Babylon lifecycle

**Scope: только Stage A5, diagnostics/read-only**, без реализации, merge и Pages publication. Frozen `main=b3d65303130dbd385caaac299f1f2dfc0473cd8c`, published v134 root `a057ea05ebc115cf5deca0222a4bb5aa5164ab48`, SW `a93dcde641`. Обязательный контекст: [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [A3 Draft PR #177](https://github.com/mryandexxx-spec/Dgoh-game/pull/177), [A4 Draft PR #178](https://github.com/mryandexxx-spec/Dgoh-game/pull/178), [A4 отчёт](https://github.com/mryandexxx-spec/Dgoh-game/blob/audit/arch01c5a-a4-virtual-runtime-bootstrap-20261118/dev/docs/ARCH01C5A_A4_UI_BOOTSTRAP_RUNTIME_DIAG_2026_11_18.md).

## Факты и мотивация

Замороженные source-инварианты: **173 modules, 1000 imports, 167 ESM markers, 898 public names, SCC [106,6], 2 historical forbidden data→runtime dependencies**: `data/conquest-data.js→ui/overlays/celebrate.js`, `data/story.js→assets/models.js`. A3 доказал UI-origin mincut 8 рёбер, из них 7 живых named bindings, исключив простое удаление порядка. A4 виртуально перемещал bootstrap в `ui/views/conq.js`, сохраняя 167 модулей, но сдвигая **47 ESM positions** и исключая только Conquest data из большого SCC [106,6]→[105,6]. [A4 full verified CI #44239990336 SUCCESS attempt 3](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44239990336), [A4 docs-only #44241561742 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44241561742). В узком real Chrome A4: 0 TDZ, но изменён module-ready order и warm splash; `showCeleb` запускался только при **пустой CELEB**, `b3Pre` был зарегистрирован, но actual `loadB3` и DGM не проверялись. Следовательно B1 NO-GO.

## Реализация Stage A5 — только диагностические файлы

Из чистого `main` создана самостоятельная feature-ветка с **5 путями**, без наследования A4 Draft и без изменения production source:

1. Новый `dev/tests/ci/arch01c5a-a5-virtual-bootstrap.mjs`: скопированный и переименованный проверенный A4 helper, получающий два **одинаково инструментированных** real esbuild scripts (baseline original v134 и candidate виртуальный Conquest→celebrate removal + UI-first preload). Замороженная static AST/SCC/ESM проверка обязательна, никакой записи в `src`/`dist`.
2. Новый `dev/tests/ci/arch01c5a-a5-real-lifecycle.mjs`: actual Chromium/Puppeteer, один и тот же настоящий validated PWA HTML/assets и URL map из проверенного `dist/app.unmin.js`. Только HTTP intercept `/app.js` в тестовых вкладках, без модификации любых файлов.
3. Единственный новый импорт диагностического test runner `dev/tests/ci/arch-init-graph.mjs`.
4. Единственный новый step PR-only E3 job в `.github/workflows/validate-pwa.yml`, после Chrome gear/memory smoke, перед DOM/idle.
5. Этот отчёт.

Сценарии по два отдельных реальных browser runs для `baseline` и `virtual`: **cold new save 844×390** и **warm historical `03-late.json` 667×375**, каждое с новым браузерным контекстом/страницей. Тест обязывает реальную **непустую** `cqBump('win',0,1)` → `NOTES` вида `cqf`, не синтетическую заглушку, затем `renderNotes()`. В одной цепочке запрашиваются две **непустые CELEB**: star Paul → unlock Paul, с реальным `showCeleb`, двумя `celebClick`, задержками событий, DOM-диалогами и проверкой завершения очереди. Отдельно создаётся устаревший *только тестовый* `S.conq.wk`, затем реальный `cq()` должен обнулить weekly `stars/done/route`, **не** стереть постоянный `S.cqUnlock.easy`; `persist0()` и **реальный `page.reload()`**, `loadSave()` проверяют сохранение. Новая test tab инициализирует fixture **один раз**, не очищает `localStorage` при reload.

Для 3D обязателен настоящий `loadB3()`, HTTP requests к `babylon3d.js` и минимум одному `*.dgm` (с верной validated asset URL map), положительные `HAS3D` / `globalThis.__B3` и заполнение `MODEL_DATA.duncan` после декодирования actual DGM. Собираются per-variant события, page errors, requested assets, weekly/notification/CELEB/UI snapshots и рассчитанная параллельная совместимость. **Baseline positive-flow asserts fail closed**: тест не может стать зелёным, просто пропустив проблемные сценарии. Любое обнаруженное отличие виртуального кандидата фиксируется как фактический NO-GO, даже если test job PASS на корректно измеренном unchanged v134.

## Доказательства и ограничения

Полный CI проверяет ***оригинальную*** v134 (golden battles/meta/saves/screens, 210 Campaign, SW/PWA, 3D MED/LOW/HIGH и Camp), а не контрфактическое изменение всех 47 ESM-модулей. Текущий A5 Chrome — **online PWA** с выключенным Service Worker ради изоляции, это **не** single-file standalone `dist/artifact.html`, не физический Safari/iPhone, не 3D EngineHost full wake/sleep/dispose cycles на virtual, не весь Conquest gameplay. Реальная загрузка Babylon/DGM сильнее предыдущей проверки только регистрации `b3Pre`, но не равнозначна полной безопасности 3D. В A4 оригинальный HUD projection smoke дал два transient failed-run до успешного attempt 3 на том же SHA; не скрывать повторения, не «фиксить» тест без отдельной задачи.

Для будущего B1 потребуется отдельное согласование владельца, включая **явный допустимый пересмотр SCC [106,6]→[105,6] и 47 ESM positions**, сохранение всех семи групп существующих именованных UI→logic/data APIs, реальную cold/warm/TDZ/CELEB+NOTES, Conquest weekly/difficulty/refill/saves, 3D/memory/protected Camp, offline/standalone и физический Safari. `Story→models` не входит в A5.

## Фактические CI и Chrome протоколы, замороженный A5 code SHA

**Проверенный кодовый HEAD `2a6897dfe70d4015e78fe0d542073e83616082f9`**, [**GitHub Actions #44243768929 — COMPLETED SUCCESS, run attempt 1, 19/19 mandatory jobs and final `All required checks passed` gate SUCCESS**](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44243768929). Публикация GitHub Pages **SKIPPED**, `main` и публичная v134 не затронуты. Реальный `Build once + architecture` job `134598004573` SUCCESS; реальный E3 iPhone UI + DOM idle Chromium job `134598431228` SUCCESS, включая новый A5 browser probe и существующие DOM/Gear/Ix. Продуктовый артефакт `dune-validated-build`, ID **14400559149**, digest **`sha256:efc750757dded826d14bd30b8dfae9d0bcc0d4f97698255cb053eeb2ab1bf5dd`**, 188 validated SHA-256 файлы, оригинальная v134 SW `a93dcde641`. Исходный v134 CI покрывает golden 200 battles + meta/saves/41 screens, Conquest, все 210 Campaign, offline/SW/PWA, MED/LOW/HIGH WebGL lifecycle, protected Camp.

**История fail-closed:** первый диагностический SHA `ee100f76993929540e6c4ed10bdd078845a4d21f`, Actions [#44243162687](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44243162687), имел **FAIL только нового A5 E3 probe**, потому что тест после первого `celebClick` делал фиксированную паузу 125 ms и преждевременно снимал второе окно UNLOCK. Важнейшее наблюдение: и baseline v134, и virtual имели тот же порядок событий, реальные `cqf` NOTES, настоящую звёздную награду, сохранение/перезагрузку и 5 успешно декодированных моделей; но UNLOCK к раннему снимку ещё не появился. Test-only correction заменил паузу на реальное `page.waitForFunction` для `#celeb.unlock` и завершения очереди (с ограниченным таймаутом), не изменяя `dev/src`/runtime/сейвы/ассеты. Этот старый workflow позже **CANCELLED** новым HEAD; его красный диагностический gate не скрывается. Исправленный code SHA прошёл full CI уже с первой попытки.

### Фактический Chrome: cold и warm

Эксперимент запускает baseline и virtual как два **реальных** скрипта с одной production-asset map, один и тот же HTML и ресурсы; для каждого отдельная browser tab. Positive-flow baseline asserts пройдены и обе ветки сравниваются по детерминированным результатам. **`candidateParity=true` в обоих ограниченных сценариях**, но это не доказательство отсутствия проблем за их рамками.

| Событие | Cold new save 844×390 | Warm historical save 667×375 |
| --- | --- | --- |
| `cqBump('win',0,1)` реальные Conquest NOTES | **2**: `g:win` 1/30, `0:win` 1/6 | **2**: те же |
| CELEB STAR Paul → UNLOCK Paul | **оба настоящих DOM окна**, STAR и UNLOCK с текстом и close callbacks | то же |
| Очередь CELEB после двух закрытий | **0**, `#celeb` отсутствует | **0**, `#celeb` отсутствует |
| Рендер NOTES | очередь хранит 2 `cqf`; контейнер существует, но **hidden=true** в текущем UI context | то же |
| Недельный `cq()` | `wk=Mon Nov 16 2026`, сброшены `stars=0/pts=0/done=0/route=0` | то же |
| Постоянная разблокировка после `persist0`/реального reload | `S.cqUnlock.easy='a5-permanent-unlock'` и в живом S, и после `loadSave` | то же |
| Реальная загрузка Babylon/DGM | `loadB3()=true`, `HAS3D=true`, `globalThis.__B3=true` | то же |
| Декодированные `MODEL_DATA` | **5**: `baron, baron_legend, duncan, muaddib, worm` | те же 5 |
| HTTP requests за два page loads в каждой ветке | `app.js=2`, `babylon3d.js=2`, `DGM=10`, live engines 1 | те же |
| Browser `pageerror` | **0 / 0** | **0 / 0** |
| Exact selected normalized snapshots baseline ↔ virtual | **совпали** | **совпали** |

Эта проверка уже **не** ограничивается регистрацией `b3Pre(loadAssets3)`: физические DGM-ресурсы запрошены и `MODEL_DATA.duncan` успешно заполнен, Babylon готов и один живой engine существует. Это всё ещё **не** virtual 3D EngineHost mount→wake→sleep→dispose / GPU budgets. UI notification `NOTES` содержал реальные новые записи, однако `#notes` был **hidden** и текст Conquest-уведомления в закрытом контейнере не виден; поэтому не заявлять доказанное отображение в игровых контекстах после снятия overlay. Очередь STAR→UNLOCK и drain проверена через реальные DOM-события, а не просто наличие вызванных функций.

**Virtual graph/order не изменился относительно A4:** тот же 47-marker shift, `[105,6]` с исключением только `data/conquest-data.js`, тогда как настоящий `main` всё ещё содержит две старые data→runtime зависимости. В CI полного исходного приложения нет изменения продукта, source schema/ledger/golden, root PWA, SW, версии, UI/Camp/WebGL или моделей.

### Ограничения B1 и решение

**ARCH-01C5a-A5 Stage A DIAGNOSTIC COMPLETE, исследовательский browser parity 2/2 PASS; source B1 — NO-GO до самостоятельного owner-approved design/implementation package.** Нужны явная демонстрация неизменного поведения остальных 47 ESM-позиций/TDZ, полноценный **виртуальный** Conquest difficulty/refills/weekly/feats/saves regression, offline/SW и single-file artifact, реальный 3D EngineHost 3 циклов и budget, physical Safari/iPhone и explicit owner acceptance SCC shrink `106→105`. Сохранить все семь именованных UI→data/logic интерфейсов A3, не менять Story→models/3D baker/camp в этом пакете. Возможен следующий Stage A6 **только архитектурный дизайн explicit UI-owned composition/registration contract**, без запуска B1 по умолчанию, если владелец пожелает продолжить.

**Final report-only SHA CI receipt:** в отдельном документационном commit после real code CI; pending final exact SHA. 

