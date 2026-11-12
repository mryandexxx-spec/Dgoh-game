// render2d/figures.js — строки 676–804 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { FEM, LOOK, OL, SKINS, ghash, sigil } from '../data/looks.js';

function figureSVG(def, full) {
  const fac = def.f[0], L = def.id === 'margot' ? {hi:'#766080',cloak:'#46314e',dark:'#24182d',acc:'#c8a47d',pants:'#251d2a'} : def.id === 'yue' ? {hi:'#b9ac98',cloak:'#777268',dark:'#343c32',acc:'#8e9e72',pants:'#49453d'} : LOOK[fac] || LOOK.atr, h = ghash(def.id), fem = FEM.has(def.id);
  const si = h % SKINS.length, [sk1, sk2] = SKINS[si];
  const hairC = ['#2a1c14', '#5a3a22', '#151110', '#7a5232', '#3a2a20', '#8a8076'][(h >> 3) % 6];
  const style = def.legendary || fac === 'frem' ? 'robe' : def.f.includes('bg') ? 'bgrobe' : fac === 'hark' || fac === 'mach' ? 'armor' : fac === 'cor' ? 'cor' : 'tunic';
  const long = style === 'robe' || style === 'bgrobe';
  const sw = def.role === 'tank' ? 13.5 : def.role === 'att' ? 11 : 10.5;
  const hx = 30 + sw + 2, hy = 53, lx = 30 - sw - 2;
  const cl = `cl-${fac}`, sk = `sk-${si}`, G = [];
  G.push(`<defs><linearGradient id="${cl}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L.hi}"/><stop offset=".55" stop-color="${L.cloak}"/><stop offset="1" stop-color="${L.dark}"/></linearGradient>
    <radialGradient id="${sk}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${sk1}"/><stop offset="1" stop-color="${sk2}"/></radialGradient>
    <linearGradient id="mt-hark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a96b8"/><stop offset=".5" stop-color="#3c4462"/><stop offset="1" stop-color="#141826"/></linearGradient>
    <linearGradient id="mt-cor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fae2a0"/><stop offset=".5" stop-color="#c49a3e"/><stop offset="1" stop-color="#5e4210"/></linearGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#8a929c"/></linearGradient>
    <linearGradient id="boot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2a1e"/><stop offset="1" stop-color="#1a120c"/></linearGradient></defs>`);
  if (def.legendary) G.push(`<ellipse cx="30" cy="48" rx="28" ry="50" fill="#e0b44a" opacity=".12"/><ellipse cx="30" cy="30" rx="18" ry="26" fill="#f6d688" opacity=".14"/>`);
  if (def.leader) G.push(`<path d="M${30 - sw} 25 Q30 22 ${30 + sw} 25 L${30 + sw + 9} 95 Q30 99 ${30 - sw - 9} 95Z" fill="${fac === 'cor' ? '#7a1f1a' : L.dark}" stroke="${OL}" stroke-width=".7"/><path d="M${30 + sw + 1} 30 L${30 + sw + 7} 93" stroke="#fff" stroke-width=".7" opacity=".12"/>`);
  if (def.role === 'sup' && def.id !== 'margot') G.push(`<line x1="14" y1="98" x2="14" y2="14" stroke="${OL}" stroke-width="3.6" stroke-linecap="round"/><line x1="14" y1="98" x2="14" y2="14" stroke="#6e5034" stroke-width="2.4" stroke-linecap="round"/><path d="M14 9 l3.4 4 -3.4 4 -3.4 -4z" fill="${L.acc}" stroke="${OL}" stroke-width=".6"/><circle cx="13" cy="12" r="1" fill="#fff" opacity=".7"/>`);
  // legs & boots
  if (!long) {
    const pc = style === 'armor' ? 'url(#mt-hark)' : L.pants;
    G.push(`<path d="M23 50 L29.2 50 L28.6 88 L23.6 88Z" fill="${pc}" stroke="${OL}" stroke-width=".7"/><path d="M30.8 50 L37 50 L36.4 88 L31.4 88Z" fill="${pc}" stroke="${OL}" stroke-width=".7"/>`);
    if (style === 'armor' || style === 'cor') G.push(`<ellipse cx="26" cy="71" rx="3.3" ry="2.6" fill="${style === 'cor' ? 'url(#mt-cor)' : '#59627e'}" stroke="${OL}" stroke-width=".5"/><ellipse cx="34" cy="71" rx="3.3" ry="2.6" fill="${style === 'cor' ? 'url(#mt-cor)' : '#59627e'}" stroke="${OL}" stroke-width=".5"/>`);
  }
  G.push(`<path d="M22.6 85 h6.6 v10 q0 2.2 -2 2.2 h-6.2 q-1.6 0 -1.4 -1.6 l1 -3z" fill="url(#boot)" stroke="${OL}" stroke-width=".6"/><path d="M30.8 85 h6.6 l1 7.6 q.4 1.8 -1.4 1.8 h-.2 v.6 q0 2.2 -2 2.2 h-4z" fill="url(#boot)" stroke="${OL}" stroke-width=".6"/>`);
  // torso
  if (long) {
    const rc = style === 'bgrobe' ? L.dark : `url(#${cl})`;
    G.push(`<path d="M${30 - sw} 25.5 Q30 22 ${30 + sw} 25.5 L${30 + sw + 5} 90 Q30 94 ${30 - sw - 5} 90Z" fill="${rc}" stroke="${def.legendary ? '#e0b44a' : OL}" stroke-width=".8" stroke-linejoin="round"/>`);
    G.push(`<path d="M30 28 L33 91 L27 91Z" fill="${L.dark}" opacity=".55"/><path d="M${30 - sw * .5} 50 Q${30 - sw * .7} 70 ${30 - sw - 2} 89 M${30 + sw * .45} 52 Q${30 + sw * .6} 72 ${30 + sw + 2} 89 M${30 - 3} 60 Q${30 - 3.6} 75 ${30 - 4.5} 90" stroke="${L.dark}" stroke-width=".9" fill="none" opacity=".7"/>`);
    G.push(`<path d="M${30 - sw + 1} 27 L${30 - sw - 3.5} 88" stroke="#fff" stroke-width=".9" opacity=".18"/><path d="M${30 - sw * .7} 45 Q30 47.5 ${30 + sw * .7} 45 L${30 + sw * .72} 48.5 Q30 51 ${30 - sw * .72} 48.5Z" fill="${style === 'bgrobe' ? L.acc : '#5a3a22'}" opacity="${style === 'bgrobe' ? .55 : 1}" stroke="${OL}" stroke-width=".4"/>`);
    if (style === 'bgrobe') G.push(`<path d="M30 26 V90" stroke="${L.acc}" stroke-width=".6" opacity=".45"/>`);
  } else {
    const tc = style === 'armor' ? 'url(#mt-hark)' : `url(#${cl})`;
    G.push(`<path d="M${30 - sw} 26 Q30 22.5 ${30 + sw} 26 L${30 + sw - 1.5} 50 L${30 + 9.5} 60 L${30 - 9.5} 60 L${30 - sw + 1.5} 50Z" fill="${tc}" stroke="${OL}" stroke-width=".8" stroke-linejoin="round"/>`);
    if (style === 'tunic') G.push(`<path d="M30 25 V59" stroke="${L.dark}" stroke-width="1"/><path d="M24.5 34 h4 M31.5 34 h4" stroke="${L.dark}" stroke-width=".8"/><circle cx="30" cy="38" r=".7" fill="${L.acc}"/><circle cx="30" cy="43" r=".7" fill="${L.acc}"/>`);
    if (style === 'armor') G.push(`<path d="M${30 - sw + 3} 28 Q30 26 ${30 + sw - 3} 28 L${30 + sw - 4} 40 Q30 43 ${30 - sw + 4} 40Z" fill="#5c6888" stroke="${OL}" stroke-width=".6"/><path d="M${30 - 7} 44 h14 M${30 - 7.5} 48 h15 M${30 - 8} 52 h16" stroke="#0c0f18" stroke-width="1"/><path d="M${30 - sw + 4} 29 Q30 27.5 ${30 + 2} 28.4" stroke="#fff" stroke-width=".7" opacity=".35" fill="none"/>`);
    if (style === 'cor') G.push(`<path d="M${30 - sw + 3} 27.5 Q30 25.5 ${30 + sw - 3} 27.5 L${30 + sw - 4.5} 42 Q30 45 ${30 - sw + 4.5} 42Z" fill="url(#mt-cor)" stroke="${OL}" stroke-width=".6"/><circle cx="30" cy="34" r="2.6" fill="none" stroke="#7a5414" stroke-width="1"/><circle cx="30" cy="34" r="1" fill="#7a5414"/>`);
    G.push(`<rect x="${30 - sw + 1}" y="47.5" width="${sw * 2 - 2}" height="3.2" rx="1" fill="#2a1d14" stroke="${OL}" stroke-width=".5"/><rect x="28.3" y="47" width="3.4" height="4.2" rx=".7" fill="${style === 'cor' ? '#e6c66e' : '#b8a27a'}"/>`);
    if (style !== 'cor') G.push(sigil(fac, 30 + sw * .45, 32, L.acc));
  }
  // arms
  const sleeve = style === 'armor' ? '#3c4462' : style === 'cor' ? '#625d55' : style === 'bgrobe' ? L.dark : L.cloak;
  const lhand = def.role === 'sup' ? [15.6, 52] : def.role === 'tank' ? [lx + 2, 46] : [lx, hy];
  const arm = (x0, y0, ex, ey, x1, y1) => `<path d="M${x0} ${y0} Q${ex} ${ey} ${x1} ${y1}" stroke="${OL}" stroke-width="6.6" fill="none" stroke-linecap="round"/><path d="M${x0} ${y0} Q${ex} ${ey} ${x1} ${y1}" stroke="${sleeve}" stroke-width="5.2" fill="none" stroke-linecap="round"/>`;
  G.push(arm(30 + sw - 2, 28, 30 + sw + 4, 41, hx, hy));
  G.push(arm(30 - sw + 2, 28, 30 - sw - 4, 41, lhand[0], lhand[1]));
  if (style === 'armor' || style === 'cor') G.push(`<ellipse cx="${30 + sw - 1}" cy="27.5" rx="5" ry="3.6" fill="${style === 'cor' ? 'url(#mt-cor)' : '#59627e'}" stroke="${OL}" stroke-width=".6"/><ellipse cx="${30 - sw + 1}" cy="27.5" rx="5" ry="3.6" fill="${style === 'cor' ? 'url(#mt-cor)' : '#59627e'}" stroke="${OL}" stroke-width=".6"/>`);
  else if (style === 'tunic') G.push(`<rect x="${30 + sw - 5}" y="24.5" width="6.5" height="2.4" rx=".8" fill="${L.acc}" stroke="${OL}" stroke-width=".4"/><rect x="${30 - sw - 1.5}" y="24.5" width="6.5" height="2.4" rx=".8" fill="${L.acc}" stroke="${OL}" stroke-width=".4"/>`);
  const glove = style === 'armor' ? '#232838' : `url(#${sk})`;
  G.push(`<circle cx="${hx}" cy="${hy}" r="2.8" fill="${glove}" stroke="${OL}" stroke-width=".55"/><circle cx="${lhand[0]}" cy="${lhand[1]}" r="2.8" fill="${glove}" stroke="${OL}" stroke-width=".55"/>`);
  // neck + head
  G.push(`<path d="M27.4 19 h5.2 v6.5 h-5.2z" fill="${sk2}"/>`);
  if (style === 'tunic' || style === 'cor') G.push(`<path d="M26 24 Q30 27 34 24 L34.6 26.6 Q30 29.4 25.4 26.6Z" fill="${L.dark}" stroke="${OL}" stroke-width=".5"/>`);
  const hood = style === 'robe' || style === 'bgrobe', helm = style === 'armor' && (def.id === 'trooper' || def.role === 'tank' || fac === 'mach'), crest = style === 'cor';
  const hoodC = style === 'bgrobe' ? L.dark : `url(#${cl})`;
  if (hood) G.push(`<path d="M21.6 21 Q20 3 30 2.6 Q40 3 38.4 21 L37 27 L23 27Z" fill="${hoodC}" stroke="${def.legendary ? '#e0b44a' : OL}" stroke-width=".8"/>`);
  else if (fem) G.push(`<path d="M23.2 12 Q22 3.6 30 3.4 Q38 3.6 36.8 12 L38 27 Q30 29.5 22 27Z" fill="${hairC}" stroke="${OL}" stroke-width=".6"/>`);
  const rx = fem ? 5.5 : 6, ry = fem ? 6.8 : 7.1;
  if (!helm) {
    if (!hood) G.push(`<ellipse cx="23.9" cy="13.6" rx="1.2" ry="1.9" fill="${sk2}"/><ellipse cx="36.1" cy="13.6" rx="1.2" ry="1.9" fill="${sk2}"/>`);
    G.push(`<ellipse cx="30" cy="12.8" rx="${rx}" ry="${ry}" fill="url(#${sk})" stroke="${OL}" stroke-width=".7"/>`);
    G.push(`<ellipse cx="26.3" cy="15.6" rx="1.6" ry="1" fill="${sk2}" opacity=".35"/><ellipse cx="33.7" cy="15.6" rx="1.6" ry="1" fill="${sk2}" opacity=".35"/>`);
    const iris = ['#3a2614', '#4a5a6a', '#2c2014', '#5a6a40'][(h >> 6) % 4];
    G.push(`<ellipse cx="27.5" cy="12.4" rx="1.3" ry=".78" fill="#f4ede2"/><ellipse cx="32.5" cy="12.4" rx="1.3" ry=".78" fill="#f4ede2"/><circle cx="27.7" cy="12.4" r=".62" fill="${iris}"/><circle cx="32.7" cy="12.4" r=".62" fill="${iris}"/><circle cx="27.9" cy="12.2" r=".2" fill="#fff"/><circle cx="32.9" cy="12.2" r=".2" fill="#fff"/>`);
    G.push(`<path d="M26 10.7 Q27.5 ${fem ? 9.9 : 10} 29 10.6 M31 10.6 Q32.5 ${fem ? 9.9 : 10} 34 10.7" stroke="${hood ? '#3a2a1e' : hairC}" stroke-width="${fem ? .55 : .8}" fill="none" stroke-linecap="round"/>`);
    if (fem) G.push(`<path d="M26.2 11.9 l-.5 -.4 M33.8 11.9 l.5 -.4" stroke="#1a100a" stroke-width=".4"/>`);
    G.push(`<path d="M30 12.8 L29.3 15.6 Q30 16.2 30.9 15.7" stroke="${sk2}" stroke-width=".7" fill="none" stroke-linecap="round"/>`);
    G.push(`<path d="M28.4 17.9 Q30 ${fem ? 18.9 : 18.5} 31.6 17.9" stroke="${fem ? '#9a4a42' : '#7a4434'}" stroke-width="${fem ? .9 : .7}" fill="none" stroke-linecap="round"/>`);
    const beard = !fem && !hood && (h >> 9) % 3 === 0;
    if (beard) G.push(`<path d="M24.3 13.5 Q24.4 20.8 30 21 Q35.6 20.8 35.7 13.5 Q34.4 17.6 32 17.4 Q30 16.9 28 17.4 Q25.6 17.6 24.3 13.5Z" fill="${hairC}" opacity=".92"/><path d="M28 17.3 Q30 18.6 32 17.3" stroke="#7a4434" stroke-width=".6" fill="none"/>`);
    if (!hood && !crest) {
      const hs = (h >> 12) % 3;
      if (fem) G.push(`<path d="M24 11.5 Q24.6 5.4 30 5.2 Q35.4 5.4 36 11.5 Q33.5 7.8 30 8 Q27 7.8 24 11.5Z" fill="${hairC}"/>`);
      else if (hs === 0) G.push(`<path d="M23.9 12.6 Q23.2 4.8 30 4.6 Q36.8 4.8 36.1 12.6 Q35 8 30 8.2 Q25 8 23.9 12.6Z" fill="${hairC}" stroke="${OL}" stroke-width=".5"/>`);
      else if (hs === 1) G.push(`<path d="M23.9 13 Q22.8 4.2 30.4 4.2 Q37.4 4.6 36.1 12 Q35.4 8.4 32.6 7.8 Q28 9.2 24.6 9.8Z" fill="${hairC}" stroke="${OL}" stroke-width=".5"/>`);
      else G.push(`<g fill="${hairC}" stroke="${OL}" stroke-width=".4"><circle cx="25.4" cy="8.4" r="2.6"/><circle cx="28.4" cy="6.2" r="2.8"/><circle cx="31.8" cy="6" r="2.8"/><circle cx="34.8" cy="8.2" r="2.6"/><circle cx="24.4" cy="11" r="1.6"/><circle cx="35.6" cy="11" r="1.6"/></g>`);
    }
    if (style === 'robe') G.push(`<path d="M24.4 14.6 Q30 16.4 35.6 14.6 L35 20 Q30 22 25 20Z" fill="${L.dark}" stroke="${OL}" stroke-width=".5"/><path d="M25 17.3 Q30 18.8 35 17.3" stroke="${L.cloak}" stroke-width=".6" fill="none"/>`);
    if (hood) G.push(`<path d="M23.4 17 Q22.4 5.6 30 5.2 Q37.6 5.6 36.6 17" stroke="${style === 'bgrobe' ? L.dark : L.cloak}" stroke-width="2.6" fill="none"/>${style === 'bgrobe' ? `<path d="M23 18 Q22 5 30 4.4 Q38 5 37 18" stroke="${L.acc}" stroke-width=".5" fill="none" opacity=".6"/>` : ''}`);
    if (crest) G.push(`<path d="M28.6 3 Q27.8 -4 34.6 -5.5 Q32 -.5 32.2 3Z" fill="#a3322a" stroke="${OL}" stroke-width=".5" transform="translate(0 2)"/><path d="M23.4 13 Q22.6 3.4 30 3.2 Q37.4 3.4 36.6 13 L35.6 13 Q35.4 7 30 6.8 Q24.6 7 24.4 13Z" fill="url(#mt-cor)" stroke="${OL}" stroke-width=".6"/><path d="M23.6 12.5 L23.2 18 L24.8 17.6 L24.5 12.6Z M36.4 12.5 L36.8 18 L35.2 17.6 L35.5 12.6Z" fill="url(#mt-cor)" stroke="${OL}" stroke-width=".4"/>`);
  } else {
    G.push(`<path d="M22.8 15 Q22 2.6 30 2.4 Q38 2.6 37.2 15 L36.4 21 Q30 23.4 23.6 21Z" fill="url(#mt-hark)" stroke="${OL}" stroke-width=".8"/><path d="M24.6 11.4 Q30 9.6 35.4 11.4 L35 14.4 Q30 13 25 14.4Z" fill="#06070c"/><path d="M25.6 12.4 Q30 11.2 34.4 12.4" stroke="#8fd0ff" stroke-width=".55" opacity=".8" fill="none"/><path d="M25 6.5 Q30 3.6 35 6.5" stroke="#fff" stroke-width=".7" opacity=".3" fill="none"/><path d="M30 15.5 V21.8" stroke="#0c0f18" stroke-width=".8"/>`);
  }
  // off-hand & weapon
  if (def.role === 'tank') G.push(`<path d="M${lx - 6} 34 h13 v18 q0 9 -6.5 12 q-6.5 -3 -6.5 -12z" fill="url(#${cl})" stroke="${OL}" stroke-width=".8"/><path d="M${lx - 4.4} 36 h9.8 v15.4 q0 7 -4.9 9.6 q-4.9 -2.6 -4.9 -9.6z" fill="none" stroke="${L.acc}" stroke-width=".9"/>${sigil(fac, lx + .5, 46, L.acc)}`);
  if (def.role === 'heal') G.push(`<rect x="${lx - 3.6}" y="${hy - 1}" width="7" height="9.5" rx="2.2" fill="#3a8ec6" stroke="${OL}" stroke-width=".5"/><rect x="${lx - 2.8}" y="${hy}" width="1.5" height="7" rx=".7" fill="#c6e8ff" opacity=".7"/><rect x="${lx - 1.6}" y="${hy - 3.6}" width="3.2" height="3" fill="#6a5a4a"/>`);
  const dt = def.basic.dt;
  if (dt === 'blade') {
    if (fac === 'frem') G.push(`<path d="M${hx} ${hy} Q${hx + 9} ${hy - 7} ${hx + 7} ${hy - 19}" fill="none" stroke="${OL}" stroke-width="3.6" stroke-linecap="round"/><path d="M${hx} ${hy} Q${hx + 9} ${hy - 7} ${hx + 7} ${hy - 19}" fill="none" stroke="#f4eddc" stroke-width="2.3" stroke-linecap="round"/>`);
    else G.push(`<line x1="${hx}" y1="${hy}" x2="${hx + 9}" y2="${hy - 26}" stroke="${OL}" stroke-width="3.4" stroke-linecap="round"/><line x1="${hx}" y1="${hy}" x2="${hx + 9}" y2="${hy - 26}" stroke="url(#steel)" stroke-width="2.1" stroke-linecap="round"/>`);
    G.push(`<line x1="${hx - 3}" y1="${hy - 1.2}" x2="${hx + 3}" y2="${hy + 1.2}" stroke="#7a5a2e" stroke-width="2.4" stroke-linecap="round"/>`);
  } else if (dt === 'fast') {
    G.push(`<rect x="${hx - 1}" y="${hy - 4}" width="11.5" height="3.8" rx="1" fill="#2a2a32" stroke="${OL}" stroke-width=".5"/><rect x="${hx}" y="${hy - 1}" width="3" height="5" fill="#2a2a32" stroke="${OL}" stroke-width=".4"/><rect x="${hx + 1}" y="${hy - 3.4}" width="8" height=".7" fill="#7a808c"/>`);
  } else if (dt === 'laser') {
    G.push(`<g transform="rotate(-22 ${hx} ${hy})"><rect x="${hx - 12}" y="${hy - 3}" width="27" height="4.2" rx="1" fill="#24262e" stroke="${OL}" stroke-width=".5"/><rect x="${hx - 8}" y="${hy - 2.4}" width="15" height=".8" fill="#5a606c"/><circle cx="${hx + 15}" cy="${hy - .9}" r="2.4" fill="#7fe0ff"/><circle cx="${hx + 15}" cy="${hy - .9}" r="5" fill="#7fe0ff" opacity=".22"/></g>`);
  } else if (dt === 'poison') {
    G.push(`<line x1="${hx}" y1="${hy}" x2="${hx + 8}" y2="${hy - 11}" stroke="#d8ddd8" stroke-width="1.2"/><circle cx="${hx + 8.6}" cy="${hy - 12}" r="2" fill="#7ad36a"/><circle cx="${hx + 8.6}" cy="${hy - 12}" r="4.2" fill="#7ad36a" opacity=".22"/>`);
  } else if (dt === 'voice') {
    G.push(`<path d="M37.5 14 Q40 17.5 37.5 21" fill="none" stroke="${L.acc}" stroke-width="1.3"/><path d="M40.5 11.5 Q45 17.5 40.5 23.5" fill="none" stroke="${L.acc}" stroke-width="1.3" opacity=".55"/><path d="M43.5 9 Q50 17.5 43.5 26" fill="none" stroke="${L.acc}" stroke-width="1.1" opacity=".25"/>`);
  }
  return `<svg viewBox="${full ? '0 -6 60 106' : '15 0 30 30'}" aria-hidden="true">${G.join('')}</svg>`;
}

