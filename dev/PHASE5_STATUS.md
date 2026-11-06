# Фаза 5 — статус (REFACTOR_PLAN §7, «Ассеты»)

База: коммит daf049f, артефакт v53, PWA `dune-goh-57aa70c8f6`. Сборка из main воспроизводит тот же кэш SW; golden (battles/meta/saves/screens) совпадает на артефакте и PWA.

## Шаг 1 — аудит и план (2026-11-06, согласован)
Встроенные ассеты — около 4,0 МБ из 4,92 МБ app.js (gzip 2,64 из 2,85 МБ):

| Ассет | base64 в app.js | Кто читает |
|---|---|---|
| `MODEL_DATA.duncan` — геометрия (8 частей, около 28 тыс. вершин) | 1 126 К | `authored.js` — лагерь, бой, окно героя, Baker |
| `MODEL_DATA.duncan` — 22 JPEG (8×1024², 10×512², 4×256²) | 1 896 К | `new B3.Texture(dataURI)` (кэш движка по URL) |
| `MODEL_DATA.worm` — геометрия + 2 JPEG | 627 + 88 К | `worm.js` — бой |
| `WORM_IMG` (PNG 128², 220²) | 65 К | `data/cosmetics.js`, `ui/hero-window.js` |
| `ENV_HDR` (RLE .hdr 256×128) | 171 К | `scenes/hero.js` |
| `MOCAP` (JSON + Int16) | 106 К | `mocap.js` — бой; `MOCAP_OK` меняет тайминги анимаций Дункана |

VRAM Дункана (RGBA8 с мипами) — около 56 МБ; цель ≤ 15 МБ без KTX2 недостижима.

**Согласовано:**
- свой бинарный формат DGM1 вместо glb (загрузчик glTF с KHR_texture_basisu и meshopt — около 120 КБ, плюс риск переделки скелета и материалов);
- порядок шагов: 2 пробник → 3 ассеты в файлы → 4 SW → 5 KTX2 (если пробник прошёл) → 6 .env → 7 замеры;
- офлайн: ассеты фоново докачиваются при первом запуске;
- минификация app.js без переименований.

## Шаг 2 — пробник артефакта (2026-11-06, iPhone, iOS 18.7)
- Публикация артефакта отдаёт только веб-типы: .js .wasm .json .txt .jpg .png .webp и т. п. Файлы `.bin/.ktx2/.hdr/.env` не принимаются ни под каким contentType → в артефакте бинарные ассеты лежат base64-текстом в «.txt».
- На iPhone: .txt отдаётся с gzip; base64 5,2 МБ декодируется за 29 мс; WebAssembly.compile и compileStreaming работают; Worker из файла и из blob с importScripts и wasm работают; WebGL2, есть ASTC, ETC2, ETC1, PVRTC, S3TC, BPTC.
- Кодировщик KTX2 (basisu из исходников) песочница собрать не дала — решение в шаге 5.

## Шаг 3 — ассеты в файлы (2026-11-06)
- `dev/assets/` — источник ассетов (разовый перенос `tools/export-assets.mjs`):
  - `models/duncan.dgm`, `models/worm.dgm` (DGM1: заголовок JSON + блобы, байты те же);
  - `tex/*.jpg`, `img/worm-*.png`, `env/desert.hdr`, `anim/mocap.json`.
- `assets/models.js`:
  - сборка подставляет карту путей (`__ASSET_MAP__`, имена с хешем содержимого);
  - `loadAssets3` регистрируется через `b3Pre` — `loadB3` грузит чанк и ассеты параллельно;
  - если ассет не загрузился, 3D заменяет его как раньше (процедурная модель, без mocap и окружения).
- `ENV_HDR` и `MOCAP` — живые `let` с сеттерами; `MOCAP_OK` вычисляется в `onB3`; `b64bytes` принимает и байты.
- `tools/build.mjs`:
  - ассеты `assets/<имя>.<хеш8>.<расш>`; в артефакте для .dgm и .hdr добавляется «.txt»;
  - артефакт — каркас + app.js + app.css + babylon3d.js + assets/ (список — `dist/artifact-files.json`);
  - app.js — minifyWhitespace + minifySyntax; `dist/app.unmin.js` для check-bundle.
- Тесты:
  - `tests/lib/serve.mjs` — локальный HTTP-сервер;
  - смоук и A/B открывают страницу по HTTP (fetch ассетов с file:// не работает).
- Предварительно: artifact.html 3,8 КБ (было 5,02 МБ), app.js 0,59 МБ (gzip 195 КБ, было 4,92 / 2,85 МБ).
- Отличие от плана: клипы — `mocap.json` (тот же объект с base64), а не `mocap.bin`: декодер не меняется, тип файла отдаёт и артефакт.
- В браузере (PWA по HTTP): `MOCAP_OK` true, Дункан и червь из DGM1, окружение героя — `assets/env/desert.<хеш>.hdr` по URL.
- Смоук, 2 цикла desktop:
  - 1 WebGL-контекст, meshes/textures/materials 211/51/120, gpu 92–93 — как в фазе 4;
  - компиляций после wake 0, ошибок консоли 0;
  - «≤ 400 мс» FAIL ожидаем на SwiftShader.

**Версия в футере (по запросу, макет согласован):**
- `#appver` в `index.html` — фиксированный элемент на всех экранах, левый нижний угол, непрозрачность 0,72, z-index выше всего, кроме экрана поворота;
- в бою — по центру снизу (`body:has(#battle)`), слева там панель активного героя;
- текст ставит `ui/views/lobby.js` (`__APP_VER__`, как раньше);
- раньше номер был только в лобби и закрывался тостом заданий.

**Golden screens переснят (`--update`, согласовано):** различий ровно два — экран 37 (`<image href>` эмблемы червя — путь к файлу вместо data-URI) и экраны лобби 0/3/36/38 (`<div class="appver">` ушёл из `#view`); после нормализации этих двух мест все 41 экран совпадают. Battles/meta/saves без изменений.
