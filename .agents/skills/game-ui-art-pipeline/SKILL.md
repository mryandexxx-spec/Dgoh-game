---
name: game-ui-art-pipeline
description: Production of reusable artistic game UI layers, nine-slice skins, item art and reference-preserving compositions for Dune GoH.
---
# Game UI art production
Read game-ui-ux, create-game-assets, GFX_01_ART_BIBLE.md and GFX_06_UI_PIPELINE.md. Original project-specific adaptation inspired by [Layer Game UI](https://github.com/layerai/skills/blob/main/plugins/layer/skills/layer-game-ui/SKILL.md) and [Figma MCP](https://developers.figma.com/docs/figma-mcp-server/). Not a vendored provider skill or a requirement to purchase access.

1. Recover the **approved original** reference bytes, not the rejected HTML screenshot. Store the source, hash, provenance and approval; do not replace the target silently. Audit layout, lighting, materials, visual hierarchy and interaction regions before coding.
2. Define layers (background without UI/text, architectural framing, pedestal and contact shadow, objects, UI surfaces, live text, state accents). Try manual crops/alpha masks/Pillow first. If an external model is authorized, check its live schema and price, use one bounded run, keep original bytes and report quality/cost; do not retry paid calls automatically. Qwen Image Layered produces approximate RGBA layers, not editable UI semantics. Inspect reconstructed composite, alpha halos, missing occluded pixels and alignment.
3. Produce a small coherent set of authored textures: primary button, selected/normal tile, panel edge, divider and reward stage. Use CSS border-image/nine-slice for stretchable borders, center texture separately where necessary; preserve corners and aspect ratios. Avoid unnecessary ornament, fake gradients as a replacement for artwork, baked text, or whole-screen raster hitboxes. Test each texture at min/max size. Preserve established palette and Inter body font, dark/light contrast, consistent key/fill direction and scale.
4. Export optimized local WebP/PNG, record source, license, dimensions, alpha, slice insets, bytes and intent in a manifest. Existing accepted currency art has precedence. Do not ship unapproved third-party IP art or model/API credentials. No new runtime engine, network dependency or GPU inference.
5. Use figma-ui-transfer then game-ui-visual-review. Do not declare a concept or asset sheet to be a finished functional prototype.
