# Campaign 2.0 — C4.5 «Дом Харконненов», v107: принятый релиз и handoff

**Дата:** 13.11.2026. **Статус: реализовано, художественно принято, PR объединён, PWA опубликована.** Источник истины — `main` и актуальный игровой код.

## Релизные ссылки и коммиты

- Реализация и приёмка: [PR #59](https://github.com/mryandexxx-spec/Dgoh-game/pull/59), MERGED, squash-коммит `1b250e1016e43c8fcbffb48e14d757cb690564f9`.
- Версия: `dev/version.json` — **107**. Предыдущий параллельный релиз Meshy-Дункана v106 (`df37f89`) сохранён.
- Публикация проверенных PWA-файлов: `e68413440f1a915657d080379674473fe79491b6`, «Publish verified PWA from CI artifact».
- [PR CI](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43452854319) **SUCCESS**; [главный релизный CI](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43454954358) **SUCCESS**, включая Golden, E3 iPhone DOM, 3D lifecycle, WebGL и все обязательные проверки.
- [Pages build and deployment](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43457686876) **SUCCESS** именно для `e68413440`.
- [Реальные WebGL-кадры MED 844×390, LOW 667×375](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43449992870/artifacts/14048869449): `harkonnen-first-844-med.png`, `harkonnen-844-med.png`, `harkonnen-first-667-low.png`, `harkonnen-667-low.png`. Это изображения из Chromium/SwiftShader, не художественные макеты.
- Игровой URL: https://mryandexxx-spec.github.io/Dgoh-game/

## Художественная приёмка

Владелец утвердил направление «Путь Гурни из рабских ям», затем после осмотра настоящих MED/LOW WebGL-кадров второй итерации подтвердил **«принимаю»** и отдельным сообщением разрешил **«публикуй»**. Решение записано в PR #59; не перепроектировать C4.5 без новой задачи.

## Реализованная география

У «Хроник Дюны» глава II `C:1` «Дом Харконненов», уровень 20–30, десять исходных миссий и их ID:

1. Рабские ямы — террасная каменная шахта и бараки.
2. Кнут Раббана — мост надзирателей.
3. Побег — подземные трубы.
4. Контрабанда — скрытый рынок.
5. Ментат барона — башня Питера.
6. Арена Гиеди — каменная арена рабов.
7. Месть за сестру — двор личной мести Гурни.
8. Огни деревни — сожжённые дома и угли.
9. Встреча с Атрейдесами — светлые ворота убежища.
10. Зверь — блокада Раббана в ущелье.

Игрок движется по непрерывной географии, а не по сетке точек. Локальные отрезки маркеров последовательны, начало 1–3, финал 8–10; остальные доступны свайпом v101/зумом. Не добавлены кнопки навигации. Точки закреплены world-space x/z, 50/60px без наложений.

## Файлы

- `dev/src/data/campaign-map-presets.js`: пресет `C:1`.
- `dev/src/render3d/scenes/campaign-harkonnen-chronicles.js`: собственная статическая Babylon-геометрия.
- `dev/src/render3d/scenes/campaign-map.js`: подключение к общему `GameScene`, камеры и projectLabels.
- `dev/src/styles/campaign20.css`: CSS-палитра и 2D fallback.
- `dev/tools/split.config.mjs`: регистрация модуля.
- `dev/tests/smoke/campaign20.mjs`: проверки обеих мобильных геометрий и WebGL screenshots.
- `dev/CHANGES_STATUS.md`: релиз v107, открытый физический iPhone smoke.

**Не изменены:** 210 миссий и ID, баланс, награды, свечи хроник/GE2, сохраняемые прогрессы, свайпы v101 и pinch/twist, `EngineHost`/рендер-цикл, художественно принятые C4.1–C4.4 и Дункан v106.

## После релиза / следующая задача

На физическом iPhone Safari проверить новую C:1 на MED 844×390 / LOW 667×375: все десять маркеров свайпом, pinch/turn/recenter, карточки и бои/симуляции, возврат из фарма, WebGL-loss и fallback, FPS/нагрев. WebGL Chromium/SwiftShader CI не заменяет физические измерения на устройстве.

Для следующей главы C4.6 сначала читать этот handoff, `dev/ARCHITECTURE.md`, `dev/docs/PROJECT_INSTRUCTIONS.md`, актуальный `main`, раздел «Открыто» в `dev/CHANGES_STATUS.md` и `dev/docs/campaign20/README.md`. Новый художественный концепт и макеты согласовать до нового кода; не менять принятые главы без явного запроса.
