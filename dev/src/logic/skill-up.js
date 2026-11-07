// logic/skill-up.js — повышение умений (пакет 6, E2): стоимость, бонусы и тексты уровней, вид окна умения. Без DOM и HTML.
import './roster.js'; // порядок исполнения
import { S } from '../core/state.js';
import { leadBonus, pasMult, skMax, skMult } from './battle/skills.js';
import { SK_MLV, SK_UPS } from '../data/skill-ups.js';

function skCost(next) {
  if (next <= 5) return { sol: [0, 0, 800, 2000, 4000, 7000][next], folio: [0, 0, 1, 2, 4, 6][next] };
  if (next === 6) return { sol: 12000, seal: 1 };
  return { sol: 25000, wol: 1 };
}
function skBonus(k, l) {
  if (k === 'passive') return `+${Math.round((pasMult(l) - 1) * 100)}% здоровья и урона героя`;
  if (k === 'leader') return `+${(leadBonus(l) * 100).toFixed(1).replace('.0', '').replace('.', ',')}% здоровья и урона союзникам фракции`;
  return `+${Math.round((skMult(l) - 1) * 100)}% силы${l >= 7 && k !== 'basic' ? ', −1 к перезарядке' : ''}`;
}
function skLvLines(def, k, max) {
  const ups = SK_UPS[def.id + ':' + k] || {}, ml = SK_MLV[def.id + ':' + k], out = [];
  for (let l = 2; l <= max; l++) {
    let g;
    if (ml) g = ml[l - 1] !== ml[l - 2] ? `урон клинком ${Math.round(ml[l - 1] * 100)}%` : '';
    else if (k === 'passive') g = `+${Math.round((pasMult(l) - pasMult(l - 1)) * 100)}% здоровья и урона`;
    else if (k === 'leader') g = `+${((leadBonus(l) - leadBonus(l - 1)) * 100).toFixed(1).replace('.0', '').replace('.', ',')}% здоровья и урона фракции`;
    else g = `+${Math.round((skMult(l) - skMult(l - 1)) * 100)}% силы`;
    if (l === 7 && k !== 'basic' && k !== 'passive' && k !== 'leader') g += ', −1 к перезарядке';
    out.push({ l, t: [g, ups[l]].filter(Boolean).join('; ') });
  }
  return out;
}
function abDescLv(def, k, lv) {
  const ab = def[k]; if (!ab) return ''; let d = ab.d; const ml = SK_MLV[def.id + ':' + k], ups = SK_UPS[def.id + ':' + k];
  if (ml) d = d.replace(/\d+%/, Math.round(ml[Math.min(ml.length, lv) - 1] * 100) + '%');
  if (ups) for (const l of Object.keys(ups).map(Number).sort((a, b) => a - b)) if (lv >= l) d += ' ' + ups[l];
  return d;
}
const hasCost = c => S.solari >= c.sol && S.folio >= (c.folio || 0) && S.seal >= (c.seal || 0) && S.wol >= (c.wol || 0);
const lackKey = c => S.wol < (c.wol || 0) ? 'wol' : S.seal < (c.seal || 0) ? 'seal' : S.folio < (c.folio || 0) ? 'folio' : S.solari < c.sol ? 'sol' : null;
// вид окна умения (E2): уровни 1…макс. — got (изучен) / next (следующий) / lock; прирост и стоимость уровня; ups — тексты уровней-апгрейдов
function skLevelView(def, k, p) {
  const max = skMax(def, k), lv = (p.sk && p.sk[k]) || 1, locked = !p.stars, lines = skLvLines(def, k, max);
  const rows = Array.from({ length: max }, (_, j) => {
    const l = j + 1;
    return { l, st: l <= lv ? 'got' : l === lv + 1 && !locked ? 'next' : 'lock', t: l === 1 ? 'база' : lines[j - 1].t || '—', cost: l > lv ? skCost(l) : null };
  });
  return { max, lv, locked, rows, ups: SK_UPS[def.id + ':' + k] || {} };
}
// материал уровня (один на уровень) — ключ ресурса и количество
const skMat = c => c.wol ? ['wol', c.wol] : c.seal ? ['seal', c.seal] : c.folio ? ['folio', c.folio] : null;

export { skCost, skBonus, skLvLines, abDescLv, hasCost, lackKey, skLevelView, skMat };
