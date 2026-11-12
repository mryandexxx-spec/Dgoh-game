# Муад’Диб — интеграция DGM v5 (staging)
Молодой Пол `paul` остаётся без изменений. Легенда: `muaddib`.
Рабочая ветка `feat/muad-dib-legend-3d-v5`.

Новые файлы (перенести из `MuadDib_Legend_DGM_V5_STAGING.zip` в корень ветки):
- `dev/assets/models/muad-dib-legend.dgm` — 66 костей, 18 658 треугольников, 8 клипов
- `dev/assets/tex/muad-dib-0.jpg` — JPEG fallback
- `dev/assets-src/characters/muad-dib-legend/` — мастер-GLB, мобильный GLB, концепт, отчёты
- `dev/models/convert_muad_dgm.py` — конвертер

Ветка содержит загрузку `muaddib`, обработку local TRS и бинарных каналов анимации. Карта клипов временная: Idle_11, Right_Hand_Sword_Slash, Stand_Dodge, Charged_Ground_Slam. Это не художественная приёмка.
После загрузки ресурсов: `cd dev && node tests/muad-dib-asset.mjs`; затем сборка, golden, 3D smoke, MED/LOW A/B, iPhone. KTX2 пока не создан: JPEG-фолбэк. Main не затрагивать до полной проверки.
