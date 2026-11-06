// render3d/base.js — строки 1183–1204 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../render2d/fx-layer.js'; // порядок исполнения

// ===== 3D battle arena (Babylon.js engine) =====
const B3 = typeof BABYLON !== 'undefined' ? BABYLON : null;
const HAS3D = (() => { try { if (!B3) return false; const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();

const ENV3 = {
  desert:     { ground: 'dunes', sand: '#e2ae6c', sand2: '#b07440', props: ['farrocks'], parts: 'sand' },
  spicefield: { ground: 'dunes', sand: '#e4a466', sand2: '#a85430', spice: '#c4562a', props: ['plumes'], parts: 'sand' },
  dawn:       { ground: 'dunes', sand: '#e8a682', sand2: '#86485a', props: ['farrocks'], parts: 'sand' },
  harvester:  { ground: 'dunes', sand: '#dca46a', sand2: '#9a6038', props: ['harvester'], parts: 'sand' },
  storm:      { ground: 'dunes', sand: '#c4945e', sand2: '#8a5a34', parts: 'storm', fogNear: 6, fogFar: 55 },
  ruins:      { ground: 'dunes', sand: '#c88a5e', sand2: '#7a4434', props: ['ruins'], parts: 'sand' },
  saltflat:   { ground: 'flat', sand: '#efe6d6', sand2: '#c2b29a', tex: 'salt', props: ['farrocks'], parts: 'sand' },
  canyon:     { ground: 'dunes', sand: '#dc9c62', sand2: '#a05a32', props: ['canyon'], parts: 'dust' },
  cave:       { ground: 'dunes', sand: '#8a6440', sand2: '#3a2416', props: ['cave'], parts: 'dust', dark: 1, fogNear: 20, fogFar: 70 },
  sietch:     { ground: 'dunes', sand: '#7a6066', sand2: '#2a1c22', props: ['mesas'], parts: 'dust', night: 1 },
  arrakeen:   { ground: 'dunes', sand: '#c07a42', sand2: '#6a3420', props: ['mesas', 'city'], parts: 'sand' },
  caladan:    { ground: 'rocky', sand: '#66745e', sand2: '#2e3832', tex: 'rock', props: ['sea', 'castle'], parts: 'rain' },
  giedi:      { ground: 'flat', sand: '#3e302a', sand2: '#140c0a', tex: 'rock', props: ['towers'], parts: 'ember', fogNear: 25, fogFar: 110 },
  court:      { ground: 'floor', sand: '#c49a5e', sand2: '#6a4c26', tex: 'tile', props: ['palace'], parts: 'dust' },
};
const SLOT3 = [[-3.6, .4], [-6.6, -3.4], [-2.6, -4.4], [-7.4, 3.6], [-2.2, 4.6]];


export { B3, HAS3D, ENV3, SLOT3 };
