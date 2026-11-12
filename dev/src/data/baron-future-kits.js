// BH9.3 — owner-approved Margot/Yue kits, STAGED until independent unlock
// events, art and public roster release gates are approved.
// Existing engine terms (basic, special, ult) = three regular active buttons;
// neither hero has a leader ability or a separate legendary ultimate.
const BARON_FUTURE_KITS = Object.freeze({
  margot: Object.freeze({
    id:'margot', n:'Леди Марго Фенринг', sn:'Марго', g:'МФ', f:['bg','cor'], role:'sup',
    passive: { n:'Незримая рука', factionPotency: { factions:['bg','cor'], amount:.10 },
      isolationProtect: { faction:['bg','cor'], turns:1 },
      d:'Бене Гессерит и Коррино получают +10% эффективности. Раз за ход при Изоляции союзник с наименьшим здоровьем получает Защита↑ на 1 ход.' },
    basic: { n:'Скрытый намёк', tgt:'enemy', dt:'voice', m:.8, fx:[['damageDown',2,'t',.5]],
      d:'Голос: 80% урона, 50% шанс понизить урон цели на 2 хода.' },
    special: { n:'Тонкая игра', tgt:'allies', cd:3, tm:{allies:200}, factionFx:[{ factions:['bg'], status:'foresight', turns:1 }],
      d:'Все союзники +20% шкалы хода. Бене Гессерит получают Предвидение на 1 ход.' },
    ult: { n:'Нити влияния', tgt:'enemy', cd:4, fx:[['isolation',2,'t']], removePositive:1,
      d:'Выбранный враг получает Изоляцию на 2 хода, с него снимается одно усиление.' },
  }),
  yue: Object.freeze({
    id:'yue', n:'Доктор Веллингтон Юэ', sn:'Юэ', g:'ВЮ', f:['atr'], role:'heal',
    passive: { n:'Врач Дома', emergencyHeal: { threshold:.5, fraction:.12, perAllyPerBattle:1 },
      d:'Если союзник впервые за бой опускается ниже 50% здоровья, Юэ лечит его на 12% максимального здоровья.' },
    basic: { n:'Суккская диагностика', tgt:'enemy', dt:'fast', m:.75, healLowest:.05,
      d:'75% урона выбранному врагу; самый раненый союзник восстанавливает 5% максимального здоровья.' },
    special: { n:'Имперская медицина', tgt:'allies', cd:3, heal:.18, cleanseKeys:['poison','bleed'], lowestAllyFx:[['defUp',2]],
      d:'Все союзники восстанавливают 18% здоровья, очищаются от Яда и Кровотечения; самый раненый получает Защита↑ на 2 хода.' },
    ult: { n:'Печать кондиционирования', tgt:'allies', cd:4,
      lowestAllyFx:[['debuffImmune',2]], lowestAllyTm:150,
      d:'Самый раненый союзник получает Иммунитет к ослаблениям на 2 хода и +15% шкалы хода.' },
  }),
});

function validateBaronFutureKits(kits=BARON_FUTURE_KITS) {
  const errors=[];
  if(!kits||Object.keys(kits).length!==2||!kits.margot||!kits.yue) return ['Expected only Margot and Yue'];
  for(const id of ['margot','yue']){
    const h=kits[id];
    if(h.id!==id||h.leader||h.legendary||h.gl||!Array.isArray(h.f)||!h.f.length) errors.push('Invalid future hero identity '+id);
    for(const key of ['basic','special','ult','passive'])if(!h[key]?.n) errors.push('Missing '+id+' '+key);
    if(h.special?.cd!==3||h.ult?.cd!==4) errors.push('Incorrect cooldown '+id);
  }
  if(kits.margot.f.join(',')!=='bg,cor'||kits.yue.f.join(',')!=='atr')errors.push('Wrong factions');
  return errors;
}

export { BARON_FUTURE_KITS, validateBaronFutureKits };
