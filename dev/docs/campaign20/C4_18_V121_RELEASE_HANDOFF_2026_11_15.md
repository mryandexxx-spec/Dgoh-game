# Campaign 2.0 — C4.18 «Наследник» / «Венец без трона» — v121 validated release handoff

Дата: 15.11.2026. **Релиз разрешён владельцем: «Сливай и выпускай».** На момент подготовки этого файла v121 — release candidate; не обозначать опубликованной до официального validated publish, Pages deployment и фактической сверки корня.

## Утверждение и реализация
- Художественная концепция и 22 настоящих WebGL PNG MED 844×390 / LOW 667×375 приняты владельцем («Ок», «Все ок»), затем отдельно дана команда merge+release «Сливай и выпускай».
- [Issue #105](https://github.com/mryandexxx-spec/Dgoh-game/issues/105), [Implementation PR #107 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/107) squash `178502971cd28886fecc4c4f1732054dbf443cde`.
- [Финальный implementation CI #43724511596 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43724511596) после повтора двух независимых UI/аренных CI джобов; [22 реальных WebGL кадров](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43724511596/artifacts/14165793936).

## Художественная и техническая спецификация
- 19 из 21 авторских 3D карт Campaign 2.0: Тёмная V `D:4`, канонические ID 110–119, уровни 31–42.
- «Венец без трона»: одна непрерывная статичная 3D-диорама-подкова с чёрным отсутствующим троном в центре; три сюжетных акта (арена/яд/Барон; испытание Фейда/Мохиам/дуэль; политический союз, ловушка и долг Гурни); 10 разных монументальных ориентиров и 9 непрерывных связных секций пути.
- Исходные `CAMP_DEF`, 210 миссий, названия, уровни, противники, награды, STORY, баланс, экономика, прогресс и формат сохранений не изменены.
- Общий `EngineHost`/`CampaignMapScene`, оригинальные жесты v101, интерактивный 2D fallback, static idle и dispose, профили HIGH/MED/LOW.
- 22/22 WebGL кадров и фокусов реального Chromium/SwiftShader: 2–4 локальных последовательных world-space метки, без наложений, обрезок, скролла; углы/LOW фокусы доведены по CI.
- Трёхцикловый strict lifecycle: MED 844×390 — **134 meshes / 7610 vertices**; LOW 667×375 — **117 / 6751**; HIGH 960×600 — **134 / 7610**. Нет утечек Engine/WebGL контекстов. Build/architecture, Golden, PWA/offline, all required CI PASS.
- Физический Safari/PWA iPhone (landscape) остаётся **непроверенным**: жесты, открытие 110–119 и бой/симуляция, fallback, offline/SW, FPS, нагрев, батарея 10–15 минут.

## v121 release — fail closed
- Предыдущий confirmed production: **v120**, root `sw.js` cache `5c7310b18b`; версия `dev/version.json` в исходном `main` — 120.
- Отдельная ветка `release/c4-18-v121-validated` изменяет только `dev/version.json` 120→121, release handoff, указатель, `CHANGES_STATUS.md` и одноразовый guard `.github/workflows/release-v121-once.yml`. Никаких новых изменений игрового кода.
- Сначала required PR CI SUCCESS, затем squash merge с **точным заголовком `release(campaign): publish v121`**. Guard проверяет title, SHA, version 121, исходный SW cache 120, принятый D:4 пресет и WebGL тесты; только после этого запускает единственный официальный `workflow_dispatch publish=true` `validate-pwa.yml` на `main`.
- Официальная публикация требует всех required CI/receipt PASS и stage из идентичного SHA-256 validated artifact, sync PWA root, отдельный GitHub Pages deployment SUCCESS и сверку `dev/version.json=121`, app.js v121, изменённого `sw.js` cache, hashes. **До этих доказательств выпуск НЕ опубликован.**
- После завершения удалить одноразовый workflow отдельным cleanup PR, обновить статус журнала и release handoff, не запускать publish повторно.

## Подтверждённый выпуск v121
_PENDING: заполнить после verified publication, не выдавать release candidate за продакшен._

## Дальше
После публикации остаются две главы Dark `D:5` (C4.19) и `D:6` (C4.20). Для следующей главы — только новый художественный этап A по канону и отдельное согласование.
