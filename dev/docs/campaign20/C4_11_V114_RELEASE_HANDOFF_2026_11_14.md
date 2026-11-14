# Campaign 2.0 · C4.11 «Бегство» — v114 release handoff (14.11.2026)

## Разрешения и источник истины

- [Issue #72](https://github.com/mryandexxx-spec/Dgoh-game/issues/72); авторский этап A «Разлом Бури» утверждён.
- Авторская реализация завершена в [PR #74 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/74), кодовый merge commit `fbd78fce42e029c2d2db7b7f4f95be7bb605fb77`.
- Владелец просмотрел настоящий WebGL MED 844×390 / LOW 667×375 и подтвердил художественную приёмку: **«Все ок»**.
- Отдельная команда «Сливай» исполнена. **14.11.2026 дана отдельная команда «Выпускай»** — разрешены release, version bump и GitHub Pages.
- Последняя до v114 выпущенная версия — `113`, production root PWA автоматически обновилась после code merge #74 без изменения номера. Текущий запрос — оформить **v114** с явным version bump и верифицируемым развертыванием.

## Состав релиза и инварианты

`L:2` Светлой стороны, глава III «Бегство», исходные ID 20–29, уровни 13–20. Ночная единая диорама «Разлом Бури»: орнитоптер/буря/станция Кайнса/ущелье/червь под песком/пряностное видение/отвлечение Кайнса/палатка/следы/фримены. Только карта, камера, 2D fallback и графика; нет изменений 210 исходных ID, порядка NODES, диалогов, врагов, босса, баланса, ресурсов, экономики или сохранений. Shared EngineHost/GameScene, swipe v101, pinch/twist/recenter, профильные MED/LOW, локальные последовательные номера.

## Доказательства перед выпуском

- [PR #74 финальный CI #43599896818](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43599896818) **SUCCESS**: Golden, WebGL 844×390 MED / 667×375 LOW, lifecycle desktop/phone, UI, camp+battle budgets, all required checks.
- [Настоящие WebGL-кадры 20, 23, 25, 27, 28, 29 MED/LOW](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43599896818/artifacts/14116076586), художественно приняты.
- После документального согласования отдельный [PR CI #43600972522](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43600972522) **SUCCESS**; [main CI #43602495871](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43602495871) **SUCCESS**, Pages #43603097052 **SUCCESS** для кода главы с прошлым номером `v113`. Это **не** выпуск v114.

## Точная процедура v114

1. В одном release PR из актуального `main` изменить только `dev/version.json` → `114`, `dev/CHANGES_STATUS.md`, `dev/docs/campaign20/README.md` и этот handoff. Не изменять визуальный код после художественной приёмки.
2. Получить **SUCCESS полного PR CI на точном release HEAD**, поскольку diff содержит `dev/version.json`. Проверить Golden, Campaign20 WebGL MED/LOW, 3D lifecycle, E3, SW, budgets, обязательный gate.
3. Merge release PR в `main`, commit title **без `release:`**, чтобы не запускать дублирующий издатель.
4. После merge проверить **Validate `push main` на release merge SHA**: mandatory gate SUCCESS, встроенный job `Publish verified PWA to GitHub Pages` SUCCESS с проверкой SHA-256.
5. Проверить отдельный `pages build and deployment` SUCCESS на публикационном root PWA SHA. В `app.js` и опубликованном `https://mryandexxx-spec.github.io/Dgoh-game/` проверить отображение `v114`.
6. Указать фактические SHA, PR/CI и Pages URLs в комментариях Issue #72 / release PR и дописать release evidence в этот handoff и журнал.

## Физическая приёмка после Pages

Safari/PWA на iPhone в landscape: `Сюжет → Светлая сторона → III «Бегство»` 20–29; 1–10 через свайп, без скачков; pinch/twist/recenter, экраны миссий, бой/симуляция/возврат, 2D fallback при выключенном WebGL, сохранения, SW/offline и перезапуск. 10–15 минут FPS/нагрев/батарея: только физический Safari, Chromium SwiftShader не доказывает реальные цифры.

## Статус

**v114 — release candidate.** Не объявлять опубликованной до SUCCESS PR CI, main validated publication, Pages deployment и проверки `v114` на опубликованном сайте.
