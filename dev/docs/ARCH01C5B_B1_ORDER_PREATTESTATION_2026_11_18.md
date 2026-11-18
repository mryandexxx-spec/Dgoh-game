# ARCH-01C5b-B1: независимая предварительная фиксация нового порядка ESM

18.11.2026. **До любых правок игровых исходников.** Результат виртуальной production-esbuild сборки на v135 (`main 372d915fdd7f7b06fa5c3b23ce97b3a74dcf6753`) в [CI #44280281688](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44280281688), build job 134719029798.

`old_sha256=385d726d8a51d0b4b270dea36d1949e74ddeef360895d3ca536a285cdc621df3 future_sha256=8dfc01f4eec407a2b09bfc116fe299ad6a346c834156fcf805a71ca3d1652695`

- Исторический полный порядок из `tests/ci/arch01c5a-b1-approved-order.json` сохранён отдельно как `arch01c5b-b1-v135-order.json`. Исходный snapshot A1/A2 не изменён.
- Новый **проектный** порядок из настоящего read-only virtual esbuild сохранён в `arch01c5b-b1-proposed-order.json`: 167 модулей, без потерь/добавления; ровно **62** смены позиции. Этот перечень зафиксирован **перед** source edits и не является выводом из ручной перестановки `SPLIT`.
- Источник права: согласование владельцем проекта сценария controlled migration после A2, но не merge/release. Не заменять этот файл «для зелёного CI».
- SCC текущей v135 `[105,6]` → виртуальная `[60,11,6,3]`; imports `1000→1001`, baseline source остаётся `1` до реального B1.
- Отдельная проверка B1 должна вернуть исходные три файла из реального кандидата в памяти, вычислить именно старый 167/1000/[105,6] и сравнить с historical; затем собрать реальные source и строго сравнить с frozen proposed. Документ и CSV ниже — источник доказательства, а не гарантии TDZ/3D безопасности.

## Полный список перемещений (индексы с нуля)

```json
[
  {
    "name": "data/looks.js",
    "from": 20,
    "to": 22
  },
  {
    "name": "render2d/figures.js",
    "from": 21,
    "to": 46
  },
  {
    "name": "render2d/scenes.js",
    "from": 22,
    "to": 48
  },
  {
    "name": "render2d/scene-bg.js",
    "from": 23,
    "to": 52
  },
  {
    "name": "render2d/fx-layer.js",
    "from": 24,
    "to": 53
  },
  {
    "name": "render3d/base.js",
    "from": 25,
    "to": 54
  },
  {
    "name": "render3d/quality.js",
    "from": 26,
    "to": 55
  },
  {
    "name": "render3d/ctx.js",
    "from": 27,
    "to": 56
  },
  {
    "name": "render3d/game-scene.js",
    "from": 28,
    "to": 57
  },
  {
    "name": "render3d/materials.js",
    "from": 29,
    "to": 58
  },
  {
    "name": "render3d/geometry.js",
    "from": 30,
    "to": 60
  },
  {
    "name": "render3d/env/build-env.js",
    "from": 31,
    "to": 61
  },
  {
    "name": "render3d/env/props.js",
    "from": 32,
    "to": 62
  },
  {
    "name": "render3d/env/particles.js",
    "from": 33,
    "to": 63
  },
  {
    "name": "render3d/characters/rig.js",
    "from": 34,
    "to": 64
  },
  {
    "name": "render3d/characters/authored.js",
    "from": 35,
    "to": 65
  },
  {
    "name": "render3d/characters/procedural.js",
    "from": 36,
    "to": 66
  },
  {
    "name": "render3d/characters/pose-generic.js",
    "from": 37,
    "to": 67
  },
  {
    "name": "render3d/worm.js",
    "from": 38,
    "to": 72
  },
  {
    "name": "render3d/world-hud.js",
    "from": 39,
    "to": 73
  },
  {
    "name": "render3d/scenes/arena.js",
    "from": 40,
    "to": 74
  },
  {
    "name": "render3d/characters/pose-duncan.js",
    "from": 41,
    "to": 75
  },
  {
    "name": "render3d/characters/pose-baron.js",
    "from": 42,
    "to": 76
  },
  {
    "name": "render3d/characters/pose-legend-baron.js",
    "from": 43,
    "to": 77
  },
  {
    "name": "assets/mocap-data.js",
    "from": 44,
    "to": 78
  },
  {
    "name": "render3d/characters/mocap.js",
    "from": 45,
    "to": 79
  },
  {
    "name": "assets/env-hdr.js",
    "from": 46,
    "to": 80
  },
  {
    "name": "render3d/engine-host.js",
    "from": 47,
    "to": 81
  },
  {
    "name": "render3d/scenes/base-scene.js",
    "from": 48,
    "to": 59
  },
  {
    "name": "render3d/scenes/hero.js",
    "from": 49,
    "to": 68
  },
  {
    "name": "render3d/scenes/camp.js",
    "from": 50,
    "to": 69
  },
  {
    "name": "render3d/scenes/baker.js",
    "from": 51,
    "to": 70
  },
  {
    "name": "assets/models.js",
    "from": 52,
    "to": 71
  },
  {
    "name": "data/story.js",
    "from": 53,
    "to": 20
  },
  {
    "name": "data/campaign-energy.js",
    "from": 54,
    "to": 21
  },
  {
    "name": "data/seeded-rng.js",
    "from": 55,
    "to": 23
  },
  {
    "name": "data/campaigns.js",
    "from": 56,
    "to": 24
  },
  {
    "name": "data/glyphs.js",
    "from": 57,
    "to": 25
  },
  {
    "name": "data/journeys.js",
    "from": 58,
    "to": 26
  },
  {
    "name": "data/memory-scrap.js",
    "from": 59,
    "to": 27
  },
  {
    "name": "logic/economy.js",
    "from": 60,
    "to": 28
  },
  {
    "name": "data/memories.js",
    "from": 61,
    "to": 29
  },
  {
    "name": "logic/relics.js",
    "from": 62,
    "to": 30
  },
  {
    "name": "logic/gear.js",
    "from": 63,
    "to": 31
  },
  {
    "name": "logic/gear-crafting.js",
    "from": 64,
    "to": 32
  },
  {
    "name": "logic/gear-sources.js",
    "from": 65,
    "to": 33
  },
  {
    "name": "core/format.js",
    "from": 66,
    "to": 34
  },
  {
    "name": "core/save.js",
    "from": 67,
    "to": 35
  },
  {
    "name": "core/state.js",
    "from": 68,
    "to": 36
  },
  {
    "name": "logic/daily.js",
    "from": 69,
    "to": 37
  },
  {
    "name": "core/dom.js",
    "from": 70,
    "to": 38
  },
  {
    "name": "core/rng.js",
    "from": 71,
    "to": 39
  },
  {
    "name": "logic/progress.js",
    "from": 72,
    "to": 40
  },
  {
    "name": "logic/roster.js",
    "from": 73,
    "to": 41
  },
  {
    "name": "logic/skill-up.js",
    "from": 74,
    "to": 42
  },
  {
    "name": "logic/account-rules.js",
    "from": 75,
    "to": 43
  },
  {
    "name": "logic/rewards.js",
    "from": 76,
    "to": 44
  },
  {
    "name": "core/errlog.js",
    "from": 77,
    "to": 45
  },
  {
    "name": "ui/common.js",
    "from": 78,
    "to": 47
  },
  {
    "name": "ui/router.js",
    "from": 79,
    "to": 49
  },
  {
    "name": "data/campaign-map-presets.js",
    "from": 80,
    "to": 50
  },
  {
    "name": "logic/campaign-map.js",
    "from": 81,
    "to": 51
  }
]
```

**Нельзя** менять golden, защищённый лагерь, профили графики, 3D сцены, Campaign 2.0, сейвы или опубликовать этот эксперимент.
