// BH9.7 — two ordinary heroes. Owner approved existing procedural Chani/Paul
// rendering for now; full authored GLB/DGM is explicitly postponed.
// This pure module retains the final art manifest without requiring it in gameplay.
import { BARON_FUTURE_KITS, validateBaronFutureKits } from '../data/baron-future-kits.js';
import { BARON_FUTURE_HEROES, validateFutureHeroRegistry } from '../data/baron-future-heroes.js';

const HERO_IDS=Object.freeze(['margot','yue']);
const HERO_LOOKS=Object.freeze({
  margot:Object.freeze({side:'dark',portrait:'img/heroes/margot.png',model:'models/margot.dgm',
    anim:'anim/margot.json',factions:Object.freeze(['bg','cor']),role:'sup'}),
  yue:Object.freeze({side:'light',portrait:'img/heroes/yue.png',model:'models/yue.dgm',
    anim:'anim/yue.json',factions:Object.freeze(['atr']),role:'heal'}),
});
function standardFutureDefs() {
  if(validateBaronFutureKits().length || validateFutureHeroRegistry().length)throw Error('Future hero contract invalid');
  return Object.fromEntries(HERO_IDS.map(id=>{
    const kit=BARON_FUTURE_KITS[id], visual=HERO_LOOKS[id];
    // z7 is set by the ordinary roster registry; no GL-specific abilities.
    return [id,{...kit,side:visual.side,z7:['ult','special']}];
  }));
}
function releaseAssetCheck(names,defs=standardFutureDefs()) {
  const missing=[];
  const available=new Set(names||[]);
  for(const id of HERO_IDS){
    const visual=HERO_LOOKS[id],def=defs[id];
    if(!def||def.npc||def.legendary||def.gl||def.leader||
      def.role!==visual.role||def.f.join(',')!==visual.factions.join(','))missing.push(id+':contract');
    for(const key of ['portrait','model','anim'])if(!available.has(visual[key]))missing.push(visual[key]);
  }
  return missing;
}
// Procedural art is now an expressly approved temporary option. Final authored
// model mode still requires six files. Never reset previously earned progress.
function stageFutureRoster(save,{approved=false,visualMode='procedural',availableAssets=[]}={}){
  if(!approved)return {ok:false,reason:'approval-required',changed:false};
  if(visualMode!=='procedural' && visualMode!=='authored')return {ok:false,reason:'visual-mode',changed:false};
  const missing=visualMode==='authored'?releaseAssetCheck(availableAssets):[];
  if(missing.length)return {ok:false,reason:'assets-required',missing,changed:false};
  if(!save||typeof save!=='object'||!save.roster||typeof save.roster!=='object')
    return {ok:false,reason:'save-required',changed:false};
  let changed=false;
  for(const id of HERO_IDS){
    if(!Object.prototype.hasOwnProperty.call(save.roster,id)){
      save.roster[id]={shards:0,stars:0,lvl:1,gear:1,eq:[false,false,false,false,false,false],
        sk:{basic:1,special:1,ult:1,passive:1,leader:1}};
      changed=true;
    }
  }
  return {ok:true,changed,heroes:HERO_IDS.slice()};
}
export { HERO_IDS, HERO_LOOKS, standardFutureDefs, releaseAssetCheck, stageFutureRoster };
