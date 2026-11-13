# Campaign 2.0 · C4.7 «Батлерианский джихад» — v110 release handoff (14.11.2026)

## Согласование и факт разрешения
- Художественная концепция «Шрам освобождения», реальные WebGL-кадры 844×390 MED и 667×375 LOW приняты владельцем («Ок»).
- **Разрешение на публикацию получено 14.11.2026:** «Ci прошел, выпускай».
- [PR #62](https://github.com/mryandexxx-spec/Dgoh-game/pull/62) — единая доставка главы и arena HUD fix. [PR #64](https://github.com/mryandexxx-spec/Dgoh-game/pull/64) — исходный отдельный технический PR; идентичный фикс уже интегрирован в #62, не сливать дважды.
- Репозиторий: `mryandexxx-spec/Dgoh-game`, `main`; версия в `dev/version.json`: **110**. Прошлая опубликованная версия 109.

## Что входит в v110
1. Campaign 2.0, «Хроники», `C:3` — исходные миссии **170–179**, уровни 40–52, без изменений баланса и экономики, прогресса/сохранений и всего набора 210 миссий.
2. Самостоятельная Babylon-сцена `dev/src/render3d/scenes/campaign-butlerian-jihad.js`: исторический war atlas Омниуса, Лиги, погибшей Земли, кимеков, эвакуации, освобождения, истоков ментатов и сестёр Россак, Серены и финальных легионов Омниуса.
3. Пресет маршрута, sway/drag/swipe v101, локальные последовательные маркеры 50/60px без наложений, MED/LOW WebGL + 2D fallback.
4. Исправление реального world-HUD drift из [issue #63](https://github.com/mryandexxx-spec/Dgoh-game/issues/63): `.battle.quake` больше не трясёт DOM-обёртку в 3D бою, поскольку Babylon-камера уже обрабатывает shake. В 2D эффект сохранён. Smoke требует прежний допуск **менее 1px** и проверяет вручную включённый quake.

## Проверки до релиза
- Полный [PR #62 CI #43520953114](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43520953114) — **SUCCESS** (исправление HUD на ветке C4.7).
- Полный [PR #64 CI #43520835928](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43520835928) — **SUCCESS** (независимая проверка HUD fix).
- Настоящие MED/LOW WebGL: [artifact #14080378421](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43515556172/artifacts/14080378421); в новом CI снимки повторно генерируются.
- **Обязательно:** после повышения `version.json` до 110 дождаться SUCCESS CI уже нового PR HEAD; затем merge в `main`, SUCCESS main Validate и встроенного Pages job, отдельного Pages deployment.
- Избежать конкуренции двух publish workflow: squash title не начинать `release:`, чтобы `.github/workflows/publish-pwa.yml` не запускал второй оркестратор; основным считать встроенный `deploy-pages` с проверкой SHA.

## Проверка публикации и ограничения
- Игровой URL после подтверждённого Pages: https://mryandexxx-spec.github.io/Dgoh-game/.
- Не объявлять публикацию успешной до сверки **CI SUCCESS + Pages SUCCESS** с релизным SHA. Фактические ID и SHA финального main CI/Pages добавить в комментарий к PR #62 / issue #61 после их получения.
- Физические FPS и нагрев на iPhone **не измерены**; проверить на устройстве C:3 1–10, свайпы/pinch/recenter, босс, миссия/симуляция/возврат, 2D fallback, HUD в обычном бою и при flash/quake/auto x4.
- Историческая проблема двойного publish workflow после v109 остаётся отдельной и в этой версии не перепроектируется.
