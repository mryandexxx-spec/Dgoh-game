# Скрипты моделей (Python/Blender)

Перенесены из документов проекта claude.ai (`dune-tools/`). Скрипты пишут в рабочую папку `/home/claude/dune/` (пути зашиты в начале файлов — поправьте под своё окружение). Готовые ассеты игры уже лежат в `dev/assets/` (KTX2/JPEG, модели `.dgm.txt`, `mocap.*.json`, `desert.*.env.txt`); скрипты нужны только для пересборки моделей.

- `mhlib.py` — чтение MakeHuman: base.obj, .target, скелет, веса.
- `mh_body.py` — тело Дункана: морфы MakeHuman, поза рук, кулак, перенос весов на скелет игры (15 костей + 3 кости плаща).
- `mh_duncan.py` — одежда и броня поверх тела, волосы, шарф, плащ, сапоги; запускает `mh_duncan_bake.py`.
- `mh_duncan_bake.py` — веса одежды, группы материалов, UV, запекание (альбедо, нормали с хайполи, ORM = AO/roughness/metal), роспись лица, экспорт `blender/duncan.json` + `.glb`/`.blend`.
- `mixamo_clips.py` — перенос клипов Mixamo (`mixamo/*.fbx`: Unarmed_Idle_01, Sword_And_Shield_Slash, Sword_Fight_One) на скелет игры, зеркально → `blender/clips.json`.
- `make_env.py` — HDR-окружение пустыни для витрины героя.

## Окружение
`pip install bpy --break-system-packages` (Blender 5.2). Запуск: `python3 -I mh_duncan.py --render`.
Ассеты MakeHuman (CC0): raw.githubusercontent.com/makehumancommunity/makehuman (base.obj, rigs/default.mhskel, default_weights.mhw) + git sparse-checkout targets → `assets/mh`, `assets/mhrepo`.
FBX Mixamo — `dev/models/mixamo/` (скопировать в `assets/mixamo`).
Скрипт червя `worm.py` утерян; данные червя — готовые ассеты в `dev/assets/`.

## Не перенесено (устарело)
`build_pwa.py`, `embed_model.py`, `patch_*.py`, `patch_cq*.py`, `cq_block_v*.js`, `patch_game_v34.py`, `src.pack.txt`, `dune-pwa-flat.zip` — инструменты эпохи монолита, заменены `dev/tools/build.mjs` и модулями `dev/src`. JS-инструменты `dune-tools/tools/*` и `package.json` — устаревшие копии `dev/tools` и `dev/package.json`.
