// ui/portrait.js — круглый портрет героя по UI-киту (пакет 4): кольцо стороны, обод снаряжения, звёзды дугой, бейджи.
// Только разметка; размер — CSS-переменная --s контейнера. Без анимаций (0 работы в простое).
import './views/camp.js'; // порядок исполнения
import { TIER_COL } from '../logic/gear.js';
import { SHARDS_NEXT } from '../logic/economy.js';
import { unlockNeed } from '../logic/relics.js';
import { figureSVG } from '../render2d/figures.js';

const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
// UI-06: original vector engraving, inspired by the approved ancestral eye seal.
// No network assets, duplicate SVG IDs or procedural hexagon backgrounds.
const MEMORY_ART = '<svg class="memory-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 2 79 17 91 48 79 80 50 97 21 80 9 48 21 17Z" fill="#241911" stroke="#1c130d" stroke-width="3"/><path d="M50 5 77 20 87 48 77 77 50 93 23 77 13 48 23 20Z" fill="#986139" stroke="#f2d2a0" stroke-width="2"/><path d="M50 10 74 23 83 48 74 74 50 89 26 74 17 48 26 23Z" fill="#4d2a1c" stroke="#c88f55" stroke-width="2"/><path d="M50 15 70 26 79 48 70 70 50 83 30 70 21 48 30 26Z" fill="#ad6c36" stroke="#54351e" stroke-width="2"/><path d="M50 17V27M50 69v11M22 48h10m36 0h10M29 27l8 8m26 26 8 8M71 27l-8 8M37 61l-8 8" stroke="#ffe0a1" stroke-width="1.5" fill="none"/><circle cx="50" cy="48" r="25" stroke="#f2c27b" stroke-dasharray="2 3" fill="none"/><path d="M34 29c-11 5-13 16-8 25l-3 6 10 3 2 9 10-4V54c-8-5-6-19-11-25Z M66 29c11 5 13 16 8 25l3 6-10 3-2 9-10-4V54c8-5 6-19 11-25Z" fill="#382017" stroke="#d2985c" stroke-width="1"/><path d="M29 48Q50 27 71 48Q50 69 29 48Z" fill="#edc88b" stroke="#4b2c1b" stroke-width="2"/><ellipse cx="50" cy="48" rx="10" ry="12" fill="#2b211e"/><ellipse cx="50" cy="48" rx="5" ry="8" fill="#ecb35c"/><circle cx="52" cy="44" r="2" fill="#fff3c4"/><path d="M50 7l5 8-5 7-5-7zM50 78l5 8-5 7-5-7z" fill="#ffe0a1" stroke="#573821"/><path d="M22 22L50 7 76 22M15 48l10 27 25 16" stroke="#ffe9bd" stroke-width="1.2" fill="none" opacity=".8"/></svg>';
function memoryBadge(level, locked = false) {
  const rankArt = '__MEMORY_RANK_ICON_URL__';
  const plaque = rankArt.startsWith('__') ? null : rankArt;
  return `<span class="memory-seal${locked ? ' is-locked' : ''}" aria-label="Другая память: ${locked ? 'закрыта' : level}">${MEMORY_ART}<span class="memory-rank">${plaque ? `<img class="memory-plaque" src="${plaque}" alt="" draggable="false">` : ''}<span class="memory-rank-value">${locked ? LOCK_SVG : level}</span></span></span>`;
}
const canPromote = p => { const n = SHARDS_NEXT[p.stars]; return !!(p.stars && n && p.shards >= n); };

// o: { lead } — ромб «Л» (лидер отряда)
function ptRound(d, p, o = {}) {
  const locked = !p.stars;
  // Другая память (ДП1+) добавляет цветное свечение поверх обода снаряжения.
  // Легендарный золотой контур — отдельный CSS-слой, не замена кольцу стороны/ДП.
  const dp = !locked && p.relic > 0 ? ` dp-${d.side === 'light' ? 'light' : d.side === 'dark' ? 'dark' : 'mach'}` : '';
  let h = `<span class="hpt${locked ? ' locked' : ''}${d.legendary ? ' legend' : ''}${dp}" style="--fc:var(--${d.f[0]});--side:var(--${d.side});--rim:${locked ? '#3a3028' : TIER_COL[p.gear]}">`
    + `<span class="ring"></span><span class="rim">${figureSVG(d)}</span>`;
  if (locked) h += `<span class="lock">${LOCK_SVG}</span>`;
  else {
    let st = ''; for (let i = 0; i < 7; i++) st += i < p.stars ? '<i class="on">★</i>' : '<i>★</i>';
    h += `<span class="stars">${st}</span><span class="gear">${p.gear}</span><span class="lvl">${p.lvl}</span>`;
    if (p.relic) h += o.registry
      ? `<span class="mem r-memory" role="img" aria-label="Другая память: ${p.relic}"><svg class="r-dp-eye" viewBox="0 0 20 12" aria-hidden="true"><path d="M1 6Q10 -3 19 6Q10 15 1 6Z" fill="none" stroke="currentColor" stroke-width="1.7"/><ellipse cx="10" cy="6" rx="2.3" ry="3.4" fill="currentColor"/></svg><b>${p.relic}</b></span>`
      : `<span class="mem">${memoryBadge(p.relic)}</span>`;
  }
  if (canPromote(p)) h += '<span class="promo">!</span>';
  if (o.lead) h += '<span class="lead"><b>Л</b></span>';
  return h + '</span>';
}

// полоса осколков под портретом (до открытия или до следующей звезды); на 7★ — «МАКС.»
function ptShards(d, p) {
  const need = p.stars ? SHARDS_NEXT[p.stars] : unlockNeed(d);
  if (!need) return '<span class="hmax">МАКС.</span>';
  return `<span class="hsh"><i class="${p.shards >= need ? 'full' : ''}" style="width:${Math.min(100, p.shards / need * 100)}%"></i><span>${p.shards}/${need}</span></span>`;
}

export { ptRound, ptShards, canPromote, memoryBadge };
