---
name: game-ui-ux
description: Dune GoH JavaScript/Babylon.js adapted gameplay guidance for game ui ux tasks.
---

# Dune GoH — game-ui-ux

Source: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-ui-ux/SKILL.md (Apache-2.0). Adaptation for the existing browser/mobile PWA, vanilla JavaScript, CSS and DOM. Use for HUD, top navigation, profile, roster, dialogs, safe areas and accessibility.

## Workflow
1. Inspect existing screen markup, stylesheet, typography and previously approved UI mockups before changing visuals. Do not replace the existing design system or introduce a UI framework.
2. Preserve the approved desert-imperial direction, Inter font and consistent profile/upper-menu/actions visual language. Use flexible CSS grid/flex layout rather than absolute positioning for controls. Keep compact narrow phones readable; respect `env(safe-area-inset-*)`, viewport resizing and orientation.
3. Use semantic buttons, visible keyboard focus, sufficient touch targets, ARIA labels where icons lack text, contrast at least 4.5:1 for body text, and reduced-motion preferences. Never rely on colour alone.
4. Keep input and visual state separate: render on state changes; avoid per-frame DOM polling, duplicate event listeners, and cross-screen focus leaks. Modal focus returns to the opener when closed.
5. Implement only the approved UI scope; do not change account, reward, economy or save semantics as a side effect.

## Targeted acceptance
- Verify at compact/mobile and desktop widths (including notched safe area), portrait and landscape where supported.
- Inspect for clipped numbers, overflowed localized labels, overlap between top bar/profile/buttons, and regressions to responsive roster and PWA.
- Run the repo's current build and appropriate UI smoke only; existing CI rules choose any additional checks based on actual diff.
