import assert from 'node:assert/strict';
import { kill } from '../src/logic/battle/engine.js';
import { glAct } from '../src/logic/battle/turns.js';
const def = (id,f,extras={}) => ({id,sn:id,f,role:'sup',basic:{dt:'fast',m:1},...extras});
const baron = {uid:'baron',side:'A',idx:0,def:def('baron_legend',['hark'],{
  passive:{harkonnenGreed:true,healOnEnemyDeath:.5},
  gl:{n:'Падение Атрейдесов',kind:'fall-of-atreides',damageMultiplier:3,armorDownTurns:3,atreidesBonus:.5,healPerKill:.2}
}),alive:true,hp:300,maxHp:1000,shield:0,maxShield:0,dmg:400,crit:0,eva:0,pot:1,ten:0,arm:0,fx:{},sk:{ult:1},glOn:true,glUsed:false,ultM:100};
const feyd={uid:'feyd',side:'A',idx:1,def:def('feyd',['hark']),alive:true,hp:900,maxHp:900,fx:{}};
const enemy={uid:'leto',side:'B',idx:0,def:def('leto',['atr']),alive:true,hp:400,maxHp:400,shield:0,maxShield:0,arm:0,dmg:90,eva:0,crit:0,ten:0,fx:{},counterChance:0,sk:{passive:1}};
const enemy2={uid:'trooper',side:'B',idx:1,def:def('trooper',['cor']),alive:true,hp:5000,maxHp:5000,shield:0,maxShield:0,arm:0,dmg:90,eva:0,crit:0,ten:0,fx:{},counterChance:0,sk:{passive:1}};
const B={units:[baron,feyd,enemy,enemy2],events:[],log:[],leader:{A:null,B:null},rng:()=>.5,spice:{A:0,B:0},over:null};
kill(B,enemy,baron);
assert.equal(enemy.alive,false);
assert.equal(enemy.noRev,true);
assert.equal(enemy.pendingRevive,undefined);
assert.equal(baron.hp,800); // +50% maximal health from Greed
assert.equal(feyd.fx.attackUp,2); // Atreides kill doubles bonus duration
// New battle for actual legendary ultimate: both targets survive and receive armour debuff.
const fresh=(u,hp)=>({...u,alive:true,hp,maxHp:hp,fx:{},noRev:false,houseVictimSide:undefined});
const U=fresh(baron,1000), E=fresh(enemy,8000), C=fresh(enemy2,8000);
U.ultM=100;U.glUsed=false;
const S={units:[U,E,C],events:[],log:[],leader:{A:null,B:null},rng:()=>.5,spice:{A:0,B:0},over:null};
glAct(S,U);
assert.equal(U.glUsed,true);
assert.equal(U.ultM,0);
assert.equal(S.glKind,'fall-of-atreides');
assert.equal(E.fx.armDown,3);
assert.equal(C.fx.armDown,3);
assert.ok(E.hp<C.hp); // +50% vs Atreides
assert.equal(S.over,null);
console.log('BH2 Greed death, anti-revive and Fall of the Atreides GL: PASS');
