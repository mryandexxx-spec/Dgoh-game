---
name: rpg
description: Dune GoH JavaScript/Babylon.js adapted gameplay guidance for rpg tasks.
---

# Dune GoH — rpg

Source: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/genres/rpg/SKILL.md (Apache-2.0). Applies to turn-based squad RPG design, hero stats, skills, equipment, quests and progression in current JS codebase.

## Workflow
1. Read approved combat/economy specs and live configuration before recommending changes. Gameplay formulas, roster, drop tables, energy regeneration and balance are governed by repository decisions (including ECON-01), not skill examples.
2. Express new hero kits as data/config following current patterns; keep effect resolution deterministic with seeded RNG, stable action order and consistent stacking rules.
3. Document each new effect's targets, timing, stack limits, duration, dispel behaviour and UI description. Avoid ambiguous effects or hidden changes to gear progression.
4. Reward acquisition, spending and unlocks must pass existing transaction, idempotency and Web Locks protections; preserve v1 save compatibility.
5. Balance with repeatable encounter simulation and metrics (win rate, turns, resource income/sinks) before requesting approval for substantive design or economy changes.

## Targeted acceptance
- Add focused deterministic scenarios for changed kit/effect/quest; verify UI labels and saved state when touched.
- Do not launch broad combat or Conquest tests for documentation-only changes; use the diff-sensitive CI gate.
