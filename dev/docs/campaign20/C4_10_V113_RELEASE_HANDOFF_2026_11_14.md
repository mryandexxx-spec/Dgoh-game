# Campaign 2.0 · C4.10 «Песчаные черви Дюны» — v113 release handoff (14.11.2026)

## Согласование
- Issue: [#69](https://github.com/mryandexxx-spec/Dgoh-game/issues/69), [PR #71](https://github.com/mryandexxx-spec/Dgoh-game/pull/71).
- Этап A «Пульс глубин»: «Ок». WebGL MED 844×390 / LOW 667×375: **художественно принято «Все ок»**. Отдельное явное разрешение на выпуск: **«Выпускай» (14.11.2026)**.
- Исходная подтверждённая игровая версия `main`: **112**. Новый релиз: **113** в `dev/version.json`. До получения SUCCESS main+Pages называть v113 кандидатом, а не опубликованной.

## Реализация и ограничения
Новая диорама `C:6` — единая соляная впадина, S-образная дельта, машинные иглы, корабль-невидимка, капсулы гхол, стеклянный ожог, песчаная форель, Сёстры, лицеделы, человеческий круг, новые черви, финальный гребень Омниуса против дуги червя. Исходные глобальные ID **200–209**, уровни **76–85**. Данные `CAMP_DEF.C.chapters[6]`, остальные 210 ID, `foes`, `boss`, `drops`, баланс, экономику и сохранения **не менять**. Реализация: `campaign-sandworms.js`, `campaign-map-presets.js`, существующие EngineHost/GameScene, swipe v101 + pinch/twist/recenter, 2D fallback, LOW-графика без отдельного движка.

## Доказательства до релизного коммита
- [Validate #43590545775](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43590545775) **SUCCESS**, attempt 3, кодовая база `fa8e0f4d627bf79880d151901741fcf7a1c30a68`.
- [WebGL 844×390 MED / 667×375 LOW](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43590545775/artifacts/14112485804), настоящие screenshots 200, 203, 204, 206, 208, 209. На финале №9–10 видны без перекрытий.
- [Документальный acceptance CI #43592111397](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43592111397) **SUCCESS**.
- Известный независимый нестабильный тест `flash-expired HUD projection drift u0` дважды упал, прошёл на третьей попытке без ослабления гейта. Это не C:6-баг.

## Безопасная процедура выпуска
1. Одним коммитом к ветке PR #71 добавить `dev/version.json=113`, `CHANGES_STATUS.md`, handoff. Не создавать вторую ветку/PR.
2. На **точном release HEAD** выполнить полный PR CI: build/SHA256, Golden, Campaign 2.0 WebGL, iPhone UI, 3D lifecycle, Arena, SW, performance и обязательный gate — все SUCCESS. PR docs-only успех не подменяет release-check.
3. Пометить PR #71 ready, затем **squash merge** в `main`; сообщение коммита **без `release:`**.
4. После merge дождаться нового Validate `push main` на merge SHA, **SUCCESS** обязательных гейтов и встроенного шага `Publish verified PWA to GitHub Pages` **SUCCESS**. Он проверяет SHA-256 единой артефактной сборки, записывает опубликованную PWA в корень `main`. Отдельного publish workflow после оптимизации CI нет.
5. Проверить PWA root publish SHA, реальный Pages deployment SUCCESS и появление `v113` в опубликованном [Dune GoH](https://mryandexxx-spec.github.io/Dgoh-game/). Зафиксировать точные SHA, CI и Pages ссылки в PR/Issue/журнале. Не закрывать Issue #69 раньше публикации.

## Приёмка на физическом iPhone после релиза
В Safari/PWA открыть Хроники `C:6`, 200–209; убедиться в последовательности номеров (1–10) через свайп; проверить миссию/бой/симуляцию/возврат, pinch/twist/recenter, фарм-переходы, fallback без WebGL, SW/offline и сохранение прогресса. 10–15 минут FPS/нагрев/батарея — отдельная физическая проверка; Chromium SwiftShader не доказательство реального iPhone FPS.

## Релизный статус
**ОПУБЛИКОВАНО: v113, 14.11.2026.** Фактические подтверждения:
- [PR #71](https://github.com/mryandexxx-spec/Dgoh-game/pull/71) **MERGED** (squash) commit `caef37696791b5701f12ebdb9365fd82f49c1b68`. Ветка release candidate commit `d439ec16cfab6a383c8b31f6abf003a5db1d826a`.
- [PR Validate #43592759733](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43592759733) **SUCCESS**, attempt 1 на точном v113 HEAD, обязательный gate зелёный.
- [Main Validate + Publish #43593325880](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43593325880) **SUCCESS**, включая verified SHA-256, публикацию exact artifact и deploy-pages.
- Публикационный root-PWA commit `2682c3f9d290624a0561cb1da16b41472b6cf565` с прямым parent merge SHA; message `Publish verified PWA from CI artifact`. В опубликованном `app.js` **`v113 · db25b7661b`**.
- [Pages build and deployment #43593921987](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43593921987) **SUCCESS** на публикационном SHA `2682c3f9d290624a0561cb1da16b41472b6cf565`, jobs `build/deploy/report-build-status` SUCCESS.
- Финальная игра: https://mryandexxx-spec.github.io/Dgoh-game/. Среда Pages сообщает успешный deployment; физическая проверка в Safari остаётся задачей владельца.


## Подтверждение владельца после публикации и переход к C4.11

**14.11.2026 после завершённой публикации v113 владелец ответил «Все ок».** Пострелизная приёмка подтверждена, новых замечаний не заявлено. Не делать из этого вывода, что предоставлены физические измерения iPhone Safari FPS, нагрева или батареи: таких данных нет.

Следующий этап: **C4.11, Светлая сторона III `L:2` «Бегство», 20–29**, только художественная концепция A. [Issue #72](https://github.com/mryandexxx-spec/Dgoh-game/issues/72) и [handoff нового чата](C4_11_AFTER_V113_HANDOFF_2026_11_14.md). Все семь Хроник `C:0`–`C:6` опубликованы; переход к ещё не разработанному окружению Светлой стороны не меняет данные миссий и не санкционирует новый релиз.
