// ui/mouse.js — строки 5084–5104 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './notifications.js'; // порядок исполнения

// ===================== desert mouse (muad'dib) for battle results =====================
const MOUSE_SVG = sad => `<svg class="mouse ${sad ? 'sad' : 'joy'}" viewBox="0 0 120 100" aria-hidden="true">
  <ellipse class="msh" cx="60" cy="94" rx="${sad ? 26 : 20}" ry="4" fill="rgb(0 0 0 / .35)"/>
  <g class="mbody">
    <path class="mtail" d="M38 74c-14 2-24-4-30-14 ${sad ? 'M38 76c-12 4-22 6-30 2' : ''}" fill="none" stroke="#b07a48" stroke-width="3" stroke-linecap="round"/>
    <circle cx="9" cy="${sad ? 78 : 60}" r="3.5" fill="#f0d8b0"/>
    <ellipse cx="58" cy="70" rx="22" ry="${sad ? 16 : 19}" fill="#d4a46a"/><ellipse cx="62" cy="75" rx="13" ry="10" fill="#f2dcb4"/>
    <path d="M44 84l-6 8h10M68 86l2 8h8" fill="none" stroke="#9a6a3a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="mhead">
      <ellipse class="mear l" cx="64" cy="${sad ? 40 : 26}" rx="9" ry="16" fill="#d4a46a" transform="rotate(${sad ? -60 : -18} 64 ${sad ? 46 : 38})"/><ellipse cx="64" cy="${sad ? 40 : 26}" rx="5" ry="11" fill="#e8a8a0" transform="rotate(${sad ? -60 : -18} 64 ${sad ? 46 : 38})"/>
      <ellipse class="mear r" cx="84" cy="${sad ? 42 : 26}" rx="9" ry="16" fill="#c89458" transform="rotate(${sad ? 62 : 16} 84 ${sad ? 48 : 38})"/><ellipse cx="84" cy="${sad ? 42 : 26}" rx="5" ry="11" fill="#e8a8a0" transform="rotate(${sad ? 62 : 16} 84 ${sad ? 48 : 38})"/>
      <ellipse cx="76" cy="${sad ? 56 : 50}" rx="17" ry="14" fill="#d4a46a"/>
      ${sad ? `<path d="M67 55q3 -3 6 0M80 55q3 -3 6 0" fill="none" stroke="#2a1a10" stroke-width="2" stroke-linecap="round"/><path class="mtear" d="M70 58c1.5 2 2.5 3.4 2.5 4.6a2.5 2.5 0 01-5 0c0-1.2 1-2.6 2.5-4.6z" fill="#7ac0ff"/><path d="M73 65q4-3 8 0" fill="none" stroke="#2a1a10" stroke-width="1.8" stroke-linecap="round"/>`
        : `<circle cx="70" cy="47" r="3.2" fill="#2a1a10"/><circle cx="83" cy="47" r="3.2" fill="#2a1a10"/><circle cx="71" cy="46" r="1" fill="#fff"/><circle cx="84" cy="46" r="1" fill="#fff"/><path d="M71 55q5 5 10 0" fill="none" stroke="#2a1a10" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="66" cy="53" rx="3" ry="2" fill="#e88a7a" opacity=".6"/><ellipse cx="87" cy="53" rx="3" ry="2" fill="#e88a7a" opacity=".6"/>`}
      <circle cx="91" cy="${sad ? 59 : 52}" r="2.6" fill="#6a3a2a"/>
    </g>
    ${sad ? '' : '<path class="marm" d="M50 62l-10-14" stroke="#c89458" stroke-width="4" stroke-linecap="round"/><path class="marm2" d="M72 64l12-12" stroke="#c89458" stroke-width="4" stroke-linecap="round"/>'}
  </g>
  ${sad ? '<g class="mcloud"><ellipse cx="96" cy="16" rx="12" ry="7" fill="#7a7a8a"/><ellipse cx="86" cy="18" rx="8" ry="6" fill="#8a8a9a"/><path class="mdrop" d="M90 26v5M96 26v5M102 26v5" stroke="#7ac0ff" stroke-width="1.6" stroke-linecap="round"/></g>' : '<g class="mstars"><path d="M14 18l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5z" fill="#ffd27a"/><path d="M104 10l1.5 3 3 .4-2.2 2 .6 3-2.9-1.5-2.9 1.5.6-3-2.2-2 3-.4z" fill="#ffe8a0"/><circle cx="28" cy="8" r="2" fill="#ffd27a"/><circle cx="110" cy="34" r="1.6" fill="#ffd27a"/></g>'}
</svg>`;


export { MOUSE_SVG };
