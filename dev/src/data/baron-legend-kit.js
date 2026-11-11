// BH3: executable legendary Baron kit, staged behind the character-release gate.
// Source of names / mechanics: owner's recovered original chat. Suggested combat
// numbers (Horror 20%, GL 300%/50%/20%) are provisional playtest defaults.
// This module intentionally does NOT add the character to public CHARS yet.
import { BARON_LEGEND_ABILITIES as C } from './baron-legend-abilities.js';

const BARON_LEGEND_KIT = Object.freeze({
  id: 'baron_legend', n: 'Барон Владимир Харконнен', sn: 'Барон (легенда)', g: 'БЛ',
  f: ['hark'], role: 'sup', legendary: true, pow: 1.45,
  leader: {
    n: C.leader.name, houseMark: true,
    d: 'Харконнены усиливают атаку и здоровье, наносимый урон по ослабленным врагам, охотятся на Жертву Дома.',
  },
  passive: {
    n: C.passive.name, harkonnenGreed: true, healOnEnemyDeath: C.passive.healOnEnemyDeath,
    d: 'При гибели врага лечится на 50% и усиливает союзных Харконненов. Атрейдесы не воскресают. Фейд и Раббан усиливают синергию.',
  },
  basic: {
    n: C.basic.name, tgt: 'enemy', assistFaction: 'hark', assistMultiplier: 1,
    extraAssistId: 'feyd', extraAssistMultiplier: C.basic.feydBonusBasicMultiplier,
    assistHorrorBonus: C.basic.bonusDamageVsHorror, selfHealStaggered: C.basic.selfHealStaggered,
    fx: [['damageDown',2,'t']],
    d: 'Сильнейший союзный Харконнен атакует с силой 100%. Фейд также атакует с силой 150% (если он сильнейший, бьёт дважды). Против Ужаса +50% урона. Барон восстанавливает 30% здоровья.',
  },
  special: {
    n: C.special.name, cd: 3, cd0: 3, tgt: 'enemies',
    fx: [['horror',2,'enemies']], harkFx: [['attackUp',2]],
    d: 'Начальная перезарядка 3. Все враги получают Ужас, уменьшающий урон и получение шкалы хода. Харконнены получают Атаку↑.',
  },
  // Existing 'ult' slot is the THIRD regular attack, as on Muad'Dib.
  // The separate 'gl' key keeps its independent charge and one-use rules.
  ult: {
    n: C.powerful.name, cd: 4, cd0: 4, tgt: 'enemy', dt: 'fast', m: 2,
    harkFx: [['attackUp',2],['defUp',2],['debuffImmune',1],['foresight',1]],
    enemyLeaderFx: [['isolation',2]],
    d: 'Начальная перезарядка 4. Наносит 200% урона выбранной цели; Харконненам Атака↑, Защита↑, иммунитет к ослаблениям и Предвидение. Вражескому лидеру — Изоляция.',
  },
  gl: {
    n: C.gl.name, kind: C.gl.kind, theme: '#a76c48', tgt: 'enemies',
    damageMultiplier: 3, armorDownTurns: 3, atreidesBonus: .5, healPerKill: .2,
    d: 'Легендарная ульта: удар армии по всем врагам, Броня↓, бонус по Атрейдесам, лечение за уничтожение. Анимация левитирующего кресла — отдельный визуальный пакет.',
  },
});

export { BARON_LEGEND_KIT };
