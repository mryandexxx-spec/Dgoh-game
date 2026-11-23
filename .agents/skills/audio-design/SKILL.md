---
name: audio-design
description: Dune GoH JavaScript/Babylon.js adapted gameplay guidance for audio design tasks.
---

# Dune GoH — audio-design

Source: https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/main/skills/disciplines/audio-design/SKILL.md (Apache-2.0). Adaptation for browser Web Audio/HTMLMediaElement and mobile PWA.

## Workflow
1. Inventory existing audio assets, playback and user settings. Avoid adding FMOD/Wwise/Godot-style buses or heavy dependencies to the web client.
2. Organize logical Master, Music, SFX, UI, Ambience and Voice gain groups only as needed, using Web Audio GainNodes; preserve user preference and mute. Slider x in [0,1] maps to gain x² (zero = silence) rather than treating x as dB.
3. Respect browser autoplay restrictions: unlock AudioContext from a user gesture, handle suspend/resume, app backgrounding, and audio-disabled or offline PWA states without errors.
4. Reuse/limit simultaneous sound sources; vary repetitive sounds moderately while avoiding random impact on gameplay decisions. Duck music separately from the player's music gain when voice plays.
5. Keep sound events presentational, after committed game events when relevant; audio failures never reverse rewards or block interaction. Provide mute and reduced-sensory options.

## Targeted acceptance
- Test initial muted start, first gesture unlock, mute persistence, rapid overlapping SFX, pause/resume and offline PWA; profile memory before adding large music files.
- Validate UI/audio-specific smoke and build; no full regression for source/license metadata changes.