function wormSVG() {
  const teeth = [];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, r1 = 13, r2 = 8.5, cx = 160, cy = 46;
    const x1 = cx + Math.cos(a - .14) * r1, y1 = cy + Math.sin(a - .14) * r1, x2 = cx + Math.cos(a + .14) * r1, y2 = cy + Math.sin(a + .14) * r1, x3 = cx + Math.cos(a) * r2, y3 = cy + Math.sin(a) * r2;
    teeth.push(`<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${x3.toFixed(1)} ${y3.toFixed(1)}Z" fill="#e8dcc0"/>`);
  }
  return `<svg viewBox="0 0 220 120" aria-hidden="true" class="worm-svg">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8916a"/><stop offset="1" stop-color="#5e4129"/></linearGradient></defs>
    <path d="M0 104 Q60 86 120 98 T220 92 L220 120 L0 120Z" fill="#a8743f" opacity=".7"/>
    <path d="M44 122 C52 52 112 14 150 36" fill="none" stroke="url(#wg)" stroke-width="30" stroke-linecap="round"/>
    <path d="M44 122 C52 52 112 14 150 36" fill="none" stroke="#3a2616" stroke-width="30" stroke-dasharray="2.5 9" opacity=".35"/>
    <ellipse cx="160" cy="46" rx="21" ry="20" fill="#8a6440"/>
    <circle cx="160" cy="46" r="15" fill="#1c0f0a"/>
    ${teeth.join('')}
    <circle cx="160" cy="46" r="5" fill="#ff8a3a" opacity=".35"/>
    <g fill="#e2b072" opacity=".8"><circle cx="34" cy="100" r="3"/><circle cx="62" cy="96" r="2"/><circle cx="26" cy="92" r="1.6"/><circle cx="70" cy="104" r="2.4"/></g>
    <path d="M0 112 Q50 100 110 110 T220 106 L220 120 L0 120Z" fill="#d9a462"/>
  </svg>`;
}

function portrait(def, size, ring) {
  return `<span class="pt ${ring ? 'ringed' : ''}" data-info="shard:${def.id}" style="--fc:var(--${def.f[0]});${ring ? `--ring:${ring};` : ''}width:${size}px;height:${size}px">${figureSVG(def)}</span>`;
}


function set_figureSVG(v) { return figureSVG = v; }
export { figureSVG, wormSVG, portrait, set_figureSVG };
