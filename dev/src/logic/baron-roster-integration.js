// BH4 — staged roster/save contract, independent of CHARS and gameplay unlock paths.
// Preserve existing player progression; never grant stars, shards or a new event.
// Only the legendary Baron has an approved complete kit. Margot/Yue are reserved
// playable identities without kits until their own separate design/approval.
import { BARON_FUTURE_HEROES } from '../data/baron-future-heroes.js';
import { BARON_LEGEND_KIT } from '../data/baron-legend-kit.js';
import { BARON_APPROVED_REQUIREMENTS, BARON_APPROVED_STAGES, validateBaronApprovedData } from '../data/baron-legend-approved.js';
import { baronRequirementsStatus } from './baron-legend-contract.js';

const STAGED_HERO_IDS = Object.freeze([BARON_LEGEND_KIT.id, ...BARON_FUTURE_HEROES.map(hero => hero.id)]);
const DEFAULT_STAGED_HERO = Object.freeze({ shards: 0, stars: 0, lvl: 1, gear: 1, sk: Object.freeze({ basic: 1, special: 1, ult: 1, passive: 1, leader: 1 }), eq: Object.freeze([false, false, false, false, false, false]) });

function defaultStagedHero() {
  return { ...DEFAULT_STAGED_HERO, sk: { ...DEFAULT_STAGED_HERO.sk }, eq: [...DEFAULT_STAGED_HERO.eq] };
}

// Idempotent migration for a separately-staged roster. Existing player data is
// never reset, including valid prior progress of a character from a later release.
function stageBaronRoster(save) {
  if (!save || typeof save !== 'object') throw new TypeError('Save required');
  save.roster ??= {};
  for (const id of STAGED_HERO_IDS) save.roster[id] ??= defaultStagedHero();
  save.journeys ??= {};
  save.journeys.baron_legend ??= {};
  return save;
}

function baronRosterGate(save) {
  if (validateBaronApprovedData().length) throw new Error('Canonical Baron requirements corrupted');
  const status = baronRequirementsStatus(BARON_APPROVED_REQUIREMENTS, save?.roster);
  return {
    ...status,
    // Distinguish future heroes from normally farmable characters.
    futureLocked: BARON_FUTURE_HEROES.filter(h => (save?.roster?.[h.id]?.stars || 0) === 0).map(h => h.id),
    availableStages: BARON_APPROVED_STAGES.map((stage, index) => ({
      index,
      title: stage.title,
      allies: [...stage.allies],
      // Do not fabricate encounters: no approved enemy setup/rewards yet.
      readyForBattle: false,
      requiresEncounterDesign: true,
    })),
  };
}

// BH8 — pure, non-public roster/card contract.  No mutations to CHARS,
// ROSTER_IDS, save data, or the live UI. Visual publication is a separate gate.
// The normal `ult` slot intentionally maps to the approved "Глаза императора".
const BARON_PREVIEW_ACTION_KEYS = Object.freeze(['basic', 'special', 'ult', 'gl']);
function baronLegendPreview(save) {
  const p = save?.roster?.[BARON_LEGEND_KIT.id];
  const requirements = baronRosterGate(save);
  return {
    id: BARON_LEGEND_KIT.id,
    name: BARON_LEGEND_KIT.n,
    faction: [...BARON_LEGEND_KIT.f],
    role: BARON_LEGEND_KIT.role,
    legendary: true,
    // Absence of approved artwork and encounters always keeps this staged.
    public: false,
    playable: false,
    modelAsset: 'models/baron-legend-mobile.dgm',
    portraitApproved: false,
    progress: { stars: p?.stars ?? 0, shards: p?.shards ?? 0, lvl: p?.lvl ?? 1,
      gear: p?.gear ?? 1, relic: p?.relic ?? 0 },
    actions: BARON_PREVIEW_ACTION_KEYS.map(key => ({
      slot: key, name: BARON_LEGEND_KIT[key].n,
      cooldown: BARON_LEGEND_KIT[key].cd || 0,
      initialCooldown: BARON_LEGEND_KIT[key].cd0 || 0,
      glKind: key === 'gl' ? BARON_LEGEND_KIT.gl.kind : null,
    })),
    passive: BARON_LEGEND_KIT.passive.n,
    leader: BARON_LEGEND_KIT.leader.n,
    requirements: { ready: requirements.ready, completed: requirements.completed,
      total: requirements.total, futureLocked: [...requirements.futureLocked] },
    eventPlayable: false,
  };
}

export { STAGED_HERO_IDS, defaultStagedHero, stageBaronRoster, baronRosterGate, baronLegendPreview };

