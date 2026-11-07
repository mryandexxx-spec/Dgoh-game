// ui/portrait.js — круглый портрет героя по UI-киту (пакет 4): кольцо стороны, обод снаряжения, звёзды дугой, бейджи.
// Только разметка; размер — CSS-переменная --s контейнера. Без анимаций (0 работы в простое).
import './views/camp.js'; // порядок исполнения
import { TIER_COL } from '../logic/gear.js';
import { SHARDS_NEXT } from '../logic/economy.js';
import { unlockNeed } from '../logic/relics.js';
import { figureSVG } from '../render2d/figures.js';

const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const canPromote = p => { const n = SHARDS_NEXT[p.stars]; return !!(p.stars && n && p.shards >= n); };

// o: { lead } — ромб «Л» (лидер отряда)
function ptRound(d, p, o = {}) {
  const locked = !p.stars;
  let h = `<span class="hpt${locked ? ' locked' : ''}${d.legendary ? ' legend' : ''}" style="--fc:var(--${d.f[0]});--side:var(--${d.side});--rim:${locked ? '#3a3028' : TIER_COL[p.gear]}">`
    + `<span class="ring"></span><span class="rim">${figureSVG(d)}</span>`;
  if (locked) h += `<span class="lock">${LOCK_SVG}</span>`;
  else {
    let st = ''; for (let i = 0; i < 7; i++) st += i < p.stars ? '<i class="on">★</i>' : '<i>★</i>';
    h += `<span class="stars">${st}</span><span class="gear">${p.gear}</span><span class="lvl">${p.lvl}</span>`;
    if (p.relic) h += `<span class="mem">${p.relic}</span>`;
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

export { ptRound, ptShards, canPromote };
