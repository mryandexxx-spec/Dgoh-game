# ARCH-01C3a2 — WORM_IMG: перенос SVG из data в слой отображения

**Дата:** 17 ноября 2026. **Stacked base:** [C3a1 Draft PR #145](https://github.com/mryandexxx-spec/Dgoh-game/pull/145) (HEAD `89c2504d2439751321c3692925fb0367995632bd`, full [CI #43967523398 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43967523398)); публикация игры **v127**, `main=02a4f0143a...`. Владелец поручил «Идём дальше», не дав отдельного разрешения на merge C3a1. Поэтому C3a2 изолирован в **stacked Draft PR на ветку C3a1**, main и release не изменяются.

## Контекст и опасность

В C3a1 baseline **9**; только три остаточных ребра связаны с косметикой/историей: `data/cosmetics.js -> assets/models.js`, `data/cosmetics.js -> logic/stats.js`, `data/story.js -> assets/models.js`. Последний — C2d, доказанный NO-GO 39/39 вариантов; не трогать. Цель этого пакета — **ровно одно ребро** `data/cosmetics -> assets/models`, ожидается 9→8, не 9→7.

Раньше `data/cosmetics.js` сразу после объявления `EMBLEMS` исполняет:

`if (typeof WORM_IMG !== 'undefined') { EMBLEMS.worm.svg = `<image href="${WORM_IMG.ava}" x="1" y="1" width="38" height="38"/>`; EMBLEMS.worm.bg = ['#a8784a', '#2a1608']; }`

Это **не просто картинка**: `WORM_IMG.ava` вычисляется в `assets/models.js` через `assetUrl('img/worm-ava.png')` из `__ASSET_MAP__`, подменяемой сборщиком отдельно для PWA и artifact. Нельзя хардкодить путь или заменить фото процедурной мордой червя. Нельзя менять WORM_IMG, карту ассетов, 3D-функцию `b3Pre(loadAssets3)` или расположение 3D-модулей в цикле ESM. Вся таблица EMBLEMS, URL, градиент, fallback, фон, титулы/рамки должны остаться **побитово идентичными**.

**Безопасный кандидат:** импортировать `WORM_IMG` напрямую из `assets/models.js` в UI (`ui/overlays/profile.js`), перенести **точно ту же** строку патча SVG после импортов этого модуля — до первого `avatarHtml()`, `openProfile()` или `profileChip()`; в data оставить только декларативные EMBLEMS/FRAMES/TITLES/FREE и совместимый C3a1 `unlocked`. Мутация `EMBLEMS.worm` остается прежней, но меняется владелец и момент инициализации. Поэтому одной проверки наличия SVG недостаточно — нужны строгие runtime snapshot по реальной PWA+artifact и TDZ-gates.

## Стадия A — только virtual esbuild

`dev/tests/ci/arch01c3a2-virtual-worm.mjs`, импорт из обязательного `arch-init-graph.mjs`: тестирует исходный production esbuild (format esm, no treeshake), удаление одного ребра и 6 вариантов регистрации в существующих не-data UI файлах. Проверяет **все 167 старых ESM-маркеров** на точное совпадение прежних позиций, missing/extra, и прежние SCC. Модели/профиль/feats/wiring изменяются **только в памяти esbuild-плагина**. Не трогать `dev/src`, baseline, SPLIT, golden, PWA и версию до GO по exact old order.

Если ни один кандидат не имеет `moved=0, missing=[], extra=[]`, **STOP/NO-GO**, как C2d. Не менять SPLIT ради подгонки.

## Только после виртуального GO

1. Минимальная реальная правка `data/cosmetics.js` (только удаление import и старой SVG-подстановки), и один разрешённый UI-адаптер без изменений разметки и визуальных шаблонов. **Никаких правок ui/views/lobby.js, ui/views/camp.js, render3d/scenes/camp.js, лагерь/стили/навигация/зоны/кнопки**.
2. Убедиться, что before/after snapshot для **всех** `EMBLEMS/FRAMES/TITLES/FREE` и реального HTML `avatarHtml('emb:worm')` совпадает на **PWA + artifact**. Уже зафиксированный в C3a1 строгий SHA-256 каталога: `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8` и прав: `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55` — неизменяемые контрольные точки. Дополнительный HTML SHA собирать на неизменённом коде до реализации.
3. AST baseline **9→8**, 0 новых/stale; нет новых SCC/TDZ, не терять `b3Pre(loadAssets3)` и `WORM_IMG` в assets/models. `SPLIT` старых **167** не переставлять (если добавления модулей нет, останется 167). Проверить named exports/количество JS и сохранение модели червя, персонажей и 210 миссий.
4. Full CI: golden 200 battles/meta/saves/41 screens на PWA и artifact, offline/SW, E3 DOM, 3D/arena/camp/campaign phone/desktop WebGL MED/LOW, строгий resource lifecycle. **Никакого golden update**, никаких новых боевых правил, экономик, графики, формата сейвов.
5. **Только Draft; нет согласия на merge, release и публикацию**. Физическая Safari/iPhone v127 приёмка открыта, C2d blocker отдельно.

## Виртуальная проверка и исходные эталоны — до вмешательства в игру

- В [CI #43973551768](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43973551768), AST gate, на неизменённом C3a1 исходнике: `remove-only` и все шесть вариантов UI ownership (`ui/overlays/profile.js`, `ui/views/feats.js`, `ui/wiring.js`) дали `moved=0, missing=[], extra=[]` для всех **167 из 167** старых ESM маркеров. Выбран `ui/overlays/profile.js#0`: уже имеет импорт EMBLEMS и содержит `avatarHtml`; один новый разрешённый import WORM_IMG в UI и прежний SVG-патч после импортов до `openProfile`. Лагерь/3D/рендер не меняются.
- В [CI #43974108838](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43974108838) **до реальных src изменений** зафиксирован SHA-256 готового HTML, включающего оригинальный URL из `WORM_IMG.ava`, SVG, HTML `avatarHtml('emb:worm')` для размеров 22/44/84 и рамок basic/worm/gold, `profileChip()` и `cosHtml()`. На **PWA и artifact** исходный хеш одинаковый: `737995ab60dc152a2b39a4fa6002114aef1b45c9cc123396edb0bd491f52cde2`. Закреплён константой в `tests/arch01c3a2-worm-avatar-html.mjs` до исходных изменений.
- Ранее в C3a1 снимки всех прав `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55` и полного каталога SVG `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8` сохранены и также обязательно проверяются на обеих сборках.

## Реальная реализация C3a2 — в stacked Draft

- `src/data/cosmetics.js`: удалены `import { WORM_IMG } from '../assets/models.js'` и **одна строго исходная** строка замены SVG/фон; статические фракционные эмблемы и их fallback, FREE, FRAMES, TITLES, C3a1 compatibility API сохранены. `logic/stats.js` order-only import остаётся первым.
- `src/ui/overlays/profile.js`: добавлено `import { WORM_IMG } from '../../assets/models.js'` после прежнего импорта косметики, а старая строка SVG+bg буквально перенесена в UI-модуль после всех import и до первого `openProfile()/avatarHtml()`. Не меняется ни один шаблон, DOM, CSS или игровое правило.
- `tools/arch-import-baseline.json`: **9→8** (одно и только одно ребро); `tools/split.config.mjs` остаётся прежним, **167 маркеров** без перестановки. C3a1 AST регрессия обновлена, добавлена `tests/ci/arch01c3a2-worm-boundary.mjs`, предыдущие C1/C2 regression gates остаются строгими с точным счётчиком 8.
- `assets/models.js`, `data/story.js`, `render3d/scenes/camp.js` и весь лагерь неизменны. `b3Pre(loadAssets3)` и реальная `__ASSET_MAP__` остаются в asset module; нет хардкода путей.
- Обязательный CI на настоящих PWA+artifact: три зафиксированных до изменения SHA-256 (прав, каталога, HTML), 210 NODES hash, ESM static/split, golden, offline, 41 screens, phone+desktop WebGL MED/LOW. **До полной финальной проверки пакет остаётся непринимаемым**.

**Без отдельного разрешения владельца не сливать ни PR #145, ни stacked PR #146; не выпускать релиз.** Состояние полного CI фиксируется отдельно после завершения.

