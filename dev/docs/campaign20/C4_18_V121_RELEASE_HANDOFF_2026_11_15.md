# Campaign 2.0 — C4.18 «Наследник» / «Венец без трона» — v121 validated release handoff

Дата: 15.11.2026. **v121 ОПУБЛИКОВАНА И ПОДТВЕРЖДЕНА.** Владелец дал отдельную команду «Сливай и выпускай»; официальный validated publish и отдельный GitHub Pages deployment выполнены успешно, файлы сверены с тестовым SHA-256 артефактом.

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

## Подтверждённый выпуск v121 — 15.11.2026

- [Release PR #108 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/108), squash **`0ace9e878724b1de9f98d8177f1c827c100b106c`**, точное название `release(campaign): publish v121`. [Full release PR CI #43742998526 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43742998526).
- [main CI #43743577876 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43743577876) на exact release SHA; [одноразовый guard #43743577871 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43743577871) проверил v121, предыдущий SW `5c7310b18b`, принятый D:4 код и CI-тесты; отправил единственный `publish=true`.
- [Официальный validated publish #43743591453 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43743591453) — `workflow_dispatch`, все required CI и финальный gate SUCCESS, затем `Publish verified PWA to GitHub Pages` SUCCESS; `Verified build v121 / 9f55a9a721 · 188 SHA-256 files`, staged byte-for-byte without rebuild, [публикуемый артефакт](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43743591453/artifacts/14173671996).
- Публикационный sync root commit **`c17770f89b762ca642fdb6b05578d31157df3774`** (`Publish verified PWA from CI artifact`), `dev/version.json={"v":121}`, root `sw.js` `VER='9f55a9a721'`, `SHELL['app.js']` SHA-256 prefix **`19da181e64f9df78`**. Ранее production v120 имела SW `5c7310b18b`.
- [Отдельный GitHub Pages deployment #43744361527 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43744361527) на **exact root SHA `c17770f89...`**. Production: https://mryandexxx-spec.github.io/Dgoh-game/. **v121 опубликована.**
- Одноразовый release guard удаляется отдельным документационным cleanup PR после публикации; повторная отправка `publish=true` отсутствует. Физические Safari/PWA iPhone проверки остаются открытыми.


## Дальше
После публикации остаются две главы Dark `D:5` (C4.19) и `D:6` (C4.20). Для следующей главы — только новый художественный этап A по канону и отдельное согласование.
