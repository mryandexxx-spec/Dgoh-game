# ARCH-01C3a1/a2 — v128: безопасное разделение косметики и состояния

**Дата:** 17.11.2026. Владелец: «Давай сольем, опубликуем и перейдем к следующему пакету». Разрешение включает последовательный merge обоих пакетов, отдельный проверенный выпуск и начало диагностики C3a3. Источник истины `main`, не 3D-лагерь.

## Фактические изменения игры — УЖЕ слиты

1. **[PR #145 — C3a1 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/145)**, squash `c33ceb9640e2e09d65f3428b3049f4e80b669c83`; [полный PR CI #43967523398 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43967523398). `data/cosmetics.js` более не импортирует live `core/state.js` или `logic/progress.js`; ровно тот же `unlocked(kind,id)` выполняется в `logic/cosmetics-unlocks.js`, старый named API остаётся публичным. `ui/wiring.js` регистрирует callback в доказанной безопасной точке. Baseline 11→9.
2. **[PR #146 — C3a2 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/146)**, squash `d7e07c93251976970aa904f596a2db070207e35b`; [полный исходный PR CI #43975133035 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43975133035), а после буквального переноса 15 файлов только C3a2 на main новая [CI #44022567313 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44022567313) доказала идентичный fingerprint/behavior, `ci-artifact verify` и повторное использование полного покрытия исходного run. `data/cosmetics.js` более не импортирует `assets/models.js`; точная подстановка `WORM_IMG.ava` в SVG и `worm.bg` выполняется в разрешённом `ui/overlays/profile.js` при ESM evaluation до первого отображения. Никаких изменений в HTML-разметке и CSS; baseline 9→8.

## Проверки неизменности

- **8 старых** обратных `data→*` зависимостей, **0 новых/устаревших**; **173 исходных модуля / 1003 статических импорта / две прежние SCC**; `check-bundle OK (167)`, все старые ESM-маркеры в прежнем порядке, 898 экспортируемых имён/0 утраченных.
- Сохранены 3 строгих SHA-256 на реальных PWA **и** artifact, зафиксированных до рефакторинга: права на косметику `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55`; весь каталог эмблем/SVG/фонов/титулов/рамок `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8`; HTML червя для нескольких размеров и рамок, фичи и профиль `737995ab60dc152a2b39a4fa6002114aef1b45c9cc123396edb0bd491f52cde2`.
- Все 210 миссий Campaign 2.0 побитово прежние, полный SHA-256 `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`; 4096 RNG значений, стоимость 6/8, условия открытия 210 миссий, правило путешествий, golden 200 боёв/meta/saves/41 screens, обновление/offline PWA, DOM iPhone, 3D WebGL phone+desktop MED/LOW и строгое освобождение ресурсов — PASS.
- Файлы **лагеря**, его Babylon-сцены, навигация, кнопки, зоны, стили и графика не менялись. Никаких изменений состояния/формата сейвов, экономических данных, баланса, наград или 21 карты Campaign 2.0. Связи `data/cosmetics.js→logic/stats.js` (C3a3) и `data/story.js→assets/models.js` (C2d, 39/39 NO-GO) **намеренно сохранены**.

## Контракт v128 — fail closed

1. От полностью слитого `main=d7e07c93251976970aa904f596a2db070207e35b` создать `release/arch01c3-v128-validated-20261117`. Изменить только `dev/version.json:127→128`, `dev/CHANGES_STATUS.md`, этот handoff и `.github/workflows/release-v128-once.yml`. Никакого изменения `dev/src`, baseline, SPLIT, golden и корня PWA.
2. [Release PR](https://github.com/mryandexxx-spec/Dgoh-game/pulls) обязан пройти полный mandatory CI и финальный `All required checks passed` SUCCESS. Только после этого merge этого релизного PR с **точным squash commit subject** `release(arch): publish v128`.
3. Одноразовый guard на `main` проверяет exact subject, `dev/version.json={"v":128}`, предыдущий опубликованный root Service Worker `const VER = '2e36ce669d'`, строго 8 legacy рёбер без новых, присутствие новой логики C3a1 и UI-owned WORM_IMG C3a2, контрольных тестов. Затем **один раз** вызывает официальное `validate-pwa.yml` / `workflow_dispatch` c `inputs[publish]=true`.
4. Официальный validated workflow обязан пройти обязательный gate, SHA-256 receipt/artifact, проверку exact-current-main, синхронизацию только проверенных PWA bytes в корень репозитория и `actions/deploy-pages` SUCCESS. Затем подтвердить отдельный `pages build and deployment` SUCCESS на опубликованном production root SHA. **Не объявлять v128 опубликованной до этих доказательств**.
5. После публикации записать run IDs, root SHA, SW hash и CI в Issue #132 и журнал; одноразовый release guard удалить отдельным docs-only PR после подтверждения без нового publish. Физический Safari/iPhone v128 проверить отдельно (cold/warm PWA/SW, эмблема червя, права на косметику после импорта сейва, профиль/рамки, лагерь без изменений, Campaign 2.0 6/8, WebGL MED/LOW, offline).

## Фактический релиз v128

**v128 ПОДТВЕРЖДЁННО ОПУБЛИКОВАНА 17.11.2026.** Проверенный источник `dev/version.json={"v":128}`, root SW `const VER = '0437419c76'`; физическая Safari/iPhone проверка ещё открыта.

- **[Release PR #147 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/147)**, exact subject `release(arch): publish v128`, SHA `184ef4ac68845abe550cf601984b885b98c94e1d`; [полный release candidate CI #44023037203 SUCCESS (19 mandatory jobs)](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44023037203), postmerge main [CI #44023964999 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44023964999).
- **[One-shot guard #44023965100 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44023965100):** exact message/version, previous SW `2e36ce669d`, 8 old dependencies and new cosmetic contracts verified; dispatched official `validate-pwa.yml` `publish=true` exactly once.
- **[Official validated publish #44024295063 SUCCESS, attempt 2](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44024295063):** first attempt passed all but one arena HUD drift check at 667×375 (3 px on low resolution); mandatory gate correctly blocked publication. Re-run on same exact source/artifact/thresholds passed; **20/20 jobs including gate + `Publish verified PWA to GitHub Pages` SUCCESS**. SHA-256 receipt confirmed **188 files**, `Verified build v128 / 0437419c76`, exact-current-main, no rebuilt source after validation, exact PWA bytes pushed to root.
- **Published root `73b60eef17b01ee371d58a549f4ab6beb9447682`**, commit `Publish verified PWA from CI artifact`. Root contains `dev/version.json={"v":128}` and new SW `0437419c76`. **[Independent GitHub Pages #44025945489 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44025945489)** on exact root SHA. URL: https://mryandexxx-spec.github.io/Dgoh-game/.
- **Источники и графика неизменны:** archived baseline **8/0 new/0 stale**, `check-bundle OK (167)`, source 173 modules/2 SCC; 210 NODES, 4096 RNG, три косметических SHA-256, golden 200 battles/meta/saves/41 screens обеих сборок, PWA SW/offline, WebGL MED/LOW phone/desktop, cinematic и 3D lifecycle PASS. Лагерь, 3D-сцены, зоны, стиль, кнопки, сохранения и баланс не менялись.
- **Docs-only post-release cleanup:** удалить `.github/workflows/release-v128-once.yml`, записать фактические receipts сюда и в `CHANGES_STATUS.md` без изменения `dev/src`, root PWA, version, golden и без повторного `publish=true`. One-shot guard больше не требуется.

**Открыто:** физическая iPhone/Safari v128 (переход v127→v128, cold/warm, offline/SW, аватар червя, права/рамки/титулы после импорта сейва, лагерь и Campaign 2.0 MED/LOW); отдельная диагностика C3a3 и блокирующий C2d.

## Продолжение

**ARCH-01C3a3** — один отдельный пакет по последнему order-only `data/cosmetics.js → logic/stats.js`. Начинать с virtual esbuild/TDZ, без изменений лагеря и без принудительного переставления SPLIT; отдельный Draft PR и отдельная приёмка. **C2d остаётся заблокирован** до отдельного проекта развязки 3D bootstrap SCC.
