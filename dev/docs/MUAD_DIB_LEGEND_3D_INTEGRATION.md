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


## Staged visual review — 12 November 2026
Owner rejected the nearly black 3D card background and approved restoration of a readable atmosphere, stronger Muad'Dib blue eyes, and legible long ability titles on 667×375. On Draft PR #28 only:
- Shared HeroStage background uses the existing background sphere + radial halo with sandstone/haze colours. **Do not remove GlowLayer background exclusions**: those fix young Baron's translucent appearance on MED/LOW.
- Muad'Dib-only small emissive blue iris markers follow `headfront`; check eye placement and visual scale on actual MED/LOW screenshots before accepting. Source GLB/DGM/JPEG, young Paul, combat balance and save schema are untouched.
- At narrow landscape sizes, Muad'Dib's ability titles can wrap to two lines. Confirm touch targets, scroll, and labels at 667×375.
- This is an **unapproved visual prototype**, not a release sign-off. Require before/after 844×390 MED and 667×375 LOW images, young Baron non-ghost checks, all CI and owner's artistic acceptance before merge/publishing.

## Approved hero-card palette: Dusk of Arrakis (12 November 2026)
The owner approved the **B — Dusk of Arrakis** side-by-side HTML mockup (844×390 MED / 667×375 LOW) after rejecting both the near-black and over-bright sandstone versions. This revision is implemented in the staging branch: `render3d/scenes/hero.js` uses muted sand/smoke backdrop, restrained amber halo and stone podium; `styles/hero-card.css` blends dark bronze side panels into the center. Existing GlowLayer exclusions for the background sphere and halo **must remain** to avoid the young Baron appearing translucent. Muad'Dib-only irises, short crysknife and narrow-viewport skill-title wraps are preserved. Check CI screenshots of BOTH heroes in MED/LOW and obtain visual sign-off before merge/public release. No save migration or gameplay changes.
