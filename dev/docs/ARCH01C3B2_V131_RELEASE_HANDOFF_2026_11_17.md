# ARCH-01C3b2 — v131: живые уведомления Джихада принадлежат logic

**17 ноября 2026** · Issue #132 · версия v131 · релизный статус: **кандидат, не считать опубликованным до validated Pages + independent Pages SUCCESS**.

## Решение владельца и база

Владелец в чате одобрил «принимаю, сливай, выпускай» после завершения Stage A. На диагностике [PR #157](https://github.com/mryandexxx-spec/Dgoh-game/pull/157) MERGED, commit `f6b01e6578f7d335caf9c42279e99257634239d8`, [full CI #44059605426 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44059605426). В 12 виртуальных реальных production-esbuild вариантах сохранены все 167 исходных маркеров и две исходные SCC, предложен минимальный перенос одной runtime-функции.

Исходный опубликованный v130: [официальная проверенная публикация #44050433689](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44050433689) SUCCESS, [независимый Pages #44051694332](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44051694332) SUCCESS, root `4297132fe9fc9deee00445f2580a6d265959c9ba`, SW `f97ab7c7da`, 188 SHA-256 файлов. После публикации #156 (docs) и #157 (diagnostics) не меняли root PWA.

## Реализация только одного ребра ARCH-01C3b2 Stage B1

Отдельный [PR #158](https://github.com/mryandexxx-spec/Dgoh-game/pull/158) переносит **в точности старое тело** `cqBump(ev,s,n,abs)` из `dev/src/data/conquest-data.js` в `dev/src/logic/conquest.js`; логика использует ранее существующие imports core/state (NOTES,S) и data (cqFeats), а UI перенаправляет уже существующий именованный импорт. Из `data` удалена **только** живая зависимость `→ core/state.js`. Старый глобальный `cqBump` остаётся, путь именованного экспорта меняется на logic; все внутренние потребители обновлены.

Архитектурный baseline **6→5**, новых 0, stale 0. Пять оставшихся:
```
data/boss.js -> logic/battle/skills.js
data/conquest-data.js -> logic/conquest.js
data/conquest-data.js -> ui/overlays/celebrate.js
data/looks.js -> logic/battle/ai.js
data/story.js -> assets/models.js
```
Изменять эти рёбра без новой отдельной виртуальной проверки запрещено. C3b0 celebrate NO-GO (0/35), C2d story/models NO-GO (0/39) по-прежнему заблокированы.

**Неприкосновенно:** 173 JS-модуля, **167/167 исходных ESM-маркеров**, **898 имён экспорта**, 2 прежние SCC (Conquest 106, вторая 9); `SPLIT`, золотые тесты, цены `cqRfN/cqRfCost`, 21 карта/210 миссий, накопленные save/progress, weekly reset, 50 crystals/50 refill-energy/100 cap/180-second regeneration, NOTE notifications и 3D bootstrap. Лагерь не менять (UI, 3D, кнопки, зоны, стили, навигация). Новый тест на реальной PWA и артефакте проверяет fresh/imported/replaced save, Monday week reset, global/local/boss feats, once-only points, cqScore, NOTES payload/IDs, persist и старые refill formulas.

## Fail-closed процесс релиза v131

1. В **feature PR #158** full CI, строгий 167/898/5/0/0 AST/SCC, 210 mission SHA, golden 200 боёв/meta/saves/41 screens на PWA+artifact, offline/SW, iPhone DOM, мобильный MED/LOW и desktop HIGH WebGL, 3D lifecycle/ресурсы — **SUCCESS** до merge; Pages в PR SKIPPED. После merge — main исходники соответствуют точному tested feature head.
2. Отдельный release PR содержит **только** `dev/version.json`, `dev/CHANGES_STATUS.md`, этот handoff и one-time `.github/workflows/release-v131-once.yml`. **Никакого dev/src, SPLIT, baseline, save, golden, ассетов и root PWA в release PR.** Полный CI release PR SUCCESS.
3. Выполнить squash merge release PR строго с заголовком `release(arch): publish v131`. Однократный fail-closed guard проверит точную версию, оставшийся v130 root SW, 5 ledger edges, перенос тела и импортов, 167 SPLIT слотов и прежние blocked predecessor, затем **однократно** dispatch `validate-pwa.yml` c `publish=true` на main.
4. Официальный workflow строит PWA, проверяет всё на PWA/artifact и публикует **именно испытанный артефакт**, только при `All required checks passed SUCCESS`; Pages публикация должна быть SUCCESS.
5. Отдельный root Pages workflow на новом root commit должен быть SUCCESS. Только затем записать в Issue #132 реальные run IDs, SHA root, версию SW и count/hash receipt. После публикации удалить использованный одноразовый guard отдельным docs-only PR без нового publish.

**Физическая приёмка v131 Safari/iPhone остаётся открытой**: обновление v130→v131, холодный/тёплый запуск и offline, weekly Conquest feat/NOTES, ежедневные пополнения, импорт сейва, Campaign 2.0, лагерь и WebGL MED/LOW. CI-эмуляция не заменяет телефон.
