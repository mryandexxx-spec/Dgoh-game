// core/format.js — форматирование чисел и иконки ресурсов (строки HTML без доступа к DOM), вынесены из core/save.js (фаза 2).
import '../logic/gear-sources.js'; // порядок исполнения

const fmt = n => n.toLocaleString('ru-RU');
const ICONS_RES = {
  wring: '<circle cx="8" cy="9.2" r="5" fill="none" stroke="#9fd8e8" stroke-width="2.2"/><circle cx="8" cy="9.2" r="5" fill="none" stroke="#3a7a92" stroke-width=".7"/><path d="M8 .8c1.2 1.6 1.9 2.6 1.9 3.4a1.9 1.9 0 01-3.8 0c0-.8.7-1.8 1.9-3.4z" fill="#5fc0e0"/>',
  jt: '<path d="M8 1.2l1.7 3.4 3.8.6-2.7 2.7.6 3.8L8 10l-3.4 1.7.6-3.8L2.5 5.2l3.8-.6z" fill="#d8b45a"/><path d="M8 4.2l.9 1.9 2 .3-1.5 1.4.4 2L8 8.9l-1.8.9.4-2-1.5-1.4 2-.3z" fill="#7a3a1a"/><path d="M5 12.5h6l-.6 2.3H5.6z" fill="#a8742a"/>',
  water: '<path d="M8 1.5C10.2 5 12.5 7.4 12.5 10a4.5 4.5 0 01-9 0C3.5 7.4 5.8 5 8 1.5z" fill="#6fb3ea"/><path d="M6 10.5a2 2 0 002 2" stroke="#d6ecff" stroke-width="1.1" fill="none" stroke-linecap="round"/>',
  sol: '<circle cx="8" cy="8" r="6.3" fill="#d4ab4c"/><circle cx="8" cy="8" r="4.2" fill="none" stroke="#8a6a1e" stroke-width="1.2"/><path d="M8 5.5v5" stroke="#8a6a1e" stroke-width="1.3"/>',
  pl: '<path d="M8 1.6l5.6 3.2v6.4L8 14.4 2.4 11.2V4.8z" fill="#8f9bb0"/><path d="M8 1.6l5.6 3.2L8 8 2.4 4.8z" fill="#c4cedd"/><path d="M8 8v6.4" stroke="#5f6a7d" stroke-width=".8"/>',
  teeth: '<path d="M3 3.5c2-1.4 8-1.4 10 0-.4 3.2-1.4 4.6-2.2 5.6L9.6 14 8 9.8 6.4 14 5.2 9.1C4.4 8.1 3.4 6.7 3 3.5z" fill="#e8dcc0"/><path d="M8 4v4" stroke="#b9a988" stroke-width=".8"/>',
  shard: '<path d="M8 1.2l4 5.3L8 14.8 4 6.5z" fill="#e48a3c"/><path d="M8 1.2l4 5.3H4z" fill="#f6b97a"/>',
  cry: '<path d="M8 1.4l5.4 4.2-2 7.6H4.6l-2-7.6z" fill="#c2412a"/><path d="M8 1.4l5.4 4.2L8 7.4 2.6 5.6z" fill="#ff8a5a"/><path d="M8 7.4v5.8" stroke="#ffb08a" stroke-width=".7" opacity=".7"/>',
  folio: '<path d="M2.5 3.2c2.2-.9 4-.6 5.5.6v10c-1.5-1.2-3.3-1.5-5.5-.6z" fill="#c9b08a"/><path d="M13.5 3.2c-2.2-.9-4-.6-5.5.6v10c1.5-1.2 3.3-1.5 5.5-.6z" fill="#e6d2ae"/><path d="M8 3.8v10" stroke="#7a5a34" stroke-width=".8"/>',
  seal: '<circle cx="8" cy="8.4" r="5.4" fill="#9a2a24"/><path d="M3.6 6l-1-2.4 2.4.8M12.4 6l1-2.4-2.4.8M8 2.4V.9" stroke="#9a2a24" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="8.4" r="3.2" fill="none" stroke="#e6b45a" stroke-width=".9"/><path d="M8 6.4l.7 1.4 1.5.2-1.1 1 .3 1.5L8 9.8l-1.4.7.3-1.5-1.1-1 1.5-.2z" fill="#e6b45a"/>',
  wol: '<path d="M6 1.6h4v2.2l2.2 3.6v5.4c0 1.2-1 2-2.2 2H6c-1.2 0-2.2-.8-2.2-2V7.4L6 3.8z" fill="#2a6a8a"/><path d="M4.4 8.6h7.2v3.8c0 .8-.7 1.4-1.6 1.4H6c-.9 0-1.6-.6-1.6-1.4z" fill="#5ad0ff"/><circle cx="8" cy="10.6" r="3.6" fill="#8fe8ff" opacity=".25"/><rect x="5.6" y="1" width="4.8" height="1.4" rx=".5" fill="#7a5a34"/>',
  candle: '<rect x="5.5" y="7" width="5" height="7.5" rx="1" fill="#e8d8b0"/><path d="M8 1.5c1.6 2 1.8 3.4 0 5-1.8-1.6-1.6-3 0-5z" fill="#ffb040"/><path d="M8 3.2c.7 1 .7 1.8 0 2.6-.7-.8-.7-1.6 0-2.6z" fill="#fff2b0"/><rect x="4" y="13.5" width="8" height="1.5" rx=".6" fill="#8a6a3a"/>',
  rid: '<path d="M8 1l5 4v6l-5 4-5-4V5z" fill="#2a9a8a"/><path d="M8 1l5 4-5 2.6L3 5z" fill="#7ae8d4"/><path d="M8 7.6V15" stroke="#bff8ec" stroke-width=".6" opacity=".7"/><path d="M3 5v6M13 5v6" stroke="#1a6a5e" stroke-width=".6"/>',
  core: '<path d="M8 1.2l5.6 3.3v6.9L8 14.8l-5.6-3.4V4.5z" fill="#7a1f2a"/><path d="M8 3.6l3.4 2v4.1L8 11.8 4.6 9.7V5.6z" fill="#ff6a3a"/><circle cx="8" cy="7.7" r="1.7" fill="#ffe0a0"/>',
  ix_plate: '<rect x="2" y="3" width="12" height="10" rx="1" fill="#b78f4d"/><path d="M4 6h8M4 9h8" stroke="#efce91" stroke-width="1"/>',
  holtz_conductor: '<path d="M4 2h8v12H4z" fill="#799ab1"/><path d="M8 3L5 9h3l-1 4 5-7H9l1-3" fill="#b9e9ff"/>',
  tleilax_matrix: '<path d="M8 1L14 5v6l-6 4-6-4V5z" fill="#88558b"/><path d="M4 7l4-3 4 3-4 5z" fill="#d6a5db"/>',
  null_cell: '<circle cx="8" cy="8" r="7" fill="#a78042"/><circle cx="8" cy="8" r="4" fill="#1a191c"/><path d="M8 3V1M8 15v-2M1 8h2M13 8h2" stroke="#f5d18a"/>',
  blood_echo: '<circle cx="8" cy="8" r="6" fill="#bc5a38"/><path d="M8 2l4 6-4 6-4-6z" fill="#ffca9e"/>',
  legacy_thread: '<path d="M2 12C4 3 12 3 14 12" stroke="#79b2c5" fill="none" stroke-width="2"/><circle cx="8" cy="8" r="3" fill="#cae9eb"/>',
  age_resonance: '<circle cx="8" cy="8" r="7" fill="none" stroke="#c8b3ec" stroke-width="2"/><circle cx="8" cy="8" r="4" fill="none" stroke="#826abc" stroke-width="2"/><circle cx="8" cy="8" r="1.5" fill="#fff1d3"/>',
  frag: '<path d="M2.5 4.5h4a1.6 1.6 0 113.2 0h3.8v3.8a1.6 1.6 0 110 3.2v3.8h-11z" fill="#b9c3d4"/><path d="M2.5 4.5h4a1.6 1.6 0 113.2 0h3.8v3.8" fill="none" stroke="#7f8aa0" stroke-width=".8"/>',
};
const ic = k => `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">${ICONS_RES[k]}</svg>`;
const amt = (k, n, key) => `<span class="amt" data-info="${key || k}">${ic(k)}${typeof n === 'number' ? fmt(n) : n}</span>`;
const fc = def => `var(--${def.f[0]})`;


export { fmt, ICONS_RES, ic, amt, fc };
