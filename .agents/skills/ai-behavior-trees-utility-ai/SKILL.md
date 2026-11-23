---
name: ai-behavior-trees-utility-ai
description: Dune GoH JavaScript/Babylon.js adapted gameplay guidance for ai behavior trees utility ai tasks.
---

# Dune GoH — ai-behavior-trees-utility-ai

Source: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/ai-behavior-trees-utility-ai/SKILL.md (Apache-2.0). JS data-driven enemy decision logic for deterministic squad encounters; **not** a directive to replace current AI.

## Workflow
1. Inspect the existing opponent decision rules first. Use a straightforward state machine or decision table when it suffices; introduce behavior trees/utility scoring only for measurable game design needs.
2. Define decisions in pure functions over combat snapshots, not DOM or Babylon objects. Every action remains legal under existing turn order, cooldown and target constraints.
3. Behavior tree states: Success, Failure, Running; reset aborted execution-local state, never cooldowns. Reactive priority guards can preempt long actions when appropriate.
4. Utility inputs are normalized to [0,1] and vetoed actions stay vetoed; stable tie-breaking and the game's seeded RNG preserve replays. Avoid Math.random, wall time or FPS-dependent decisions.
5. Cache expensive target evaluations and decide at turn boundaries, not via per-frame ticking. AI changes require explicit balancing sign-off if they affect difficulty or rewards.

## Targeted acceptance
- Test legal fallback when every candidate is blocked, cooldown persistence, target invalidation, deterministic repeated seeds, and no duplicate actions/rewards.
- Run focused battle AI tests plus short smoke, not an unrelated full regression.
