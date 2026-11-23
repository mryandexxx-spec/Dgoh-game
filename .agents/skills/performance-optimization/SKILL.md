---
name: performance-optimization
description: Dune GoH JavaScript/Babylon.js adapted gameplay guidance for performance optimization tasks.
---

# Dune GoH — performance-optimization

Source: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/performance-optimization/SKILL.md (Apache-2.0). Use for mobile PWA performance and Babylon WebGL rendering, not speculative refactors.

## Workflow
1. Choose a repeatable scene and target device profile, record baseline load time, JS main-thread frame time, GPU/frame time where possible, p95 spikes and memory.
2. Identify CPU, GPU, asset download/decode, DOM/layout or storage bottleneck before editing. Keep debug profiling outside hot production loops.
3. Prioritize fewer draw calls, sensible texture resolutions/KTX2, model LOD, reuse/pooling, reduced allocations in animation loops, and delayed work only when measured.
4. Respect existing GLB/DGM and Babylon loaders. Never break animation clip mapping, ID lookups, local PWA cache or asset availability just for smaller bundles.
5. Measure same scene after change on equivalent configuration; report before/after measurements and any mobile-only uncertainty.

## Targeted acceptance
- Run build plus targeted 3D/performance smoke when renderer or assets change; PWA offline smoke when manifest/cache changes.
- No new always-on performance CI gate; save heavy profiling for suspected regressions or explicit optimisation tasks.
