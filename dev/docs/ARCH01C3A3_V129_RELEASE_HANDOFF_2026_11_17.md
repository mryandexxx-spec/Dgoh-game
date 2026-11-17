# ARCH-01C3a3 — выпуск v129: проверяемая публикация косметического порядка stats/feats

**17 ноября 2026**. Repo `mryandexxx-spec/Dgoh-game`, issue [#132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).
Владелец принял оба пакета: «Принимаю, сливай, публикуй». **Публикация согласована** только в безопасном штатном порядке после CI; не считать успешной заранее.

## Зафиксированная база и scope

- Старый подтверждённо опубликованный выпуск: **v128**; [official validated #44024295063 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44024295063), [independent Pages #44025945489 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44025945489), `main root=73b60eef17b01ee371d58a549f4ab6beb9447682`, `sw.js:const VER = '0437419c76'`.
- [#149 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/149), squash `d60b9e88d1d5a5dd752d0adc0341351926da43e5`: `data/cosmetics.js → logic/stats.js` устранён; два уже существующих импорта в UI `feats.js` переставлены (METRIC прежде EMBLEMS), без новой runtime зависимости. Baseline **8→7**, 0 новых/устаревших, порядок всех **167** исторических модулей точен, 898 named exports без потерь, 173 JS, прежние две SCC.
- Independent diagnostic [#148](https://github.com/mryandexxx-spec/Dgoh-game/pull/148), [CI #44027572147 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44027572147) — 27 virtual esbuild вариантов, только два сохранили порядок, выбран вариант с перестановкой существующих импортов. [Full implementation CI #44028237681 SUCCESS on attempt 1](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44028237681): все mandatory/golden/WebGL/DOM/offline/3D lifecycle.
- [Docs #150 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/150), squash `ff35678bc0c79cee98710e1025ef6d14e543e9c1`, CI [#44028760252 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44028760252): сохранён v128 receipt и удалён старый одноразовый триггер. С этого SHA создаётся release PR.
- PWA и HTML artifact: строгие frozen SHA косметики: entitlement `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55`, каталог SVG `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8`, профиль/червь HTML `737995ab60dc152a2b39a4fa6002114aef1b45c9cc123396edb0bd491f52cde2`; весь 210 NODES digest `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`; 4096 RNG values. Эти эталоны и full golden не менять.
- **Лагерь целиком — не трогать** (UI/3D, сцена, зоны, навигация, кнопки, стили), как и 21 самостоятельную карту Campaign 2.0/210 миссий, сейвы, экономику, баланс, награды, ESM SPLIT, золотые тесты. C2d `data/story.js→assets/models.js` остаётся NO-GO (39/39 виртуальных способов меняли порядок); ещё шесть других оставшихся рёбер — C3b и дальше.

## Содержимое только этого release PR

Только `dev/version.json` (**128→129**), `dev/CHANGES_STATUS.md` (запись v129, актуальный реестр открытых вопросов), этот протокол и одноразовый `.github/workflows/release-v129-once.yml`. **Никаких production source, baseline, SPLIT, golden или PWA root изменений**. Пока не опубликован новый сайт, в Pages живёт v128.

## Fail-closed процесс

1. На изолированной `release/arch01c3a3-v129-validated-20261117` запустить full mandatory PR CI (release-gate, реальная PWA+artifact, SHA-256, золотые, WebGL, DOM/offline). До финального `All required checks passed SUCCESS` **NO MERGE**.
2. Слить release PR squash **с точным subject** `release(arch): publish v129`. Одноразовый guard на main проверит точный subject, `dev/version.json={"v":129}`, прежний root SW `0437419c76`, текущий AST baseline 7, отсутствие `data→stats`, корректный UI stats-before-cosmetics, unchanged C2d и strict C3 tests. Затем *один раз* dispatch `validate-pwa.yml` на `main` с `inputs[publish]=true`.
3. Workflow `Validate Dune GoH PWA` обязан сам пройти полный план/CI + final gate + SHA-256 receipt, подтвердить current main и stage **только те PWA bytes, что тестировались**, затем `actions/deploy-pages` SUCCESS. Проверить новый root commit и новый ServiceWorker VER, а также **отдельный independent `pages build and deployment` SUCCESS**.
4. Только после этой цепочки объявлять v129 опубликованной; записать все run IDs, root/SW/receipt в [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132) и журнал. Одноразовый guard убрать следующим docs-only PR после публикации; без новой выкатки.
5. Физическая Safari/iPhone приёмка **не автоматизирована**, остаётся открытой: холодный/тёплый запуск PWA, обновление v128→v129/offline SW, профиль, рамки/червь, права на эмблемы/титулы после импорта сохранений, подвиги/метрики, лагерь/кампания/WebGL MED/LOW.

## Фактическая публикация

**До выполнения одноразового guard и official validated publish — не подтверждена.** После выполнения обновить этот блок отдельным docs-only коммитом с точными ссылками. Никаких неавторизованных изменений UI/лагеря/игровых механик.

## Продолжение

Следующий отдельный этап — **ARCH-01C3b, reverse data imports в Conquest**, сначала только read-only AST/SCC/ESM virtual анализ и выбор границ владения. **7→6** только при доказанном сохранении всех ESM markers и побочных эффектов; отдельный Draft, CI, приёмка. C2d story/models блокирован. 
