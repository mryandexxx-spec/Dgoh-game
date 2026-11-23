---
name: game-feel
description: Dune GoH JavaScript/Babylon.js adapted gameplay guidance for game feel tasks.
---

# Dune GoH — game-feel

Source: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/game-feel/SKILL.md (Apache-2.0). Browser/Babylon adaptation; use for hit reactions, critical blows, rewards, UI interactions, feedback animations.

## Workflow
1. Find the existing animation/event hooks and visual feedback implementations. Attach effects to discrete events; do not poll and do not alter battle outcomes.
2. Group feedback by intensity: small (button), medium (ordinary hit/loot), large (crit/ultimate/boss). Prefer short CSS transitions and Babylon animation/particle feedback. Keep a clear hierarchy instead of shaking the screen at every click.
3. Any camera shake, visual pause or highlight must stay strictly presentational. **Never modify the deterministic combat clock, RNG, cooldowns, reward commitments, autosave or transaction timing to achieve hit-stop.** If safe separation is not possible, omit hit-stop.
4. On overlapping events cancel/merge tweens without lingering transforms, scale drift, flashing loops or stuck interaction; ensure animations settle to their original state.
5. Honour `prefers-reduced-motion`; provide a low-effects option when introducing a user-facing effect.

## Targeted acceptance
- Compare before/after screenshots and mobile rendering in one ordinary hit, one critical, one reward claim, and one repeated rapid action as applicable.
- Validate the associated interaction smoke and build; battle regression only if underlying battle code changes.
