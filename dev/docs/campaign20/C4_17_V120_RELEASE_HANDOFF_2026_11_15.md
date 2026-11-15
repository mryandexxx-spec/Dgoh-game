# Campaign 2.0 — C4.17 «Правление Зверя» / «Железная квота» · v120 release handoff

Дата: 15.11.2026. **Статус на момент подготовки release PR: v120 кандидат. НЕ НАЗЫВАТЬ опубликованной до официального validated PWA / Pages / сверки root cache.**

## Утверждение и реализация
- Владелец утвердил концепцию «Железная квота», затем принял 22 настоящих Chromium/SwiftShader WebGL MED 844×390 и LOW 667×375 кадра («Ок»), затем отдельно дал команду **«Сливай и публикуй»**.
- [Issue #100](https://github.com/mryandexxx-spec/Dgoh-game/issues/100); [Implementation PR #102 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/102), squash `2679f819d1427c25083c22430ba405f5b655ca9a`.
- [Полный CI реализации #43709919830 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43709919830), [исходные WebGL PNG](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43709919830/artifacts/14160197145).
- [main CI после merge #43713070854 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43713070854).

## Контракт игры
- **18-я из 21** индивидуальных 3D карт Campaign 2.0: Тёмная IV `D:3`, десять канонических глобальных ID 100–109, уровни 21–30.
- Самостоятельная статичная однопространственная диорама промышленной оккупации Арракиса: западная трибуна Раббана, водяной налог, гигантский комбайн, патрульная засада, датчики Кайнса, выжженный сиетч, пропавший караван, знаки фрименов, перекрытие воды и противостояние Раббана со Стилгаром. Десять уникальных фокусов, 9 секций непрерывного тракта. Не копирует предыдущие Dark III, Light III и Chronicles VII.
- `CAMP_DEF`, 210 ID, оригинальные названия, уровни, STORY/диалоги, враги/боссы, drops, экономика, прогресс, баланс и сохранения не менялись.
- Shared EngineHost/GameScene/CampaignMapScene, LOW/MED/HIGH, интерактивный fallback 2D, жесты v101, локальные 2–4 последовательные метки 50/60 px без overlap/scroll/clipping, static idle.
- Трёхцикловые MED 844×390 **154 meshes / 7527 vertices**; LOW 667×375 **127 / 6655**; HIGH 960×600 **154 / 7527**, один WebGL context без утечек.
- Full CI: build/architecture, Golden, PWA/offline, all campaign WebGL screenshots, strict lifecycle and perf PASS.

## Версия / публикация
- Предыдущая опубликованная версия: **v119**, root `sw.js` VER=`5433bc45aa`, предыдущие validated 188 SHA-256 файлов.
- Этот release PR изменяет только `dev/version.json` **119 → 120**, release handoff, указатель Campaign 2.0, статус-журнал и **одноразовый fail-closed workflow** `.github/workflows/release-v120-once.yml`. Игровой код, арены, ассеты и сохранения не трогаются.
- Сначала **все release PR CI SUCCESS**. Затем squash-merge с точным заголовком **`release(campaign): publish v120`**.
- Guard проверяет точный main squash title, Git SHA, `version.json=120`, старый root SW `5433bc45aa`, наличие принятого D:3 кода, lifecycle и WebGL тестов. Только после успешных guard запускает официальный workflow `validate-pwa.yml` с `publish=true`.
- Далее обязательны официальный full gate SUCCESS, публикационная синхронизация root из **того же SHA-256 validated artifact**, отдельный Pages deployment SUCCESS и фактическая сверка root `dev/version.json=120`, `app.js` v120, нового `sw.js` cache и совпадающих хешей. **Без этих доказательств выпуск считается незавершённым**.
- После подтверждённого выпуска удалить одноразовый workflow документальным cleanup PR и записать точные CI, commit и SW SHA в handoff и журнал. Дальнейшую публикацию этот cleanup не вызывает.

## Физический iPhone Safari / PWA — открыто
Проверить ландшафтный режим 100–109 MED/LOW, видимость маршрута, выбор миссии и переход в бой/симуляцию, жесты swipe/pinch/twist/recenter, fallback WebGL off, offline и SW update, FPS/нагрев/батарею 10–15 минут. Chromium/SwiftShader и художественная приёмка не являются физическими замерами.

## Следующая глава
После подтверждённого релиза v120 следующая отдельная художественная фаза: **C4.18 — Тёмная V `D:4`** по исходному `CAMP_DEF.D.chapters[4]`, без автоматических изменений кода или предварительного merge/release. Три тёмных окружения останутся на разработку.
