---
name: cinematic-motion
description: Hero showcase character motion, authored DGM clips, local gesture layers, visual-only timelines and actual video review.
---
# Cinematic motion — Dune GoH
- Read GFX_2_0_ROADMAP.md, GFX_05_CINEMATIC_MOTION.md and Babylon/game-feel/performance skills. Stay on approved heroes.
- Inventory real clips, rest transforms and local axes. Prefer source keyframed clips over artificial oscillation. Reject unnatural gestures, weapon intersections, foot sliding and unmotivated motion.
- Keep one EngineHost/RAF; showcase-only sampler selection, no shared clip map mutation, no gameplay actions. Use elapsed time, no catch-up after suspension, restore local pose before additive correction. LOW/reduced motion settled pose; respect drag, switch, sleep, hold, fallback. No new paid assets without approval.
- Compare actual built WebGL with identical viewport, camera, profile, warmup and hero. Use 844/667 MED/LOW, real sequential video for motion (not inferred FPS), independently critique silhouette, acting, contact and loop seam. Compare frame cost, memory, lifecycle; >10% needs approval. No green-only acceptance. Keep temporary capture workflow out of main.
- For progression effects, use confirmed domain events only; never modify saves/rewards/RNG, never fake battle action, cancel on navigation/overlay/re-entry. Record findings and exact evidence in GitHub.
