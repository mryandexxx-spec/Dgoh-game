# BH9.9 → выпуск: передача контекста в следующий чат (12.11.2026)

**Истина — состояние GitHub на момент начала следующего чата, а не зафиксированные ниже SHA.** Сначала прочитать `dev/ARCHITECTURE.md`, `dev/docs/PROJECT_INSTRUCTIONS.md`, раздел «Открыто» в `dev/CHANGES_STATUS.md`, `dev/docs/BH9_9_PUBLIC_BARON_RELEASE_PLAN.md` и настоящий документ. Не копировать код из текста чата: весь код и контекст уже в Git.

## Где находится работа

- Репозиторий: `mryandexxx-spec/Dgoh-game`.
- Draft PR: https://github.com/mryandexxx-spec/Dgoh-game/pull/24 ; исходная ветка `feat/bh1-baron-legend-foundation`, целевая `main`. Не закрывать PR и не выбрасывать его длинную историю.
- Последний **полностью зелёный CI по функциональной версии BH9.9 + GE1 v91**: https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43174470641 ; коммит `42bede83af1e4d5e703f75f8a297cf33b5852ed0`. Все семь обязательных jobs SUCCESS: Build/architecture/artifact, Golden, E3 UI, BH8 WebGL, BH9.8/BH9.9 mobile, 3D safety/performance, final gate. Pages job **skipped** (ожидаемо: нет push в main). Это НЕ автоматическое подтверждение будущего merge с v92.
- На момент передачи **`main` уже v92**, HEAD `c0737c44d5508e26e9ca738d4531867a5fda9d4b` (`Publish verified PWA from CI artifact`), исходный v92-коммит `03903b5214` (`release: Dune GoH v92 — GE2 recipe-aware simulation rewards`). `dev/version.json` в `main`: `{"v":92}`, в Draft-ветке пока `{"v":91}`. `main` опережает Draft **на два коммита**, PR стал `mergeable:false` (конфликты).
- Не переносить GE2 назад или удалять его. GE2 исправляет сохранение выбранного компонента рецепта после фарма и подробности наград симуляции; релиз BH9.9 должен включить опубликованные v91 GE1 **и v92 GE2**.
- Последний полностью проверенный коммит `42bede8` не редактировал `main`; все изменения легенды только в Draft.

## Что уже реализовано и одобрено

1. Публичный персонаж `baron_legend` зарегистрирован **отдельно** от обычного молодого `baron`; прежний Барон и Муад’Диб остаются в игре, не заменять их. У легенды свой боевой kit, общая карточка и свой DGM/GL; никаких новых 3D-моделей сейчас не создавать.
2. Публичный переход «Легенды → Восхождение Барона», отдельный экран `baron_journey` с адаптивной раскладкой 844×390/667×375, 10 требований 7★/XIII/ДП, индикатор 0–10, доступ к карточкам требуемых героев, 5 стадий и отображение фиксированных пятёрок/врагов. UI-макет был согласован в предыдущем чате; см. `dev/docs/bh9_9_baron_public_journey_mockup.html`.
3. Доступ к первой стадии только при выполнении всех десяти требований; далее строго последовательные бои I–V. Одобренные волны 1/1/1/2/2, настоящие сражения через общий `launch` / Arena3D/2D, `advanceWave`. Награды **20/40/60/90/120 = 330** осколков строго за первые победы; повторы — ноль. После V стадии — отдельный 7★ легендарный Барон.
4. Отдельная идемпотентная миграция `journeys.baron_legend`; ключ `dune-goh-v1` не меняется. `baron`, `muaddib`, Марго и Юэ, события и старые сохранения защищены тестами; Golden-эталоны не переснимались.
5. Марго/Юэ — **обычные** герои с отдельными событиями, временными согласованными процедурными моделями; не делать GLB/DGM, пока владелец не попросит.
6. Релиз ещё **НЕ** осуществлялся и физический iPhone ещё **НЕ** тестировался. Владелец допускает iPhone-проверку только после публикации.

## Файлы для проверки

