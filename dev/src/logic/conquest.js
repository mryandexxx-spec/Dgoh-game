// logic/conquest.js — строки 5394–5530 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { CQ_CHESTS, CQ_DIFF, CQ_DISKS, CQ_DMAX, CQ_EN, CQ_ERI, CQ_LAST, CQ_LAYERS, CQ_LMAX, CQ_LTYPE, CQ_MODS, CQ_SECT, CQ_STA, cqBump, cqRar, cqScore } from '../data/conquest-data.js';
import { statInc } from './stats.js';
import { unlockedIds } from '../ui/overlays/squad-select.js';
import { RW_NAME } from '../ui/rewards.js';
import { S } from '../core/state.js';
import { amt } from '../core/save.js';
import { enemyProg } from './economy.js';
import { sRng } from '../render2d/scenes.js';
import { ghash } from '../data/looks.js';
import { CH } from '../data/chars.js';

const cqWeek = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toDateString(); };
function cq() {
  const wk = cqWeek();
  if (!S.conq || S.conq.wk !== wk) S.conq = { v: 2, wk, diff: null, open: 0, done: {}, sta: {}, foe: {}, disks: [], pick: null, dpick: {}, buy: {}, stars: 0, got: {}, rest: 0, sel: null, sec: 0, squad: [], en: CQ_EN.max, enTs: Date.now(), v3: 1, pts: 0, fp: {}, fd: {}, tk: {} };
  const C = S.conq;
  if (C.v !== 2) {        // v1 → v2: new map layout, stamina instead of shared HP/fatigue, equipable disks
    Object.assign(C, { v: 2, done: {}, open: 0, sec: 0, sel: null, sta: {}, foe: {}, dpick: {}, buy: {}, rest: 0, en: CQ_EN.max, enTs: Date.now(), disks: (C.disks || []).map(k => typeof k === 'string' ? { k: k === 'leech' ? 'stam' : k, on: 1 } : k) });
    for (const k of ['hp', 'fat', 'med', 'stim', 'regroup']) delete C[k];
  }
  if (!C.v3) { Object.assign(C, { v3: 1, pts: 0, fp: {}, fd: {}, tk: {} }); delete C.got; CQ_MEMO_CLR(); }     // v3: feats + new reward track, boss modifiers
  return C;
}
// ---- Решимость (energy of the mode) ----
function cqEn() {
  const C = cq(), now = Date.now(), step = CQ_EN.sec * 1000;
  if (C.en >= CQ_EN.max) { C.enTs = now; return C.en; }
  const k = Math.floor((now - C.enTs) / step);
  if (k > 0) { C.en = Math.min(CQ_EN.max, C.en + k); C.enTs = C.en >= CQ_EN.max ? now : C.enTs + k * step; }
  return C.en;
}
function cqEnSpend(n) { const C = cq(); if (cqEn() < n) return false; if (C.en >= CQ_EN.max) C.enTs = Date.now(); C.en -= n; return true; }
const cqEnNext = () => { const C = cq(); return C.en >= CQ_EN.max ? 0 : Math.max(1, Math.ceil((CQ_EN.sec * 1000 - (Date.now() - C.enTs)) / 1000)); };
const cqEnTxt = () => { const s = cqEnNext(); return s ? `+1 через ${s >= 60 ? Math.ceil(s / 60) + ' мин' : s + ' с'}` : 'запас полон'; };
// ---- выносливость героев ----
function cqSta(id) { const r = cq().sta[id]; return r ? Math.min(100, r.v + Math.floor((Date.now() - r.t) / (CQ_STA.regenMin * 60000))) : 100; }
function cqStaSet(id, v) { const C = cq(); v = Math.max(0, Math.min(100, Math.round(v))); if (v >= 100) delete C.sta[id]; else C.sta[id] = { v, t: Date.now() }; }
const cqStaPen = s => { const x = 1 - s / 100; return { dmg: CQ_STA.dmg * x, spd: CQ_STA.spd * x }; };
const cqStaCol = s => s >= 70 ? '#7fbb6c' : s >= 40 ? '#e8c04f' : '#d9604f';
// ---- диски ----
const cqDiskOn = () => cq().disks.filter(x => x.on).map(x => x.k);
// шансы редкости [обычный, редкий, легендарный]: стартовый выбор, тайники (ранний / поздний в секторе), ящик контрабандиста
const CQ_DROP = { start: [70, 30, 0], early: [55, 38, 7], late: [30, 50, 20], crate: [40, 45, 15] };
function cqDropW(kind, s = 0) {
  const w = CQ_DROP[kind].slice(), C = cq(); if (kind === 'start') return w;
  const up = 2 * s + (C.diff === 'hard' ? 5 : C.diff === 'normal' ? 2 : 0); w[2] += up; w[0] = Math.max(5, w[0] - up); return w;
}
function cqDiskPick(seed, w = CQ_DROP.start, n = 3) {
  const C = cq(), own = new Set(C.disks.map(x => x.k)), r = sRng(ghash(C.wk + C.diff + 'd' + seed)), out = [], rs = ['c', 'r', 'l'];
  const left = q => Object.keys(CQ_DISKS).filter(k => !own.has(k) && !out.includes(k) && (!q || CQ_DISKS[k].r === q));
  while (out.length < n && left().length) {
    let x = r() * w.reduce((a, b) => a + b, 0), q = 0; while (q < 2 && (x -= w[q]) >= 0) q++;
    let pool = left(rs[q]); for (const d of [-1, 1, -2, 2]) if (!pool.length && rs[q + d]) pool = left(rs[q + d]);   // нужной редкости нет — берём соседнюю
    out.push(pool[Math.floor(r() * pool.length)]);
  }
  return out;
}
const cqLegOn = () => cqDiskOn().filter(k => CQ_DISKS[k].r === 'l').length;
const cqCanOn = k => cqDiskOn().length < CQ_DMAX && (CQ_DISKS[k].r !== 'l' || cqLegOn() < CQ_LMAX);
function cqAddDisk(k) { const C = cq(); if (C.disks.some(x => x.k === k) || !CQ_DISKS[k]) return; C.disks.push({ k, on: cqCanOn(k) ? 1 : 0 }); if (CQ_DISKS[k].r === 'l') statInc('cqLeg'); cqBump('disk', null, C.disks.length, true); }
const cqNodeDisks = a => { const C = cq(); return (C.dpick[a.key] ??= cqDiskPick(a.key, cqDropW(a.L < 6 ? 'early' : 'late', a.s))); };
// ---- лавка тайника ----
const CQ_GOODS = [
  { n: 'Водный паёк', d: 'Все герои: +30% выносливости.', ico: 'sta', mk: m => ({ cost: ['cry', 60], use: () => { for (const id of unlockedIds()) cqStaSet(id, cqSta(id) + 30); return 'Выносливость всех героев +30%'; } }) },
  { n: 'Клятва сиетча', d: '+50 Решимости (можно сверх запаса).', ico: 'res', mk: m => ({ cost: ['cry', 80], use: () => { cqEn(); cq().en += 50; return '+50 Решимости'; } }) },
  { n: 'Осколки Эразма', mk: m => ({ cost: ['cry', 200 + 100 * m], rw: [['shard', 3 * m, 'erasmus']] }) },
  { n: 'Осколки робота', mk: m => ({ cost: ['cry', 90], rw: [['shard', 5 * m, 'robot']] }) },
  { n: 'Осколки кимека', mk: m => ({ cost: ['cry', 90], rw: [['shard', 5 * m, 'cymek']] }) },
  { n: 'Другая память', mk: m => ({ cost: ['sol', 40000 * m], rw: [['core', 3 * m]] }) },
  { n: 'Печать Ландсраада', mk: m => ({ cost: ['cry', 220], rw: [['seal', 1]] }) },
  { n: 'Фолианты ментата', mk: m => ({ cost: ['sol', 20000], rw: [['folio', 4 * m]] }) },
  { n: 'Ящик контрабандиста', d: 'Случайный диск, которого у вас ещё нет: 15% — легендарный, 45% — редкий.', ico: 'disk', mk: m => ({ cost: ['cry', 300], use: () => { const k = cqDiskPick('buy' + cq().disks.length, cqDropW('crate', cq().sec || 0), 1)[0]; if (!k) return 'Все диски уже собраны'; cqAddDisk(k); return `${cqRar(k).n} диск «${CQ_DISKS[k].n}»`; } }) },
];
function cqGoods(key) {
  const C = cq(), m = (CQ_DIFF[C.diff] || CQ_DIFF.easy).mult, r = sRng(ghash(C.wk + key + 'g')), rest = CQ_GOODS.slice(2), out = CQ_GOODS.slice(0, 2);
  while (out.length < 5) out.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
  return out.map(g => ({ ...g, ...g.mk(m) }));
}
// ---- карта ----
const CQ_MEMO = {}, CQ_MEMO_CLR = () => { for (const k in CQ_MEMO) delete CQ_MEMO[k]; };
function cqLayout(s) {
  const C = cq(), mk0 = C.wk + C.diff + ':v3:' + s; if (CQ_MEMO[mk0]) return CQ_MEMO[mk0];
  const r = sRng(ghash(mk0)), nodes = [];
  CQ_LAYERS.forEach((n, L) => { for (let j = 0; j < n; j++) nodes.push({ key: `${s}-${L}-${j}`, s, L, j, y: (j + .5) / n, next: [] }); });
  const at = L => nodes.filter(x => x.L === L), near = (arr, y) => arr.slice().sort((p, q) => Math.abs(p.y - y) - Math.abs(q.y - y))[0];
  for (const a of nodes) a.next = at(a.L + 1).filter(b => Math.abs(b.y - a.y) <= .34).map(b => b.key);
  for (const a of nodes) if (a.L < CQ_LAST && !a.next.length) a.next.push(near(at(a.L + 1), a.y).key);
  for (const b of nodes) if (b.L > 0 && !nodes.some(a => a.next.includes(b.key))) near(at(b.L - 1), b.y).next.push(b.key);
  for (const a of nodes) a.type = CQ_LTYPE[a.L] || 'fight';
  const pick = L => { const c = at(L); return c[Math.floor(r() * c.length)]; };
  pick(3).type = 'elite'; pick(8).type = 'elite';
  const D = CQ_DIFF[C.diff] || CQ_DIFF.easy, SE = CQ_SECT[s], modKeys = Object.keys(CQ_MODS);
  for (const a of nodes) {
    a.fight = ['fight', 'elite', 'boss'].includes(a.type);
    const fr = (s * CQ_LAYERS.length + a.L) / (5 * CQ_LAYERS.length - 1), boss = a.type === 'boss', elite = a.type === 'elite';
    a.lvl = Math.min(85, Math.round(D.lvl[0] + (D.lvl[1] - D.lvl[0]) * fr) + (boss ? 3 : elite ? 2 : 0));
    a.relic = Math.min(7, Math.round(D.relic[0] + (D.relic[1] - D.relic[0]) * fr) + (boss && D.relic[1] ? 1 : 0));
    a.pow = (D.pow[0] + (D.pow[1] - D.pow[0]) * fr) * (boss ? 1.2 : elite ? 1.1 : 1);
    a.enemy = []; a.mods = [];
    if (!a.fight) continue;
    if (boss) a.enemy = SE.boss.slice();
    else if (elite) a.enemy = SE.boss.slice(1).concat(SE.pool[0]).slice(0, 5);
    else { const sz = a.L >= 5 ? 5 : 4; a.enemy = Array.from({ length: sz }, () => SE.pool[Math.floor(r() * SE.pool.length)]); }
    const li = a.enemy.findIndex(id => CH[id].leader); if (li > 0) a.enemy.unshift(a.enemy.splice(li, 1)[0]);
    const nm = boss ? (C.diff === 'hard' ? 1 : 0) : elite ? 1 : 0, mk = modKeys.slice();
    if (boss) a.mods.push(`b${s}a`, `b${s}b`);
    for (let k = 0; k < nm; k++) a.mods.push(mk.splice(Math.floor(r() * mk.length), 1)[0]);
  }
  return (CQ_MEMO[mk0] = nodes);
}
const cqNode = key => cqLayout(+key.split('-')[0]).find(n => n.key === key);
const cqFoes = a => a.enemy.map(id => ({ ...enemyProg(id, a.lvl), relic: a.relic, pow: a.pow, gl: a.type === 'boss' && id === 'erasmus' && cq().diff !== 'easy' }));
// enemies still standing at a node (with their remembered HP / shield), and their indices in the full line-up
function cqLive(a) { const st = cq().foe[a.key], all = cqFoes(a), idx = all.map((_, k) => k).filter(k => !st || !st[k] || st[k].h > 0); return { all, idx, foes: idx.map(k => all[k]), st }; }
function cqOpen(a) {
  const C = cq(); if (!C.diff || C.pick || a.s > C.open) return false;
  if (a.L === 0) return true;
  return cqLayout(a.s).some(p => p.next.includes(a.key) && C.done[p.key]);
}
const cqTypeN = t => ({ boss: 'Босс сектора', elite: 'Элита', cache: 'Тайник контрабандистов', disk: 'Тайник с дисками', fight: 'Бой' })[t];
function cqTrack() {       // [{at, kind: 'st'|'chest', i}] — 4 промежуточные награды перед каждым сундуком
  const out = []; let prev = 0, j = 0;
  CQ_CHESTS.forEach((at, i) => { for (let q = 1; q <= 4; q++) out.push({ at: Math.round(prev + (at - prev) * q / 5), kind: 'st', i: j++ }); out.push({ at, kind: 'chest', i }); prev = at; });
  return out;
}
function cqStatic(j) {
  const m = (CQ_DIFF[cq().diff] || CQ_DIFF.easy).mult, t = j % 4, g = Math.floor(j / 4);
  return [[['sol', Math.round(3000 * m * (1 + g * .3))], ['cry', 10 * m + 3 * g], ['folio', 2 * m], ['shard', 2 * m, g % 2 ? 'cymek' : 'robot']][t], ['jt', (10 + 2 * g) * m]];
}
function cqChest(i) {        // fix: гарантированно; any: одна случайная награда из списка
  const C = cq(), D = CQ_DIFF[C.diff] || CQ_DIFF.easy, m = D.mult, fix = [['sol', Math.round(10000 * m * (1 + i * .4))], ['cry', 40 * m + 15 * i]];
  const ei = CQ_ERI.indexOf(i); if (ei >= 0) fix.push(['shard', D.er[ei], 'erasmus']);
  if (i >= 3) fix.push(['core', (i - 1) * m]); if (i >= 5) fix.push(['seal', m]); if (i === 6 && m >= 2) fix.push(['wol', m - 1]);
  const any = [['shard', 6 * m, 'robot'], ['shard', 6 * m, 'cymek'], ['folio', 4 * m + i], ['pl', 10 * m + 3 * i], ['cry', 50 * m]];
  return { fix, any };
}
const cqCanClaim = i => { const C = cq(); return !!C.diff && cqScore() >= CQ_CHESTS[i] && !C.tk['c' + i]; };
function cqSyncTrack() {}      // промежуточные награды больше не начисляются сами — «доступно», забираются по тапу
const cqStCan = j => { const C = cq(); if (!C.diff || C.tk['s' + j]) return false; const T = cqTrack().find(x => x.kind === 'st' && x.i === j); return !!T && cqScore() >= T.at; };
const cqStReady = () => cqTrack().filter(x => x.kind === 'st' && cqStCan(x.i)).length;
function cqPop(el, html) {    // маленькая всплывашка над наградой
  const r = el.getBoundingClientRect(), d = document.createElement('div'); d.className = 'cqpop'; d.innerHTML = html;
  d.style.left = (r.left + r.width / 2) + 'px'; d.style.top = r.top + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 1700);
}
const cqRwHtml = r => amt(r[0], r[1], r[2] ? 'shard:' + r[2] : undefined) + (r[2] ? ` <span class="cqrwn">${CH[r[2]].sn}</span>` : ` <span class="cqrwn">${RW_NAME[r[0]] || ''}</span>`);
const cqBadge = () => { if (!S) return ''; const C = cq(); if (!C.diff) return 'новая неделя'; const ready = CQ_CHESTS.filter((t, i) => cqCanClaim(i)).length, st = cqStReady(); return ready ? `сундуков: ${ready}` : st ? `наград: ${st}` : `очки ${cqScore()}`; };
const cqHot = () => { if (!S) return false; const C = cq(); return S.acc.lvl >= CQ_DIFF.easy.acc && (!C.diff || !!C.pick || CQ_CHESTS.some((t, i) => cqCanClaim(i)) || cqStReady() > 0); };


export { cqWeek, cq, cqEn, cqEnSpend, cqEnNext, cqEnTxt, cqSta, cqStaSet, cqStaPen, cqStaCol, cqDiskOn, CQ_DROP, cqDropW, cqDiskPick, cqLegOn, cqCanOn, cqAddDisk, cqNodeDisks, CQ_GOODS, cqGoods, CQ_MEMO, CQ_MEMO_CLR, cqLayout, cqNode, cqFoes, cqLive, cqOpen, cqTypeN, cqTrack, cqStatic, cqChest, cqCanClaim, cqSyncTrack, cqStCan, cqStReady, cqPop, cqRwHtml, cqBadge, cqHot };
