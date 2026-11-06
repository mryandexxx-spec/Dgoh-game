# Фаза 2 «Сборка и разрезание» — статус (REFACTOR_PLAN §7)

**Дата:** 2026-11-05. **База:** артефакт v45 (= PWA `dune-goh-b19cf011b1`), эталоны фазы 0 без изменений.

## Итог
| Критерий | Статус |
|---|---|
| `src/` из ES-модулей + esbuild | ✅ 85 JS-модулей + 23 CSS-файла, сборка `tools/build.mjs` |
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

## Что осталось (не блокирует выкатку)
1. **Правило зависимостей §2:** 7 унаследованных нарушений (`tools/check-deps.mjs`): `sRng` (render2d → data/logic), `SPOT_ICONS`/`NOTES` в `data/conquest-data`, `figureSVG` в `data/cosmetics`, `giveRewards`/`RW_NAME`/`unlockedIds` (ui → logic), `TRIALS` в `ui/views/trials` (→ `logic/stats`), DOM в `logic/conquest` (`cqPop`). Лечится переносом объявлений (функции — без риска для порядка) — следующий шаг.
2. Части разных разделов, смешанные в монолите, лежат в одном модуле (например, `core/save.js` содержит `fmt/ic/amt`, `ui/overlays/sim.js` — `campReward`). Разносить вручную, проверяя golden.
3. Глобалы `SC/SHG/PBR_ON` переведены на сеттеры, но остаются глобальным состоянием — замена на `ctx` в фазе 3.
4. Ассеты (`MODEL_DATA` 3,9 МБ, `ENV_HDR`, `MOCAP`) — пока JS-модули `src/assets/*.js` (в паке — заглушки); перевод в файлы — фаза 5.
5. Инструкции проекта ссылаются на `build_pwa.py` — заменить на `node tools/build.mjs --static <архив>`.
