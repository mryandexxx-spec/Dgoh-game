// ARCH-01C1b: journey eligibility and saved-state selectors belong to logic.
// data/journeys.js exposes an unchanged callable compatibility port for the locked camp UI.
import { JOURNEYS, JREQ, jRelic, bindJourneyRuntime } from '../data/journeys.js';
import { MAX_GEAR } from '../data/gear-cap.js';
import { S } from '../core/state.js';
import { prog } from './progress.js';

// Preserve the v125/v125+C1a gate formulas, including unlocked-legend grandfathering.
const jHeroOkRule = (k, id, t) => { const p = prog(id); return p.stars >= 7 && p.gear >= MAX_GEAR && (p.relic || 0) >= jRelic(k, id, t); };
const jGateReadyRule = k => !!prog(k).stars || JOURNEYS[k].req.every(id => {
  const p = prog(id);
  return p.stars >= 7 && p.gear >= MAX_GEAR && (p.relic || 0) >= ((JREQ[k] || {})[id] || 0);
});
const jReadyRule = (k, t) => !!prog(k).stars || (jGateReadyRule(k) && (k === 'muaddib' && t >= 3
  ? JOURNEYS[k].req.filter(id => jHeroOkRule(k, id, t)).length >= 4
  : JOURNEYS[k].req.every(id => jHeroOkRule(k, id, t))));
const jSelectedReadyRule = (k, t, ids) => jReadyRule(k, t) && (k === 'muaddib' && t >= 3
  ? ids.length === 4 && new Set(ids).size === 4 && ids.every(id => JOURNEYS[k].req.includes(id) && (prog(k).stars > 0 || jHeroOkRule(k, id, t)))
  : true);
const JKRule = () => JOURNEYS[S.jKey] ? S.jKey : 'muaddib';
const JRRule = () => JOURNEYS[JKRule()];
const JPRule = () => (S.journeys[JKRule()] ??= {});

// Register closures only, do not read S/prog or mutate save at module evaluation.
bindJourneyRuntime({
  jHeroOk: jHeroOkRule, jGateReady: jGateReadyRule, jReady: jReadyRule,
  jSelectedReady: jSelectedReadyRule, JK: JKRule, JR: JRRule, JP: JPRule,
});
