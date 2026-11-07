// logic/roster.js — ростер (пакет 4): фильтр и сортировка списка героев, чистая функция без DOM.
import './progress.js'; // порядок исполнения
import { prog } from './progress.js';
import { unitPower } from './battle/stats.js';
import { unlockNeed } from './relics.js';
import { CHARS } from '../data/chars.js';

// f — сторона (light/dark/mach) или фракция (atr, frem, …), r — роль, s — сортировка открытых: pw | lvl | st | nm
const ROSTER_SORTS = { pw: 'Мощь', lvl: 'Уровень', st: 'Звёзды', nm: 'Имя' };
const ROSTER_SIDES = ['light', 'dark', 'mach'];
const ROSTER_DEF = { f: 'all', r: 'all', s: 'pw' };

const rosterMatch = (c, f, r) => (f === 'all' || (ROSTER_SIDES.includes(f) ? c.side === f : c.f.includes(f))) && (r === 'all' || c.role === r);

// → { open: [id], locked: [id] }; закрытые — всегда отдельной группой, по доле собранных осколков
function rosterView(o = ROSTER_DEF, pg = prog, power = unitPower) {
  const f = o.f || 'all', r = o.r || 'all', s = ROSTER_SORTS[o.s] ? o.s : 'pw';
  const all = CHARS.filter(c => !c.npc && rosterMatch(c, f, r)).map(c => { const p = pg(c.id); return { c, p, pw: p.stars ? power(c, p) : 0 }; });
  const byName = (a, b) => a.c.n.localeCompare(b.c.n, 'ru') || (a.c.id < b.c.id ? -1 : 1);
  const key = { pw: x => x.pw, lvl: x => x.p.lvl, st: x => x.p.stars }[s];
  const open = all.filter(x => x.p.stars > 0).sort(s === 'nm' ? byName : (a, b) => key(b) - key(a) || b.pw - a.pw || byName(a, b));
  const need = x => unlockNeed(x.c);
  const locked = all.filter(x => !x.p.stars).sort((a, b) => b.p.shards / need(b) - a.p.shards / need(a) || byName(a, b));
  return { open: open.map(x => x.c.id), locked: locked.map(x => x.c.id) };
}

export { ROSTER_SORTS, ROSTER_SIDES, ROSTER_DEF, rosterMatch, rosterView };
