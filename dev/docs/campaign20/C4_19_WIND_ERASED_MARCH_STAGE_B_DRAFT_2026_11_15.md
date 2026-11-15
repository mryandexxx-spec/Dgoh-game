# Campaign 2.0 — C4.19 «Легионы Салусы» · «Марш, стёртый ветром» · этап B

**Статус:** утверждено владельцем в чате 15.11.2026; отдельная feature-ветка и Draft PR. **Не merge, не публиковать**, не менять v121 и root PWA. Перед следующим шагом проверить PR CI и реальную артефактную визуальную приёмку владельцем.

## Художественный канон

Dark VI D:5, десять неизменных глобальных миссий 120–129 (уровни 43–56). Source of truth: \`src/data/campaigns.js\`, \`CAMP_DEF.D.chapters[5]\`. Канонические STORY, foes, boss, drops, 210 IDs, save migration, economy и прогресс не меняются.

Согласованная идея — единая диагональная география Арракиса: **имперская дисциплина → первые поражения → буря и разлом строя → черви и вынужденное отступление → человеческий силуэт Муад'Диба**. Салуза — происхождение сардаукаров, не физически соединённая с Арракисом планета.

Три акта: 120–123 (строй, первая кровь, пленный); 124–126 (Кориолис, каньон, тайная вода); 127–129 (черви, отступление, пророк). Уникальные landmarks встроены в 3D географию; nine contiguous world-route stretches; отдельного pager/грида/10 экранов нет. Несхожесть с «Зеркалом Падишаха», «Железной квотой» и «Венцом без трона» — обязательна.

## Проектная сцена

- \`src/render3d/scenes/campaign-salusa-legions.js\`: самостоятельная статичная геометрия, одна connected mesh земля, широкие маршрутные участки и десять ориентиров, ни одного собственного Engine/rAF/timer/particles/shadow RTT.
- \`src/data/campaign-map-presets.js\`: тема \`salusa-wind-march\`, 10 X/Z и 10 индивидуальных \`focuses\` по утверждённой спецификации.
- \`src/render3d/scenes/campaign-map.js\`: регистрация темы в существующем \`EngineHost\` / \`CampaignMapScene\`, тема включена в локальную world-projection фильтрацию и camera bounds. Жесты v101, 2D fallback, static mode и dispose сохраняются.
- \`tests/smoke/campaign20.mjs\`: 22 **настоящих** Chromium/SwiftShader WebGL PNG: MED 844×390 + LOW 667×375, первый вход и 10 фокусов для каждого; контролируются canvas, идентификаторы, world-space 2–4 consecutive метки, отсутствие overlap/clip/scroll, 10 ориентиров, 9 соединений и scene budgets.
- \`tests/smoke/campaign-lifecycle.mjs\`: MED/LOW/HIGH × 3, D:5 добавлен к стандартным lifecycle тестам. Полный CI workflow \`.github/workflows/validate-pwa.yml\` сохраняется, с загрузкой существующего Campaign screenshots artifact.

## Критерии приёмки

- 22 PNG доступно через артефакт \`dune-campaign20-\${{ github.run_number }}\` PR workflow (найти \`salusa-march-*.png\`).
- Принимает только фактический CI SUCCESS: artwork, no JS errors, 2–4 consecutive markers 50px/60px boss, lifecycle 3×, deps/build, Golden, PWA/offline, performance, overall required gate.
- Сравнивать фактические meshes/vertices/draw и цену кадра с v121 MED/LOW; свыше +10% — отдельное согласование. Цифры из design-spec — прогноз, не факт.
- Физический Safari/PWA iPhone и реальные FPS/нагрев 10–15 минут остаются открытыми, Chromium SwiftShader — не физический iPhone.

## Releases

v121 подтверждённо опубликована как C4.18. **Этот Draft PR не разрешён к merge или release**. После технической/художественной приёмки отдельно получить согласие владельца на merge и отдельно — на publication, соблюдать validated artifact / Pages gate.
