# Muad’Dib Legendary — DGM1 v5 staging conversion (2026-11-12)

## Completed
- `dev/assets/models/muad-dib-legend.dgm` — DGM1 v5, 66 joints, 18,658 triangles, full native bind TRS and 8 original animation clips, 1.24 MB.
- `dev/assets/tex/muad-dib-0.jpg` — extracted albedo JPEG.
- `dev/models/convert_muad_dgm.py` — reproducible conversion from provided skinned GLB.
- `dev/assets-src/characters/muad-dib-legend/` — source assets and audits.

## Critical runtime contract change required — NOT RELEASE READY
Existing `dev/src/render3d/characters/authored.js` only understands joints as
`[name, absolute_world_translation, parent]` and rotation-only clips represented as JSON arrays.
New v5 asset uses `[name, local_translation, parent, local_rotation_quaternion, local_scale]`,
`jointFormat: local-trs`, and binary Float32 `inverseBindMatrices`. Animation tracks have
`joint`, `path` (rotation/translation/scale), `times` (binary Float32), `values` (binary Float32),
`componentCount` (4 for rotation, 3 otherwise). The existing `parseDgm` resolves
binary byte-range refs, but `modelData` and `makeModel3` / `poseModelClip` need dedicated v5 branches.

The v5 path must preserve full local bind rotations; a legacy 18-bone exporter cannot be reused.
Animations should be explicitly mapped to gameplay actions; they are NOT already mapped.
For playback, rebuild skinned skeleton matrices with local TRS and inverseBindMatrices,
then interpolate animation tracks and apply optional root-motion policy.
Avoid applying legacy procedural override to an animated joint.

## Remaining
- Implement isolated v5 loader and movement/animation playback in `render3d`, registering
  a separate `muad_dib` id without replacing `paul`.
- KTX2 encode via project's `dev/tools/encode-ktx2.mjs` once project build dependencies
  are available; JPEG already works as fallback.
- Battle/portrait preview, render comparisons (844x390, 667x375), MED/LOW iPhone perf,
  two-cycle 3D smoke, CI, review, then publication.
- Audit shaded UV orientation and skinned bind pose in Babylon; GLB-to-DGM structural
  tests do not establish visual parity.

Do not deploy DGM v5 through the existing v4-only runtime without its loader adaptation.
