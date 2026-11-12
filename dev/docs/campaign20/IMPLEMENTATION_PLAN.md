# Campaign 2.0 — архитектура и план реализации

Статус 2026-11-12: C1 UX принят, C2 разрешён к старту, **игровая реализация ещё не начиналась**. Ветка `feat/campaign20-caladan-prototype`.

## Техническая схема
Путь `data → logic → ui/render3d` без обратных зависимостей. Общий `EngineHost`; сцена `GameScene` с `create / wake / update / sleep / dispose` и `mode(active/idle/static/paused)`. Не создавать `Engine`, свой WebGL render loop, rAF или интервалы. Babylon ленивый `babylon3d.js`.

Предлагаемые модули (имена предварительные, сверить реальную структуру импортов/цепочку до изменений):
- `src/data/campaign-map-presets.js`: описания глав и схемы расстановки, координаты точек, ссылки на окружение; пока конфигурация только Каладана.
- `src/logic/campaign-map.js`: чистая проекция `NODES` + unlock/cleared/selected и проверка доступности, тестируемая без DOM/Babylon. Не дублировать `nodeOpen`.
- `src/render3d/scenes/campaign-map.js`: terrain, props, camera, picking, markers, lifecycle, fallback-сигналы и адаптация профилей.
- `src/render2d/campaign-map.js`: интерактивный упрощённый fallback (без WebGL).
- `src/ui/views/campaign-hub.js`: 2 больших обложки; переход к `S.campTab`.
- `src/ui/views/camp.js` (или вынос в подмодули): постоянная оболочка карты/глав/сторон, карточка миссии и модалка (разбивать при ~600 строках).
- `src/styles/campaign20.css`: безопасные области и responsive viewport; UI-kit.
- `src/ui/events.js`, `src/ui/router.js`, `src/render3d/quality.js`, `tools/split.config.mjs`, `src/pwa/sw.js` (если новые ассеты) — интеграционные изменения.

**Важный контракт:** не создавать карту путем DOM-рендера 10 HTML-карточек поверх 3D с постоянным чтением layout в update; picking/проекция маркеров/позиции — кэшированные, обновлять точечно при движении камеры. Все параметры DPR/тени/FX/качества через `render3d/quality.js`.

## Этап C2 — рабочий 3D-пилот Каладана
1. Уточнить фактический head/release-контекст ветки и зависимости после последних изменений проекта; не трогать `main`. Сверить `CHANGES_STATUS.md` «Открыто», UI-kit, связанное GE2.
2. Реализовать чистую таблицу геометрии Каладана: 10 миссий с неизменными ids/порядком, прибрежная крепость, море, утёсы, гавань, космопорт; ограничить полигоны, текстуры, draw calls.
3. Подключить `EngineHost` / `GameScene`; touch pan, pinch-zoom, ограниченный rotation, reset/center; чётко разделить drag от tap и соблюсти безопасные границы.
4. Показать 10 узлов (утверждённый размер 50px, финальный 60px как ориентир), состояния открыто/закрыто/пройдено/босс, звёзды, контраст/подсветка, hit area и no-overlap.
5. Сохранить интерфейс 2 обложек и 3 режимов, главы, compact card + modal. Первые интерактивные данные — реальный Каладан из `NODES`, для неготовых окружений безопасный fallback без ложных обещаний готового 3D.
6. 2D-fallback, скрытие/idle карты при модалках/других экранах. Сравнительный скриншот 844×390 MED, 667×375 LOW и отсутствие scroll.
7. На C2 **не заменять боевые правила/награды/экономику**, не публиковать без отдельного согласования результата.

## Этап C3 — интеграция миссий и фарма
- Реальные `data-node`, `data-sim`, диалоги, требования, награды, входы из поиска предметов, полное восстановление предыдущего состояния.
- Все 3 режима, главы и progressive unlock, squad, энергия, 3★ симуляция.
- Тесты legacy saves и item-source navigation.

## Этап C4 — окружения
- Повторно используемые кит-наборы: Caladan sea/cliffs/fortress, Giedi industry, Arrakis desert/city/sietch/storm, Chronicles eras (court/ruins/machines/etc.).
- Каждой главе — scene preset, маршрут узлов, props, собственная атмосфера; совместимые ресурсы/качество. Художественное согласование пачками, не генерировать 20 одинаковых сцен.
- Новые ассеты: `dev/assets/`, KTX2, fallback; source `dev/assets-src/`, учёт SW.

## Этап C5 — quality gates и поставка
- Проверка `node tools/check-deps.mjs`, `node tools/check-bundle.mjs dist/pwa/app.js`, `node tests/run.mjs dist/pwa/index.html --no-dom` между шагами.
- Перед release: `npm test`, golden на artifact/PWA без непрошенного `--update`; `tests/smoke/dom.mjs` desktop и `--phone`, `tests/smoke/3d.mjs --cycles 2` desktop и `--phone`, `tests/smoke/ab.mjs --gfx` MED/LOW, `tests/smoke/perf.mjs --gfx` MED/LOW, `tests/smoke/sw.mjs` при новых static assets.
- iPhone: 844×390 / 667×375, safe area, WebGL/2D, тест 10–15 мин на нагрев и FPS, PWA reopen; profile `high/med/low`.
- База perf из `ARCHITECTURE.md`: деградация по MED/LOW >10% по любому измеряемому показателю — вынести на согласование. Новая сцена должна иметь отдельный бюджет и замер, **нельзя сравнивать неподходящие разные сцены как A/B**; дополнительно следить за общим нагрузочным регрессом.
- Обновление версии/журнала `CHANGES_STATUS.md` — при реальном выпуске, релиз через установленный процесс. Не изменять утверждённые golden без отдельного согласия.

## Риски и решения
- **Размер узлов / плотность:** 10 на viewport помещаются не всегда; часть карты за границей камеры — допустима, страничный scroll запрещён. Увеличение hit-target и cluster/cull на отдалении, без перекрытий.
- **GPU и тепло:** baked lighting, instancing/merged props, ограниченные материалы и текстуры, optional particles off LOW, static-idle вне drag.
- **Исторические карты:** не смешивать механику/сохранения `C` с L/D.
- **Viewport 667×375:** HUD не должен перекрывать карту/управление, модалка может иметь вкладки/пагинацию вместо scroll.
- **Открытые GE2/BH:** проверить реальные merge/release перед началом технической интеграции, чтобы не потерять исправления симуляции и Барона.
