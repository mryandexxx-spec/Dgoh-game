# Campaign 2.0 — C4.9 «Битва за Коррин» · v112 release handoff (14.11.2026)

## Разрешение и состояние
**Разрешено владельцем:** «Ок» — художественная концепция «Разорванный венец»; «Все ок» — художественная приёмка реальных MED и LOW WebGL-снимков; **«Выпускаем» (14.11.2026)** — отдельная команда на merge/release.

- [PR #68](https://github.com/mryandexxx-spec/Dgoh-game/pull/68); [Issue #67](https://github.com/mryandexxx-spec/Dgoh-game/issues/67).
- Начало ветки: последний опубликованный v111, `4500d6aa7c27cf038ad2d256a1ceca0b8ab54e82`.
- `dev/version.json`: **112**; до main Validate и Pages не объявлять v112 опубликованной.
- Новый мир Babylon `render3d/scenes/campaign-corrin-battle.js` и preset `C:5`, один связный осадный ландшафт, орбитальный Мост Хретгир, внешняя сеть Омниуса (196) и защищённое автономное ядро (199). Исходные **190–199**, уровни 64–76; 210 ID, экономика/враги/дроп/награды/баланс/сохранения не менялись.
- Общий EngineHost/GameScene, MED+LOW статичная детализация, world-space маркеры 50px/boss 60px, свайп v101, pinch/twist/recenter, 2D fallback. Нет нового Engine/render loop.

## Приёмочные проверки до v112
- [Полный Validate #43579708606](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43579708606) **SUCCESS** на финальном художественно принятом коде `03a84c2704c0b35f37900835c5ccd261fcf18641`.
- [Arena framing #43579708490](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43579708490) **SUCCESS**.
- [8 реальных WebGL MED 844×390 + LOW 667×375 кадров](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43579708606/artifacts/14108245684): 190, 196, 197, 199; на входе 1–2, на финале 8–10; без перекрытий, один босс. Владелец художественно принял «Все ок».
- Выпускной bump до 112 требует **повторного полного PR CI** на точном release HEAD. По нему проверить обязательные golden/saves/E3/3D/mobile WebGL/SW/artifact checksum.

## Последовательность безопасной публикации
1. На ветке PR #68 зафиксировать релизную версию 112, `CHANGES_STATUS.md` и handoff **в одном коммите**, затем дождаться всех обязательных **SUCCESS** на том же SHA.
2. Пометить PR готовым к review; выполнить **squash merge**, заголовок без `release:`, чтобы исключить дублирующий оркестратор `publish-pwa.yml`.
3. Дождаться **SUCCESS главного Validate** после merge; задача `Publish verified PWA to GitHub Pages` должна завершиться **SUCCESS**. Его собственная публикация проверяет SHA-256 сборки и синхронизирует точные tested files в корень `main`.
4. Проверить фактический **Pages deployment SUCCESS** для точного опубликованного PWA SHA (не старого коммита). Игра: https://mryandexxx-spec.github.io/Dgoh-game/ — после публикации должен быть **футер v112**.
5. Записать merge SHA, main CI run, PWA SHA и Pages run в PR #68 / Issue #67. Не запускать второй `Publish Dune GoH PWA`; он не должен сработать для merge без `release:`.

## Что проверить на физическом iPhone после выпуска
- `C:5`: все 10 исходных 190–199, последовательное локальное появление номеров, MED 844×390, LOW 667×375; бой, симуляция, возврат и фарм-переходы; свайп, pinch/twist/recenter; отсутствие DOM-перекрытий.
- При отключении WebGL — 2D fallback, при обновлении PWA — SW/cache и сохранённый прогресс.
- Отдельно проверить 10–15 минут FPS, нагрев, расход батареи в Safari. **CI SwiftShader не является замером на физическом iPhone.**

## Статус
Данный документ готовится **перед выпуском**; он не доказывает успешную публикацию. Подтверждать SUCCESS и финальные SHA исключительно фактическими GitHub Actions и Pages.
