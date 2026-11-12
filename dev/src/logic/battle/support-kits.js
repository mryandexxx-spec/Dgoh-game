// Shared data-driven support mechanics. No checks for Margot/Yue IDs.
// Applies only if an ability/passive explicitly opts in to these fields.
import { FX } from '../../data/fx.js';

const sameFaction = (unit, factions=[]) => unit.def.f.some(f => factions.includes(f));
const weakest = team => team.filter(u=>u.alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
function healTarget(B, target, fraction, ev) {
  if (!target?.alive || !(fraction>0)) return;
  const delta=Math.min(target.maxHp-target.hp,Math.round(target.maxHp*fraction));
  if(delta>0){target.hp+=delta;ev(B,target,'+'+delta,'heal');}
}
function passiveTeamPotency(B) {
  for(const side of ['A','B']){
    const allies=B.units.filter(u=>u.side===side&&u.alive);
    for(const source of allies){
      const v=source.def.passive?.factionPotency;
      if(v)for(const target of allies)if(sameFaction(target,v.factions))target.pot+=v.amount;
    }
  }
}
function supportAbilityEffects(B,unit,ability,{living,applyFx,ev}) {
  if(!ability)return;
  const allies=living(B,unit.side), enemies=living(B,unit.side==='A'?'B':'A');
  for(const v of ability.factionFx||[])for(const ally of allies)
    if(sameFaction(ally,v.factions))applyFx(B,unit,ally,v.status,v.turns);
  const low=weakest(allies);
  if(ability.healLowest)healTarget(B,low,ability.healLowest,ev);
  if(ability.lowestAllyFx)for(const [status,turns] of ability.lowestAllyFx)
    if(low)applyFx(B,unit,low,status,turns);
  if(ability.lowestAllyTm&&low){
    if(low===unit)unit.tmBonus=(unit.tmBonus||0)+ability.lowestAllyTm;
    else low.tm=Math.min(999,low.tm+ability.lowestAllyTm);
  }
  if(ability.cleanseKeys)for(const ally of allies)for(const key of ability.cleanseKeys)
    if(FX[key]?.bad) {delete ally.fx[key];if(key==='bleed')ally.bleedN=0;}
}
function supportOnIsolation(B,applier,affected,{living,ev}) {
  if(!affected?.fx.isolation)return;
  const source=living(B,applier.side).find(u=>u.def.passive?.isolationProtect);
  if(!source)return;
  const cfg=source.def.passive.isolationProtect;
  if(source._isolationProtectionRound===B.round)return;
  const target=weakest(living(B,source.side).filter(u=>sameFaction(u,cfg.faction)));
  if(!target)return;
  source._isolationProtectionRound=B.round;
  target.fx.defUp=Math.max(target.fx.defUp||0,cfg.turns);
  ev(B,target,'Защита↑','buff');
}
function supportEmergencyHeal(B,target,prevFraction,ev) {
  if(!target?.alive||target.hp<=0||!(prevFraction>=.5)||!(target.hp/target.maxHp<.5))return;
  const source=B.units.find(u=>u.alive&&u.side===target.side&&u.def.passive?.emergencyHeal);
  if(!source)return;
  const cfg=source.def.passive.emergencyHeal;
  const marked=(source._emergencyHealedIds??=new Set());
  if(marked.has(target.uid))return;
  marked.add(target.uid);
  healTarget(B,target,cfg.fraction,ev);
}
function supportDispel(target,qty=1){
  if(!target?.alive)return;
  let remaining=qty;
  for(const k of Object.keys(target.fx))if(remaining>0&&!FX[k]?.bad){delete target.fx[k];remaining--;}
}
export { passiveTeamPotency, supportAbilityEffects, supportOnIsolation, supportEmergencyHeal, supportDispel };
