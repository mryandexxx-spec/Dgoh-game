# C4.2 Арракин — handoff реализационной ветки (2026-11-13)

## Статус
Владелец одобрил художественный концепт Арракина сообщением «Да». Ветка `feat/campaign20-c4-2-arrakeen` отделена от дизайн-ветки; Draft PR #52: https://github.com/mryandexxx-spec/Dgoh-game/pull/52. Main/Pages/v102 не менялись. Дизайн PR #51 отдельно сохранён.

Реализовано в ветке:
- `src/render3d/scenes/campaign-arrakeen.js` — статическая Babylon геометрия города, дворца, стены, дюн, комбайна, рынка, щитового генератора и коридора Дункана, без отдельных Engine/timers и дорогих particles.
- `src/data/campaign-map-presets.js`: L:1 со строго десятью исходными L/глава 1 индексами `m=0..9`, уникальная география.
- `src/render3d/scenes/campaign-map.js`: подключение фабрики Arrakeen, прежний общий EngineHost и `campaignPanDelta(-dx,-dy,...)` **не изменён**.
- `src/styles/campaign20.css`: тема Arrakeen и 2D-fallback.
- `tools/split.config.mjs`: новый модуль; `tests/smoke/campaign20.mjs`: выбор L:1, 10 pin / boss / отсутствие наложений, real WebGL screenshot и modal для MED/LOW.
- Ранее утверждённый художественный документ и HTML/SVG макет 844×390/667×375 включены из дизайн-ветки.

## CI на момент записи
После открытия PR #52 автоматически стартовали:
- Validate PWA: https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43382943180
- Arena framing review: https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43382943221
На момент записи — `in_progress`. Не заявлять PASS, не утверждать качество WebGL по статическому макету.

## Следующие обязательные действия
1. Дождаться результатов CI. Исправить failures в ветке, не трогая Golden.
2. Скачать реальные smoke screenshots `arrakeen-844-med.png` и `arrakeen-667-low.png` из артефакта, визуально проверить; сравнить с утверждённым концептом. Если качество недостаточное, доработать.
3. Запустить/проверить проверки MED/LOW, GLB/Wake/Dispose, 2D fallback, взаимодействие `L:1` с боем/симуляцией/GE2, route pin focus. Особенно проверить Camera clamp и видимость десяти точек, если некоторые расположены за пределами стартового viewport.
4. Фактические GPU/draw/RT/memory цифры сравнить с базой; рост >10% — отдельное согласование, без обхода gates.
5. Показать пользователю настоящие WebGL-кадры MED и LOW для художественного одобрения. Не выпускать и не сливать PR #52 до прямого разрешения.

Без изменений: original NODES, 210 missions, saves, drops, economy, Caladan/Giedi geometry, Swipe v101, version 102.