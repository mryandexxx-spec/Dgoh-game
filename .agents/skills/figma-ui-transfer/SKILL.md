---
name: figma-ui-transfer
description: Reference-faithful editable Figma master and conversion into Dune GoH native HTML/CSS.
---
# Figma UI transfer
Original project adaptation based on [Figma MCP tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) and [structure guidance](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/). Load the actual installed Figma plugin skills as mandatory before applicable calls (figma-create-new-file, figma-use, figma-generate-design, figma-generate-library, figma-design-to-code). Do not pretend a Figma tool was executed if permission/access fails.

- Start from approved original artwork and separately exported assets. Build editable 844×390 and 667×375 frames, named semantic layers, variables for palette/type/spacing, reusable button/tile/panel variants, overlay and disabled/sold states. Preserve coherent landscape composition; use auto layout for dynamic text and controls, fixed cropping only for intentional artwork. Inspect Figma screenshot against the source before coding.
- Request get_design_context with screenshot (or separately get_screenshot), exact assets and hierarchy; if sparse retrieve relevant children. Record file/node IDs. Never use the full flattened design as a functional background. Download design assets as instructed and keep them locally; no temporary provider URLs.
- Translate to existing vanilla DOM/CSS/ES modules, not generated React/Tailwind. Reuse ui_kit and existing components where faithful; do not change economy, saves, state transitions or campaign 3D. Keep all labels live and touch/focus states accessible; no root scroll in landscape.
- Figma is a master, not a shortcut to approved quality. If access fails, use a versioned layer manifest with fixed target frames and explicitly mark Figma unverified. Run game-ui-visual-review on real browser screenshots before signoff.
