# ARCH-01C5a-A4 — UI bootstrap: виртуальная проверка TDZ, CELEB/NOTES и 3D preloader

**Scope:** исследование / Stage A4, без изменения игрового кода, баланса, сохранений, `SPLIT`, golden, графики, 21 карты / 210 миссий Campaign 2.0 и защищённого лагеря; без merge и публикации. **Base `main=b3d65303130dbd385caaac299f1f2dfc0473cd8c`, выпуск v134**, public root `a057ea05ebc115cf5deca0222a4bb5aa5164ab48`, SW `a93dcde641`. Репозиторий [Dgoh-game](https://github.com/mryandexxx-spec/Dgoh-game), [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [A3 Draft PR #177](https://github.com/mryandexxx-spec/Dgoh-game/pull/177); [A3 final head CI #44189365949 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44189365949).

## Причина исследования и границы доказательства

- Остаются ровно две исторические запрещённые связи: `data/conquest-data.js→ui/overlays/celebrate.js` и `data/story.js→assets/models.js`. В последних релизах v134 ранее проверены 173 JS, 1000 static imports, 167 ESM-позиций, 898 имён и SCC [106,6]; publication checks реальны.
- [ARCH-01C5a-A2](https://github.com/mryandexxx-spec/Dgoh-game/pull/176) проверил 100 законных позиций переносов и нашёл **0 exact ESM**. Лучший (`ui/views/conq.js:first`) сдвинул **47 из 167** ESM-позиций, `data/conquest-data.js` один вышел из SCC 106→105.
- [ARCH-01C5a-A3](https://github.com/mryandexxx-spec/Dgoh-game/pull/177) нашёл 12 из 16 исходящих `celebrate`-веток, ведущих обратно к Conquest, и минимальный **UI-author-owned** графовый разрез **8 рёбер, из них 7 именованных**. Поэтому простое удаление «порядковых» связей не работает. Часть путей заходит в `data/story→assets/models→render3d/scenes/baker`.
- Доказано: если слой `data` импортирует только `data`, невозможно буквально сохранить смешанный data+UI SCC [106,6] после очистки двух долгов. Пересмотр допустимого конкретного состава SCC возможен **лишь после отдельного разрешения владельца и фактического bootstrap/TDZ/runtime доказательства**, не посредством обхода тестового контракта.

## A4 — два новых независимых уровня диагностики

1. `dev/tests/ci/arch01c5a-a4-virtual-bootstrap.mjs` — компиляция неизменённого v134 через настоящий production-equivalent esbuild и компиляция **виртуального контрфактического** кандидата в памяти. Меняет только две временные строки в esbuild `onLoad`: удаляет `data/conquest-data.js→celebrate.js` и добавляет `import '../overlays/celebrate.js'` **перед** существующим первым импортом `ui/views/conq.js`. Требует `167/167` имён модулей без missing/extra, **ровно 47 moved**, first mismatch #118, SCC [105,6] с точно одним вышедшим `data/conquest-data.js`, ровно 1 оставшийся исторический reverse-edge и 0 новых долгов. Оригинальный v134 ESM порядок обязателен **167/167**. Любое расхождение с замороженной исходной структурой — красный diagnostic gate.
2. `dev/tests/ci/arch01c5a-a4-browser-differential.mjs` запускается в **обязательном E3 Chromium job** в отдельной PR-ветке после проверенного `dune-validated-build`. Он строит два браузерных JS-бандла **в памяти**: baseline original+identical read-only instrumentation и тот же instrumented кандидат 47 moved. Путь model `ASSET` формируется **строго из validated `dist/app.unmin.js`**, без заглушек или поддельных 3D URL. Подменяется только HTTP-ответ `/app.js` локального тестового PWA-сервера в Puppeteer; `dist`, `dev/src`, `app.js`, `sw.js` и project files не переписываются. Сравнение в изолированных вкладках **cold new save / 844×390** и **warm late save / 667×375**: фактические pageerrors/TDZ, первые 17 меток ESM module-ready, регистрация `b3Pre(loadAssets3)`, `onPersist(notePoll)`, вход в `core/boot.start()`, установленные `MutationObserver`, подписки DOM, интервалы, `CELEB`/`NOTES`, Conquest table length/save schema и вызовы `notePoll/renderNotes/showCeleb/cqStatic`.
   - Это **реальный Chrome PWA**, а не только AST / фиктивная VM; входные saver fixtures и контент страницы берутся из той же подтверждённой сборки.
   - Результат помечает **candidate parity vs baseline**. Любое нарушение TDZ, инициализации модели, установки observer/notes, UI или отклонение маркеров — предметный NO-GO; baseline TDZ = невалидное испытание; случайный SUCCESS виртуального кандидата **всё равно не может быть B1 GO** из-за 47 переставленных старых ESM marker positions, непроверенного standalone HTML/физического Safari/iPhone и необходимости независимого owner-review.

**A4 изменяет только:** два новых diagnostics JS `dev/tests/ci`, один обязательный architecture test hook `dev/tests/ci/arch-init-graph.mjs`, один дополнительный шаг Chrome в PR-ветке `.github/workflows/validate-pwa.yml`, текущий документ. `dev/src`, `SPLIT`, архитектурные baseline/golden, `dev/version.json`, root `index.html` / `app.js` / `sw.js`, renderer/camp/saves/assets untouched.

## Возможный законный дизайн будущего контракта

Если архитектурное решение станет возможно, **`data/conquest-data.js` остаётся pure data**, существующие именованные импорты в `logic/conquest.js`, `ui/views/conq.js`, `ui/overlays/squad-select.js`, `ui/notifications.js` и прочих UI-обработчиках остаются действительными. **Владелец порядка** — `ui/views/conq.js` или специальный `ui/` composition/bootstrap-модуль, подключаемый из `boot.js` до cold/warm hydration. Это не должно менять `core/boot.start`, `renderNotes`, UI events или `b3Pre(loadAssets3)` без доказательства регистрации и TDZ. Строго запрещено вводить DOM в `data/logic`, импорт UI в `data` или превращать живые именованные контракты в фиктивные side effects.

Альтернатива, если даже лучший кандидат ломает холодный старт: **сначала уточнить семантику ранней инициализации, а не пытаться воспроизвести прежний ESM порядок просто перестановкой импортов**. Проектировать маленькие порты/фабрики поздних UI-хуков допустимо только после доказательства необходимости, сохранения публичных API и performance бюджетов, отдельным будущим Stage A5.

## GO / NO-GO

- **GO только для завершения Stage A4 как исследования**, если virtual/actual Chrome диагностика работает на оригинальной v134, воспроизводит 47 перестановок, осмысленно отражает реальные различия, fail-closed тесты зелёные.
- **B1 NO-GO по умолчанию независимо от результата** — нельзя внедрять реальный код без отдельного user approval и полного поведения: 200 battle golden, 1560 meta, 4 saves, 41+ screens, Conquest weekly/reset/route/refill/feats/difficulty/notes/celebration, full cold/warm PWA+standalone HTML, offline/SW, 3D/model preloader, WebGL LOW/MED/HIGH, Campaign 2.0 210, лагерь и реальный iPhone Safari. Запрещено исправлять ESM/golden тесты «для зелёного» без утверждённого новой contract/order/TDZ proof.
- Если Chromium-кандидат падает или меняет события, **признать конкретный NO-GO**; не считать его безопасным только потому, что CI на *оригинальной* v134 зелёный.

## Фактическая проверка A4: реальные esbuild / Chrome / CI

**Исходный диагностический HEAD** `8c79c6ad3a85b521a04608cc5c881be12549fb31` (код тестов и PR-only workflow; `dev/src` НЕ изменён). [**GitHub Actions #44239990336 — COMPLETED SUCCESS, attempt 3**](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44239990336), итоговый `All required checks passed` **SUCCESS**, `Publish verified PWA to GitHub Pages` **SKIPPED**. Первый полный запуск: 17 обязательных рабочих заданий успешны, но единственный оригинальный `Arena animation continuity + HUD + lighting` FAILED (`flash-expired HUD projection drift u0`, 844×390 MED); следовательно final gate FAILED. Первая перепроверка `rerun failed jobs` **на том же SHA, без правок теста/игры** снова дала original Arena FAIL (`flash-expired HUD projection drift u9`, 667×375 LOW; MED subcase PASS). Вторая перепроверка **только упавшего job** на неизменённом SHA (attempt 3) закончилась **SUCCESS**; final gate подтвердил полное проверенное покрытие. **Оба первых падения сохраняются как наблюдение нестабильного исходного HUD-smoke**, не скрываются и не приписываются виртуальному bootstrap. Они не основание менять рендер или эталоны в A4.

Реальный `Build once + architecture + SHA-256 manifest` job **`134585367476` SUCCESS**. Реальный E3 Chrome job **`134585790116` SUCCESS в исходной попытке**: существующие gear/memory IX/DOM и новый A4-browser differential PASS. Верифицированный package **`dune-validated-build`, artifact ID `14398639550`**, SHA-256 digest `92741ce741d4acaa3704cff3dd4fe385d0505646dfaa5a8e816443915df6a07c`, 188 проверенных PWA файлов, v134, SW `a93dcde641`. **Данный CI относится к кодовому HEAD, не к документационной последующей записи.**

### Проверенный виртуальный bootstrap graph

Тест `arch01c5a-a4-virtual-bootstrap.mjs` проверил настоящим esbuild: 173 JS, 1000 imports, original **167/167** ESM markers, virtual содержит те же 167 модулей, **47 ESM-позиций сдвинуты**, first mismatch **index 118: original `logic/trials.js` vs virtual `data/conquest-data.js`**; SCC **[106,6]→[105,6]**, из большого SCC выходит строго `data/conquest-data.js`, новых data→runtime рёбер **0**, в контрфактическом графе остаётся только Story→models. Оригинальная программа/ledger **по-прежнему имеют две запрещённые зависимости**. Source edits на диске и `SPLIT` edits **0**. Builder instrument source uses exactly the same event probes in both versions; actual validated production model asset URL map is copied into both virtual browser bundles, never replaced with a fake empty map.

### Реальный браузерный дифференциальный тест (одинаковое HTML, ассеты и контекст)

Обязательный E3 Chromium создаёт две изолированные вкладки с **исходным** и **виртуальным** JavaScript, оба собираются в памяти и подменяют только HTTP `/app.js` в локальной PWA. Test runtime covers a new save at **844×390 phone** and existing late-save fixture **667×375 phone**, not a simulated Node VM. Each response is downloaded exactly once, page errors / TDZ none in either variant.

| Проверка | cold 844×390 | warm late-save 667×375 |
| --- | --- | --- |
| `pageerror` / TDZ / `ReferenceError` | 0 / 0, обе сборки | 0 / 0, обе сборки |
| Профиль `view` | `lobby` / `lobby` | `lobby` / `lobby` |
| `CQ_SECT`, `CQ_DISKS` | 5 секторов / 23 диска в обеих | 5 / 23 в обеих |
| `S` state keys | 69 / 69 | 71 / 71 |
| `S.conq` save keys | идентичный список из 25 keys | идентичный список из 25 keys |
| `CELEB` / `NOTES` | 0 / 1 в обеих | 0 / 1 в обеих |
| `notePoll(true), renderNotes(), showCeleb(), cqStatic()` | `ok, ok, ok, true` в обеих | то же |
| `MutationObserver` | ровно один `body,childList,subtree` в обеих | то же |
| DOM `addEventListener` по типам / intervals | равное число, нет расхождений | равное число, нет расхождений |
| `models:b3Pre(loadAssets3)` и `notifications:onPersist(notePoll)` | before/after в обоих | before/after в обоих |
| `core/boot.start` | reached в обоих | reached в обоих |
| Splash на момент раннего snapshot | отсутствует в обоих | baseline уже исчез, virtual ещё присутствует — **необъяснённое временное расхождение** |
| Top-level module-ready порядок | **РАСХОДИТСЯ** | **РАСХОДИТСЯ** |

**Первое наблюдаемое расхождение instrumented module-ready** — индекс 8: исходный `ui/overlays/squad-select.js`, виртуальный `data/conquest-data.js`. Далее candidate `logic/conquest.js` выполняется **раньше** `squad-select`, тогда как baseline сначала завершает `squad-select` и связанные event/boot paths. Эти две последовательности нельзя считать эквивалентными только потому, что текущие вызовы `notePoll/renderNotes/showCeleb` работают. Положительная регистрация `b3Pre` — это **регистрация колбэка**, а не проверка реальной загрузки всех 3D моделей / Engine wake. Аналогично `showCeleb` был вызван на **пустой очереди**: реальная непустая star-up / unlock CELEB очередь и event interleaving ещё не доказаны.

**A4 реальные результаты:** `baselineSafe=true`, `candidateParity=false`, `noTDZ=true` для обеих страниц, `publicCalls=true`, `observerRegistrations=true`, `listeners=true`, `intervals=true`; `bootState=true` cold, `bootState=false` warm из-за splash. Эталонный `S.conq` в warm не мигрировал и не потерял ключи в проверенном состоянии. Не проверено: отдельный single-file `dist/artifact.html` с реальной виртуальной заменой, offline/SW update на кандидате, физический iPhone Safari, непустой CELEB/NOTES queue scheduling, повторное импортирование/замещение save, реальная загрузка 3D-ассетов и первый wake, все режимы Conquest в виртуальном кандидате. **Исходная v134** прошла full product CI; **виртуальный кандидат** — только перечисленные узкие сравнительные тесты.

### Решение

**ARCH-01C5a-A4 Stage A — диагностика выполнена. Контрфактический вариант даёт определённую ограниченную совместимость без TDZ, но полная поведенческая эквивалентность НЕ доказана. B1 NO-GO.** Не разрешать merge или выпуск и не редактировать SCC/ESM/golden oracle без отдельного owner review. Пятёрка пути диагностики остаётся Draft/UNMERGED; source debt = 2.

**Предлагаемый следующий шаг (только отдельно утверждённый ARCH-01C5a-A5 / Stage A):** тест на реальной **непустой CELEB/NOTES очереди** (star-up, unlock, уведомления Conquest, последовательность/дедупликация/скрытие при модальном окне), импорт/замену сейва и недельный Conquest rollover, фактическое исполнение `loadAssets3` через `loadB3` и проверка 3D assets/Engine/camp wake, cold/warm/standalone HTML + offline and actual iPhone Safari. Проектировать UI-owned composition/late-init port можно лишь с сохранением всех действующих именованных контрактов `UI→data/logic` и доказанным жизненным циклом. Не переносить Story→models и 3D baker/camp без самостоятельной оценки. **Никаких изменений производственного кода, версии, сохранений или публикации в A4.**

