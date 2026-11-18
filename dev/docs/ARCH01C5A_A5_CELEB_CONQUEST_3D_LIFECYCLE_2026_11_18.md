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

## Реальные CI-протоколы

**PENDING:** привязать точный code SHA, build/E3 Chrome outputs (включая actual positive CELEB, cqf, persistent rollover, Babylon/DGM), полный CI и отдельный docs-only HEAD receipt. Никакого заявления о B1 GO или публикации.
