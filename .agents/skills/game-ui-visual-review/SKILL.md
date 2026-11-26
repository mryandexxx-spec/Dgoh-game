---
name: game-ui-visual-review
description: Independent artistic critique and browser acceptance of actual game UI renders.
---
# Visual acceptance
Original project adaptation inspired by [Impeccable critique and audit](https://github.com/pbakaus/impeccable/tree/main/skill/reference) and [Microsoft frontend-design-review](https://github.com/microsoft/skills/tree/main/.github/skills/frontend-design-review). Their full tools are not installed by this file; use project-native test infrastructure.

1. Inspect the approved original, Figma master, and actual HTML captures side by side at 844×390 and 667×375 with same content/state. Capture selected item, normal, purchase confirmation, cancel, received, sold out, insufficient funds, long names, reduced motion and keyboard/touch. Record browser/viewport/device scale and asset errors. Existing Puppeteer is preferred to adding Playwright.
2. Separate visual critique from technical audit. Identify concrete mismatches by region: spatial composition, focal hierarchy, material realism, lighting/contact, image consistency, typography, state affordance and contrast. Use P0 (broken flow/data), P1 (reference or readability failure), P2 (visible polish), P3 (minor). Review each image at native scale; avoid praising improvements unrelated to target.
3. Use dev/tools/ui-art/compare.py for optional equal-size image diff diagnostics (not automatic art approval). Do not compare different states or rescale mismatched frames. Record comparable regions and intentional divergences. Pixel match is not a substitute for human-style review.
4. Block acceptance on any P0/P1, missing original, placeholder art, root scrolling, dead controls, asset failures, or uncontrolled reference drift. If failed, return to the responsible pipeline stage, not arbitrary CSS pixel tweaking. After two failed attempts reassess asset/structure strategy. Report explicit verdict and evidence. Physical Safari is a separate gate, not claimed from Chromium.
