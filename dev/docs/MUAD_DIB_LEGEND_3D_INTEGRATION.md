# Муад’Диб — подключение 3D-модели (staging)

## Граница идентичностей
`paul` — молодой Пол, **не изменять**. `muaddib` — легенда и только она использует `muad-dib-legend.dgm`.

## Доступные источники
- `dev/assets/models/muad-dib-legend.dgm` — DGM1 v5, 66 bones, 8 clips, 18 658 triangles.
- `dev/assets/tex/muad-dib-0.jpg` — текстура, fallback для KTX2.
- `dev/assets-src/characters/muad-dib-legend/` — оригинальный GLB, облегчённый GLB, концепт, отчёты.
- `dev/models/convert_muad_dgm.py` — конвертер.

## Изменения в исходниках
- `dev/src/assets/models.js` — необязательная загрузка `models/muad-dib-legend.dgm` и маппинг на id `muaddib`.
- `dev/src/render3d/characters/authored.js` — ветка для local-TRS, 66 костей, совместимость со старым DGM.
- `dev/tests/muad-dib-asset.mjs` — проверка DGM v5, бинарных ссылок и ключей анимаций.

## Статус
**Staging, не релиз.** Требуются загрузка бинарных ассетов в рабочую ветку, запуск CI, реальный 3D smoke/ретаргет анимаций, KTX2-компрессия, A/B скриншоты на MED/LOW и проверка iPhone. Художественное соответствие Idle/Attack/Hit/Death — только черновая карта (Idle_11 / Right_Hand_Sword_Slash / Stand_Dodge / Charged_Ground_Slam); окончательная постановка и реакция плаща требуют согласования.

## Проверка
После распаковки архива в корень репозитория на ветке `feat/muad-dib-legend-3d-v5`:
`cd dev && node tests/muad-dib-asset.mjs`.
Затем `node tools/check-deps.mjs`, `node tools/build.mjs --deploy`, `node tools/check-bundle.mjs dist/pwa/app.js`, `node tests/run.mjs dist/pwa/index.html --no-dom` и 3D smoke.
