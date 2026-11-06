# Фаза 2 «Сборка и разрезание» — статус (REFACTOR_PLAN §7)

**Дата:** 2026-11-05. **База:** артефакт v45 (= PWA `dune-goh-b19cf011b1`), эталоны фазы 0 без изменений.

## Итог
| Критерий | Статус |
|---|---|
| `src/` из ES-модулей + esbuild | ✅ 87 JS-модулей (85 + 2 при доделке) + 23 CSS-файла, сборка `tools/build.mjs` |
| Перенос механический | ✅ строки монолита дословно; добавлены только `import`/`export`, 18 сеттеров (`X = v` → `set_X(v)`), 220 правок записи |
| golden + DOM-снимки совпадают | ✅ battles / meta / saves / screens — на **артефакте** и на **PWA** (sha эталонов те же) |
| `build_pwa.py` → `build.mjs` | ✅ артефакт (один HTML, Babylon с jsdelivr) и PWA (index.html + app.js + app.css + статика прошлого архива) |
| 3D (смоук, SwiftShader) | ✅ лагерь и арена создаются, ошибок нет |

Проверка эталонов при переносе в рабочую папку: эталоны, снятые заново на базовой сборке, **побайтно совпали** с сохранёнными в проекте (одинаковые первые строки и последняя строка gzip с CRC32/длиной).

## Как устроено
- **Проход 1** (`tools/extract-pass1.mjs`): артефакт → `src/index.html` (каркас с метками `<!--@css-->`, `<!--@js-->`…), `src/styles/app.css`, `src/app.js` (оба скрипта подряд), `src/pwa/*` (head/хвост PWA). Golden — зелёные.
- **Проход 2** (`tools/modularize.mjs` + `tools/split.config.mjs`, `tools/split-css.mjs`): разрезание по таблице §2 на непрерывные куски.
  - Импорты/экспорты вычисляются анализом областей видимости (`tools/scope.mjs`, acorn).
  - **Порядок инициализации** (риск §8): каждый модуль импортирует предыдущий, импорты по убыванию номера, `main.js` импортирует последний → обход ESM исполняет модули строго в порядке монолита. Проверяет `tools/check-bundle.mjs` (порядок + все 697 глобальных имён на месте без переименований).
  - Бандл — ESM без экспорта, вставляется классическим `<script>`: верхний уровень остаётся глобальным, как в монолите (на это опираются eval-шаги DOM-набора и `g.run` в тестах). esbuild превращает `let/const` верхнего уровня в `var` — проверено: коллизий с `window.*` нет.
  - CSS склеивается текстуально по `src/styles/index.css` — байт-в-байт равен исходному.
- `tests/lib/load.mjs` — изменён только загрузчик: выполняет все скрипты страницы, включая локальный `<script src="app.js">` (PWA); наборы не тронуты.

## Команды
```
npm i                                                    # esbuild, acorn, acorn-walk, fflate
node tools/pack.mjs unpack src.pack.txt <артефакт.html>  # восстановить src/ (литералы ассетов берутся из артефакта)
node tools/build.mjs --static <прошлый dune-pwa-flat.zip> # → dist/artifact.html, dist/pwa/, dist/dune-pwa-flat.zip
node tools/check-bundle.mjs dist/pwa/app.js              # порядок модулей и глобальные имена
node tests/run.mjs dist/artifact.html --babylon dist/pwa/babylon.min.js
node tests/run.mjs dist/pwa/index.html
node tools/check-deps.mjs                                # правило зависимостей §2
node tools/pack.mjs pack src.pack.txt                    # упаковать src/ для проекта
```

## Доделка 2026-11-06: правило зависимостей §2 и разнос смешанных кусков
Перенос механический (объявления дословно, формулы/RNG/разметка/сохранения не менялись), эталоны не переснимались: battles / meta / saves / screens совпадают на артефакте и PWA. `node tools/check-deps.mjs` → **нарушений нет**.

| Что | Откуда → куда |
|---|---|
| `sRng` | `render2d/scenes` → `core/util` |
| `NOTES` (очередь уведомлений) | `ui/notifications` → `core/state` |
| `SPOT_ICONS.conq = …` | `data/conquest-data` → `ui/wiring` (после `.trial`/`.feat`, порядок ключей тот же) |
| `avatarHtml`, `accBadge`, `accPanel` | `data/cosmetics`, `logic/account` → `ui/overlays/profile` |
| `accXP` (начисление + строки HTML) | `logic/account` → `ui/rewards` (рядом с `giveRewards`) |
| `RW_NAME` | `ui/rewards` → `logic/economy` |
| `unlockedIds` | `ui/overlays/squad-select` → `core/util` (рядом с `prog`) |
| `cqPop` (DOM) | `logic/conquest` → `ui/views/conq` |
| данные и правила испытаний (`TRIALS`, `TRIAL_LVL/ST/RUNS`, `trialStars`, `trialRoll`, `trialOpen` …) | `ui/views/trials` → **новый** `logic/trials` |
| `fmt`, `ICONS_RES`, `ic`, `amt`, `fc` | `core/save` → **новый** `core/format` |
| `campReward`, `rollShards` | `ui/overlays/sim` → `logic/economy` |

Модулей теперь 87 (`logic/trials` стоит в цепочке перед `ui/views/trials`, `core/format` — перед `core/save`; оба добавлены в `tools/split.config.mjs`, номер строки — как у модуля-источника; таблица теперь служит только реестром порядка для `check-bundle`).

**Правила, выявленные при переносе:**
- Порядок исполнения держится на импорте предшественника по цепочке. Если у модуля удаляется последний именованный импорт из предшественника, вместо него обязателен `import './пред.js'; // порядок исполнения` (иначе цепочка рвётся — check-bundle падает).
- Новый именованный импорт «вперёд» по цепочке может сдвинуть порядок, если он стоит раньше импорта предшественника; в затронутых модулях импорт предшественника поставлен первым.
- const/let переносились только в модули, стоящие раньше в цепочке (или в новый модуль непосредственно перед исходным); функции — куда угодно.

## Что осталось (не блокирует выкатку) — пп. 1–2 закрыты в фазе 3a, п. 3 — в 3b (см. PHASE3_STATUS.md)
1. HTML в логике (не нарушение `check-deps`, но смешение): `cqRwHtml`, `cqBadge` в `logic/conquest`; `CQ_ICON`, `cqI` в `data/conquest-data`; `accXP`/`giveRewards` возвращают строки HTML и живут в `ui/` — разделение «начислить» / «показать» требует изменения порядка вызовов, это фаза 3. `grantShards` (в `ui/overlays/squad-select`) — логика с `toast`, туда же.
2. `core/util.js` остаётся сборным модулем (DOM-хелпер `$`, энергия, требования узлов, `glyph`) и импортирует `ui/*` — разнести в фазе 3 вместе с `ctx`.
3. Глобалы `SC/SHG/PBR_ON` переведены на сеттеры, но остаются глобальным состоянием — замена на `ctx` в фазе 3.
4. Ассеты (`MODEL_DATA` 3,9 МБ, `ENV_HDR`, `MOCAP`) — пока JS-модули `src/assets/*.js` (в паке — заглушки); перевод в файлы — фаза 5.
5. Инструкции проекта ссылаются на `build_pwa.py` — заменить на `node tools/build.mjs --static <архив>`.
