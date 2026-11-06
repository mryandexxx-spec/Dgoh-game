# Dune GoH — исходники и сборка (папка dev/ репозитория mryandexxx-spec/Dgoh-game)

**Источник правды — `dev/src/` (ES-модули).** Корень репозитория — собранная PWA (GitHub Pages); артефакт https://claude.ai/artifact/WE7ymKgZXUxH7tH4TDvfoT собирается из тех же исходников.
Статус: фаза 2 — `PHASE2_STATUS.md`, фаза 3 — `PHASE3_STATUS.md`, фаза 4 — `PHASE4_STATUS.md`. Документы `dune-tools/src.pack.txt` и `dune-workspace.zip` больше не нужны.

## Цикл правки
```
git clone https://github.com/mryandexxx-spec/dgoh-game && cd dgoh-game/dev && npm i
# правки в src/
node tools/build.mjs --deploy        # dist/artifact.html + PWA прямо в корень репозитория (статика — из корня, по списку sw.js; sw.js — из шаблона src/pwa/sw.js)
node tools/check-bundle.mjs dist/pwa/app.js
node tests/run.mjs dist/artifact.html && node tests/run.mjs dist/pwa/index.html   # = npm test
git add -A && git commit && git push  # в main
```
Перед выкаткой поднять номер в `version.json` (в лобби выводится «v<номер> · <хеш сборки>», хеш = версия кэша SW). Затем dist/artifact.html публикуется в артефакт. `--static <dune-pwa-flat.zip>` — взять статику из архива вместо корня.
JS-инструменты (`tools/`): `build.mjs`; `move-decl.mjs` — перенос объявлений между модулями с починкой импортов и цепочки порядка; `extract-pass1.mjs`, `modularize.mjs` + `split.config.mjs` + `scope.mjs`, `split-css.mjs` — разрезание монолита (выполнено, повторно не запускать: src/ правится вручную); `check-bundle.mjs`; `check-deps.mjs` — правило зависимостей §2; `pack.mjs` — упаковка src/ в текст (запасной вариант).
Python/Blender-скрипты моделей лежат в документах проекта dune-tools/.

## Golden-тесты (tests/) — фаза 0 REFACTOR_PLAN §6.1–6.4
Эталоны сняты 2026-11-05 с артефакта v45 (= index.html PWA `dune-goh-b19cf011b1`). В фазе 2 не менялись: сборки из src/ (артефакт и PWA) совпадают с ними. Нужны Node ≥ 20; для DOM — Playwright + Chromium.

```
node tests/run.mjs dist/artifact.html                                      # все 4 набора, сравнение с эталоном
node tests/run.mjs dist/pwa/index.html                                      # PWA
node tests/run.mjs <html> --no-dom                                          # только Node-наборы (~5 с)
node tests/golden/battles.mjs <html> [--update]                             # отдельный набор; --update переснимает эталон
node tests/lib/golden.mjs unpack battles meta saves screens                 # распаковать эталоны в .json для просмотра
```
`<html>` — артефакт или `index.html` PWA. Babylon тестам не нужен: без WebGL чанк `babylon3d.js` не грузится (фаза 4; `babylon.min.js` больше не поставляется). Номер версии в лобби в снимках экранов маскируется (`v0`).
При расхождении печатаются первые 5 различий, полный факт — в `tests/golden/data/<набор>.actual.json`.

| Набор | Что проверяет | Объём |
|---|---|---|
| `golden/battles.mjs` | 200 боёв ИИ против ИИ в Node (seed 0–199): 140 обычных, 30 рейд-червь, 30 Джихад (диски + модификаторы). Состав отрядов выводится из seed. Итог: победитель, раунды, ходы (актор:умение:цель), HP/щит юнитов, пряность, ритм, полный журнал | 1,2 МБ JSON |
| `golden/meta.mjs` | 1539 табличных случаев: стоимости, характеристики/мощь героев, награды кампании, рейд, вход, испытания, подвиги, лавки, опыт аккаунта; Джихад × 3 сложности | 311 КБ |
| `golden/saves.mjs` | `loadSave()` (fillSave) и `S` после `start()` для: без сохранения, `fixtures/saves/*` | 42 КБ |
| `dom/screens.mjs` | 41 экран: все view, вкладки кампании и лавок, карточки героев, инфо-окна, выбор отряда, симуляция, календарь, профиль, Джихад, бой (старт и ход). innerHTML без канвасов, тела `<svg>` → хэш | ~800 КБ |

Устройство:
- `lib/load.mjs` — выполняет все скрипты страницы (inline и локальные `<script src>`, кроме Babylon) в Node vm с заглушками DOM/Babylon (`start()` не вызывается), фиксированные часы (2026-11-02 12:00 МСК), сидированный `Math.random`. Бандл фазы 2 — классический скрипт, его верхний уровень глобален, поэтому наборы обращаются к функциям по именам (`createBattle`, `campReward`, `fillSave`, …) как раньше.
- `lib/golden.mjs` — канонический JSON (ключи отсортированы, 1 запись на строку), хранение `data/*.json.gz.b64` (gzip + base64: документы проекта — только текст).
- DOM: WebGL отключён (2D-фоллбек, 3D не снимается), часы Playwright на паузе — время идёт только через `runFor`, сеть закрыта.
- Реальные сохранения: положить в `tests/fixtures/saves/` как `.json` или `.txt` (код «Экспорт сохранения») и переснять `saves.mjs --update` **на базовой сборке**.

Правило: эталон переснимается (`--update`) только при осознанном изменении логики/вёрстки; при механическом переносе кода наборы обязаны совпасть. Запись в глобал из eval-шагов тестов (`view = …`, `S = …`) попадает в ту же привязку, что читают модули (бандл плоский).

## 3D-смоук и A/B (tests/smoke/, нужен Chrome)
```
node tests/smoke/3d.mjs dist/pwa/index.html --cycles 20 [--phone]     # реальный WebGL (SwiftShader): лагерь → герой → бой → выход; утечки, компиляции
node tests/smoke/3d.mjs dist/pwa/index.html --tti 5 [--phone] [--net wifi|4g] [--cpu 3]   # время до интерактивного лобби: HTTP + gzip, без кэша, медиана
node tests/smoke/ab.mjs A.html B.html --out dir [--phone] [--babylon babylon.min.js]       # скриншоты A/B; --babylon — только для старых сборок (до фазы 4)
node tests/smoke/sw.mjs <A> <B> [<C>]   # обновление PWA (SW) на localhost: A, B, C — каталоги PWA (C — с изменённым ассетом); перенос кэша, офлайн, старая вкладка
```