- Данные/прогресс: `dev/src/data/chars.js`, `dev/src/data/baron-legend-kit.js`, `dev/src/data/baron-legend-encounters.js`, `dev/src/logic/baron-bh9-event.js`, `dev/src/logic/baron-bh9-battle.js`, `dev/src/logic/baron-bh9-rewards.js`, `dev/src/core/save.js`.
- UI: `dev/src/ui/views/baron-journey.js`, `dev/src/ui/views/legend.js`, `dev/src/ui/router.js`, `dev/src/ui/events.js`, `dev/src/ui/battle/battle-ui.js`, стандартный `dev/src/ui/hero-card.js`.
- Тесты: `dev/tests/baron-bh99-public-journey.mjs`, `dev/tests/smoke/bh99-public-journey.mjs`; `dev/tests/baron-bh9-*.mjs`, `dev/tests/baron-roster-integration.mjs`; Golden `dev/tests/golden/{battles,meta,saves}.mjs`, `dev/tests/dom/screens.mjs`.
- CI: `.github/workflows/validate-pwa.yml`, `dev/tools/split.config.mjs`, `dev/tests/smoke/perf.mjs`, `dev/tools/ci-artifact.mjs`.
- GE1/GE2 v92 смотреть в `main`, в частности `dev/src/ui/overlays/sim.js`, `dev/src/ui/rewards.js`, `dev/src/styles/rewards.css`, `dev/docs/GE2_SIMULATION_REWARD_CONTRACT.md`, `dev/tests/smoke/gear-e3-dom.mjs`, `dev/tests/smoke/sw.mjs`.

## Последняя проблема CI и её исправление

CI #43172803820 был красным только по «Package 10 camp frame budget vs deployed v77»: LOW RT +19.7%, когда в новую сборку попал **временный render target фонового запекания портретов**, а в базу — нет. Тест `dev/tests/smoke/perf.mjs` исправлен так, что A/B-замер исключает фоновую запекалку **одинаково в обеих сравниваемых сборках**. Рабочая запекалка в игре НЕ отключена, бюджет ухудшения >10% НЕ повышен. Повторный полный CI **#43174470641 SUCCESS**, включая 3D safety/performance. Не обходить архитектурные и performance gates ради релиза.

## Обязательный маршрут следующего чата — подготовка релиза

1. Вычитать актуальные документы и обе ветки, проверить свежие `HEAD`, версию `main`, PR #24 и его реальную конфликтность. Может появиться ещё один релиз; не предполагать, что `main` всё ещё v92.
2. **Синхронизировать Draft-ветку с `main`** (merge main в feature или другое безопасное разрешение; не force-push с потерей истории), корректно разрешив конфликты GE2 с BH9.9 и GE1. Особое внимание `dev/CHANGES_STATUS.md`, `dev/version.json`, `dev/src/ui/rewards.js`, `dev/src/ui/events.js`, `dev/tests/dom/screens.mjs`, `dev/tests/golden/{meta,saves}.mjs`, `.github/workflows/validate-pwa.yml`. Любые затронутые GE2 smoke/Golden нормализаторы и CSS должны сохраниться.
3. Назначить следующий свободный номер **от фактической версии main** (сейчас кандидат v93, но перепроверить), в релизном коммите обновить `dev/version.json`, запись `### vNN — BH9.9` + раздел «Открыто» в `dev/CHANGES_STATUS.md`. Публикация не должна случайно вернуть сохранения, экономику или PWA с v92 на v91.
4. Повторить **полный** Validate PWA на новом точном SHA объединённой ветки, включая Golden, игровые/повторные награды, рендер 844×390/667×375, WebGL и SVG fallback, E3, BH8, BH9.8/9.9, SW/offline, 3D lifetime/performance, SHA-256 артефакта и итоговый gate. Не ссылаться на CI #43174470641 как на тест уже объединённого кода.
5. **Только после SUCCESS нового CI и подтверждения владельца для публикации** — подготовить PR к merge, согласовать конкретную версию и состав, объединить в `main` и убедиться, что `deploy-pages` опубликовал **тот же проверенный артефакт**, без второй сборки. Существующий workflow делает Pages только при `push` в `main`; на PR Pages по умолчанию skipped. В проекте запрет на самостоятельный merge без разрешения.
6. После публикации проверить URL Pages / установленную PWA, версию, доступность событий и карточек, PWA/SW-кеш после обновления и целостность старых сохранений. Дать владельцу короткий **чек-лист физического iPhone** (альбомный Safari/PWA, 844×390/667×375, MED/LOW, 2D fallback, все 5 стадий, 330 и replay=0, Барон/Марго/Юэ, отсутствие артефактов, FPS/нагрев), записать результаты в журнал, не утверждать прохождение физического QA за владельца.

## Явные запреты / решения

- Нельзя заменить или слить молодого Барона и легендарного Барона.
- Нельзя сбрасывать существующие сейвы или ретроактивно выдавать легенду игрокам.
- Нельзя переснимать Golden-эталоны без отдельного согласования.
- Нельзя менять экономику/баланс и художественные образы, либо создавать новые 3D-модели, без согласования.
- **Никаких изменений `main` / Pages до решения владельца о релизе.**
- Не ждать физического iPhone до публикации — оно возможно только после релиза.

Ссылка на опорный успешный прогон: https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43174470641 . Ссылка на PR: https://github.com/mryandexxx-spec/Dgoh-game/pull/24 .
