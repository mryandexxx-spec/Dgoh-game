// data/looks.js — строки 654–675 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../logic/battle/ai.js'; // порядок исполнения

// ===== Graphics: archetype figures, worm, procedural scenes, attack FX =====
const LOOK = {
  atr:  { hi: '#7d9a74', cloak: '#4c6b4e', dark: '#24382a', acc: '#d4d6bf', pants: '#2c2a24' },
  hark: { hi: '#66708e', cloak: '#30374f', dark: '#151a2a', acc: '#a2aac2', pants: '#1c2130' },
  cor:  { hi: '#9a9488', cloak: '#625d55', dark: '#2e2b26', acc: '#e6c66e', pants: '#3a3630' },
  frem: { hi: '#d0a77a', cloak: '#9c7149', dark: '#4e3420', acc: '#ecd4a6', pants: '#5a4028' },
  mach: { hi: '#c8ccd4', cloak: '#7a808c', dark: '#34383f', acc: '#ff5040', pants: '#4a4e56' },
  bg:   { hi: '#54445f', cloak: '#2e2436', dark: '#140f1a', acc: '#cbbbe6', pants: '#1c1622' },
};
function ghash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

function sigil(fac, x, y, col) {
  if (fac === 'atr') return `<path d="M${x} ${y - 3} L${x + 2.5} ${y} L${x} ${y + 3} L${x - 2.5} ${y}Z" fill="${col}"/>`;
  if (fac === 'hark') return `<path d="M${x - 3} ${y - 2} L${x + 3} ${y - 2} L${x} ${y + 3}Z" fill="${col}"/>`;
  if (fac === 'cor') return `<circle cx="${x}" cy="${y}" r="2.6" fill="none" stroke="${col}" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="1" fill="${col}"/>`;
  if (fac === 'frem') return `<path d="M${x - 2.5} ${y - 2} Q${x + 3} ${y} ${x - 2.5} ${y + 2.5} Q${x} ${y} ${x - 2.5} ${y - 2}Z" fill="${col}"/>`;
  return `<circle cx="${x}" cy="${y}" r="2.4" fill="none" stroke="${col}" stroke-width="1.2"/>`;
}

const SKINS = [['#efcaa6', '#b98b68'], ['#d3a17b', '#93634a'], ['#f4d6b8', '#c79c79'], ['#bc8862', '#7a4d33'], ['#9a6a4a', '#5e3c28']];
const OL = '#100a06';
const FEM = new Set(['jessica', 'chani', 'mohiam', 'kynes']);

export { LOOK, ghash, sigil, SKINS, OL, FEM };
