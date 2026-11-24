// Original illustrated UI-03 art. Pure presentation; no reward or save semantics.
const DEFS =
  '<defs><linearGradient id="coam-metal" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#7d8580"/><stop offset=".16" stop-color="#43484a"/><stop offset=".61" stop-color="#252b30"/><stop offset="1" stop-color="#0c1117"/></linearGradient>' +
  '<linearGradient id="coam-face" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#57514a"/><stop offset=".42" stop-color="#322c28"/><stop offset="1" stop-color="#161719"/></linearGradient>' +
  '<linearGradient id="coam-bronze" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ffe7ae"/><stop offset=".27" stop-color="#c79552"/><stop offset=".59" stop-color="#754524"/><stop offset="1" stop-color="#d7a760"/></linearGradient>' +
  '<linearGradient id="coam-lamp" x1="0" x2="1"><stop stop-color="#9b3b0e"/><stop offset=".25" stop-color="#ffc66f"/><stop offset=".5" stop-color="#fff5b4"/><stop offset=".8" stop-color="#ffab46"/><stop offset="1" stop-color="#73330e"/></linearGradient>' +
  '<radialGradient id="coam-glow"><stop stop-color="#ffbc61" stop-opacity=".56"/><stop offset="1" stop-color="#f49c45" stop-opacity="0"/></radialGradient></defs>';
const LID_CLOSED =
  '<path d="M25 72 73 43 227 39 277 67 256 91 43 93Z" fill="url(#coam-metal)" stroke="#c4955c" stroke-width="2.3"/>' +
  '<path d="m46 72 37-21 133-3 42 20-15 12-185 2Z" fill="#414342" stroke="#a37c49" stroke-width="1.7"/>' +
  '<path d="m76 54 28-6 103 1 28 12-16 5-130-2Z" fill="#888071" opacity=".25"/>' +
  '<path d="M40 73 61 85 239 83 261 70" stroke="#e0ae6b" fill="none" stroke-width="2.5"/>' +
  '<path d="m112 44 25-2 15 43-25 5Z" fill="url(#coam-bronze)" stroke="#f8d497" stroke-width="1.4"/>' +
  '<path d="m124 48 15 33m-65-26 4 19m143-22-3 22" stroke="#ffe7ae" stroke-width="1.3" opacity=".65"/>' +
  '<path d="m25 72 18 22m234-27-20 25" stroke="#f2c684" stroke-width="2"/>';
const LID_OPEN =
  '<ellipse cx="152" cy="80" rx="116" ry="55" fill="url(#coam-glow)"/>' +
  '<path d="M33 76 69 40 224 29 272 61 249 73 55 89Z" fill="url(#coam-metal)" stroke="#e6b06c" stroke-width="2.4"/>' +
  '<path d="m53 68 34-19 133-13 30 21-16 4L68 77Z" fill="#4d4a46" stroke="#c5995d" stroke-width="1.4"/>' +
  '<path d="m114 39 25-4 15 38-24 5Z" fill="url(#coam-bronze)"/>' +
  '<path d="M47 94 68 78 239 69 256 89 233 105 63 107Z" fill="#0a0a0b" stroke="#d4a361" stroke-width="2"/>' +
  '<path d="M57 95 237 77 246 87 233 96 67 105Z" fill="url(#coam-lamp)" opacity=".95"/>' +
  '<path d="M80 94 221 83" stroke="#fff2b3" stroke-width="3" opacity=".8"/>';
export function choamSupplyArt(opened = false) {
  const label = opened ? 'Открытый контейнер поставки КООАМ' : 'Закрытый контейнер поставки КООАМ';
  return '<svg class="ui03-choam-svg" viewBox="0 0 300 166" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' +
    DEFS +
    '<ellipse cx="151" cy="150" rx="134" ry="13" fill="#030302" opacity=".58"/>' +
    '<ellipse cx="150" cy="117" rx="147" ry="64" fill="url(#coam-glow)" opacity=".42"/>' +
    '<path d="m26 77 37-4 181-4 33 7-3 51-20 24H47l-21-22Z" fill="#131619" stroke="#c39862" stroke-width="2.2"/>' +
    '<path d="m29 85 18 11 4 50-20-17Zm245-3-19 12-3 52 20-17Z" fill="url(#coam-bronze)" stroke="#eed09a" stroke-width="1"/>' +
    '<path d="m47 94 24-10 156-2 30 12-5 49-17 8H68l-18-8Z" fill="url(#coam-face)" stroke="#ba864e" stroke-width="2"/>' +
    '<path d="M53 97 73 87l153-2 23 12" stroke="#f5d39c" stroke-width="1.7" fill="none" opacity=".55"/>' +
    '<path d="m59 103 22 6 5 35-21-6Zm181-1-21 7-5 34 21-6Z" fill="url(#coam-metal)" stroke="#bd884d" stroke-width="1.5"/>' +
    '<path d="M84 108h135l-5 33H88Z" fill="#101317" stroke="#79603c" stroke-width="1.4"/>' +
    '<path d="M88 109h127" stroke="url(#coam-lamp)" stroke-width="3"/>' +
    (opened ? LID_OPEN : LID_CLOSED) +
    '<path d="m117 106 14-7h42l14 7v29l-12 12h-47l-12-12Z" fill="#24211f" stroke="#e0b476" stroke-width="2"/>' +
    '<path d="m123 111 12-6h34l12 6v21l-10 10h-38l-10-10Z" fill="url(#coam-face)" stroke="#745a38" stroke-width="1"/>' +
    '<g fill="none" stroke="#eac183" stroke-width="2.8"><circle cx="143" cy="119" r="8"/><circle cx="156" cy="119" r="8"/></g>' +
    '<path d="M149 110v19" stroke="#ffdfa4" stroke-width=".6"/>' +
    '<path d="M131 136h36" stroke="#c69b61"/>' +
    '<circle cx="68" cy="124" r="2" fill="#ffe7ad"/><circle cx="232" cy="124" r="2" fill="#ffe7ad"/>' +
    '<path d="m32 119 15 6m205-1 16-7" stroke="url(#coam-lamp)" stroke-width="3"/>' +
    '</svg>';
}
export function choamMarkArt() {
  return '<svg class="ui03-choam-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
    '<path d="m5 19 12-8h16l11 8-4 22H9Z" fill="#22272c" stroke="#eac27f" stroke-width="2"/>' +
    '<path d="m5 19 12 7h14l13-7-11-8H17Z" fill="#53504a" stroke="#f8d89d" stroke-width="1.5"/>' +
    '<path d="m20 11 4 14v14" fill="none" stroke="#c99d60" stroke-width="4"/>' +
    '<path d="M10 28h29v10H10Z" fill="#332a25" stroke="#c1975d" stroke-width="1"/>' +
    '<g fill="none" stroke="#e6b36b" stroke-width="1.8"><circle cx="21" cy="33" r="3.8"/><circle cx="27" cy="33" r="3.8"/></g>' +
    '<path d="M7 26v9m34-9v9" stroke="#e4aa60" stroke-width="2"/>' +
    '</svg>';
}
