# Campaign 2.0 · C4.12 «Сиетч Табр» — v115 release handoff (14.11.2026)

## Решения владельца и состояние перед релизом

- [Issue #76](https://github.com/mryandexxx-spec/Dgoh-game/issues/76) — канонические миссии Светлой стороны IV `L:3`, исходные ID 30–39.
- Утверждена художественная концепция «Сердце воды» ([концепт](C4_12_HEART_OF_WATER_CONCEPT_2026_11_14.md)); реальные WebGL MED 844×390 и LOW 667×375 приняты владельцем «Ок».
- Отдельным «Ок» принят один Golden DOM-снимок `info:shard:chani`: четыре новые кнопки «На карте» к исходным миссиям 31, 34, 36, 39. Строгая проверка фиксирует только эти кнопки и их положение перед «В бой», остальные 43 экрана и прочие поля эталонны.
- [Реализация PR #78 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/78); кодовый squash merge `a25240b4c7aadb748a2552706f13b715c992596b`.
- После отдельного «Разрешаю» на merge и «Выпускай» 14.11.2026 владелец явно разрешил **v115 release PR, version bump и Pages публикацию**.
- Последняя опубликованная игровая сборка на старте выпуска — `v114`, `dev/version.json=114`; root PWA с v114. Отдельный Pages source-build после merge #78 не изменял содержимое root PWA.

## Состав v115

Светлая IV «Сиетч Табр», оригинальные глобальные миссии **30–39** (уровни 21–30). Статическая Babylon.js-диорама «Сердце воды»: круг Джамиса → резервуар воды мёртвых → зал тренировок Чани → росоловушки → разграбленный склад → податель червя → сожжённые стоянки → ложная тропа → галерея знамения → признание имени Муад’Диб. Пещерная композиция переходит в открытую пустыню. Самостоятельные landmarks, сцена `campaign-sietch.js`, пресет `L:3`, общие EngineHost/GameScene, MED/LOW, готовый HIGH, static idle и 2D fallback. На телефоне 2–4 последовательных маркера 50/60px, без обрезания и overlap, исходные жесты v101.

**Не менялись** 210 существующих ID, `NODES`, foes/boss, сюжет, награды, ресурсы, экономика, прогресс и сохранения. Предыдущие 12 окружений не изменены. После публикации — **13/21 уникальных карт**.

## Доказательства до version bump

- [CI реализации #43628714583 — SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43628714583) на PR HEAD `c916cacbb9850ccf67a16133a629ba234a1eac5d`: All required checks passed, Golden, Campaign WebGL MED/LOW, Campaign lifecycle MED/LOW/HIGH, PWA/offline, 3D memory/lifecycle phone+desktop, mobile budgets, E3, Arena.
- [Реальные MED/LOW WebGL кадры](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43627515455/artifacts/14126543340) художественно приняты.

## Проверяемая процедура v115

1. От `main=a25240b4` отдельный release PR: `dev/version.json` **114 → 115**, это release-handoff, актуализация `dev/CHANGES_STATUS.md`, `dev/docs/campaign20/README.md`. Никаких дополнительных правок игрового кода.
2. Получить обязательный SUCCESS `All required checks passed` на **точном HEAD release PR**; сверить Golden, Campaign WebGL MED/LOW, PWA/offline, build SHA-256. Утверждённые исходные проверки можно переиспользовать только по строгому input proof, предусмотренному `dev/tools/ci-plan.mjs`.
3. После green PR CI — squash merge в `main` с сообщением **без [skip ci]** и без `release:`, чтобы запустился `push main` Validate и не запустился дублирующий издатель.
4. Подтвердить **main Validate** на release merge SHA: gate SUCCESS, `Publish verified PWA to GitHub Pages` SUCCESS, staged PWA SHA-256 и отдельный root publication commit в `main`.
5. Проверить отдельный **Pages build and deployment** на root publication SHA — SUCCESS. Проверить `dev/version.json=115` и root `app.js` содержит `v115 · <cache hash>`. Production URL: https://mryandexxx-spec.github.io/Dgoh-game/.
6. Записать фактические SHA, run IDs и ссылки в Issue #76, PR и в handoff; после этого считать релиз выпущенным.

## Физическая Safari/PWA приёмка

На iPhone landscape открыть **Сюжет → Светлая сторона → IV «Сиетч Табр»**, просмотреть все 30–39 свайпом от круга Джамиса к имени Муад’Диб; MED и LOW (844×390/667×375), видимость 1–10, отсутствие обрезания и перекрытий, pinch/twist/recenter v101, карточку миссии, бой/симуляцию, возврат из источников осколков Чани, 2D fallback при отключённом WebGL, обновление SW, офлайн и сохранения. Отдельно 10–15 минут наблюдать FPS/нагрев/батарею. Chromium/SwiftShader не является физическим Safari-замером.

## Следующее развитие кампании

C4.13 — Светлая V `L:4` «Годы в пустыне», исходные ID 40–49, уровни 31–42. Отдельно начать художественный этап A в новом чате с изучением канона и 2–3 концепциями; не реализовывать до утверждения.

## Статус

**v115 release-кандидат; подтверждение CI и фактической Pages публикации добавить после выполнения вышеуказанных шагов.**
